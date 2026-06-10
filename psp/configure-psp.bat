@echo off
REM ============================================================
REM  PSP Cloud Streaming — PSP Setup Script (Windows)
REM  Connects to your PSP via USB and installs everything!
REM ============================================================

title PSP Cloud Streaming - PSP Setup
color 0B

echo.
echo  ========================================================
echo      ____  ____  ____     ____       __
echo     / __ \/ ___\/ __ \   / ___\___  / /___ ______
echo    / /_/ /\__ \/ /_/ /   \__ \/ _ \/ __/ / / / __ \
echo   / ____/___/ / ____/   ___/ /  __/ /_/ /_/ / /_/ /
echo  /_/    /____/_/       /____/\___/\__/\__,_/ .___/
echo                                           /_/
echo.
echo   GoTube + YouTubeHQ + CloudMedia + SpotiFlac
echo  ========================================================
echo.

REM ============================================================
REM Step 1: Find PSP Drive
REM ============================================================
echo [1/4] Searching for PSP...

set PSP_DRIVE=
for %%d in (D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist "%%d:\PSP\GAME\" (
        set PSP_DRIVE=%%d:
        goto :psp_found
    )
)

REM Not found by GAME folder, try by ms0 structure
for %%d in (D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist "%%d:\PSP\" (
        set PSP_DRIVE=%%d:
        goto :psp_found
    )
)

echo   PSP not detected automatically.
echo   Make sure your PSP is connected via USB and in USB mode.
echo   (Settings ^> USB Connection on your PSP)
echo.
set /p PSP_DRIVE="Enter your PSP drive letter (e.g. E): "
set PSP_DRIVE=%PSP_DRIVE::=%:
if not exist "%PSP_DRIVE%\" (
    echo   ERROR: Drive %PSP_DRIVE% does not exist!
    pause
    exit /b 1
)

:psp_found
echo   PSP detected on drive %PSP_DRIVE%
echo.

REM ============================================================
REM Step 2: Get Server IP
REM ============================================================
echo [2/4] Server Configuration
echo.
echo   Enter the IP address shown by your server setup script.
echo   Examples: 20.123.45.67 (Azure) or 192.168.1.100 (Local)
echo.
set /p SERVER_IP="   Your server IP: "

if "%SERVER_IP%"=="" (
    echo   ERROR: You must enter an IP address!
    pause
    exit /b 1
)

echo.
echo   Using server: %SERVER_IP%
echo.

REM ============================================================
REM Step 3: Copy Files
REM ============================================================
echo [3/4] Installing files to PSP...

REM Get script directory
set SCRIPT_DIR=%~dp0

REM Create GoTube directory
if not exist "%PSP_DRIVE%\PSP\GAME\GoTube\" (
    mkdir "%PSP_DRIVE%\PSP\GAME\GoTube"
)

REM Copy entire GoTube engine (EBOOT, GT, PRX modules, site.js, etc.)
xcopy /S /Y /Q "%SCRIPT_DIR%GoTube\*" "%PSP_DRIVE%\PSP\GAME\GoTube\" >nul
echo   - GoTube engine installed

REM Replace placeholder IP in cfg.js
powershell -Command "(Get-Content '%PSP_DRIVE%\PSP\GAME\GoTube\cfg.js') -replace 'YOUR_SERVER_IP', '%SERVER_IP%' | Set-Content '%PSP_DRIVE%\PSP\GAME\GoTube\cfg.js'" >nul 2>&1
echo   - cfg.js configured with IP: %SERVER_IP%

REM Create site plugins directory
if not exist "%PSP_DRIVE%\PSP\GAME\GoTube\site\" (
    mkdir "%PSP_DRIVE%\PSP\GAME\GoTube\site"
)

REM Copy plugins to site/ folder and replace IP
for %%f in (YouTubeHQ.js CloudMedia.js SpotiFLAC.js) do (
    if exist "%SCRIPT_DIR%plugins\%%f" (
        copy /Y "%SCRIPT_DIR%plugins\%%f" "%PSP_DRIVE%\PSP\GAME\GoTube\site\%%f" >nul
        REM Replace YOUR_SERVER_IP with actual IP using PowerShell
        powershell -Command "(Get-Content '%PSP_DRIVE%\PSP\GAME\GoTube\site\%%f') -replace 'YOUR_SERVER_IP', '%SERVER_IP%' | Set-Content '%PSP_DRIVE%\PSP\GAME\GoTube\site\%%f'" >nul 2>&1
        echo   - %%f installed and configured
    )
)

REM ============================================================
REM Step 4: Wi-Fi Plugin (wpa2psp)
REM   Tested and verified on 6.60 PRO-C Infinity
REM ============================================================
echo.
echo [4/4] Wi-Fi Plugin Setup
echo.
echo   The wpa2psp plugin adds WPA2 Wi-Fi support to your PSP.
echo   However, some custom firmwares (like ARK-5) already have
echo   built-in WPA2 support. Installing wpa2psp on top of these
echo   can cause GoTube to crash on launch.
echo.
echo   Skip this if:
echo     - You are using ARK-5 (has native WPA2)
echo     - Your CFW already supports WPA2
echo     - Your PSP can already connect to Wi-Fi without issues
echo.
set /p SKIP_WPA2="   Skip wpa2psp plugin? (y/N): "
if /i "%SKIP_WPA2%"=="y" (
    echo.
    echo   Skipping wpa2psp.prx (Wi-Fi already working)
    goto :skip_plugins
)

echo   Installing wpa2psp.prx for WPA2 Wi-Fi support...

REM Create seplugins directory
if not exist "%PSP_DRIVE%\seplugins\" (
    mkdir "%PSP_DRIVE%\seplugins"
)

REM Copy essential PRX files
if exist "%SCRIPT_DIR%essentials\wpa2psp.prx" (
    copy /Y "%SCRIPT_DIR%essentials\wpa2psp.prx" "%PSP_DRIVE%\seplugins\wpa2psp.prx" >nul
    echo   - wpa2psp.prx installed (WPA2 Wi-Fi support)
)

REM Create/Update VSH.TXT (dashboard plugins)
(
echo ms0:/seplugins/wpa2psp.prx 1
) > "%PSP_DRIVE%\seplugins\VSH.TXT"
echo   - VSH.TXT configured

REM Create/Update GAME.TXT (in-game plugins)
(
echo ms0:/seplugins/wpa2psp.prx 1
) > "%PSP_DRIVE%\seplugins\GAME.TXT"
echo   - GAME.TXT configured

:skip_plugins

REM ============================================================
REM Done!
REM ============================================================
echo.
echo  ========================================================
echo.
echo   SETUP COMPLETE!
echo.
echo   Your PSP is ready to stream!
echo.
echo   1. Disconnect your PSP from USB
echo   2. Go to: Game ^> Memory Stick ^> GoTube
echo   3. Press L/R to switch between apps:
echo      - YouTubeHQ  (YouTube videos)
echo      - CloudMedia (Movies ^& Anime)
echo      - SpotiFLAC  (Music streaming)
echo   4. Search for anything and press X to play!
echo.
echo   Server: %SERVER_IP%
echo.
echo   Wi-Fi issues? See docs/WIFI_GUIDE.md
echo.
echo  ========================================================
echo.
pause
