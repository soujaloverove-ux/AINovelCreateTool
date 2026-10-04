@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows-runtime.ps1" -Mode Start
if errorlevel 1 (
  echo.
  echo QoderNovel could not start. Check the error above and the logs directory.
  pause
  exit /b 1
)
exit /b %errorlevel%
