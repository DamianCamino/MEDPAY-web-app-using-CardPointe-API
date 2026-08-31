# Start Vital Pay backend (opens new window) + instructions for ngrok
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"

Write-Host "Starting Vital Pay backend on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; npm run dev"

Start-Sleep -Seconds 2

try {
  $health = Invoke-RestMethod "http://localhost:3000/health" -TimeoutSec 5
  Write-Host "Backend OK: $($health.status) ($($health.cardpointeEnv))" -ForegroundColor Green
} catch {
  Write-Host "Backend not ready yet — check the new terminal window" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. In another terminal: .\scripts\start-ngrok.ps1"
Write-Host "  2. Set PUBLIC_BASE_URL in infrastructure/.env"
Write-Host "  3. Follow docs/vitalpay-marketplace-setup.md"
Write-Host ""
Write-Host "Local URLs:"
Write-Host "  http://localhost:3000/checkout"
Write-Host "  http://localhost:3000/ghl/manage?locationId=YOUR_ID"
Write-Host "  http://localhost:3000/ghl/setup"
