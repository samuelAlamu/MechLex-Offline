param([string]$OutDir = "test-images")
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

Add-Type -AssemblyName System.Drawing

$images = @(
    "S-N Curve",
    "Stress-Strain",
    "Otto Cycle",
    "Vapor Compression",
    "Pump Curve",
    "Gears",
    "Ball Bearing",
    "Turning",
    "FDM Layers",
    "PID Response"
)

foreach ($name in $images) {
    $bmp = New-Object System.Drawing.Bitmap(400, 300)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.Clear([System.Drawing.Color]::LightGray)
    
    $font = New-Object System.Drawing.Font("Arial", 24)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
    $rect = New-Object System.Drawing.RectangleF(0, 0, 400, 300)
    
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $g.DrawString($name, $font, $brush, $rect, $format)
    
    $filename = $name -replace ' ', '_'
    $path = Join-Path $OutDir "$filename.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    $font.Dispose()
    $brush.Dispose()
    $format.Dispose()
    
    Write-Host "Generated $path"
}
