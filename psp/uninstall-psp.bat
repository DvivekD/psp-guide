@echo off
REM ============================================================
REM  PSP Cloud Streaming — Uninstall Script (Windows)
REM  Removes all files installed by configure-psp.bat
REM ============================================================

title PSP Cloud Streaming - Uninstall
color 0C

echo.
echo  ========================================================
echo   PSP Cloud Streaming - UNINSTALL
echo  ========================================================
echo.
echo   This will remove GoTube and all related files from your
echo   PSP, reverting it back to its original state.
echo.
echo   The following will be deleted:
echo     - PSP\GAME\GoTube\        (the entire app)
echo     - seplugins\wpa2psp.prx   (WPA2 Wi-Fi plugin)
echo     - seplugins\GAME.TXT      (plugin config)
echo     - seplugins\VSH.TXT       (plugin config)
echo.

REM ============================================================
REM Step 1: Find PSP Drive
REM ============================================================
echo [1/3] Searching for PSP...

set PSP_DRIVE=
for %%d in (D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist "%%d:\PSP\GAME\" (
        set PSP_DRIVE=%%d:
        goto :psp_found
    )
)

for %%d in (D E F G H I J K L M N O P Q R S T U V W X Y Z) do (
    if exist "%%d:\PSP\" (
        set PSP_DRIVE=%%d:
        goto :psp_found
    )
)

echo   PSP not detected automatically.
echo   Make sure your PSP is connected via USB and in USB mode.
echo.
set /p PSP_DRIVE="Enter your PSP drive letter (e.g. E): "
set PSP_DRIVE=%PSP_DRIVE::=%:
if not exist "%PSP_DRIVE%\" (
    echo   ERROR: Drive %PSP_DRIVE% not found!
    pause
    exit /b 1
)

:psp_found
echo   Found PSP at: %PSP_DRIVE%
echo.

REM ============================================================
REM Step 2: Confirm
REM ============================================================
echo [2/3] Confirmation
echo.
echo   WARNING: This will permanently delete GoTube and its
echo   plugins from your PSP memory stick.
echo.
set /p CONFIRM="   Are you sure? Type YES to continue: "
if /i not "%CONFIRM%"=="YES" (
    echo.
    echo   Cancelled. No files were changed.
    pause
    exit /b 0
)

echo.

REM ============================================================
REM Step 3: Remove Files
REM ============================================================
echo [3/3] Removing files...

REM Delete GoTube app folder
if exist "%PSP_DRIVE%\PSP\GAME\GoTube\" (
    rmdir /S /Q "%PSP_DRIVE%\PSP\GAME\GoTube"
    echo   - GoTube app removed
) else (
    echo   - GoTube app was not installed (skipping)
)

REM Delete wpa2psp plugin
if exist "%PSP_DRIVE%\seplugins\wpa2psp.prx" (
    del /F /Q "%PSP_DRIVE%\seplugins\wpa2psp.prx"
    echo   - wpa2psp.prx removed
) else (
    echo   - wpa2psp.prx was not installed (skipping)
)

REM Delete plugin config files (only if they contain wpa2psp entries)
if exist "%PSP_DRIVE%\seplugins\GAME.TXT" (
    findstr /I "wpa2psp" "%PSP_DRIVE%\seplugins\GAME.TXT" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        del /F /Q "%PSP_DRIVE%\seplugins\GAME.TXT"
        echo   - GAME.TXT removed
    ) else (
        echo   - GAME.TXT has other plugins, leaving it alone
    )
)

if exist "%PSP_DRIVE%\seplugins\VSH.TXT" (
    findstr /I "wpa2psp" "%PSP_DRIVE%\seplugins\VSH.TXT" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        del /F /Q "%PSP_DRIVE%\seplugins\VSH.TXT"
        echo   - VSH.TXT removed
    ) else (
        echo   - VSH.TXT has other plugins, leaving it alone
    )
)

echo.
echo  ========================================================
echo   Uninstall complete!
echo.
echo   Your PSP has been restored to its original state.
echo   You can safely disconnect your PSP from USB.
echo  ========================================================
echo.
pause
