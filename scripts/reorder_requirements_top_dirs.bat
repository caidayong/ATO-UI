@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [bat] cwd=%CD%
echo [bat] try py -3.10 ...
py -3.10 "%~dp0reorder_requirements_top_dirs.py"
if errorlevel 1 (
  echo [bat] try py -3.11 ...
  py -3.11 "%~dp0reorder_requirements_top_dirs.py"
)
if errorlevel 1 (
  echo [bat] try python ...
  python "%~dp0reorder_requirements_top_dirs.py"
)
if errorlevel 1 (
  echo [bat] try python3.10 ...
  python3.10 "%~dp0reorder_requirements_top_dirs.py"
)
echo.
echo ----- log: scripts\reorder_requirements_last_run.log -----
type "%~dp0reorder_requirements_last_run.log" 2>nul
echo ----- end log -----
exit /b %ERRORLEVEL%
