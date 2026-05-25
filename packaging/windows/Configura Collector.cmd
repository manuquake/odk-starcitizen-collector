@echo off
setlocal
cd /d "%~dp0"
title ODK Star Citizen Collector - Configurazione

set "NODE_EXE=%~dp0runtime\node.exe"
if not exist "%NODE_EXE%" (
  set "NODE_EXE=node"
)

echo.
echo ODK Star Citizen Collector - Configurazione
echo.
echo Verranno richiesti:
echo - Server URL
echo - Collector token
echo - Client ID
echo - Label macchina
echo.
echo Prima di salvare la config si aprira una finestra per scegliere
echo la cartella di Star Citizen, di solito ...\StarCitizen\LIVE.
echo.
echo Consiglio: usa il JSON generato dalla pagina Entity Live.
echo.

set "SELECTED_LOG_PATH="
if exist "%~dp0Seleziona GameLog.ps1" (
  for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Seleziona GameLog.ps1"`) do set "SELECTED_LOG_PATH=%%I"
)

if defined SELECTED_LOG_PATH (
  echo Game.log selezionato: %SELECTED_LOG_PATH%
  echo.
  "%NODE_EXE%" "%~dp0app\cli.js" init --server-url https://app.odkclan.it --log-path "%SELECTED_LOG_PATH%"
) else (
  echo Selezione Game.log saltata: verra usato il percorso automatico del collector.
  echo.
  "%NODE_EXE%" "%~dp0app\cli.js" init --server-url https://app.odkclan.it
)
set "EXITCODE=%ERRORLEVEL%"

echo.
if not "%EXITCODE%"=="0" (
  echo Configurazione terminata con codice %EXITCODE%.
) else (
  echo Configurazione completata.
)
echo Premere un tasto per continuare . . .
pause >nul
exit /b %EXITCODE%
