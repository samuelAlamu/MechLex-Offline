$path = "C:\Users\samue\Documents\Projects\Active\MechLex_Shared_Data_Simulation\state.json"
$record = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
$sharedJson = $record.shared | ConvertTo-Json -Depth 100 -Compress
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = ([System.BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($sharedJson)))).Replace("-", "").ToLowerInvariant()
$sha.Dispose()
$record.checksum = $hash
$record | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $path -Encoding UTF8
Write-Host "Checksum updated to: $hash"
