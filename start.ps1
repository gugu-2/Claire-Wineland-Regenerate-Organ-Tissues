param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Genomic Research Copilot - Production Startup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not (Test-Path "backend\.env")) {
    Write-Host "[SETUP] Creating backend\.env from .env.example..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
}

if (-not $FrontendOnly) {
    Write-Host "[BACKEND] Installing Python dependencies..." -ForegroundColor Green
    pip install -r backend\requirements.txt -q
    
    Write-Host "[BACKEND] Starting FastAPI server on http://localhost:8000..." -ForegroundColor Green
    Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory "$PWD\backend"
}

if (-not $BackendOnly) {
    Write-Host "[FRONTEND] Installing Node dependencies..." -ForegroundColor Green
    Set-Location frontend
    npm install --silent
    Write-Host "[FRONTEND] Starting Vite dev server on http://localhost:5173..." -ForegroundColor Green
    Start-Process -NoNewWindow -FilePath "npm.cmd" -ArgumentList "run dev"
    Set-Location ..
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " App is running!" -ForegroundColor Green
Write-Host "   Backend API:  http://localhost:8000" -ForegroundColor White
Write-Host "   Frontend UI:  http://localhost:5173" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
