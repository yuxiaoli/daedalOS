@echo off
setlocal

REM Read GH_TOKEN from .env
for /f "usebackq tokens=1* delims==" %%a in ("c:\workspace\html\daedalOS\.env") do (
    if "%%a"=="GH_TOKEN" set GH_TOKEN=%%b
)

if "%GH_TOKEN%"=="" (
    echo GH_TOKEN not found!
    exit /b 1
)

echo GH_TOKEN loaded.

REM Authenticate GH CLI
echo %GH_TOKEN% | gh auth login --with-token
call gh auth setup-git

REM Set NODE_OPTIONS for legacy openssl support (needed for some dependencies)
set NODE_OPTIONS=--openssl-legacy-provider

REM Build the project
echo Building project...
call yarn build
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)

REM Get remote URL
for /f "tokens=*" %%a in ('git config --get remote.origin.url') do set REMOTE_URL=%%a

REM Deploy to GitHub Pages
echo Deploying to GitHub Pages...
cd out

REM Add .nojekyll file to bypass Jekyll processing (required for _next directory)
type nul > .nojekyll

git init
git checkout -b gh-pages
git add .
git config user.name "GitHub Actions"
git config user.email "actions@github.com"
git commit -m "Deploy to GitHub Pages"
git remote add origin %REMOTE_URL%
git push --force origin gh-pages
cd ..

if %errorlevel% neq 0 (
    echo Deployment failed!
    exit /b %errorlevel%
)

echo Deployment successful!
endlocal
