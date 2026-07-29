@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 20 or newer from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm enabled.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting AIPowerTest...
call npm run dev -- --open
if errorlevel 1 (
  echo AIPowerTest stopped with an error.
  pause
  exit /b 1
)
