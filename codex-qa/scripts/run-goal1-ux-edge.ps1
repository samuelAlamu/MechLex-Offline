[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$workspace = Join-Path $projectRoot "codex-qa\workspaces\goal1-main"
$shared = Join-Path $workspace "shared-data"
$evidence = Join-Path $projectRoot "codex-qa\evidence\goal1\ux-accessibility"
$guard = Join-Path $projectRoot "codex-qa\scripts\real-shared-path-guard.ps1"
$port = 8786
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
$guardOutput = & $guard -ProjectRoot $projectRoot -TestPath $shared `
  -OutputPath (Join-Path $evidence "guard-ux-edge.json")
if ($LASTEXITCODE -ne 0) { throw "Safety guard rejected UX shared path." }

$stdout = Join-Path $evidence "helper.stdout.log"
$stderr = Join-Path $evidence "helper.stderr.log"
$oldRole = $env:MECHLEX_MOCK_ROLE
try {
  $env:MECHLEX_MOCK_ROLE = "Admin"
  $helper = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr `
    -ArgumentList @(
      "-NoProfile", "-ExecutionPolicy", "Bypass",
      "-File", "`"$(Join-Path $workspace 'core\start-local-server.ps1')`"",
      "-Port", $port, "-NoBrowser", "-SharedDataPath", "`"$shared`""
    )
} finally {
  if ($null -eq $oldRole) { Remove-Item Env:\MECHLEX_MOCK_ROLE -ErrorAction SilentlyContinue }
  else { $env:MECHLEX_MOCK_ROLE = $oldRole }
}

$exitCode = -1
try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 80; $attempt++) {
    if ($helper.HasExited) { break }
    try {
      $tcp = [System.Net.Sockets.TcpClient]::new("127.0.0.1", $port)
      $tcp.Close()
      $ready = $true
      break
    } catch { Start-Sleep -Milliseconds 100 }
  }
  if (-not $ready) { throw "UX helper did not become ready." }
  $oldNodePath = $env:NODE_PATH
  try {
    $env:NODE_PATH = Join-Path $projectRoot "qa\automation\node_modules"
    & node (Join-Path $workspace "qa\tests\browser\ux_edge_cases.cjs") `
      $workspace "http://127.0.0.1:$port/index.html"
    $exitCode = $LASTEXITCODE
  } finally {
    if ($null -eq $oldNodePath) { Remove-Item Env:\NODE_PATH -ErrorAction SilentlyContinue }
    else { $env:NODE_PATH = $oldNodePath }
  }
} finally {
  if ($helper -and -not $helper.HasExited) {
    Stop-Process -Id $helper.Id -Force
    $helper.WaitForExit(5000) | Out-Null
  }
}

$sourceReport = Join-Path $workspace "qa\evidence\logs\ux-edge-cases.json"
if (Test-Path -LiteralPath $sourceReport) {
  Copy-Item -LiteralPath $sourceReport -Destination (Join-Path $evidence "ux-edge-cases.json") -Force
}
$sourceScreenshot = Join-Path $workspace "qa\evidence\screenshots\unsaved-change-closed.png"
if (Test-Path -LiteralPath $sourceScreenshot) {
  Copy-Item -LiteralPath $sourceScreenshot -Destination (Join-Path $evidence "unsaved-change-closed.png") -Force
}
$summary = [pscustomobject]@{
  timestampUtc = [DateTime]::UtcNow.ToString("o")
  testExitCode = $exitCode
  reportExists = Test-Path -LiteralPath (Join-Path $evidence "ux-edge-cases.json")
  port = $port
  realSharedDataUsed = $false
  note = "At non-8765 ports, the product hard-coded can-write fetch is blocked by same-origin CSP and openAdmin catches the error, which is product fail-open behavior."
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $evidence "run-summary.json") -Encoding UTF8
$summary | ConvertTo-Json -Depth 6
