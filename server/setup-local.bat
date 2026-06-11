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

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: npm is not installed or not in PATH!
    pause
    exit /b 1
)
echo   - npm: OK

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

where py >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    where python >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo   WARNING: Python is not installed or not in PATH!
        echo   Download it from: https://www.python.org/downloads/
        echo   IMPORTANT: Check "Add Python to PATH" during install!
        echo.
        start https://www.python.org/downloads/
        echo   After installing Python, press any key to continue...
        pause >nul
    ) else (
        set PYTHON_CMD=python
    )
) else (
    set PYTHON_CMD=py
)
echo   - Python: OK

echo   Installing yt-dlp and ytmusicapi...
%PYTHON_CMD% -m pip install --user --quiet yt-dlp ytmusicapi 2>nul
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

for /f "usebackq tokens=*" %%a in (`powershell -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } | Select-Object -ExpandProperty IPv4Address | Select-Object -First 1).IPAddress"`) do (
    set LOCAL_IP=%%a
)

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
echo [4/5] Installing server dependencies...

set SCRIPT_DIR=%~dp0

pushd "%SCRIPT_DIR%cloudmedia"
call npm install --quiet > npm-install.log 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: Failed to install CloudMedia dependencies! Check cloudmedia\npm-install.log
    pause
    exit /b 1
)
echo   - CloudMedia: Ready
popd

pushd "%SCRIPT_DIR%spotiflac"
call npm install --quiet > npm-install.log 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: Failed to install SpotiFlac dependencies! Check spotiflac\npm-install.log
    pause
    exit /b 1
)
echo   - SpotiFlac: Ready
popd

echo.

REM ============================================================
REM Configure
REM ============================================================
echo [5/5] Configuring with IP: %LOCAL_IP%...

REM Create .env
(
echo BACKEND_IP=%LOCAL_IP%
echo GOTUBE_PORT=8082
echo SPOTIFLAC_PORT=8083
echo YT2009_PORT=8081
) > "%SCRIPT_DIR%.env"

REM Create SpotiFlac config
(
echo {
echo     "BACKEND_IP": "%LOCAL_IP%",
echo     "PORT": 8083
echo }
) > "%SCRIPT_DIR%spotiflac\config.json"

echo   - Configuration files created

echo.

REM ============================================================
REM Start Servers
REM ============================================================
echo [5/5] Starting servers...

start "CloudMedia (Port 8082)" /D "%SCRIPT_DIR%cloudmedia" cmd /k "node server.js"
echo   - CloudMedia started on port 8082

start "SpotiFlac (Port 8083)" /D "%SCRIPT_DIR%spotiflac" cmd /k "node server.js"
echo   - SpotiFlac started on port 8083

if exist "%SCRIPT_DIR%yt2009\back\config.json" (
    powershell -Command "(Get-Content -LiteralPath '%SCRIPT_DIR%yt2009\back\config.json') -replace 'YOUR_SERVER_IP', $env:LOCAL_IP | Set-Content -LiteralPath '%SCRIPT_DIR%yt2009\back\config.json'"
    if not "%YT_API_KEY%"=="" (
        powershell -Command "(Get-Content -LiteralPath '%SCRIPT_DIR%yt2009\back\config.json') -replace '\"using_ssl\": false', '\"data_api_key\": \"$env:YT_API_KEY\", \"using_ssl\": false' | Set-Content -LiteralPath '%SCRIPT_DIR%yt2009\back\config.json'"
    )
    start "YouTubeHQ (Port 8081)" /D "%SCRIPT_DIR%yt2009\back" cmd /k "node backend.js"
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
