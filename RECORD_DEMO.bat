@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo ============================================================
echo SAP Material Master Automation Demo - Recording Setup
echo ============================================================
echo.

set PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=180000
set NODE_OPTIONS=--dns-result-order=ipv4first

if not exist node_modules (
  echo [1/4] Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm dependencies could not be installed.
    echo Check your internet connection and run this file again.
    pause
    exit /b 1
  )
) else (
  echo [1/4] Project dependencies already installed.
)

echo.
echo [2/4] Ensuring Playwright FFmpeg is installed...
set /a TRY=1
:ffmpeg_retry
call npx playwright install ffmpeg
if not errorlevel 1 goto ffmpeg_ok
if !TRY! GEQ 4 goto ffmpeg_failed
echo.
echo FFmpeg download attempt !TRY! failed. Retrying in 5 seconds...
timeout /t 5 /nobreak >nul
set /a TRY+=1
goto ffmpeg_retry

:ffmpeg_failed
echo.
echo ============================================================
echo FFmpeg could not be downloaded after 4 attempts.
echo The Chromium browser may already be installed and the demo itself

echo still works. You can test the automatic sequence and screenshots with:
echo.
echo     RECORD_SCREENSHOTS_ONLY.bat

echo.
echo This is usually a temporary network/DNS timeout, not a problem with

echo the demo. You can run RECORD_DEMO.bat again later.
echo ============================================================
pause
exit /b 1

:ffmpeg_ok
echo FFmpeg is ready.

echo.
echo [3/4] Ensuring Playwright Chromium is installed...
call npx playwright install chromium
if errorlevel 1 (
  echo.
  echo ERROR: Chromium installation/check did not complete.
  echo If Chromium was already downloaded, try RECORD_SCREENSHOTS_ONLY.bat.
  pause
  exit /b 1
)

echo.
echo [4/4] Recording the deterministic portfolio sequence...
call npm run record
if errorlevel 1 (
  echo.
  echo ERROR: Recording failed. See the message above for details.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo Finished successfully.
echo Video and screenshots are in the output folder.
echo ============================================================
pause
