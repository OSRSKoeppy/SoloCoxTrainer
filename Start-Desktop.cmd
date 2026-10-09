@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (start "" "http://localhost:3103" & node server.mjs & pause & exit /b)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (start "" "http://localhost:3103" & "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs & pause & exit /b)
echo Node.js was not found. Open Olm-3D-Offline.html instead, or install Node.js.
pause

