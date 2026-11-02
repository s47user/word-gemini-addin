# Imports the Office Add-in CA certificate into the current user's Trusted Root store
$ErrorActionPreference = "Stop"

$caPath = Join-Path $env:USERPROFILE ".office-addin-dev-certs\ca.crt"

if (Test-Path $caPath) {
    Write-Host "[*] Importing CA certificate from: $caPath" -ForegroundColor Cyan
    $cert = Import-Certificate -FilePath $caPath -CertStoreLocation "cert:\CurrentUser\Root"
    Write-Host "[SUCCESS] CA Certificate trusted: $($cert.Thumbprint) - $($cert.Subject)" -ForegroundColor Green
} else {
    Write-Warning "CA certificate not found at: $caPath"
}
