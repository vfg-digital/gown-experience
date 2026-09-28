# Build products data from folders and CSV
# Run from the project root (GOWNS-DE-REVE)

$ErrorActionPreference = "Stop"

$gownsRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$parentRoot = Split-Path -Parent $gownsRoot
$preshootingRoot = Join-Path $parentRoot "Pre-shooting"
$ecommRoot = Join-Path $parentRoot "E-comm"
$csvPath = Join-Path $parentRoot "WRTW GOWNS SOH @28.07 _ REWORK.csv"
$publicImages = Join-Path $gownsRoot "public\images"
$outputTs = Join-Path $gownsRoot "src\data\products.ts"

Write-Host "=== Building products ===" -ForegroundColor Cyan
Write-Host "Pre-shooting: $preshootingRoot"
Write-Host "E-comm: $ecommRoot"
Write-Host "CSV: $csvPath"
Write-Host ""

# 1. Parse CSV
Write-Host "Parsing CSV..." -ForegroundColor Yellow
$csvData = Import-Csv $csvPath -Delimiter ";"
$csvGrouped = $csvData | Group-Object "CONT SKU"
$csvMap = @{}
foreach ($group in $csvGrouped) {
    $sizes = $group.Group | Select-Object -ExpandProperty SIZE | Sort-Object -Unique
    $csvMap[$group.Name] = @{
        Description = $group.Group[0].DESCRIZIONE
        ColorDesc = $group.Group[0].'COLOR DESC'
        Sizes = $sizes
    }
}
Write-Host "  Found $($csvMap.Count) unique SKUs in CSV"

# 2. Function to convert seasonal SKU to continuative
function Get-ContinuativeSku($seasonalSku) {
    # Remove position 0 and position 2
    if ($seasonalSku.Length -lt 3) { return $seasonalSku }
    return $seasonalSku[1] + $seasonalSku.Substring(3)
}

# 3. Scan Pre-shooting folders
Write-Host "Scanning Pre-shooting..." -ForegroundColor Yellow
$preshootingProducts = @{}
Get-ChildItem -Path $preshootingRoot -Directory | ForEach-Object {
    $sku = $_.Name
    $imgDir = Join-Path $_.FullName "preshooting"
    if (Test-Path $imgDir) {
        $images = Get-ChildItem $imgDir -Filter "*.jpg" | Select-Object -ExpandProperty Name
        $preshootingProducts[$sku] = $images
    }
}
Write-Host "  Found $($preshootingProducts.Count) pre-shooting products"

# 4. Scan E-comm folders
Write-Host "Scanning E-comm..." -ForegroundColor Yellow
$ecommProducts = @{}
Get-ChildItem -Path $ecommRoot -Directory | ForEach-Object {
    $sku = $_.Name
    $imgDir = Join-Path $_.FullName "ecommerce"
    if (Test-Path $imgDir) {
        $images = Get-ChildItem $imgDir -Filter "*.jpg" | Select-Object -ExpandProperty Name
        $ecommProducts[$sku] = $images
    }
}
Write-Host "  Found $($ecommProducts.Count) e-comm products"

# 5. Build unified product list
Write-Host "Building product list..." -ForegroundColor Yellow
$allSkus = ($preshootingProducts.Keys + $ecommProducts.Keys) | Sort-Object -Unique
Write-Host "  Total unique SKUs: $($allSkus.Count)"

# 6. Clean and recreate images folder (product images only)
# Remove old product images but keep non-product assets
$existingImages = Get-ChildItem $publicImages -Filter "*.jpg" -ErrorAction SilentlyContinue
foreach ($img in $existingImages) {
    Remove-Item $img.FullName -Force
}

# 7. Copy images and build data
$products = @()
$copiedCount = 0

