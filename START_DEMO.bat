@echo off
cd /d "%~dp0"
start "SAP Demo Server" cmd /c "python -m http.server 4173"
timeout /t 1 /nobreak >nul
start "" http://127.0.0.1:4173
