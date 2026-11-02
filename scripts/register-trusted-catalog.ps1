# Registers the folder as a Trusted Catalog in Word's registry
$ErrorActionPreference = "Stop"

$catalogGuid = "{d24f7e1b-9e4a-4a25-8664-9b8849cfa320}"
$catalogKey = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\$catalogGuid"
$folder = "C:\Users\LENOVO\OfficeAddins"
$manifestSrc = "C:\Users\LENOVO\.gemini\antigravity\scratch\word-gemini-addin\manifest.xml"

if (-not (Test-Path $folder)) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

Copy-Item $manifestSrc -Destination (Join-Path $folder "manifest.xml") -Force

if (-not (Test-Path $catalogKey)) {
    New-Item -Path $catalogKey -Force | Out-Null
}

Set-ItemProperty -Path $catalogKey -Name "Id" -Value $catalogGuid -Force
Set-ItemProperty -Path $catalogKey -Name "Url" -Value $folder -Force
Set-ItemProperty -Path $catalogKey -Name "Flags" -Value 1 -Type DWord -Force

Write-Host "[SUCCESS] Registered Office Trusted Catalog in Registry:" -ForegroundColor Green
Get-ItemProperty -Path $catalogKey
