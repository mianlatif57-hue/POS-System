@echo off
REM ============================================================
REM Complete Setup and Run Backend
REM ============================================================

cd /d "%~dp0"

echo.
echo ====================================================
echo  TechShop POS - Complete Setup & Run
echo ====================================================
echo.

REM Step 1: Create virtual environment if it doesn't exist
if not exist "venv\Scripts\python.exe" (
    echo [1/3] Creating virtual environment...
    py -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [1/3] Virtual environment created!
)

REM Step 2: Activate virtual environment and install dependencies
echo [2/3] Installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt > nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pip install -r requirements.txt
    pause
    exit /b 1
)
echo [2/3] Dependencies installed!

REM Step 3: Start the backend
echo [3/3] Starting backend...
echo.
set USE_MOCK=1
py -m uvicorn main:app --reload --port 8000

pause
