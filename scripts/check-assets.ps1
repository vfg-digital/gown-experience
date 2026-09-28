# Verifica che gli asset critici esistano su disco E siano tracciati in git
# (OneDrive li cancella; se non sono tracciati non arrivano su Vercel)
$ErrorActionPreference = "Continue"

$critical = @(
    "public/images/Test_BG_Menu.jpg",
    "public/Img_Valentino_Gowns_Whatsapp.jpg",
    "public/fonts/DINPro-Medium.ttf",
    "public/video/loop.mp4",
    "public/video/intro.mp4",
    "public/logo-valentino.svg",
    "public/valentino-reverie.svg",
    "public/star-outline.svg",
    "public/star-filled.svg"
)

$problems = 0
foreach ($f in $critical) {
    $onDisk = Test-Path $f
    $tracked = [bool](git ls-files $f)
    $status = if ($onDisk -and $tracked) { "OK" } else { "PROBLEMA"; }
    $color = if ($onDisk -and $tracked) { "Green" } else { "Red" }
    if (-not ($onDisk -and $tracked)) { $problems++ }
    Write-Host ("  {0,-9} disk={1,-5} git={2,-5}  {3}" -f $status, $onDisk, $tracked, $f) -ForegroundColor $color
}

Write-Host ""
if ($problems -eq 0) {
    Write-Host "Tutti gli asset critici sono presenti e tracciati." -ForegroundColor Green
} else {
    Write-Host "$problems asset con problemi: ricopiali dalla cartella sorgente e fai 'git add'." -ForegroundColor Red
}
