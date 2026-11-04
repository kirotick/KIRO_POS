@echo off
REM Pushes this folder to YOUR GitHub repository. Double-click this file.
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Get it from https://git-scm.com/downloads then double-click this again.
  pause
  exit /b 1
)
echo 1^) On GitHub click New repository, give it a name, leave "Add a README" UNticked, click Create.
echo 2^) Copy the address it shows, like https://github.com/yourname/kiro-platform.git
set /p URL=Paste the repository address here: 
echo %URL% | findstr /b /c:"https://github.com/" >nul
if errorlevel 1 (
  echo That does not look like a GitHub address. Nothing was changed.
  pause
  exit /b 1
)
if not exist .git git init -b main
git add -A
git diff --cached --quiet || git commit -m "KIRO platform"
git branch -M main
git remote remove origin >nul 2>nul
git remote add origin %URL%
echo Pushing... GitHub may ask you to sign in. If it asks for a password, paste a personal access token.
git push -u origin main
echo Done. Open %URL% in your browser.
pause
