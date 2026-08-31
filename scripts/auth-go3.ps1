# Cobro Gateway API con token del Clover Go 3
# Uso: .\scripts\auth-go3.ps1 -Token "9418594164541111" -Expiry "1228" -Amount "100"

param(
    [Parameter(Mandatory = $true)]
    [string]$Token,

    [string]$Expiry = "1228",
    [string]$Amount = "100",
    [string]$MerchId = "800000050208",
    [string]$User = "testing",
    [string]$Password = "testing123"
)

if ($Token -match "X") {
    Write-Error "El token contiene 'X' — es el valor enmascarado de la app. Usa el token completo (Logcat o copiar desde la app)."
    exit 1
}

$body = @{
    merchid  = $MerchId
    account  = $Token
    expiry   = $Expiry
    amount   = $Amount
    currency = "USD"
    name     = "Go3 Lab Test"
    capture  = "y"
} | ConvertTo-Json -Compress

$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${User}:${Password}"))
$headers = @{
    Authorization = "Basic $auth"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod `
    -Uri "https://fts-uat.cardconnect.com/cardconnect/rest/auth" `
    -Method Put `
    -Headers $headers `
    -Body $body

$response | ConvertTo-Json -Depth 5
Write-Host ""
if ($response.respstat -eq "A") {
    Write-Host "APROBADO retref=$($response.retref) amount=`$$($response.amount)" -ForegroundColor Green
} else {
    Write-Host "RECHAZADO: $($response.resptext) (code $($response.respcode))" -ForegroundColor Red
}
