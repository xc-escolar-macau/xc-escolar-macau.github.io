@echo off
rem One-time setup on a new computer: installs Pillow + rapidocr (bib scanning) for photo_prep
chcp 65001 >nul
where python >nul 2>nul
if errorlevel 1 (
  echo 未安裝 Python：請先到 https://www.python.org/downloads/ 安裝（安裝時勾選 Add python.exe to PATH），再執行本檔。
  pause
  exit /b 1
)
python -m pip install --user --upgrade pillow rapidocr
if errorlevel 1 (
  echo 安裝失敗：請檢查網絡後再試。
  pause
  exit /b 1
)
echo 下載號碼布偵測模型（約 5MB，只需一次）……
python -P -X utf8 -c "import sys; sys.path.insert(0, r'%~dp0.'); import photo_prep as p; p.ocr_engine(); print('完成：可以把相片資料夾拖到 photo_prep.bat 上')"
pause
