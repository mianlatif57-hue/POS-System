@echo off
REM ============================================================
REM Backend Startup Script for TechShop POS
REM ============================================================
REM This script starts the FastAPI backend with mock data enabled
REM for development without a SQL Server database.

echo.
echo ====================================================
echo  TechShop POS Backend (Mock Mode)
echo ====================================================
echo.

REM Check if venv exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo WARNING: Virtual environment not found!
    echo Create it with: py -m venv venv
    echo Then install dependencies with: pip install -r requirements.txt
    echo.
)

REM Set mock mode and start server
echo Starting FastAPI server with mock data...
echo API Docs: http://localhost:8000/docs
echo.

set USE_MOCK=1
py -m uvicorn main:app --reload --port 8000

pause
