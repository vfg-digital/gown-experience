$ErrorActionPreference = "Stop"
$gownsRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$file = Join-Path $gownsRoot "src\data\products.ts"
$imgDir = Join-Path $gownsRoot "public\images"
$text = Get-Content $file -Raw

$referenced = [regex]::Matches($text, '"(/images/[^"]+)"') | ForEach-Object { $_.Groups[1].Value }

# asset non-prodotto da preservare sempre
$keepAssets = @("Test_BG_Menu.jpg","Test_BG_Menu_v2.jpg")

$removed = 0
Get-ChildItem $imgDir -Filter *.jpg | ForEach-Object {
    $rel = "/images/" + $_.Name
    if ($referenced -notcontains $rel -and $keepAssets -notcontains $_.Name) {
        Write-Host "  rimuovo: $($_.Name)"
        Remove-Item $_.FullName -Force
        $removed++
    }
}
Write-Host ""
Write-Host "Rimosse $removed immagini orfane" -ForegroundColor Green

# controllo asset critici che OneDrive tende a cancellare
Write-Host ""
Write-Host "=== ASSET CRITICI ===" -ForegroundColor Cyan
$critical = @(
    "public\images\Test_BG_Menu.jpg",
    "public\fonts\DINPro-Medium.ttf",
    "public\images\Img_BottegaDellArte_01.webp",
    "public\video\loop.mp4",
    "public\video\intro.mp4",
    "public\logo-valentino.svg",
    "public\valentino-reverie.svg",
    "public\star-outline.svg",
    "public\star-filled.svg"
)
foreach ($c in $critical) {
    $p = Join-Path $gownsRoot $c
    if (Test-Path $p) {
        $sz = [math]::Round((Get-Item $p).Length / 1KB, 1)
        Write-Host ("  OK      {0}  ({1} KB)" -f $c, $sz) -ForegroundColor Green
    } else {
        Write-Host ("  MANCA   {0}" -f $c) -ForegroundColor Red
    }
}
