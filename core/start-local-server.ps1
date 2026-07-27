param(
  [int]$Port = 8765,
  [switch]$NoBrowser,
  [string]$SharedDataPath = ""
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..")).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
$RootBoundary = $Root + [System.IO.Path]::DirectorySeparatorChar
$Address = [System.Net.IPAddress]::Loopback
$MaxBodyBytes = 35MB

# Small trusted-team mode: Windows group membership is not required.
# Set to $false in the future to restore MechLex_Admins / MechLex_Editors enforcement.
$SimpleTeamMode = $true

function Resolve-SharedDataPath {
  $configured = $SharedDataPath
  if ([string]::IsNullOrWhiteSpace($configured)) { $configured = $env:MECHLEX_SHARED_DATA_PATH }
  if ([string]::IsNullOrWhiteSpace($configured)) {
    $configFile = Join-Path $Root "SHARED_DATA_PATH.txt"
    if (Test-Path -LiteralPath $configFile -PathType Leaf) {
      $configured = Get-Content -LiteralPath $configFile |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -and -not $_.StartsWith("#") } |
        Select-Object -First 1
    }
  }
  if ([string]::IsNullOrWhiteSpace($configured)) {
    $configured = Join-Path $Root "MechLex_Shared_Data_Simulation"
  } elseif (-not [System.IO.Path]::IsPathRooted($configured)) {
    $configured = Join-Path $Root $configured
  }
  return [System.IO.Path]::GetFullPath($configured)
}

$SharedRoot = Resolve-SharedDataPath
$StatePath = Join-Path $SharedRoot "state.json"
$PreviousPath = Join-Path $SharedRoot "state.previous.json"
$LockPath = Join-Path $SharedRoot ".mechlex-state.lock"
$HistoryPath = Join-Path $SharedRoot "history"
New-Item -ItemType Directory -Path $SharedRoot -Force | Out-Null
New-Item -ItemType Directory -Path $HistoryPath -Force | Out-Null

function Test-PortOpen([int]$TestPort) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $result = $client.BeginConnect("127.0.0.1", $TestPort, $null, $null)
    $connected = $result.AsyncWaitHandle.WaitOne(250)
    if ($connected -and $client.Connected) {
      $client.EndConnect($result)
      $client.Close()
      return $true
    }
    $client.Close()
  } catch {}
  return $false
}

function Test-MechLexServer([int]$TestPort) {
  try {
    Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue
    $httpClient = New-Object System.Net.Http.HttpClient
    $httpClient.Timeout = [TimeSpan]::FromSeconds(2)
    try {
      $resp = $httpClient.GetStringAsync("http://127.0.0.1:$TestPort/api/server-path").GetAwaiter().GetResult()
      $serverRoot = ($resp | ConvertFrom-Json).rootPath
      return ($serverRoot -eq $Root)
    } finally {
      $httpClient.Dispose()
    }
  } catch {
    return $false
  }
}

function Find-AvailablePort([int]$PreferredPort) {
  if (-not (Test-PortOpen $PreferredPort)) { return $PreferredPort }
  if (Test-MechLexServer $PreferredPort) { return -$PreferredPort }
  foreach ($candidatePort in (($PreferredPort + 1)..($PreferredPort + 20))) {
    if (-not (Test-PortOpen $candidatePort)) { return $candidatePort }
  }
  throw "No available local port was found between $PreferredPort and $($PreferredPort + 20)."
}

function Get-MimeType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css"  { "text/css; charset=utf-8" }
    ".js"   { "text/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".txt"  { "text/plain; charset=utf-8" }
    ".svg"  { "image/svg+xml" }
    ".png"  { "image/png" }
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".webp" { "image/webp" }
    ".ico"  { "image/x-icon" }
    default { "application/octet-stream" }
  }
}

