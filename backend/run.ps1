# ============================================================
# Backend Startup Script for TechShop POS (PowerShell)
# ============================================================
# This script starts the FastAPI backend with mock data enabled
# for development without a SQL Server database.

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  TechShop POS Backend (Mock Mode)" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""

# Check if venv exists
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
} else {
    Write-Host "WARNING: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Create it with: py -m venv venv" -ForegroundColor Yellow
    Write-Host "Then install dependencies with: pip install -r requirements.txt" -ForegroundColor Yellow
    Write-Host ""
}

# Set mock mode and start server
Write-Host "Starting FastAPI server with mock data..." -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""

$env:USE_MOCK = "1"
py -m uvicorn main:app --reload --port 8000
