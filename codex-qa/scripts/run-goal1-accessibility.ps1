[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$workspace = Join-Path $projectRoot "codex-qa\workspaces\goal1-main"
$shared = Join-Path $workspace "shared-data"
$evidence = Join-Path $projectRoot "codex-qa\evidence\goal1\ux-accessibility"
$guard = Join-Path $projectRoot "codex-qa\scripts\real-shared-path-guard.ps1"
$port = 8787
$guardOutput = & $guard -ProjectRoot $projectRoot -TestPath $shared `
  -OutputPath (Join-Path $evidence "guard-accessibility.json")
if ($LASTEXITCODE -ne 0) { throw "Safety guard rejected accessibility shared path." }

$helper = Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $evidence "accessibility-helper.stdout.log") `
  -RedirectStandardError (Join-Path $evidence "accessibility-helper.stderr.log") `
  -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", "`"$(Join-Path $workspace 'core\start-local-server.ps1')`"",
    "-Port", $port, "-NoBrowser", "-SharedDataPath", "`"$shared`""
  )
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
  if (-not $ready) { throw "Accessibility helper did not become ready." }
  & node (Join-Path $projectRoot "codex-qa\tests\goal1\accessibility-audit.cjs") `
    "http://127.0.0.1:$port/index.html"
  if ($LASTEXITCODE -ne 0) { throw "Accessibility audit failed." }
} finally {
  if ($helper -and -not $helper.HasExited) {
    Stop-Process -Id $helper.Id -Force
    $helper.WaitForExit(5000) | Out-Null
  }
}