foreach ($sku in $allSkus) {
    $contSku = Get-ContinuativeSku $sku
    $csvEntry = $csvMap[$contSku]
    
    $description = if ($csvEntry) { $csvEntry.Description } else { "" }
    $colorDesc = if ($csvEntry) { $csvEntry.ColorDesc } else { "" }
    $sizes = if ($csvEntry) { $csvEntry.Sizes } else { @() }
    
    # Preshooting images
    $preshootImages = @()
    $preshootDetailImages = @()
    if ($preshootingProducts.ContainsKey($sku)) {
        foreach ($img in $preshootingProducts[$sku]) {
            # Check if it's a detail image (ends with Rd.jpg, Rda.jpg, Rdb.jpg)
            $baseName = [System.IO.Path]::GetFileNameWithoutExtension($img)
            $suffix = $baseName.Substring($sku.Length)
            if ($suffix -match '^R[Dd][ab]?$' -or $suffix -match '^[Dd][ab]?$') {
                $preshootDetailImages += $img
            } else {
                $preshootImages += $img
            }
        }
        # Sort: front (Rf) first, then others alphabetically
        $frontImg = $preshootImages | Where-Object { $_ -match 'Rf\.jpg$' -or $_ -match 'f\.jpg$' }
        $otherImgs = $preshootImages | Where-Object { $_ -notmatch 'Rf\.jpg$' -and $_ -notmatch 'f\.jpg$' } | Sort-Object
        $preshootImages = @()
        if ($frontImg) { $preshootImages += $frontImg }
        $preshootImages += $otherImgs
    }
    
    # E-comm images
    $ecommImages = @()
    $ecommDetailImage = $null
    if ($ecommProducts.ContainsKey($sku)) {
        foreach ($img in $ecommProducts[$sku]) {
            $baseName = [System.IO.Path]::GetFileNameWithoutExtension($img)
            $suffix = $baseName.Substring($sku.Length)
            if ($suffix -eq "U") {
                $ecommDetailImage = $img
            } elseif ($suffix -eq "D" -and -not $ecommDetailImage) {
                $ecommDetailImage = $img
            } else {
                $ecommImages += $img
            }
        }
        # If U was found but D is still in ecommImages, keep D in carousel
        # Actually: remove D and U from carousel, only keep as detail
        $ecommImages = $ecommImages | Where-Object {
            $baseName = [System.IO.Path]::GetFileNameWithoutExtension($_)
            $suffix = $baseName.Substring($sku.Length)
            $suffix -ne "D" -and $suffix -ne "U"
        }
    }
    
    # Determine final detail image
    $detailImage = $null
    $hasEcommDetail = $false
    if ($ecommDetailImage) {
        $detailImage = "/images/$sku-ecommerce-$ecommDetailImage"
        $hasEcommDetail = $true
    } elseif ($preshootDetailImages.Count -gt 0 -and -not $ecommProducts.ContainsKey($sku)) {
        # Use preshooting detail only if no ecommerce images exist
        $detailImage = "/images/$sku-preshooting-$($preshootDetailImages[0])"
    }
    
    # Copy preshooting images (non-detail)
    $preshootPaths = @()
    foreach ($img in $preshootImages) {
        $destName = "$sku-preshooting-$img"
        $srcPath = Join-Path (Join-Path $preshootingRoot "$sku\preshooting") $img
        $destPath = Join-Path $publicImages $destName
        Copy-Item $srcPath $destPath -Force
        $preshootPaths += "/images/$destName"
        $copiedCount++
    }
    # Copy preshooting detail images ONLY if no ecommerce detail exists
    if (-not $hasEcommDetail -and $preshootDetailImages.Count -gt 0 -and -not $ecommProducts.ContainsKey($sku)) {
        foreach ($img in $preshootDetailImages) {
            $destName = "$sku-preshooting-$img"
            $srcPath = Join-Path (Join-Path $preshootingRoot "$sku\preshooting") $img
            $destPath = Join-Path $publicImages $destName
            Copy-Item $srcPath $destPath -Force
            # Don't add to preshootPaths - it will be the detailImage only
            $copiedCount++
        }
    }
    
    # Copy ecomm images
    $ecommPaths = @()
    foreach ($img in $ecommImages) {
        $destName = "$sku-ecommerce-$img"
        $srcPath = Join-Path (Join-Path $ecommRoot "$sku\ecommerce") $img
        $destPath = Join-Path $publicImages $destName
        Copy-Item $srcPath $destPath -Force
        $ecommPaths += "/images/$destName"
        $copiedCount++
    }
    
    # Copy detail image
    $detailPath = $null
    if ($ecommDetailImage) {
        $destName = "$sku-ecommerce-$ecommDetailImage"
        $srcPath = Join-Path (Join-Path $ecommRoot "$sku\ecommerce") $ecommDetailImage
        $destPath = Join-Path $publicImages $destName
        Copy-Item $srcPath $destPath -Force
        $detailPath = "/images/$destName"
        $copiedCount++
    } elseif ($preshootDetailImages.Count -gt 0 -and -not $ecommProducts.ContainsKey($sku)) {
        $destName = "$sku-preshooting-$($preshootDetailImages[0])"
        $detailPath = "/images/$destName"
        # Already copied above
    }
    
    $products += [PSCustomObject]@{
        Sku = $sku
        Description = $description
        ColorDesc = $colorDesc
        Sizes = $sizes
        PreshootPaths = $preshootPaths
        EcommPaths = $ecommPaths
        DetailPath = $detailPath
    }
}

