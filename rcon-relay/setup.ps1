# RCON Relay - Windows one-shot setup
# Usage:  Right-click this file -> "Run with PowerShell"
#         (or in an admin PowerShell:  .\setup.ps1)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "==> RCON Relay setup" -ForegroundColor Cyan

# 1. Check Node
try {
    $nodeVersion = node -v
    Write-Host "Node detected: $nodeVersion"
} catch {
    Write-Host "Node.js is not installed. Install Node 22 LTS or newer from https://nodejs.org and re-run." -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit 1
}

$major = [int]($nodeVersion.TrimStart('v').Split('.')[0])
if ($major -lt 22) {
    Write-Host "Need Node 22+ (you have $nodeVersion). Upgrade from https://nodejs.org." -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit 1
}

# 2. Create .env if missing
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "==> Creating .env (your GTX RCON details)" -ForegroundColor Cyan
    $host_   = Read-Host "HLL RCON host/IP (from GTX panel)"
    $port    = Read-Host "HLL RCON port (default 27015)"
    if ([string]::IsNullOrWhiteSpace($port)) { $port = "27015" }
    $pass    = Read-Host "HLL RCON password (from GTX panel)"

    # Generate a long random relay token
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $token = [Convert]::ToBase64String($bytes) -replace '[^a-zA-Z0-9]',''

    @"
HLL_RCON_HOST=$host_
HLL_RCON_PORT=$port
HLL_RCON_PASSWORD=$pass
RELAY_TOKEN=$token
DATABASE_PATH=./relay.db
PORT=8080
"@ | Set-Content -Path ".env" -Encoding UTF8

    Write-Host ""
    Write-Host "==> .env written." -ForegroundColor Green
    Write-Host ""
    Write-Host "RELAY TOKEN (save this - you need it on the website as RCON_RELAY_TOKEN):" -ForegroundColor Yellow
    Write-Host $token -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ".env already exists - skipping." -ForegroundColor Yellow
}

# 3. Install deps
Write-Host "==> Running npm install" -ForegroundColor Cyan
npm install

# 4. Start
Write-Host ""
Write-Host "==> Starting relay on http://localhost:8080" -ForegroundColor Green
Write-Host "    Press Ctrl+C to stop."
Write-Host ""
node --env-file=.env server.js