function Read-HttpRequest([System.IO.Stream]$Stream) {
  $headerBytes = New-Object System.Collections.Generic.List[byte]
  $matched = 0
  $terminator = [byte[]](13, 10, 13, 10)
  while ($headerBytes.Count -lt 65536 -and $matched -lt 4) {
    $value = $Stream.ReadByte()
    if ($value -lt 0) { break }
    $headerBytes.Add([byte]$value)
    if ($value -eq $terminator[$matched]) { $matched += 1 } else { $matched = if ($value -eq 13) { 1 } else { 0 } }
  }
  if ($matched -ne 4) { throw "HTTP_400: Invalid or oversized HTTP headers" }
  $headerText = [System.Text.Encoding]::ASCII.GetString($headerBytes.ToArray())
  $headerLines = $headerText -split "`r`n"
  $parts = $headerLines[0].Split(" ")
  $headers = @{}
  foreach ($line in $headerLines | Select-Object -Skip 1) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $separator = $line.IndexOf(":")
    if ($separator -gt 0) {
      $headers[$line.Substring(0, $separator).Trim().ToLowerInvariant()] = $line.Substring($separator + 1).Trim()
    }
  }
  $contentLength = if ($headers.ContainsKey("content-length")) { [int64]$headers["content-length"] } else { 0 }
  if ($contentLength -lt 0 -or $contentLength -gt $MaxBodyBytes) { throw "HTTP_413: Request body is too large" }
  [byte[]]$body = New-Object byte[] $contentLength
  $offset = 0
  while ($offset -lt $contentLength) {
    $read = $Stream.Read($body, $offset, [int]($contentLength - $offset))
    if ($read -le 0) { throw "Request body ended unexpectedly" }
    $offset += $read
  }
  return @{
    Method = if ($parts.Length -gt 0) { $parts[0].ToUpperInvariant() } else { "GET" }
    Target = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
    Headers = $headers
    Body = $body
  }
}

