[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$workspace = Join-Path $projectRoot "codex-qa\workspaces\normal"
$shared = Join-Path $workspace "shared-data"
$evidenceRoot = Join-Path $projectRoot "codex-qa\evidence\preactivation"
$guard = Join-Path $PSScriptRoot "real-shared-path-guard.ps1"
$port = 8897

$guardOutput = & $guard -ProjectRoot $projectRoot -TestPath $shared `
  -OutputPath (Join-Path $evidenceRoot "guard-localhost-browser-shared.json")
if ($LASTEXITCODE -ne 0) { throw "Safety guard rejected localhost browser shared path." }

$before = @(Get-ChildItem -LiteralPath $shared -File -Recurse -Force | Sort-Object FullName | ForEach-Object {
  [pscustomobject]@{
    Path = $_.FullName.Substring($shared.Length).TrimStart("\")
    Length = $_.Length
    SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
})
$stdout = Join-Path $evidenceRoot "h0-localhost-helper.stdout.log"
$stderr = Join-Path $evidenceRoot "h0-localhost-helper.stderr.log"
$helper = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $stdout -RedirectStandardError $stderr `
  -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", "`"$(Join-Path $workspace 'core\start-local-server.ps1')`"",
    "-Port", $port, "-NoBrowser", "-SharedDataPath", "`"$shared`""
  )
try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 50; $attempt++) {
    if ($helper.HasExited) { break }
    try {
      $tcp = [System.Net.Sockets.TcpClient]::new("127.0.0.1", $port)
      $tcp.Close()
      $ready = $true
      break
    } catch { Start-Sleep -Milliseconds 100 }
  }
  if (-not $ready) { throw "Disposable helper did not become ready." }

  $env:H0_HELPER_PORT = [string]$port
  $env:H0_HELPER_PID = [string]$helper.Id
  try {
    & node (Join-Path $projectRoot "codex-qa\tests\preactivation\localhost-authority-probe.cjs")
    if ($LASTEXITCODE -ne 0) { throw "Localhost browser probe failed." }
  } finally {
    Remove-Item Env:\H0_HELPER_PORT -ErrorAction SilentlyContinue
    Remove-Item Env:\H0_HELPER_PID -ErrorAction SilentlyContinue
  }
} finally {
  $helper.Refresh()
  if (-not $helper.HasExited) {
    Stop-Process -Id $helper.Id -Force
    $helper.WaitForExit(5000) | Out-Null
  }
}

$after = @(Get-ChildItem -LiteralPath $shared -File -Recurse -Force | Sort-Object FullName | ForEach-Object {
  [pscustomobject]@{
    Path = $_.FullName.Substring($shared.Length).TrimStart("\")
    Length = $_.Length
    SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
})
$unchanged = (@(Compare-Object $before $after -Property Path,Length,SHA256).Count -eq 0)
$summary = [pscustomobject]@{
  timestampUtc = [DateTime]::UtcNow.ToString("o")
  disposableSharedManifestUnchanged = $unchanged
  beforeFiles = $before.Count
  afterFiles = $after.Count
  realSharedDataUsed = $false
}
[System.IO.File]::WriteAllText(
  (Join-Path $evidenceRoot "11_12_localhost-probe-shared-verification.json"),
  ($summary | ConvertTo-Json -Depth 5),
  (New-Object System.Text.UTF8Encoding($false))
)
if (-not $unchanged) { throw "Disposable shared copy changed during a read/rejected-write probe." }
$summary | ConvertTo-Json -Depth 5
