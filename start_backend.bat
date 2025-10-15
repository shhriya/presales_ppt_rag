@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

echo Starting PPT Bot Backend Server...

if not exist .venv\Scripts\python.exe (
  echo ❌ .venv not found. Create it and install deps:
  echo     python -m venv .venv
  echo     .venv\Scripts\python.exe -m pip install -r backend\requirements.txt
  pause
  exit /b 1
)

REM Load backend\.env if present
set ENV_FILE=backend\.env
if exist %ENV_FILE% (
  echo Loading environment from %ENV_FILE%
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    set KEY=%%A
    set VAL=%%B
    if not "!KEY:~0,1!"=="#" if not "!KEY!"=="" set "!KEY!=!VAL!"
  )
)

REM Ensure deps
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

echo Starting server on http://127.0.0.1:8000 ...
.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000 --host 127.0.0.1
pause