function Send-Response(
  [System.IO.Stream]$Stream,
  [string]$Method,
  [int]$StatusCode,
  [string]$StatusText,
  [string]$ContentType,
  [byte[]]$Body,
  [string[]]$ExtraHeaders = @()
) {
  $securityHeaders = @(
    "Cache-Control: no-store, no-cache, must-revalidate",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: no-referrer",
    "Cross-Origin-Resource-Policy: same-origin",
    "Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy: default-src 'self' data: blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  )
  $allHeaders = @($ExtraHeaders) + $securityHeaders
  $header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`n$($allHeaders -join "`r`n")`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Method -ne "HEAD" -and $Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

function Json-Bytes($Value, [int]$Depth = 100) {
  return [System.Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth $Depth -Compress))
}

function Read-State {
  if (-not (Test-Path -LiteralPath $StatePath -PathType Leaf)) { return $null }
  $record = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($record.checksum -and $record.shared) {
    $sharedJson = $record.shared | ConvertTo-Json -Depth 100 -Compress
    if ((Get-Sha256 $sharedJson) -ne [string]$record.checksum) {
      throw "Shared state checksum validation failed. Restore state.previous.json or a history revision."
    }
  }
  return $record
}

function Get-Sha256([string]$Text) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Text)))).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Acquire-StateLock([int]$TimeoutMs = 5000) {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
  while ([DateTime]::UtcNow -lt $deadline) {
    try {
      return [System.IO.FileStream]::new($LockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    } catch [System.IO.IOException] {
      Start-Sleep -Milliseconds 50
    }
  }
  throw "Shared state is busy. Try again."
}

function Validate-StateData($dataArray) {
  if ($null -eq $dataArray -or $dataArray -isnot [System.Array]) { return "Data is missing or not an array" }
  $ids = New-Object System.Collections.Generic.HashSet[string]
  foreach ($item in $dataArray) {
    if ([string]::IsNullOrWhiteSpace($item.id)) { return "Item is missing an id" }
    if (-not $ids.Add($item.id)) { return "Duplicate id found: $($item.id)" }
  }
  foreach ($item in $dataArray) {
    if (-not [string]::IsNullOrWhiteSpace($item.parentId) -and -not $ids.Contains($item.parentId)) {
      return "Dangling parentId reference in item $($item.id)"
    }
    if ($item.id.StartsWith("image-") -and -not [string]::IsNullOrWhiteSpace($item.data)) {
      if ($item.data -notmatch "^data:image/(png|jpeg|webp|gif|svg\+xml);base64,") {
        return "Invalid image data format for $($item.id)"
      }
    }
  }
  return $null
}

function Write-StateAtomically($Record) {
  $err = Validate-StateData $Record.shared.data
  if ($null -ne $err) { throw "State Semantic Validation Failed: $err" }

  $json = $Record | ConvertTo-Json -Depth 100
  $tempPath = Join-Path $SharedRoot ("state.{0}.{1}.tmp" -f $PID, [Guid]::NewGuid().ToString("N"))
  try {
    $fs = [System.IO.FileStream]::new($tempPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    $writer = [System.IO.StreamWriter]::new($fs, [System.Text.UTF8Encoding]::new($false))
    $writer.Write($json)
    $writer.Flush()
    $fs.Flush($true)
    $writer.Close()
    
    if (Test-Path -LiteralPath $StatePath -PathType Leaf) {
      [System.IO.File]::Replace($tempPath, $StatePath, $PreviousPath, $true)
    } else {
      [System.IO.File]::Move($tempPath, $StatePath)
    }
  } finally {
    if (Test-Path -LiteralPath $tempPath -PathType Leaf) { Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue }
  }
  $safeTimestamp = ([DateTime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ"))
  $historyFile = Join-Path $HistoryPath ("state-r{0}-{1}.json" -f $Record.revision, $safeTimestamp)
  [System.IO.File]::Copy($StatePath, $historyFile, $false)
  $historyFiles = Get-ChildItem -LiteralPath $HistoryPath -Filter "state-r*.json" -File | Sort-Object LastWriteTimeUtc -Descending
  $historyFiles | Select-Object -Skip 30 | Remove-Item -Force
}

function Origin-IsAllowed([hashtable]$Headers, [int]$ActivePort) {
  if (-not $Headers.ContainsKey("origin")) { return $true }
  return $Headers["origin"] -in @("http://127.0.0.1:$ActivePort", "http://localhost:$ActivePort")
}

function Test-SharedFolderWriteAccess {
  $probePath = Join-Path $SharedRoot (".mechlex-write-probe.{0}.{1}.tmp" -f $PID, [Guid]::NewGuid().ToString("N"))
  $probeStream = $null
  try {
    $probeStream = [System.IO.FileStream]::new(
      $probePath,
      [System.IO.FileMode]::CreateNew,
      [System.IO.FileAccess]::Write,
      [System.IO.FileShare]::None
    )
    $probeStream.WriteByte(0)
    $probeStream.Flush($true)
    return $true
  } catch {
    return $false
  } finally {
    if ($null -ne $probeStream) { $probeStream.Dispose() }
    if (Test-Path -LiteralPath $probePath -PathType Leaf) {
      Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
    }
  }
}

function Test-MechLexRole([string]$RequiredRole) {
  if ($SimpleTeamMode) {
    return $RequiredRole -in @("Admin", "Editor")
  }

  if ($env:MECHLEX_MOCK_ROLE) {
    if ($RequiredRole -eq "Admin" -and $env:MECHLEX_MOCK_ROLE -match "Admin") { return $true }
    if ($RequiredRole -eq "Editor" -and $env:MECHLEX_MOCK_ROLE -match "Admin|Editor") { return $true }
    return $false
  }
  
  $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
  if ($RequiredRole -eq "Admin") {
    return $principal.IsInRole("MechLex_Admins") -or $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
  }
  if ($RequiredRole -eq "Editor") {
    return $principal.IsInRole("MechLex_Editors") -or $principal.IsInRole("MechLex_Admins") -or $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
  }
  return $false
}

$SelectedPort = Find-AvailablePort $Port
if ($SelectedPort -lt 0) {
  $ExistingPort = -$SelectedPort
  if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$ExistingPort/index.html" }
  Write-Host "MechLex is already running at http://127.0.0.1:$ExistingPort/index.html"
  exit 0
}
$Port = $SelectedPort
$Url = "http://127.0.0.1:$Port/index.html"

$global:RecoveryMode = $false
$global:RecoveryError = ""
$startupState = Read-State
if ($null -ne $startupState) {
  if ($startupState.schemaVersion -ne 2) {
    $global:RecoveryMode = $true
    $global:RecoveryError = "Invalid schemaVersion (Expected 2)"
  } else {
    $startupErr = Validate-StateData $startupState.shared.data
    if ($null -ne $startupErr) {
      $global:RecoveryMode = $true
      $global:RecoveryError = $startupErr
    }
  }
  if ($global:RecoveryMode) {
    $timestamp = [DateTime]::UtcNow.ToString("yyyyMMdd_HHmmss")
    $forensic = Join-Path $SharedRoot "state.corrupted.$timestamp.json"
    Copy-Item -LiteralPath $StatePath -Destination $forensic -Force
    Write-Warning "STATE CORRUPTION DETECTED: $($global:RecoveryError)"
    Write-Warning "Forensic copy saved to $forensic"
    Write-Warning "ENTERING RECOVERY MODE. Writes will be disabled until fixed."
  }
}

$Listener = [System.Net.Sockets.TcpListener]::new($Address, $Port)
$Listener.Start()
if (-not $NoBrowser) { Start-Process $Url }
Write-Host "MechLex is running at $Url"
Write-Host "Shared data folder: $SharedRoot"
Write-Host "Local-only server: no inbound network port is opened."
Write-Host "Keep this window open while using the dictionary. Press Ctrl+C to stop."

try {
  while ($true) {
    $TcpClient = $Listener.AcceptTcpClient()
    try {
      $Stream = $TcpClient.GetStream()
      $request = Read-HttpRequest $Stream
      $Method = $request.Method
      $RawTarget = $request.Target
      $RawPath = ($RawTarget -split "\?")[0]
      $knownRevision = -1
      if ($RawTarget -match "[?&]knownRevision=([0-9]+)") { $knownRevision = [int]$Matches[1] }

      if ($RawPath -eq "/api/server-path") {
        Send-Response $Stream $Method 200 "OK" "application/json; charset=utf-8" (Json-Bytes @{ rootPath = $Root })
        continue
      }

      if ($RawPath -eq "/api/shared-health") {
        if ($Method -notin @("GET", "HEAD")) {
          Send-Response $Stream $Method 405 "Method Not Allowed" "application/json; charset=utf-8" (Json-Bytes @{ message = "Method Not Allowed" }) @("Allow: GET, HEAD")
          continue
        }
        $modeName = if ($global:RecoveryMode) { "recovery" } else { "offline-shared-folder" }
        $health = @{
          ok = (-not $global:RecoveryMode)
          mode = $modeName
          stateExists = [bool](Test-Path -LiteralPath $StatePath -PathType Leaf)
          writable = [bool](Test-SharedFolderWriteAccess)
        }
        if ($global:RecoveryMode) { $health.error = $global:RecoveryError }
        Send-Response $Stream $Method 200 "OK" "application/json; charset=utf-8" (Json-Bytes $health)
        continue
      }

      if ($RawPath -eq "/api/can-write") {
        if ($Method -ne "GET") {
          Send-Response $Stream $Method 405 "Method Not Allowed" "application/json; charset=utf-8" (Json-Bytes @{ message = "Method Not Allowed" }) @("Allow: GET")
          continue
        }
        $canWrite = $false
        $role = "Viewer"
        try {
          $folderWritable = Test-SharedFolderWriteAccess
          if ($folderWritable -and (Test-MechLexRole "Admin")) {
            $role = "Admin"
            $canWrite = $true
          } elseif ($folderWritable -and (Test-MechLexRole "Editor")) {
            $role = "Editor"
            $canWrite = $true
          }
        } catch {}
        Send-Response $Stream $Method 200 "OK" "application/json; charset=utf-8" (Json-Bytes @{ canWrite = $canWrite; role = $role })
        continue
      }

      if ($RawPath -eq "/api/image-catalog") {
        if ($Method -ne "GET") {
          Send-Response $Stream $Method 405 "Method Not Allowed" "application/json; charset=utf-8" (Json-Bytes @{ message = "Method Not Allowed" }) @("Allow: GET")
          continue
        }
        $imagesDir = Join-Path $Root "images"
        $catalog = @()
        if (Test-Path -LiteralPath $imagesDir -PathType Container) {
          $allowedExts = @(".jpg", ".jpeg", ".png", ".webp", ".svg")
          $files = Get-ChildItem -LiteralPath $imagesDir -File | Where-Object { $_.Extension.ToLowerInvariant() -in $allowedExts }
          foreach ($f in $files) {
            $catalog += @{
              name = $f.Name
              extension = $f.Extension
              size = $f.Length
              lastModified = $f.LastWriteTimeUtc.ToString("o")
            }
          }
        }
        Send-Response $Stream $Method 200 "OK" "application/json; charset=utf-8" (Json-Bytes $catalog)
        continue
      }

      if ($RawPath -eq "/api/shared-state") {
        if (-not (Origin-IsAllowed $request.Headers $Port)) {
          Send-Response $Stream $Method 403 "Forbidden" "application/json; charset=utf-8" (Json-Bytes @{ message = "Origin is not allowed" })
          continue
        }
        if ($Method -in @("GET", "HEAD")) {
          $record = Read-State
          if ($null -eq $record) {
            Send-Response $Stream $Method 404 "Not Found" "application/json; charset=utf-8" (Json-Bytes @{ message = "Shared state has not been initialized" })
            continue
          }
          if ($knownRevision -eq [int]$record.revision) {
            Send-Response $Stream $Method 304 "Not Modified" "application/json; charset=utf-8" ([byte[]]@())
          } else {
            Send-Response $Stream $Method 200 "OK" "application/json; charset=utf-8" (Json-Bytes $record)
          }
          continue
        }
        if ($Method -ne "PUT") {
          Send-Response $Stream $Method 405 "Method Not Allowed" "application/json; charset=utf-8" (Json-Bytes @{ message = "Method Not Allowed" }) @("Allow: GET, HEAD, PUT")
          continue
        }
        if ($global:RecoveryMode) {
          Send-Response $Stream $Method 503 "Service Unavailable" "application/json; charset=utf-8" (Json-Bytes @{ message = "Server is in recovery mode. Writes are disabled." })
          continue
        }
        if ($request.Headers["x-mechlex-client"] -ne "1" -or $request.Headers["content-type"] -notmatch "^application/json") {
          Send-Response $Stream $Method 415 "Unsupported Media Type" "application/json; charset=utf-8" (Json-Bytes @{ message = "A MechLex JSON request is required" })
          continue
        }
        $payload = $null
        try {
          $payload = [System.Text.Encoding]::UTF8.GetString($request.Body) | ConvertFrom-Json
        } catch {
          Send-Response $Stream $Method 400 "Bad Request" "application/json; charset=utf-8" (Json-Bytes @{ message = "Malformed JSON payload" })
          continue
        }
        if ($null -eq $payload.shared -or $payload.shared.data -isnot [System.Array]) {
          Send-Response $Stream $Method 422 "Unprocessable Entity" "application/json; charset=utf-8" (Json-Bytes @{ message = "The shared catalog is missing or invalid" })
          continue
        }
        if ([int]$payload.schemaVersion -ne 2) {
          Send-Response $Stream $Method 400 "Bad Request" "application/json; charset=utf-8" (Json-Bytes @{ message = "Schema version 2 is required" })
          continue
        }
        
        $semanticErr = Validate-StateData $payload.shared.data
        if ($null -ne $semanticErr) {
          Send-Response $Stream $Method 422 "Unprocessable Entity" "application/json; charset=utf-8" (Json-Bytes @{ message = "Semantic validation failed: $semanticErr" })
          continue
        }

        $lock = $null
        try {
          $lock = Acquire-StateLock
          $current = Read-State
          
          # Phase 4 ACL Check
          $isAdminChange = $false
          if ($null -ne $current -and $null -ne $payload.shared.settings) {
            $oldSettings = $current.shared.settings | ConvertTo-Json -Depth 10 -Compress
            $newSettings = $payload.shared.settings | ConvertTo-Json -Depth 10 -Compress
            if ($oldSettings -ne $newSettings) { $isAdminChange = $true }
          } elseif ($null -eq $current) {
            $isAdminChange = $true # Initial creation requires Admin
          }
          
          if ($isAdminChange -and -not (Test-MechLexRole "Admin")) {
            Send-Response $Stream $Method 403 "Forbidden" "application/json; charset=utf-8" (Json-Bytes @{ message = "Administrator rights required to modify settings or initialize catalog" })
            continue
          }
          if (-not $isAdminChange -and -not (Test-MechLexRole "Editor")) {
            Send-Response $Stream $Method 403 "Forbidden" "application/json; charset=utf-8" (Json-Bytes @{ message = "Editor rights required to modify content" })
            continue
          }

          $currentRevision = if ($null -eq $current) { 0 } else { [int]$current.revision }
          if ([int]$payload.expectedRevision -ne $currentRevision) {
            Send-Response $Stream $Method 409 "Conflict" "application/json; charset=utf-8" (Json-Bytes @{
              message = "A newer shared revision already exists"
              currentRevision = $currentRevision
              updatedAt = $current.updatedAt
              updatedBy = $current.updatedBy
            })
            continue
          }
          $sharedJson = $payload.shared | ConvertTo-Json -Depth 100 -Compress
          $record = [ordered]@{
            format = "MechLexSharedState"
            formatVersion = 1
            revision = $currentRevision + 1
            schemaVersion = [int]$payload.schemaVersion
            appVersion = [string]$payload.appVersion
            updatedAt = [DateTime]::UtcNow.ToString("o")
            updatedBy = [string]$payload.clientId
            reason = [string]$payload.reason
            checksum = Get-Sha256 $sharedJson
            shared = $payload.shared
          }
          Write-StateAtomically $record
          Send-Response $Stream $Method 200 "OK" "application/json; charset=utf-8" (Json-Bytes @{
            ok = $true
            revision = $record.revision
            updatedAt = $record.updatedAt
            checksum = $record.checksum
          })
        } finally {
          if ($null -ne $lock) { $lock.Dispose() }
        }
        continue
      }

      if ($Method -notin @("GET", "HEAD")) {
        Send-Response $Stream $Method 405 "Method Not Allowed" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed")) @("Allow: GET, HEAD")
        continue
      }
      $decodedPath = [System.Uri]::UnescapeDataString($RawPath).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
      if ($decodedPath -eq [System.IO.Path]::DirectorySeparatorChar.ToString()) { $decodedPath = "index.html" }
      $decodedPath = $decodedPath.TrimStart([char[]]@("/", "\"))
      $candidate = [System.IO.Path]::GetFullPath((Join-Path $Root $decodedPath))
      if (-not $candidate.StartsWith($RootBoundary, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Response $Stream $Method 403 "Forbidden" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Forbidden"))
      } elseif (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        Send-Response $Stream $Method 404 "Not Found" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Not Found"))
      } else {
        Send-Response $Stream $Method 200 "OK" (Get-MimeType $candidate) ([System.IO.File]::ReadAllBytes($candidate))
      }
    } catch {
      try {
        $msg = $_.Exception.Message
        if ($msg -like "HTTP_413:*") {
          Send-Response $Stream "GET" 413 "Payload Too Large" "application/json; charset=utf-8" (Json-Bytes @{ message = $msg.Substring(9).Trim() })
        } elseif ($msg -like "HTTP_400:*") {
          Send-Response $Stream "GET" 400 "Bad Request" "application/json; charset=utf-8" (Json-Bytes @{ message = $msg.Substring(9).Trim() })
        } else {
          Send-Response $Stream "GET" 500 "Internal Server Error" "application/json; charset=utf-8" (Json-Bytes @{ message = "Local server error"; detail = $msg })
        }
      } catch {}
      Write-Warning $_.Exception.Message
    } finally {
      $TcpClient.Close()
    }
  }
} finally {
  $Listener.Stop()
}
