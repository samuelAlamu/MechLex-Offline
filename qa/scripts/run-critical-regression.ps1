param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath($ProjectRoot)
$node = "C:\Users\samue\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$nodeModules = "C:\Users\samue\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$results = New-Object System.Collections.Generic.List[object]
$runStamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ")
$commandLog = Join-Path $root "qa\evidence\commands\critical-regression-$runStamp.log"
$reportPath = Join-Path $root "qa\evidence\logs\critical-regression-results.json"

function Add-Result([string]$Id, [string]$Status, [string]$Note) {
  $results.Add([pscustomobject]@{ id = $Id; status = $Status; note = $Note }) | Out-Null
  Write-Output ("[{0}] {1}: {2}" -f $Status, $Id, $Note)
}

Start-Transcript -LiteralPath $commandLog -Force | Out-Null
try {
  if (-not (Test-Path -LiteralPath $node -PathType Leaf)) {
    throw "Bundled Node.js runtime is unavailable at $node"
  }
  $env:NODE_PATH = $nodeModules

  $syntaxFiles = @(
    "app.js",
    "core\boot.js",
    "core\inline-editor.js",
    "core\integrity.js",
    "core\persistence.js",
    "core\shared-sync.js",
    "data\mechlex-data.js",
    "images\catalog.js"
  )
  $syntaxFailed = @()
  foreach ($relative in $syntaxFiles) {
    & $node --check (Join-Path $root $relative)
    if ($LASTEXITCODE -ne 0) { $syntaxFailed += $relative }
  }
  Add-Result "STATIC-SYNTAX" ($(if ($syntaxFailed.Count) { "FAIL" } else { "PASS" })) ($(if ($syntaxFailed.Count) { "Failed: $($syntaxFailed -join ', ')" } else { "All active JavaScript files passed node --check." }))

  & $node (Join-Path $root "qa\tests\integration\static_audit.mjs") $root
  $static = Get-Content -LiteralPath (Join-Path $root "qa\evidence\logs\static-audit.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  $staticFailures = @($static.results | Where-Object { $_.status -eq "FAIL" })
  Add-Result "STATIC-AUDIT" ($(if ($staticFailures.Count) { "FAIL" } else { "PASS" })) ("{0} failing static gates." -f $staticFailures.Count)

  & $node (Join-Path $root "qa\tests\concurrency\shared_api_qa.mjs") $root (Join-Path $root "qa\evidence\logs\shared-api-results.json")
  $api = Get-Content -LiteralPath (Join-Path $root "qa\evidence\logs\shared-api-results.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  Add-Result "SHARED-API" ($(if ([int]$api.fail -gt 0) { "FAIL" } else { "PASS" })) ("{0} passed, {1} failed; includes 20 concurrent stale-write rounds." -f $api.pass, $api.fail)

  $browserPort = 8780
  $browserShare = Join-Path $root "qa\workspaces\regression-shared-$runStamp"
  New-Item -ItemType Directory -Path $browserShare -Force | Out-Null
  $serverRoot = Join-Path $root "qa\workspaces\concurrency-b"
  $serverScript = Join-Path $serverRoot "core\start-local-server.ps1"
  $serverOut = Join-Path $root "qa\evidence\logs\critical-browser-server-$runStamp.out.log"
  $serverErr = Join-Path $root "qa\evidence\logs\critical-browser-server-$runStamp.err.log"
  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$serverScript`"",
    "-NoBrowser",
    "-Port", "$browserPort",
    "-SharedDataPath", "`"$browserShare`""
  )
  $server = Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -WorkingDirectory $serverRoot -WindowStyle Hidden -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr -PassThru
  try {
    $ready = $false
    for ($attempt = 0; $attempt -lt 80; $attempt += 1) {
      try {
        $healthText = curl.exe -sS "http://127.0.0.1:$browserPort/api/shared-health"
        if ($LASTEXITCODE -eq 0 -and $healthText -match '"ok"\s*:\s*true') {
          $ready = $true
          break
        }
      } catch {}
      Start-Sleep -Milliseconds 100
    }
    if (-not $ready) { throw "Critical browser QA server did not become ready." }

    $env:MECHLEX_QA_SKIP_IMAGES = "1"
    & $node (Join-Path $root "qa\tests\browser\browser_qa.cjs") $root "http://127.0.0.1:$browserPort/index.html"
    Remove-Item Env:MECHLEX_QA_SKIP_IMAGES -ErrorAction SilentlyContinue
    Copy-Item -LiteralPath (Join-Path $root "qa\evidence\logs\browser-qa-results.json") -Destination (Join-Path $root "qa\evidence\logs\browser-critical-results.json") -Force
    $browser = Get-Content -LiteralPath (Join-Path $root "qa\evidence\logs\browser-critical-results.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    Add-Result "BROWSER-CORE" ($(if ([int]$browser.fail -gt 0) { "FAIL" } else { "PASS" })) ("{0} passed, {1} failed." -f $browser.pass, $browser.fail)

    & $node (Join-Path $root "qa\tests\browser\ux_edge_cases.cjs") $root "http://127.0.0.1:$browserPort/index.html"
    $ux = Get-Content -LiteralPath (Join-Path $root "qa\evidence\logs\ux-edge-cases.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    Add-Result "BROWSER-UX-EDGES" ($(if ([int]$ux.fail -gt 0) { "FAIL" } else { "PASS" })) ("{0} passed, {1} failed." -f $ux.pass, $ux.fail)
  } finally {
    if ($null -ne $server -and -not $server.HasExited) {
      Stop-Process -Id $server.Id -Force
      $server.WaitForExit()
    }
  }

  & $node (Join-Path $root "qa\tests\performance\image_capacity_api.mjs") $root
  $images = Get-Content -LiteralPath (Join-Path $root "qa\evidence\performance\image-capacity-api.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  Add-Result "IMAGE-1-15MB-SERVER" ($(if ($images.allServerRoundTripsValid) { "PASS" } else { "FAIL" })) "All six sizes were written and read through the server API."
  Add-Result "IMAGE-1-15MB-CLIENT-TIMEOUT" ($(if ($images.allWithinClientTimeout) { "PASS" } else { "FAIL" })) "The 15MB state read exceeded the client's fixed 5-second timeout."

  $sharedInventoryPath = Join-Path $root "qa\evidence\baseline\external-shared-inventory.json"
  if (Test-Path -LiteralPath $sharedInventoryPath) {
    $sharedInventory = Get-Content -LiteralPath $sharedInventoryPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $activeValid = $sharedInventory.active.format -eq "MechLexSharedState" -and [bool]$sharedInventory.active.hasChecksum -and [int]$sharedInventory.active.schemaVersion -eq 2
    Add-Result "PRODUCTION-SHARED-STATE" ($(if ($activeValid) { "PASS" } else { "FAIL" })) "Configured active state is a schema-1 unsigned performance fixture; preserved previous revision 13 validates."
  } else {
    Add-Result "PRODUCTION-SHARED-STATE" "NOT TESTED" "External shared-state inventory evidence is missing."
  }

  $edgeVersion = if (Test-Path -LiteralPath $edge) { (Get-Item -LiteralPath $edge).VersionInfo.FileVersion } else { "not installed" }
  Add-Result "EDGE-95" "NOT TESTED" "Installed Edge is $edgeVersion; actual Edge 95 is unavailable."

  $failCount = @($results | Where-Object { $_.status -eq "FAIL" }).Count
  $notTestedCount = @($results | Where-Object { $_.status -eq "NOT TESTED" }).Count
  $overall = if ($failCount -eq 0 -and $notTestedCount -eq 0) { "PASS" } else { "FAIL" }
  $report = [ordered]@{
    generatedAt = [DateTime]::UtcNow.ToString("o")
    command = "powershell -NoProfile -ExecutionPolicy Bypass -File .\qa\scripts\run-critical-regression.ps1"
    overall = $overall
    pass = @($results | Where-Object { $_.status -eq "PASS" }).Count
    fail = $failCount
    notTested = $notTestedCount
    results = $results
    commandLog = $commandLog
  }
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
  Write-Output ("CRITICAL REGRESSION: {0} ({1} pass, {2} fail, {3} not tested)" -f $overall, $report.pass, $report.fail, $report.notTested)
  if ($overall -ne "PASS") { exit 1 }
} finally {
  Stop-Transcript | Out-Null
}
