@echo off
chcp 65001 >nul
title C-Learning-Lab
cd /d "%~dp0"

echo ============================================
echo   C-Learning-Lab 翁恺C语言刷题系统
echo ============================================
echo.

REM 等待 2 秒后自动打开浏览器
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

REM 使用 pnpm.cmd 启动(避免 PowerShell 执行策略禁止 pnpm.ps1)
call pnpm.cmd dev

echo.
echo 服务器已停止。按任意键关闭窗口...
pause >nul
