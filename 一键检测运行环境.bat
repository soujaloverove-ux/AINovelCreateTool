@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows-runtime.ps1" -Mode Bootstrap
if errorlevel 1 (
  echo.
  echo QoderNovel environment setup failed. Review the error above, then run this file again.
  pause
  exit /b 1
)
exit /b %errorlevel%
