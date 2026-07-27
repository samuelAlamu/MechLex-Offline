[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$workspace = Join-Path $projectRoot "codex-qa\workspaces\goal1-main"
$shared = Join-Path $workspace "shared-data"
$evidence = Join-Path $projectRoot "codex-qa\evidence\goal1\browser-core"
$guard = Join-Path $projectRoot "codex-qa\scripts\real-shared-path-guard.ps1"
$port = 8785
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
$guardOutput = & $guard -ProjectRoot $projectRoot -TestPath $shared `
  -OutputPath (Join-Path $evidence "guard-browser-core.json")
if ($LASTEXITCODE -ne 0) { throw "Safety guard rejected Goal 1 browser shared path." }

function Get-Manifest([string]$Root) {
  @(Get-ChildItem -LiteralPath $Root -File -Recurse -Force | Sort-Object FullName | ForEach-Object {
    [pscustomobject]@{
      Path = $_.FullName.Substring($Root.Length).TrimStart("\")
      Length = $_.Length
      SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  })
}

$before = Get-Manifest $shared
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

$browserExit = -1
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
  if (-not $ready) { throw "Goal 1 browser helper did not become ready." }

  $oldNodePath = $env:NODE_PATH
  try {
    $env:NODE_PATH = Join-Path $projectRoot "qa\automation\node_modules"
    $env:MECHLEX_QA_SKIP_IMAGES = "1"
    & node (Join-Path $projectRoot "codex-qa\tests\goal1\browser_qa_isolated.cjs") `
      $workspace "http://127.0.0.1:$port/index.html"
    $browserExit = $LASTEXITCODE
  } finally {
    Remove-Item Env:\MECHLEX_QA_SKIP_IMAGES -ErrorAction SilentlyContinue
    if ($null -eq $oldNodePath) { Remove-Item Env:\NODE_PATH -ErrorAction SilentlyContinue }
    else { $env:NODE_PATH = $oldNodePath }
  }
} finally {
  if ($helper -and -not $helper.HasExited) {
    Stop-Process -Id $helper.Id -Force
    $helper.WaitForExit(5000) | Out-Null
  }
}

$sourceReport = Join-Path $workspace "qa\evidence\logs\browser-qa-results.json"
if (Test-Path -LiteralPath $sourceReport) {
  Copy-Item -LiteralPath $sourceReport -Destination (Join-Path $evidence "browser-qa-results.json") -Force
}
foreach ($directoryName in @("screenshots", "performance", "recovery")) {
  $sourceDirectory = Join-Path $workspace "qa\evidence\$directoryName"
  if (Test-Path -LiteralPath $sourceDirectory) {
    $targetDirectory = Join-Path $evidence $directoryName
    New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
    Get-ChildItem -LiteralPath $sourceDirectory -File -Force | ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination $targetDirectory -Force
    }
  }
}
$after = Get-Manifest $shared
$summary = [pscustomobject]@{
  timestampUtc = [DateTime]::UtcNow.ToString("o")
  browserExitCode = $browserExit
  reportExists = Test-Path -LiteralPath (Join-Path $evidence "browser-qa-results.json")
  beforeFileCount = $before.Count
  afterFileCount = $after.Count
  sharedChangedDuringDisposableTest = (@(Compare-Object $before $after -Property Path,Length,SHA256).Count -gt 0)
  mockRole = "Admin (disposable helper process only)"
  realSharedDataUsed = $false
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $evidence "run-summary.json") -Encoding UTF8
$summary | ConvertTo-Json -Depth 6
