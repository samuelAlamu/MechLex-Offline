[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$evidenceRoot = Join-Path $projectRoot "codex-qa\evidence\preactivation"
$guard = Join-Path $PSScriptRoot "real-shared-path-guard.ps1"
$normalRoot = Join-Path $projectRoot "codex-qa\workspaces\normal"
$normalShared = Join-Path $normalRoot "shared-data"
$viewerShared = Join-Path $projectRoot ("codex-qa\workspaces\destructive\h0-viewer-empty-shared-" + [Guid]::NewGuid().ToString("N"))
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Write-Json([string]$Name, [object]$Value, [int]$Depth = 12) {
  [System.IO.File]::WriteAllText(
    (Join-Path $evidenceRoot $Name),
    ($Value | ConvertTo-Json -Depth $Depth),
    $utf8
  )
}

function Get-FileManifest([string]$Root) {
  if (-not (Test-Path -LiteralPath $Root)) { return @() }
  return @(Get-ChildItem -LiteralPath $Root -File -Recurse -Force |
    Sort-Object FullName |
    ForEach-Object {
      [pscustomobject]@{
        path = $_.FullName.Substring($Root.Length).TrimStart("\")
        length = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        lastWriteTimeUtc = $_.LastWriteTimeUtc.ToString("o")
      }
    })
}

function Compare-Manifest([object[]]$Before, [object[]]$After) {
  $beforeJson = @($Before | Select-Object path,length,sha256) | ConvertTo-Json -Depth 5 -Compress
  $afterJson = @($After | Select-Object path,length,sha256) | ConvertTo-Json -Depth 5 -Compress
  return $beforeJson -eq $afterJson
}

function Assert-SafeShared([string]$Path, [string]$EvidenceName) {
  $guardOutput = & $guard -ProjectRoot $projectRoot -TestPath $Path `
    -OutputPath (Join-Path $evidenceRoot $EvidenceName)
  if ($LASTEXITCODE -ne 0) { throw "Safety guard rejected disposable shared path: $Path" }
}

function Start-Helper([string]$Root, [string]$Shared, [int]$Port, [string]$Label, [string]$MockRole = "") {
  $script = Join-Path $Root "core\start-local-server.ps1"
  $stdout = Join-Path $evidenceRoot "$Label-helper.stdout.log"
  $stderr = Join-Path $evidenceRoot "$Label-helper.stderr.log"
  $oldMockRole = $env:MECHLEX_MOCK_ROLE
  try {
    if ($MockRole) { $env:MECHLEX_MOCK_ROLE = $MockRole } else { Remove-Item Env:\MECHLEX_MOCK_ROLE -ErrorAction SilentlyContinue }
    $process = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput $stdout -RedirectStandardError $stderr `
      -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$script`"", "-Port", $Port, "-NoBrowser", "-SharedDataPath", "`"$Shared`"")
  } finally {
    if ($null -eq $oldMockRole) { Remove-Item Env:\MECHLEX_MOCK_ROLE -ErrorAction SilentlyContinue }
    else { $env:MECHLEX_MOCK_ROLE = $oldMockRole }
  }

  $ready = $false
  for ($attempt = 0; $attempt -lt 50; $attempt++) {
    if ($process.HasExited) { break }
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $client.Connect("127.0.0.1", $Port)
      $client.Close()
      $ready = $true
      break
    } catch {
      Start-Sleep -Milliseconds 100
    }
  }
  if (-not $ready) {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    throw "Helper did not bind to requested port $Port"
  }
  return $process
}

function Stop-Helper([System.Diagnostics.Process]$Process) {
  if ($Process -and -not $Process.HasExited) {
    Stop-Process -Id $Process.Id -Force
    $Process.WaitForExit(5000) | Out-Null
  }
}

