@echo off
setlocal

REM Double-click to start the game server (Windows).
REM A terminal window will stay open; press Ctrl+C to stop.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but was not found on PATH.
  echo Install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)

node scripts/start.mjs --open

