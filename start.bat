@echo off
title Genomic Research Copilot Launcher
echo ==============================================================================
echo           Starting Genomic Research Copilot (v2.4 Preclinical)
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting FastAPI Computational Backend on http://127.0.0.1:8000 ...
start "Genomic Copilot - FastAPI Backend (:8000)" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --port 8000 --host 127.0.0.1 --reload"

echo [2/3] Starting Vite React Frontend on http://localhost:5173 ...
start "Genomic Copilot - Vite Frontend (:5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening web browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ==============================================================================
echo   Genomic Research Copilot is now running!
echo   - Backend:  http://127.0.0.1:8000
echo   - Frontend: http://localhost:5173
echo.
echo   Keep the opened command windows running while using the application.
echo   Press any key to close this launcher window.
echo ==============================================================================
pause
