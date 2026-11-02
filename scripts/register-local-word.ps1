# Registers the Gemini Add-in manifest directly into Microsoft Word's Developer WEF registry
$ErrorActionPreference = "Stop"

$keyPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"
$manifestPath = "C:\Users\LENOVO\.gemini\antigravity\scratch\word-gemini-addin\manifest.xml"
$addinId = "d24f7e1b-9e4a-4a25-8664-9b8849cfa320"

if (-not (Test-Path $keyPath)) {
    New-Item -Path $keyPath -Force | Out-Null
    Write-Host "[+] Created registry key: $keyPath" -ForegroundColor Green
} else {
    Write-Host "[*] Registry key already exists: $keyPath" -ForegroundColor Cyan
}

# Set the manifest path in the registry
Set-ItemProperty -Path $keyPath -Name $addinId -Value $manifestPath -Force
Write-Host "[SUCCESS] Registered Gemini Add-in ($addinId) -> $manifestPath" -ForegroundColor Green
Write-Host "`nCurrent Developer Add-ins in Word:" -ForegroundColor Yellow
Get-ItemProperty -Path $keyPath
