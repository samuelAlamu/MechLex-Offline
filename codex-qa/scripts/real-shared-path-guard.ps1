[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$TestPath,
  [string]$ProjectRoot,
  [string[]]$AdditionalProtectedPath = @(),
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (-not $ProjectRoot) {
  $ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
}

if (-not ("MechLexPathGuard.NativeMethods" -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace MechLexPathGuard {
  [StructLayout(LayoutKind.Sequential)]
  public struct BY_HANDLE_FILE_INFORMATION {
    public uint FileAttributes;
    public System.Runtime.InteropServices.ComTypes.FILETIME CreationTime;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastAccessTime;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWriteTime;
    public uint VolumeSerialNumber;
    public uint FileSizeHigh;
    public uint FileSizeLow;
    public uint NumberOfLinks;
    public uint FileIndexHigh;
    public uint FileIndexLow;
  }

  public static class NativeMethods {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern SafeFileHandle CreateFile(
      string fileName,
      uint desiredAccess,
      uint shareMode,
      IntPtr securityAttributes,
      uint creationDisposition,
      uint flagsAndAttributes,
      IntPtr templateFile);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern uint GetFinalPathNameByHandle(
      SafeFileHandle file,
      System.Text.StringBuilder filePath,
      uint filePathSize,
      uint flags);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetFileInformationByHandle(
      SafeFileHandle file,
      out BY_HANDLE_FILE_INFORMATION fileInformation);
  }
}
"@
}

function Normalize-PathText {
  param([string]$PathText)
  if ([string]::IsNullOrWhiteSpace($PathText)) { return $null }
  $value = [Environment]::ExpandEnvironmentVariables($PathText.Trim().Trim('"'))
  $value = $value -replace "/", "\"
  if ($value.StartsWith("\\?\UNC\", [StringComparison]::OrdinalIgnoreCase)) {
    $value = "\\" + $value.Substring(8)
  } elseif ($value.StartsWith("\\?\", [StringComparison]::OrdinalIgnoreCase)) {
    $value = $value.Substring(4)
  }
  if ($value.Length -gt 3) { $value = $value.TrimEnd("\") }
  return $value.ToLowerInvariant()
}

function Expand-MappedDrive {
  param([string]$PathText)
  if ($PathText -notmatch "^(?<drive>[A-Za-z]:)(?<rest>\\.*)?$") { return $null }
  $drive = $Matches.drive.ToUpperInvariant()
  $rest = if ($Matches.rest) { $Matches.rest } else { "" }
  $provider = $null
  try {
    $logical = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$drive'" -ErrorAction Stop
    $provider = [string]$logical.ProviderName
  } catch {}
  if ([string]::IsNullOrWhiteSpace($provider)) {
    try {
      $psDrive = Get-PSDrive -Name $drive.Substring(0, 1) -ErrorAction Stop
      if ($psDrive.PSObject.Properties.Name -contains "DisplayRoot") {
        $provider = [string]$psDrive.DisplayRoot
      }
    } catch {}
  }
  if ([string]::IsNullOrWhiteSpace($provider)) { return $null }
  return Normalize-PathText ($provider.TrimEnd("\") + $rest)
}

function Get-ExistingPathIdentity {
  param([string]$ExistingPath)
  $flags = 0x02000000
  $share = 0x00000001 -bor 0x00000002 -bor 0x00000004
  $handle = [MechLexPathGuard.NativeMethods]::CreateFile(
    $ExistingPath,
    0,
    $share,
    [IntPtr]::Zero,
    3,
    $flags,
    [IntPtr]::Zero
  )
  if ($handle.IsInvalid) { return $null }
  try {
    $builder = New-Object System.Text.StringBuilder 32768
    $length = [MechLexPathGuard.NativeMethods]::GetFinalPathNameByHandle($handle, $builder, $builder.Capacity, 0)
    $finalPath = if ($length -gt 0) { Normalize-PathText $builder.ToString() } else { $null }
    $info = New-Object MechLexPathGuard.BY_HANDLE_FILE_INFORMATION
    $ok = [MechLexPathGuard.NativeMethods]::GetFileInformationByHandle($handle, [ref]$info)
    $fileId = if ($ok) {
      "{0:x8}:{1:x8}:{2:x8}" -f $info.VolumeSerialNumber, $info.FileIndexHigh, $info.FileIndexLow
    } else {
      $null
    }
    return [pscustomobject]@{ FinalPath = $finalPath; FileId = $fileId }
  } finally {
    $handle.Dispose()
  }
}

function Get-PathRecord {
  param(
    [string]$RawPath,
    [string]$BasePath,
    [string]$Source
  )
  $rawValue = if ($null -eq $RawPath) { "" } else { [string]$RawPath }
  $expanded = [Environment]::ExpandEnvironmentVariables($rawValue.Trim().Trim('"'))
  if ([string]::IsNullOrWhiteSpace($expanded)) { return $null }
  $combined = if ([System.IO.Path]::IsPathRooted($expanded)) {
    $expanded
  } else {
    Join-Path $BasePath $expanded
  }
  $lexical = Normalize-PathText ([System.IO.Path]::GetFullPath($combined))
  $mapped = Expand-MappedDrive $lexical
  $exists = Test-Path -LiteralPath $lexical
  $provider = $null
  $identity = $null
  if ($exists) {
    try { $provider = Normalize-PathText ((Resolve-Path -LiteralPath $lexical).ProviderPath) } catch {}
    $identity = Get-ExistingPathIdentity $lexical
  }
  $aliases = @($lexical, $mapped, $provider, $identity.FinalPath) |
    Where-Object { $_ } |
    ForEach-Object { Normalize-PathText $_ } |
    Sort-Object -Unique
  return [pscustomobject]@{
    Source = $Source
    Raw = $RawPath
    Expanded = $expanded
    LexicalPath = $lexical
    MappedUncPath = $mapped
    ProviderPath = $provider
    FinalPath = $identity.FinalPath
    FileId = $identity.FileId
    Exists = [bool]$exists
    Aliases = @($aliases)
  }
}

function Is-SameOrDescendant {
  param([string]$Candidate, [string]$Protected)
  if (-not $Candidate -or -not $Protected) { return $false }
  if ($Candidate.Equals($Protected, [StringComparison]::OrdinalIgnoreCase)) { return $true }
  return $Candidate.StartsWith($Protected.TrimEnd("\") + "\", [StringComparison]::OrdinalIgnoreCase)
}

$protectedRaw = New-Object System.Collections.Generic.List[object]
$configFile = Join-Path $ProjectRoot "SHARED_DATA_PATH.txt"
if (Test-Path -LiteralPath $configFile) {
  $configured = Get-Content -LiteralPath $configFile -Encoding utf8 |
    Where-Object { $_ -notmatch "^\s*#" -and -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -First 1
  if ($configured) {
    $protectedRaw.Add([pscustomobject]@{ Value = [string]$configured; Base = $ProjectRoot; Source = "SHARED_DATA_PATH.txt" })
  }
}
if (-not [string]::IsNullOrWhiteSpace($env:MECHLEX_SHARED_DATA_PATH)) {
  $protectedRaw.Add([pscustomobject]@{ Value = [string]$env:MECHLEX_SHARED_DATA_PATH; Base = $ProjectRoot; Source = "MECHLEX_SHARED_DATA_PATH" })
}
foreach ($item in $AdditionalProtectedPath) {
  if (-not [string]::IsNullOrWhiteSpace($item)) {
    $protectedRaw.Add([pscustomobject]@{ Value = [string]$item; Base = $ProjectRoot; Source = "AdditionalProtectedPath" })
  }
}

$protected = @($protectedRaw | ForEach-Object { Get-PathRecord -RawPath $_.Value -BasePath $_.Base -Source $_.Source })
if ($protected.Count -eq 0) {
  throw "No protected shared-data path could be discovered. Guard fails closed."
}

$testRecord = Get-PathRecord -RawPath $TestPath -BasePath $ProjectRoot -Source "TestPath"
$matches = New-Object System.Collections.Generic.List[object]
foreach ($entry in $protected) {
  $reason = $null
  if ($testRecord.FileId -and $entry.FileId -and $testRecord.FileId -eq $entry.FileId) {
    $reason = "same-physical-file-id"
  }
  if (-not $reason) {
    foreach ($candidateAlias in $testRecord.Aliases) {
      foreach ($protectedAlias in $entry.Aliases) {
        if (Is-SameOrDescendant $candidateAlias $protectedAlias) {
          $reason = "same-or-descendant-canonical-path"
          break
        }
      }
      if ($reason) { break }
    }
  }
  if ($reason) {
    $matches.Add([pscustomobject]@{
      ProtectedSource = $entry.Source
      ProtectedLexicalPath = $entry.LexicalPath
      Reason = $reason
    })
  }
}

$result = [ordered]@{
  timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
  projectRoot = (Normalize-PathText $ProjectRoot)
  testPath = $testRecord
  protectedPaths = $protected
  blocked = ($matches.Count -gt 0)
  matches = @($matches | ForEach-Object { $_ })
  comparisonMethods = @(
    "environment-variable expansion",
    "relative-to-project normalization",
    "case and separator normalization",
    "mapped-drive ProviderName or DisplayRoot expansion",
    "Resolve-Path provider resolution",
    "GetFinalPathNameByHandle link/junction resolution",
    "volume-serial and file-index physical identity",
    "same-directory and descendant blocking"
  )
}

$json = $result | ConvertTo-Json -Depth 8
if ($OutputPath) {
  $parent = Split-Path -Parent $OutputPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($OutputPath, $json, (New-Object System.Text.UTF8Encoding($false)))
}
$json
if ($result.blocked) { exit 23 }
exit 0