function Invoke-HttpProbe {
  param(
    [int]$Port,
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers = @{},
    [AllowNull()]
    [object]$Body = $null
  )
  $handler = [System.Net.Http.HttpClientHandler]::new()
  $client = [System.Net.Http.HttpClient]::new($handler)
  try {
    $request = [System.Net.Http.HttpRequestMessage]::new(
      [System.Net.Http.HttpMethod]::new($Method),
      "http://127.0.0.1:$Port$Path"
    )
    foreach ($key in $Headers.Keys) {
      if ($key -ieq "Content-Type") { continue }
      $request.Headers.TryAddWithoutValidation($key, [string]$Headers[$key]) | Out-Null
    }
    if ($PSBoundParameters.ContainsKey("Body")) {
      $contentType = if ($Headers.ContainsKey("Content-Type")) { $Headers["Content-Type"] } else { "application/json" }
      $request.Content = [System.Net.Http.StringContent]::new([string]$Body, $utf8, $contentType)
    }
    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    $bytes = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
    $bodyText = $utf8.GetString($bytes)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
      $bodyHash = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
    } finally { $sha.Dispose() }
    $safeSummary = $null
    if ($bodyText -and $bodyText.Length -lt 4096) {
      try { $safeSummary = $bodyText | ConvertFrom-Json } catch { $safeSummary = $bodyText.Substring(0, [Math]::Min(500, $bodyText.Length)) }
    } elseif ($Path -like "/api/shared-state*") {
      try {
        $record = $bodyText | ConvertFrom-Json
        $safeSummary = [pscustomobject]@{
          schemaVersion = $record.schemaVersion
          revision = $record.revision
          sharedTopLevelKeys = @($record.shared.PSObject.Properties.Name)
          dataItemCount = @($record.shared.data).Count
        }
      } catch { $safeSummary = "Large response; parse failed" }
    }
    return [pscustomobject]@{
      method = $Method
      path = $Path
      requestHeaders = $Headers
      status = [int]$response.StatusCode
      reason = $response.ReasonPhrase
      contentType = [string]$response.Content.Headers.ContentType
      bodyLength = $bytes.Length
      bodySha256 = $bodyHash
      safeBodySummary = $safeSummary
    }
  } finally {
    $client.Dispose()
    $handler.Dispose()
  }
}

function Invoke-RawHostProbe([int]$Port, [string]$HostValue) {
  $client = [System.Net.Sockets.TcpClient]::new("127.0.0.1", $Port)
  try {
    $stream = $client.GetStream()
    $request = "GET /api/shared-health HTTP/1.1`r`nHost: $HostValue`r`nConnection: close`r`n`r`n"
    $bytes = $utf8.GetBytes($request)
    $stream.Write($bytes, 0, $bytes.Length)
    $reader = [System.IO.StreamReader]::new($stream, $utf8)
    $text = $reader.ReadToEnd()
    return [pscustomobject]@{
      host = $HostValue
      statusLine = ($text -split "`r?`n")[0]
      accepted = ($text -match "^HTTP/1\.1 200")
    }
  } finally { $client.Close() }
}

Assert-SafeShared $normalShared "guard-runtime-normal-shared.json"
$normalBefore = Get-FileManifest $normalShared
$normalProcess = $null
try {
  $normalProcess = Start-Helper $normalRoot $normalShared 8895 "h0-normal"
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($normalProcess.Id)" |
    Select-Object ProcessId,Name,ExecutablePath,CommandLine
  $binding = Get-NetTCPConnection -State Listen -OwningProcess $normalProcess.Id |
    Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,State,OwningProcess

  $stateProbe = Invoke-HttpProbe 8895 "GET" "/api/shared-state"
  $knownRevision = $stateProbe.safeBodySummary.revision
  $invalidPayload = @{
    schemaVersion = 2
    expectedRevision = $knownRevision
    shared = @{
      data = @(
        @{ id = "duplicate"; parentId = "" },
        @{ id = "duplicate"; parentId = "" }
      )
    }
  } | ConvertTo-Json -Depth 10 -Compress

  $normalProbes = @(
    (Invoke-HttpProbe 8895 "GET" "/api/shared-health"),
    (Invoke-HttpProbe 8895 "HEAD" "/api/shared-health"),
    (Invoke-HttpProbe 8895 "POST" "/api/shared-health"),
    (Invoke-HttpProbe 8895 "GET" "/api/can-write"),
    $stateProbe,
    (Invoke-HttpProbe 8895 "HEAD" "/api/shared-state"),
    (Invoke-HttpProbe 8895 "GET" "/api/shared-state?knownRevision=$knownRevision"),
    (Invoke-HttpProbe 8895 "GET" "/api/shared-state" @{ Origin = "http://evil.example" }),
    (Invoke-HttpProbe 8895 "GET" "/api/shared-state" @{ Origin = "http://127.0.0.1:8895" }),
    (Invoke-HttpProbe 8895 "PUT" "/api/shared-state" @{
      "Content-Type" = "application/json"
      "X-MechLex-Client" = "1"
      Origin = "http://127.0.0.1:8895"
    } $invalidPayload)
  )
  $hostProbe = Invoke-RawHostProbe 8895 "evil.example"
} finally {
  Stop-Helper $normalProcess
}
$normalAfter = Get-FileManifest $normalShared

