@echo off
REM Simple SSH Key Setup for Windows (Alternative Method)

echo 🔐 Simple SSH Key Setup for DNSmasq GUI Deployment
echo ================================================

set PI_USER=pi
set PI_HOST=192.168.10.3

echo.
echo This script helps you set up SSH key authentication manually.
echo Target: %PI_USER%@%PI_HOST%
echo.

REM Check if SSH keys exist
if not exist "%USERPROFILE%\.ssh\id_rsa.pub" (
    echo 🔑 No SSH keys found. Let's generate them first...
    echo.
    pause
    
    REM Create .ssh directory if it doesn't exist
    if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"
    
    echo Generating SSH key pair...
    ssh-keygen -t rsa -b 4096 -f "%USERPROFILE%\.ssh\id_rsa" -N ""
    
    if %errorlevel% neq 0 (
        echo ❌ Failed to generate SSH keys.
        pause
        exit /b 1
    )
    
    echo ✅ SSH keys generated successfully!
    echo.
)

echo 📋 Your SSH public key is:
echo ----------------------------------------
type "%USERPROFILE%\.ssh\id_rsa.pub"
echo ----------------------------------------
echo.

echo 🔧 Manual setup steps:
echo.
echo 1. Copy the public key above to your clipboard
echo.
echo 2. Connect to your Raspberry Pi:
echo    ssh %PI_USER%@%PI_HOST%
echo.
echo 3. On the Raspberry Pi, run these commands:
echo    mkdir -p ~/.ssh
echo    nano ~/.ssh/authorized_keys
echo.
echo 4. Paste your public key into the file, save and exit (Ctrl+X, Y, Enter)
echo.
echo 5. Set proper permissions:
echo    chmod 600 ~/.ssh/authorized_keys
echo    chmod 700 ~/.ssh
echo    exit
echo.
echo 6. Test the connection:
echo    ssh %PI_USER%@%PI_HOST%
echo    (should connect without asking for password)
echo.
echo 7. Run the deployment script:
echo    .\deployment\deploy.sh --update-only
echo.

echo 💡 Alternative: Use PuTTY's plink and pageant for SSH key management
echo    or consider using Windows Subsystem for Linux (WSL) which has ssh-copy-id
echo.

pause
