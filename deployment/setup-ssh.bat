@echo off
REM SSH Setup Helper for DNSmasq GUI Deployment (Windows)

echo 🔐 SSH Setup Helper for Raspberry Pi Deployment
echo ==============================================

set PI_USER=pi
set PI_HOST=192.168.10.3

echo.
echo This script will help you set up SSH key authentication for deployment.
echo Target: %PI_USER%@%PI_HOST%
echo.

REM Test current connection
echo 🔌 Testing current SSH connection...
ssh -o ConnectTimeout=5 -o BatchMode=yes %PI_USER%@%PI_HOST% "echo SSH key authentication already works!" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ SSH key authentication is already set up!
    echo You can now run the deployment script.
    pause
    exit /b 0
)

echo ❌ SSH key authentication not set up.
echo.

REM Check if SSH keys exist
if not exist "%USERPROFILE%\.ssh\id_rsa" (
    echo 🔑 No SSH keys found. Generating new SSH key pair...
    echo.
    pause
    ssh-keygen -t rsa -b 4096 -f "%USERPROFILE%\.ssh\id_rsa" -N ""
    echo ✅ SSH keys generated successfully!
) else (
    echo 🔑 SSH keys found at %USERPROFILE%\.ssh\id_rsa
)

echo.
echo 📤 Copying SSH key to Raspberry Pi...
echo You will be prompted for the password for %PI_USER%@%PI_HOST%
echo.

ssh-copy-id %PI_USER%@%PI_HOST%
if %errorlevel% == 0 (
    echo.
    echo ✅ SSH key copied successfully!
    echo.
    echo 🧪 Testing SSH key authentication...
    ssh -o ConnectTimeout=5 -o BatchMode=yes %PI_USER%@%PI_HOST% "echo SSH key authentication works!" >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ SSH key authentication is working!
        echo.
        echo 🚀 You can now run the deployment script:
        echo    .\deployment\deploy.sh
        echo    .\deployment\deploy.sh --update-only
    ) else (
        echo ❌ SSH key authentication test failed.
        echo Please check your SSH configuration.
    )
) else (
    echo.
    echo ❌ Failed to copy SSH key.
    echo.
    echo Manual setup instructions:
    echo 1. Make sure SSH is enabled on your Raspberry Pi
    echo 2. Check that the IP address (%PI_HOST%^) is correct
    echo 3. Verify the username (%PI_USER%^) is correct
    echo 4. Try connecting manually: ssh %PI_USER%@%PI_HOST%
)

echo.
echo 💡 Alternative: You can also modify the deployment script to use
echo    password authentication, but SSH keys are more secure.
echo.
pause
