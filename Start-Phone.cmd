@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (node server.mjs --lan & pause & exit /b)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ("%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs --lan & pause & exit /b)
echo Node.js was not found. Install Node.js or open Olm-3D-Offline.html on your phone.
pause

