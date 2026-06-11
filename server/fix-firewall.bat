@echo off
REM ============================================================
REM  PSP Cloud Streaming — Network Firewall Fixer
REM  Run this if your PSP is getting a Black Screen / freezing!
REM ============================================================

title PSP Cloud Streaming - Firewall Fixer
color 0E

echo.
echo  ========================================================
echo   PSP Cloud Streaming - Network Firewall Fixer
echo  ========================================================
echo.

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrator privileges confirmed.
    goto :run_fix
) else (
    echo [INFO] Requesting Administrator privileges...
    goto :UACPrompt
)

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params= %*
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params:"=""%", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:run_fix
echo.
echo [1/2] Adding Node.js to Firewall...
netsh advfirewall firewall delete rule name="Node.js PSP Server" >nul 2>&1
netsh advfirewall firewall add rule name="Node.js PSP Server" dir=in action=allow program="%ProgramFiles%\nodejs\node.exe" enable=yes profile=any >nul
echo   - Node.js explicitly allowed on all networks

echo.
echo [2/2] Opening PSP streaming TCP Ports (8081, 8082, 8083)...
netsh advfirewall firewall delete rule name="PSP Cloud Streaming Ports" >nul 2>&1
netsh advfirewall firewall add rule name="PSP Cloud Streaming Ports" dir=in action=allow protocol=TCP localport=8081,8082,8083 enable=yes profile=any >nul
echo   - TCP Ports 8081, 8082, 8083 opened on all networks

echo.
echo  ========================================================
echo   SUCCESS! The Firewall has been configured.
echo   You can now restart your local server and PSP.
echo  ========================================================
echo.
pause
