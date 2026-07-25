$ServerUrl = "http://127.0.0.1:8765"

Write-Host "Running Phase 4 Concurrency Suite" -ForegroundColor Cyan

$state = Invoke-RestMethod -Uri "$ServerUrl/api/shared-state"
$startRev = $state.revision

$script = {
    param($ServerUrl, $BaseRev, $ID)
    $payload = @{
        schemaVersion = 2
        expectedRevision = $BaseRev
        clientId = "tester-$ID"
        reason = "Concurrency Test"
        shared = @{ data = @(@{ id = "test-$ID"; type = "term"; content = "value" }) }
    } | ConvertTo-Json -Depth 5
    
    try {
        Invoke-RestMethod -Uri "$ServerUrl/api/shared-state" -Method Put -ContentType "application/json" -Headers @{"x-mechlex-client" = "1"} -Body $payload
        return 200
    } catch {
        return $_.Exception.Response.StatusCode
    }
}

Write-Host "Triggering 5 simultaneous saves..."
$jobs = @()
for ($i = 1; $i -le 5; $i++) {
    $jobs += Start-Job -ScriptBlock $script -ArgumentList $ServerUrl, $startRev, $i
}
Wait-Job $jobs | Out-Null
$results = $jobs | Receive-Job

$successCount = ($results | Where-Object { $_ -eq 200 }).Count
$conflictCount = ($results | Where-Object { $_ -eq "Conflict" }).Count

if ($successCount -eq 1 -and $conflictCount -eq 4) {
    Write-Host "PASS: Only 1 request succeeded, 4 were rejected as Conflict." -ForegroundColor Green
} else {
    Write-Error "FAIL: Expected 1 success and 4 conflicts. Got $successCount successes and $conflictCount conflicts."
}

Write-Host "Concurrency suite completed." -ForegroundColor Cyan
