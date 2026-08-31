# Expose Vital Pay backend via ngrok (default port 3000)
param(
  [int]$Port = 3000
)

$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
  $wingetNgrok = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
  if (Test-Path $wingetNgrok) { $ngrok = Get-Item $wingetNgrok }
}
if (-not $ngrok) {
  Write-Host "ngrok not found. Install with:" -ForegroundColor Yellow
  Write-Host "  winget install ngrok.ngrok"
  Write-Host "  https://ngrok.com/download"
  Write-Host ""
  Write-Host "Then add your authtoken:"
  Write-Host "  ngrok config add-authtoken YOUR_TOKEN"
  exit 1
}

Write-Host "Starting ngrok tunnel -> http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Copy the https URL into infrastructure/.env as PUBLIC_BASE_URL"
Write-Host "See docs/vitalpay-marketplace-setup.md for full checklist"
Write-Host ""

& $ngrok.Source http $Port
