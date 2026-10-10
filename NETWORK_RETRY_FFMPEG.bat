@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=180000
set NODE_OPTIONS=--dns-result-order=ipv4first

echo Retrying only the small Playwright FFmpeg download...
set /a TRY=1
:retry
call npx playwright install ffmpeg
if not errorlevel 1 goto ok
if !TRY! GEQ 5 goto fail
echo Attempt !TRY! failed. Waiting 7 seconds...
timeout /t 7 /nobreak >nul
set /a TRY+=1
goto retry

:ok
echo.
echo FFmpeg installed successfully.
echo You can now run RECORD_DEMO.bat.
pause
exit /b 0

:fail
echo.
echo FFmpeg still could not be downloaded.
echo The error is network/DNS related. Try another connection or run this file later.
pause
exit /b 1
