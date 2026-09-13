# Genomic Research Copilot PowerShell Launcher
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "          Starting Genomic Research Copilot (v2.4 Preclinical)" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/3] Starting FastAPI Computational Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\backend'; python -m uvicorn main:app --port 8000 --host 127.0.0.1 --reload"

Write-Host "[2/3] Starting Vite React Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npm run dev"

Write-Host "[3/3] Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Opening web browser at http://localhost:5173 ..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`n==============================================================================" -ForegroundColor Cyan
Write-Host "  Genomic Research Copilot is now running!" -ForegroundColor Green
Write-Host "  - Backend:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Cyan
