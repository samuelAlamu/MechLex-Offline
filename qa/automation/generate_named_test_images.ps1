$ErrorActionPreference = 'Stop'
$TargetDir = 'C:\Users\samue\Documents\Projects\Active\MechLex_Visual_Admin_Fork\qa\automation\test-images'
if (!(Test-Path $TargetDir)) { New-Item -ItemType Directory -Force -Path $TargetDir }
$Images = @('Stress-Strain.png', 'S-N_Curve.png', 'Otto_Cycle.png', 'Vapor_Compression.png', 'Pump_Curve.png', 'Gears.png', 'Ball_Bearing.png', 'Turning.png', 'FDM_Layers.png', 'PID_Response.png')
Add-Type -AssemblyName System.Drawing
foreach ($img in $Images) {
    $bmp = New-Object System.Drawing.Bitmap 400, 300
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::LightGray)
    $font = New-Object System.Drawing.Font('Consolas', 16)
    $brush = [System.Drawing.Brushes]::Black
    $g.DrawString($img, $font, $brush, 20.0, 130.0)
    $bmp.Save("$TargetDir\$img", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}
