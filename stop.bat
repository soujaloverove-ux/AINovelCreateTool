@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows-runtime.ps1" -Mode Stop
if errorlevel 1 (
  echo.
  echo Some QoderNovel services could not be stopped. Review the error above.
  pause
  exit /b 1
)
exit /b %errorlevel%
