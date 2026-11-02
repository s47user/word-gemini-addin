# PowerShell script to help sideload Gemini Add-in on Windows Microsoft Word Desktop

$rootDir = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $rootDir "manifest.xml"
$manifestDir = Join-Path $env:USERPROFILE "OfficeAddins"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Gemini AI Microsoft Word Add-in Sideload Helper       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $manifestDir)) {
    New-Item -ItemType Directory -Path $manifestDir -Force | Out-Null
    Write-Host "[+] Created local manifest catalog folder: $manifestDir" -ForegroundColor Green
}

Copy-Item -Path $manifestPath -Destination $manifestDir -Force
Write-Host "[+] Copied manifest.xml to: $manifestDir\manifest.xml" -ForegroundColor Green

Write-Host "`nTo activate in Microsoft Word Desktop on Windows:" -ForegroundColor Yellow
Write-Host "1. Share this folder on your PC:" -ForegroundColor White
Write-Host "   Right-click '$manifestDir' -> Properties -> Sharing -> Share... -> Add yourself with Read permission."
Write-Host "   Copy the network path (e.g. \\$env:COMPUTERNAME\OfficeAddins)."

Write-Host "`n2. Register in Word:" -ForegroundColor White
Write-Host "   Open Word -> File -> Options -> Trust Center -> Trust Center Settings..."
Write-Host "   Select 'Trusted Add-in Catalogs'."
Write-Host "   Catalog URL: \\$env:COMPUTERNAME\OfficeAddins -> Click 'Add catalog' -> Check 'Show in Menu' -> Click OK."
Write-Host "   Restart Microsoft Word."

Write-Host "`n3. Open the Add-in:" -ForegroundColor White
Write-Host "   Go to 'Insert' tab -> 'Add-ins' -> 'Shared Folder' -> Select 'Gemini AI Word Assistant'."
Write-Host "`nFor Word Online / Web (Mac/PC):" -ForegroundColor Yellow
Write-Host "   Open any document on office.com -> Insert -> Add-ins -> Manage My Add-ins -> Upload My Add-in -> Select '$manifestPath'."
Write-Host "==========================================================" -ForegroundColor Cyan
