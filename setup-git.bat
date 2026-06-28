@echo off
REM AutoCanva one-time Git + GitHub bootstrap. Double-click to run.
setlocal

cd /d "%~dp0"

if not exist .git (
  echo Initializing local git repository...
  git init -q
  git branch -M main
)

echo Staging files...
git add -A
git commit -q -m "Initial commit: AutoCanva scaffold, plan, and docs" 2>nul

echo.
echo Your repo is committed locally.
echo.
set /p rem="Create a GitHub repo and push now? (y/n): "
if /i not "%rem%"=="y" goto :done

set /p repo="Repo name (default: autocanva): "
if "%repo%"=="" set repo=autocanva

set /p priv="Private? (y/n, default n): "
set visibility=--public
if /i "%priv%"=="y" set visibility=--private

echo Creating GitHub repo %repo%...
gh repo create "%repo%" %visibility% --source=. --remote=origin --push

:done
echo.
echo Done. You can close this window.
pause
endlocal