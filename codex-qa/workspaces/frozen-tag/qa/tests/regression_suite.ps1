$ServerUrl = "http://127.0.0.1:8765"
$SharedDataFolder = "C:\Users\samue\Documents\Projects\Active\MechLex_Shared_Data_Simulation"

function Assert-Equal($Actual, $Expected, $Message) {
    if ($Actual -ne $Expected) {
        Write-Error "FAIL: $Message. Expected '$Expected', got '$Actual'"
        return $false
    }
    Write-Host "PASS: $Message" -ForegroundColor Green
    return $true
}

Write-Host "Running Phase 1 Regression Suite" -ForegroundColor Cyan

# Test 1: Active state recovery to a valid revision.
$statePath = Join-Path $SharedDataFolder "state.json"
$state = Get-Content $statePath | ConvertFrom-Json
$currentRev = $state.revision
if (-not (Assert-Equal ($currentRev -ge 13) $true "State is at revision $currentRev (>= 13)")) { exit 1 }

# Test 2: Strict schemaVersion === 2 rejection.
$badPayload = @{ schemaVersion = 1; expectedRevision = $currentRev; shared = @{ data = @() } } | ConvertTo-Json
$prevHashBefore = Get-FileHash (Join-Path $SharedDataFolder "state.previous.json") | Select-Object -ExpandProperty Hash
try {
    Invoke-RestMethod -Uri "$ServerUrl/api/shared-state" -Method Put -Body $badPayload -ContentType "application/json" -Headers @{"x-mechlex-client" = "1"}
    Write-Error "FAIL: Server accepted schemaVersion 1"
    exit 1
} catch {
    Assert-Equal $_.Exception.Response.StatusCode "BadRequest" "Server rejected schemaVersion 1 with 400 Bad Request"
}

# Test 3: Preservation of state.previous.json after a rejected request.
$prevHashAfter = Get-FileHash (Join-Path $SharedDataFolder "state.previous.json") | Select-Object -ExpandProperty Hash
Assert-Equal $prevHashAfter $prevHashBefore "state.previous.json hash is preserved after rejected request"

# Test 4: /api/can-write validation
try {
    $canWriteRes = Invoke-RestMethod -Uri "$ServerUrl/api/can-write"
    Assert-Equal $canWriteRes.canWrite $true "/api/can-write returns true for current user"
} catch {
    Write-Error "FAIL: Failed to hit /api/can-write"
    exit 1
}

Write-Host "Regression suite completed." -ForegroundColor Cyan
