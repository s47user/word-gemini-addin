# Registers the folder as a Trusted Catalog in Word's registry using the required UNC path
$ErrorActionPreference = "Stop"

$computerName = $env:COMPUTERNAME
$uncPath = "\\$computerName\C$\Users\LENOVO\OfficeAddins"
$catalogGuid = "{d24f7e1b-9e4a-4a25-8664-9b8849cfa320}"
$catalogKey = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\$catalogGuid"
$localFolder = "C:\Users\LENOVO\OfficeAddins"
$manifestSrc = "C:\Users\LENOVO\.gemini\antigravity\scratch\word-gemini-addin\manifest.xml"

if (-not (Test-Path $localFolder)) {
    New-Item -ItemType Directory -Path $localFolder -Force | Out-Null
}

Copy-Item $manifestSrc -Destination (Join-Path $localFolder "manifest.xml") -Force

if (-not (Test-Path $catalogKey)) {
    New-Item -Path $catalogKey -Force | Out-Null
}

Set-ItemProperty -Path $catalogKey -Name "Id" -Value $catalogGuid -Force
Set-ItemProperty -Path $catalogKey -Name "Url" -Value $uncPath -Force
Set-ItemProperty -Path $catalogKey -Name "Flags" -Value 1 -Type DWord -Force

Write-Host "[SUCCESS] Registered Office Trusted Catalog in Registry with UNC path: $uncPath" -ForegroundColor Green
Get-ItemProperty -Path $catalogKey
