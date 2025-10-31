@echo off
echo Killing all Node.js processes...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM npm.exe /F >nul 2>&1

echo Killing common ports...
npx kill-port 5000 >nul 2>&1
npx kill-port 5001 >nul 2>&1  
npx kill-port 5050 >nul 2>&1
npx kill-port 3000 >nul 2>&1

echo Waiting for cleanup...
timeout /t 3 >nul

echo Starting server...
npm run dev

pause