@echo off
setlocal
cd /d "%~dp0"
set NODE_OPTIONS=--dns-result-order=ipv4first

if not exist node_modules (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Capturing the full Director Mode sequence without video...
echo This does NOT require the Playwright FFmpeg package.
call npm run screenshots
if errorlevel 1 (
  echo.
  echo Screenshot capture failed.
  echo If the message says the Chromium executable is missing, run:
  echo     npx playwright install chromium
  pause
  exit /b 1
)

echo.
echo Finished. Check the output folder.
pause
