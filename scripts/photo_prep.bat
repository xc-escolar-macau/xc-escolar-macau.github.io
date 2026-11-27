@echo off
rem Drag a photo folder onto this file (output: <folder>_上載)
chcp 65001 >nul
if "%~1"=="" (
  echo 請把相片資料夾拖到 photo_prep.bat 上。
  pause
  exit /b 1
)
python -P -X utf8 "%~dp0photo_prep.py" %*
pause
