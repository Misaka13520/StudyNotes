@echo off
chcp 65001 >nul
echo ============================
echo   StudyNotes 一键推送脚本
echo ============================
echo.

cd /d "%~dp0"

echo [1/3] 添加所有更改...
git add .
echo.

echo [2/3] 提交更改...
set /p msg="请输入提交说明 (直接回车则默认为 '更新笔记'): "
if "%msg%"=="" set msg=更新笔记
git commit -m "%msg%"
echo.

echo [3/3] 推送到 GitHub...
git push
echo.

echo ============================
echo   推送完成！
echo ============================
pause
