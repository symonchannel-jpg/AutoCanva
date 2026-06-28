@echo off
cd /d "%~dp0"
if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
)
start "" /B npm start
exit
