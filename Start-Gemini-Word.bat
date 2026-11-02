@echo off
title Gemini AI Word Assistant Launcher
color 0b

echo ========================================================
echo        Gemini AI Microsoft Word Assistant Launcher      
echo ========================================================
echo.

cd /d "C:\Users\LENOVO\.gemini\antigravity\scratch\word-gemini-addin"

echo [1/3] Verifying Office Developer Registry...
powershell -ExecutionPolicy Bypass -File "scripts\register-local-word.ps1" > nul 2>&1

echo [2/3] Starting Background Gemini HTTPS Server on port 3000...
start /B "" npm run dev

timeout /t 2 /nobreak > nul

echo [3/3] Launching Microsoft Word Desktop...
start "" "C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE"

echo.
echo [SUCCESS] Gemini Word Assistant is active!
echo Keep this window open while using Word, or minimize it.
echo Press any key when you want to stop the background server...
pause > nul

taskkill /F /IM node.exe > nul 2>&1
echo Background server stopped. Goodbye!