Write-Host "  Copied $copiedCount images" -ForegroundColor Green

# 8. Generate products.ts
Write-Host "Generating products.ts..." -ForegroundColor Yellow

# Sentence case function: "ABITO LUNGO" -> "Abito lungo"
function ToSentenceCase($str) {
    if ([string]::IsNullOrEmpty($str)) { return "" }
    return $str.Substring(0,1).ToUpper() + $str.Substring(1).ToLower()
}

$tsContent = @"
export interface Product {
  sku: string;
  description: string;
  colorDesc: string;
  sizes: string[];
  preshootImages: string[];
  ecommImages: string[];
  detailImage: string | null;
}

export const products: Product[] = [
"@

foreach ($p in ($products | Sort-Object Sku -Descending)) {
    $sizesStr = ($p.Sizes | ForEach-Object { "`"$_`"" }) -join ", "
    $preshootStr = ($p.PreshootPaths | ForEach-Object { "`"$_`"" }) -join ", "
    $ecommStr = ($p.EcommPaths | ForEach-Object { "`"$_`"" }) -join ", "
    $detailStr = if ($p.DetailPath) { "`"$($p.DetailPath)`"" } else { "null" }
    $descSentence = ToSentenceCase $p.Description
    $colorSentence = ToSentenceCase $p.ColorDesc
    $descEscaped = $descSentence -replace '"', '\"'
    $colorEscaped = $colorSentence -replace '"', '\"'
    
    $tsContent += @"

  {
    sku: "$($p.Sku)",
    description: "$descEscaped",
    colorDesc: "$colorEscaped",
    sizes: [$sizesStr],
    preshootImages: [$preshootStr],
    ecommImages: [$ecommStr],
    detailImage: $detailStr,
  },
"@
}

$tsContent += @"

];

// Get all image paths for a product: preshooting first, then ecommerce, then detail
export function getAllImagePaths(product: Product): string[] {
  const paths: string[] = [...product.preshootImages, ...product.ecommImages];
  if (product.detailImage) {
    paths.push(product.detailImage);
  }
  return paths;
}

// Get thumbnail for grid view
export function getThumbnailPath(product: Product): string {
  if (product.detailImage) {
    return product.detailImage;
  }
  if (product.preshootImages.length > 0) {
    return product.preshootImages[0];
  }
  if (product.ecommImages.length > 0) {
    return product.ecommImages[0];
  }
  return "";
}
"@

Set-Content -Path $outputTs -Value $tsContent -Encoding UTF8
Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Products: $($products.Count)"
Write-Host "Images copied: $copiedCount"
Write-Host "Output: $outputTs"
