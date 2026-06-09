@echo off
REM ============================================================
REM  PSP Cloud Streaming — Local PC Setup (Windows)
REM  Double-click this file to start!
REM ============================================================

title PSP Cloud Streaming - Local Setup
color 0B

echo.
echo  ========================================================
echo   PSP Cloud Streaming - Windows Local Setup
echo   YouTube HQ / CloudMedia / SpotiFlac
echo  ========================================================
echo.

REM ============================================================
REM Check Dependencies
REM ============================================================
echo [1/5] Checking dependencies...

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: Node.js is not installed!
    echo   Download it from: https://nodejs.org/
    echo   Install the LTS version, then run this script again.
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)
echo   - Node.js: OK

where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   WARNING: FFmpeg is not installed!
    echo   Download it from: https://www.gyan.dev/ffmpeg/builds/
    echo   Extract and add the bin folder to your PATH.
    echo   Video streaming will NOT work without FFmpeg!
    echo.
    start https://www.gyan.dev/ffmpeg/builds/
    echo   After installing FFmpeg, press any key to continue...
    pause >nul
)
echo   - FFmpeg: OK

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    where python3 >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo   WARNING: Python is not installed!
        echo   Download it from: https://www.python.org/downloads/
        echo   IMPORTANT: Check "Add Python to PATH" during install!
        echo.
        start https://www.python.org/downloads/
        echo   After installing Python, press any key to continue...
        pause >nul
    )
)
echo   - Python: OK

echo   Installing yt-dlp and ytmusicapi...
pip install --quiet yt-dlp ytmusicapi 2>nul || pip3 install --quiet yt-dlp ytmusicapi 2>nul
echo   - yt-dlp: OK

echo.

REM ============================================================
REM Detect Local IP
REM ============================================================
echo.
echo [2/5] [OPTIONAL] YouTube Data v3 API Key
echo.
echo   This improves search result dates but is NOT required.
echo   Search works without it. Get one free at: https://console.cloud.google.com
set /p YT_API_KEY="   Enter your YouTube API Key (or press Enter to skip): "

echo.
echo [3/5] Detecting your local IP address...

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
REM Trim leading space
set LOCAL_IP=%LOCAL_IP: =%

if "%LOCAL_IP%"=="" (
    set /p LOCAL_IP="Could not detect IP. Enter your local IP: "
) else (
    echo   Detected: %LOCAL_IP%
    set /p confirm="Is this correct? (Y/n): "
    if /i "%confirm%"=="n" (
        set /p LOCAL_IP="Enter the correct IP: "
    )
)

echo.

REM ============================================================
REM Install NPM Dependencies
REM ============================================================
echo [3/5] Installing server dependencies...

set SCRIPT_DIR=%~dp0

pushd "%SCRIPT_DIR%cloudmedia"
call npm install --quiet >nul 2>&1
echo   - CloudMedia: Ready
popd

pushd "%SCRIPT_DIR%spotiflac"
call npm install --quiet >nul 2>&1
echo   - SpotiFlac: Ready
popd

echo.

REM ============================================================
REM Configure
REM ============================================================
echo [4/5] Configuring with IP: %LOCAL_IP%...

REM Create .env
(
echo BACKEND_IP=%LOCAL_IP%
echo GOTUBE_PORT=8082
echo SPOTIFLAC_PORT=8083
echo YT2009_PORT=8081
echo PROXY_URL=socks5://127.0.0.1:40000
) > "%SCRIPT_DIR%.env"

REM Create SpotiFlac config
(
echo {
echo     "BACKEND_IP": "%LOCAL_IP%",
echo     "PORT": 8083,
echo     "PROXY_URL": "socks5://127.0.0.1:40000"
echo }
) > "%SCRIPT_DIR%spotiflac\config.json"

echo   - Configuration files created

echo.

REM ============================================================
REM Start Servers
REM ============================================================
echo [5/5] Starting servers...

start "CloudMedia (Port 8082)" cmd /k "cd /d "%SCRIPT_DIR%cloudmedia" && node server.js"
echo   - CloudMedia started on port 8082

start "SpotiFlac (Port 8083)" cmd /k "cd /d "%SCRIPT_DIR%spotiflac" && node server.js"
echo   - SpotiFlac started on port 8083

if exist "%SCRIPT_DIR%yt2009\back\config.json" (
    powershell -Command "(Get-Content '%SCRIPT_DIR%yt2009\back\config.json') -replace 'YOUR_SERVER_IP', '%LOCAL_IP%' | Set-Content '%SCRIPT_DIR%yt2009\back\config.json'"
    if not "%YT_API_KEY%"=="" (
        powershell -Command "(Get-Content '%SCRIPT_DIR%yt2009\back\config.json') -replace '\"using_ssl\": false', '\"data_api_key\": \"%YT_API_KEY%\", \"using_ssl\": false' | Set-Content '%SCRIPT_DIR%yt2009\back\config.json'"
    )
    start "YouTubeHQ (Port 8081)" cmd /k "cd /d "%SCRIPT_DIR%yt2009\back" && node backend.js"
    echo   - YouTubeHQ started on port 8081
)

echo.
echo  ========================================================
echo   SETUP COMPLETE!
echo.
echo   Your local IP: %LOCAL_IP%
echo.
echo   YouTubeHQ:  http://%LOCAL_IP%:8081
echo   CloudMedia: http://%LOCAL_IP%:8082
echo   SpotiFlac:  http://%LOCAL_IP%:8083
echo.
echo   Next: Run psp\configure-psp.bat with your PSP
echo   connected via USB and enter IP: %LOCAL_IP%
echo.
echo   Keep the server windows open while using your PSP!
echo  ========================================================
echo.
pause
