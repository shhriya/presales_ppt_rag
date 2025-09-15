@echo off
echo Setting up PPT Bot Database...
echo.
echo Make sure you have activated your virtual environment first:
echo .venv\Scripts\activate
echo.
echo Running database setup...
.venv\Scripts\python.exe setup_database.py
pause
