# Script to copy product images into the public/images folder
# Run this from the project root (GOWNS-DE-REVE):
# powershell -ExecutionPolicy Bypass -File scripts/copy-images.ps1

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$publicImages = Join-Path $projectRoot "public\images"
$gownsRoot = Split-Path -Parent $projectRoot

# Create output directory
New-Item -ItemType Directory -Path $publicImages -Force | Out-Null

Write-Host "Copying e-commerce images..." -ForegroundColor Cyan

# E-comm images
$ecommDir = Join-Path $gownsRoot "E-comm"
Get-ChildItem -Path $ecommDir -Directory | ForEach-Object {
    $sku = $_.Name -replace "-ecommerce-high$", ""
    Get-ChildItem -Path $_.FullName -Filter "*.jpg" | ForEach-Object {
        $newName = $_.Name -replace "-ecommerce-high", ""
        # Rename pattern: 6B0VDL951ED626-ecommerce-0.jpg (already correct)
        $destPath = Join-Path $publicImages $_.Name
        Copy-Item -Path $_.FullName -Destination $destPath -Force
        Write-Host "  $($_.Name)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Copying pre-shooting images..." -ForegroundColor Cyan

# Pre-shooting images
$preshootingDir = Join-Path $gownsRoot "Pre-shooting"
Get-ChildItem -Path $preshootingDir -Directory | ForEach-Object {
    Get-ChildItem -Path $_.FullName -Filter "*.jpg" | ForEach-Object {
        $destPath = Join-Path $publicImages $_.Name
        Copy-Item -Path $_.FullName -Destination $destPath -Force
        Write-Host "  $($_.Name)" -ForegroundColor Gray
    }
}

Write-Host ""
$count = (Get-ChildItem -Path $publicImages -Filter "*.jpg").Count
Write-Host "Done! $count images copied to public/images/" -ForegroundColor Green
