#!/usr/bin/env pwsh
# start.ps1 — One-command startup script for Genomic Research Copilot
# Usage: .\start.ps1
# Or run backend only: .\start.ps1 -BackendOnly
# Or run frontend only: .\start.ps1 -FrontendOnly

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Genomic Research Copilot — Production Startup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Check .env exists
if (-not (Test-Path "backend/.env")) {
    Write-Host "[SETUP] Creating backend/.env from .env.example..." -ForegroundColor Yellow
    Copy-Item "backend/.env.example" "backend/.env"
    Write-Host "[SETUP] Edit backend/.env if you need to change any settings." -ForegroundColor Yellow
}

if (-not $FrontendOnly) {
    Write-Host "`n[BACKEND] Installing Python dependencies..." -ForegroundColor Green
    pip install -r backend/requirements.txt -q

    Write-Host "[BACKEND] Running syntax check on all modules..." -ForegroundColor Green
    python -c "
import ast, sys, os
errors = []
for root, dirs, files in os.walk('backend'):
    dirs[:] = [d for d in dirs if d not in ['.venv', '__pycache__', '.pytest_cache']]
    for f in files:
        if f.endswith('.py') and 'test_' not in f:
            path = os.path.join(root, f)
            try:
                ast.parse(open(path, encoding='utf-8').read())
            except SyntaxError as e:
                errors.append(f'{path}:{e.lineno}: {e.msg}')
if errors:
    print('SYNTAX ERRORS:')
    for e in errors: print(' ', e)
    sys.exit(1)
else:
    print('All modules: OK')
"
    if ($LASTEXITCODE -ne 0) { Write-Error "Syntax errors found — fix before starting."; exit 1 }

    Write-Host "[BACKEND] Starting FastAPI server on http://localhost:8000..." -ForegroundColor Green
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD\backend
        python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    }
    Write-Host "[BACKEND] PID: $($backendJob.Id)" -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

if (-not $BackendOnly) {
    Write-Host "`n[FRONTEND] Installing Node dependencies..." -ForegroundColor Green
    Set-Location frontend
    npm install --silent
    Write-Host "[FRONTEND] Starting Vite dev server on http://localhost:5173..." -ForegroundColor Green
    Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"
    Set-Location ..
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " App is running!" -ForegroundColor Green
Write-Host "   Backend API:  http://localhost:8000" -ForegroundColor White
Write-Host "   Frontend UI:  http://localhost:5173" -ForegroundColor White
Write-Host "   API Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

if (-not $FrontendOnly) {
    Write-Host "`nPress Ctrl+C to stop backend..." -ForegroundColor Gray
    Wait-Job $backendJob
}
