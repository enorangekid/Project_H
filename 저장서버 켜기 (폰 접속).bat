@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Project_H save server - phone access (same Wi-Fi). Close this window to stop.
node tools/server.js --open --lan
pause
