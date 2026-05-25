@echo off
setlocal
cd /d "%~dp0"
title ODK Star Citizen Collector

set "NODE_EXE=%~dp0runtime\node.exe"
if not exist "%NODE_EXE%" (
  set "NODE_EXE=node"
)

echo.
echo ODK Star Citizen Collector
echo.
echo Per fermare il collector premi Ctrl+C in questa finestra.
echo.

"%NODE_EXE%" "%~dp0app\cli.js" run
set "EXITCODE=%ERRORLEVEL%"

echo.
echo Collector terminato con codice %EXITCODE%.
echo Premere un tasto per continuare . . .
pause >nul
exit /b %EXITCODE%
