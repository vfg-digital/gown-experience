# Audit: riconciliazione CSV <-> products.ts <-> cartelle immagini
$ErrorActionPreference = "Stop"

$gownsRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$parentRoot = Split-Path -Parent $gownsRoot
$csvPath = Join-Path $parentRoot "WRTW GOWNS SOH @28.07 _ REWORK.csv"
$productsTs = Join-Path $gownsRoot "src\data\products.ts"
$preshootingRoot = Join-Path $parentRoot "Pre-shooting"
$ecommRoot = Join-Path $parentRoot "E-comm"

function Get-ContinuativeSku($s) {
    if ($s.Length -lt 3) { return $s }
    return $s[1] + $s.Substring(3)
}

# --- CSV ---
$csv = Import-Csv $csvPath -Delimiter ";"
$csvSkus = $csv | Select-Object -ExpandProperty "CONT SKU" | Sort-Object -Unique
Write-Host "CSV: righe=$($csv.Count)  CONT SKU unici=$($csvSkus.Count)" -ForegroundColor Cyan

# --- products.ts ---
$tsText = Get-Content $productsTs -Raw
$tsSkus = [regex]::Matches($tsText, 'sku:\s*"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
Write-Host "products.ts: entries=$($tsSkus.Count)" -ForegroundColor Cyan

# --- mappatura continuativo ---
$map = @{}
foreach ($s in $tsSkus) {
    $c = Get-ContinuativeSku $s
    if (-not $map.ContainsKey($c)) { $map[$c] = @() }
    $map[$c] += $s
}
Write-Host "products.ts: continuativi unici=$($map.Count)" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== DUPLICATI (stesso continuativo, piu stagionali) ===" -ForegroundColor Yellow
$dupCount = 0
foreach ($k in ($map.Keys | Sort-Object)) {
    if ($map[$k].Count -gt 1) {
        $dupCount++
        Write-Host "  $k  ->  $($map[$k] -join ', ')"
    }
}
if ($dupCount -eq 0) { Write-Host "  nessuno" }

Write-Host ""
Write-Host "=== IN products.ts MA NON NEL CSV (no match continuativo) ===" -ForegroundColor Yellow
$orphans = @()
foreach ($k in ($map.Keys | Sort-Object)) {
    if ($csvSkus -notcontains $k) {
        $orphans += $k
        Write-Host "  $k  (stagionale: $($map[$k] -join ', '))"
    }
}
if ($orphans.Count -eq 0) { Write-Host "  nessuno" }

Write-Host ""
Write-Host "=== NEL CSV MA NON IN products.ts (mancano immagini) ===" -ForegroundColor Yellow
$missing = @()
foreach ($c in $csvSkus) {
    if (-not $map.ContainsKey($c)) { $missing += $c }
}
foreach ($m in $missing) {
    $row = ($csv | Where-Object { $_."CONT SKU" -eq $m })[0]
    Write-Host ("  {0}  {1} / {2}" -f $m, $row.DESCRIZIONE, $row.'COLOR DESC')
}
if ($missing.Count -eq 0) { Write-Host "  nessuno" }

Write-Host ""
Write-Host "=== QUADRATURA ===" -ForegroundColor Green
Write-Host "  CSV unici                        : $($csvSkus.Count)"
Write-Host "  products.ts entries              : $($tsSkus.Count)"
Write-Host "  products.ts continuativi unici   : $($map.Count)"
Write-Host "  di cui NON nel CSV (orfani)      : $($orphans.Count)"
Write-Host "  matchati col CSV                 : $($map.Count - $orphans.Count)"
Write-Host "  CSV senza immagini (mancanti)    : $($missing.Count)"
Write-Host "  CHECK: $($map.Count - $orphans.Count) + $($missing.Count) = $(($map.Count - $orphans.Count) + $missing.Count) (deve fare $($csvSkus.Count))"
Write-Host "  Duplicati da rimuovere           : $($tsSkus.Count - $map.Count)"

# --- prodotti con campi vuoti ---
Write-Host ""
Write-Host "=== ENTRIES CON descrizione O colore VUOTI ===" -ForegroundColor Yellow
$blocks = [regex]::Matches($tsText, 'sku:\s*"([^"]+)",\s*\r?\n\s*description:\s*"([^"]*)",\s*\r?\n\s*colorDesc:\s*"([^"]*)"')
$empty = 0
foreach ($b in $blocks) {
    if ([string]::IsNullOrWhiteSpace($b.Groups[2].Value) -or [string]::IsNullOrWhiteSpace($b.Groups[3].Value)) {
        $empty++
        Write-Host "  $($b.Groups[1].Value)  desc='$($b.Groups[2].Value)' color='$($b.Groups[3].Value)'"
    }
}
Write-Host "  totale vuoti: $empty  (blocchi analizzati: $($blocks.Count))"

# --- cartelle ---
$preSkus = Get-ChildItem $preshootingRoot -Directory | Select-Object -ExpandProperty Name
$ecoSkus = Get-ChildItem $ecommRoot -Directory | Select-Object -ExpandProperty Name
$allFolder = ($preSkus + $ecoSkus) | Sort-Object -Unique
Write-Host ""
Write-Host "=== CARTELLE ===" -ForegroundColor Green
Write-Host "  Pre-shooting: $($preSkus.Count)   E-comm: $($ecoSkus.Count)   union: $($allFolder.Count)"
Write-Host "  solo Pre-shooting: $((($preSkus | Where-Object { $ecoSkus -notcontains $_ })).Count)"
Write-Host "  solo E-comm      : $((($ecoSkus | Where-Object { $preSkus -notcontains $_ })).Count)"
Write-Host "  entrambe         : $((($preSkus | Where-Object { $ecoSkus -contains $_ })).Count)"