New-Item -ItemType Directory -Path $viewerShared -Force | Out-Null
Assert-SafeShared $viewerShared "guard-runtime-viewer-empty-shared.json"
$viewerState = Join-Path $viewerShared "state.json"
$viewerBefore = [pscustomobject]@{ stateExists = Test-Path -LiteralPath $viewerState; files = Get-FileManifest $viewerShared }
$viewerProcess = $null
try {
  $viewerProcess = Start-Helper $normalRoot $viewerShared 8896 "h0-viewer" "Viewer"
  $viewerCanWrite = Invoke-HttpProbe 8896 "GET" "/api/can-write"
  $viewerAfterCanWrite = [pscustomobject]@{
    stateExists = Test-Path -LiteralPath $viewerState
    stateLength = if (Test-Path -LiteralPath $viewerState) { (Get-Item -LiteralPath $viewerState).Length } else { $null }
    stateSha256 = if (Test-Path -LiteralPath $viewerState) { (Get-FileHash -LiteralPath $viewerState -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }
    files = Get-FileManifest $viewerShared
  }
} finally {
  Stop-Helper $viewerProcess
}

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
$result = [pscustomobject]@{
  timestampUtc = [DateTime]::UtcNow.ToString("o")
  environment = @{
    os = (Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,OSArchitecture)
    powerShell = $PSVersionTable.PSVersion.ToString()
    identityName = $identity.Name
    builtInAdministrator = $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
  }
  normalHelper = @{
    process = $processInfo
    binding = @($binding)
    probes = $normalProbes
    invalidSemanticExpected = 422
    invalidSemanticActual = ($normalProbes | Where-Object { $_.method -eq "PUT" }).status
    hostileHostProbe = $hostProbe
    sharedManifestUnchanged = Compare-Manifest $normalBefore $normalAfter
    beforeManifest = $normalBefore
    afterManifest = $normalAfter
  }
  viewerCanWriteSideEffect = @{
    mockRole = "Viewer"
    before = $viewerBefore
    response = $viewerCanWrite
    after = $viewerAfterCanWrite
    durableWriteByViewerProven = (-not $viewerBefore.stateExists -and $viewerAfterCanWrite.stateExists)
    note = "MECHLEX_MOCK_ROLE was inherited by this disposable helper process only."
  }
  releaseGateFindings = @(
    if ($hostProbe.accepted) { "Host header not validated" }
    if (-not $viewerBefore.stateExists -and $viewerAfterCanWrite.stateExists) { "Viewer GET /api/can-write created a durable state.json file" }
  )
  realSharedDataUsed = $false
}
Write-Json "runtime-probes.json" $result 20
$result | Select-Object timestampUtc,realSharedDataUsed,@{
  Name="normalManifestUnchanged";Expression={$_.normalHelper.sharedManifestUnchanged}
},@{
  Name="invalidSemanticStatus";Expression={$_.normalHelper.invalidSemanticActual}
},@{
  Name="hostHeaderAccepted";Expression={$_.normalHelper.hostileHostProbe.accepted}
},@{
  Name="viewerDurableWriteProven";Expression={$_.viewerCanWriteSideEffect.durableWriteByViewerProven}
} | ConvertTo-Json -Depth 5
