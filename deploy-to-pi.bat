@echo off
REM Deploy dnsmasq-gui to Raspberry Pi from Windows
REM Usage: deploy-to-pi.bat [pi-hostname-or-ip] [ssh-user] [--update-only]
REM        deploy-to-pi.bat --update-only

setlocal EnableDelayedExpansion

REM Parse arguments for --update-only flag
set UPDATE_MODE=false
set PI_HOST=192.168.10.3
set SSH_USER=pi

:parse_args
if "%~1"=="--update-only" (
    set UPDATE_MODE=true
    shift
    goto parse_args
)
if "%~1"=="" goto done_parsing
if "%PI_HOST%"=="192.168.10.3" (
    set PI_HOST=%~1
    shift
    goto parse_args
)
if "%SSH_USER%"=="pi" (
    set SSH_USER=%~1
    shift
    goto parse_args
)
shift
goto parse_args

:done_parsing

set APP_DIR=/opt/dnsmasq-gui
set SERVICE_NAME=dnsmasq-gui

echo 🚀 Deploying dnsmasq-gui to %SSH_USER%@%PI_HOST%
if "%UPDATE_MODE%"=="true" (
    echo 📄 Mode: Update Only (faster deployment)
) else (
    echo 📄 Mode: Full Deployment
)

echo.
echo 🏗️ Building application locally...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 📡 Testing SSH connection...
ssh %SSH_USER%@%PI_HOST% "echo 'SSH connection successful'" >nul 2>&1
if errorlevel 1 (
    echo ❌ SSH connection failed! Check your Pi IP and SSH setup.
    pause
    exit /b 1
)

echo.
echo 📦 Stopping existing service...
ssh %SSH_USER%@%PI_HOST% "sudo systemctl stop %SERVICE_NAME% 2>/dev/null || true"

if "%UPDATE_MODE%"=="true" (
    echo.
    echo 📤 Copying updated files to Pi...
    scp -r dist public package.json %SSH_USER%@%PI_HOST%:/tmp/
    if errorlevel 1 (
        echo ❌ File copy failed!
        pause
        exit /b 1
    )
    
    echo 📁 Moving files to app directory...
    ssh %SSH_USER%@%PI_HOST% "sudo cp -r /tmp/dist /tmp/public /tmp/package.json %APP_DIR%/ && sudo chown -R dnsmasq-gui:dnsmasq-gui %APP_DIR%"
    
    echo 🧹 Cleaning up temporary files...
    ssh %SSH_USER%@%PI_HOST% "rm -rf /tmp/dist /tmp/public /tmp/package.json"
    
) else (
    echo.
    echo 📁 Creating app directory on Pi...
    ssh %SSH_USER%@%PI_HOST% "sudo mkdir -p %APP_DIR%"

    echo 📤 Copying application files to Pi...
    scp -r dist package.json %SSH_USER%@%PI_HOST%:/tmp/
    if errorlevel 1 (
        echo ❌ File copy failed!
        pause
        exit /b 1
    )
    
    scp -r public deployment %SSH_USER%@%PI_HOST%:/tmp/
    if errorlevel 1 (
        echo ❌ File copy failed!
        pause
        exit /b 1
    )
    
    echo 📁 Moving files to app directory...
    ssh %SSH_USER%@%PI_HOST% "sudo cp -r /tmp/dist /tmp/package.json /tmp/public /tmp/deployment %APP_DIR%/"

    echo 🔧 Installing dependencies...
    ssh %SSH_USER%@%PI_HOST% "cd %APP_DIR% && sudo npm ci --omit=dev"

    echo 👤 Setting up user and permissions...
    ssh %SSH_USER%@%PI_HOST% "sudo useradd -r -s /bin/false dnsmasq-gui 2>/dev/null || true"
    ssh %SSH_USER%@%PI_HOST% "sudo chown -R dnsmasq-gui:dnsmasq-gui %APP_DIR%"
    ssh %SSH_USER%@%PI_HOST% "sudo chmod +x %APP_DIR%/dist/index.js"

    echo 🔒 Setting up sudoers permissions...
    ssh %SSH_USER%@%PI_HOST% "sudo cp %APP_DIR%/deployment/dnsmasq-gui-sudoers /etc/sudoers.d/dnsmasq-gui"
    ssh %SSH_USER%@%PI_HOST% "sudo chmod 440 /etc/sudoers.d/dnsmasq-gui"

    echo 🔧 Installing systemd service...
    ssh %SSH_USER%@%PI_HOST% "sudo cp %APP_DIR%/deployment/dnsmasq-gui.service /etc/systemd/system/"
    ssh %SSH_USER%@%PI_HOST% "sudo systemctl daemon-reload"

    echo 🗂️ Creating required directories...
    ssh %SSH_USER%@%PI_HOST% "sudo mkdir -p /etc/dnsmasq.d"
    ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.hosts"
    ssh %SSH_USER%@%PI_HOST% "sudo chown dnsmasq-gui:dnsmasq-gui /etc/dnsmasq.hosts"

    echo 🔧 Creating required config files...
    ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-static-leases.conf"
    ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-ranges.conf"
    ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-options.conf"
    ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-advanced.conf"
    ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-cnames.conf"
    ssh %SSH_USER%@%PI_HOST% "sudo chown dnsmasq-gui:dnsmasq-gui /etc/dnsmasq.d/dnsmasq-*.conf"

    echo 🚀 Enabling service...
    ssh %SSH_USER%@%PI_HOST% "sudo systemctl enable %SERVICE_NAME%"
    
    echo 🧹 Cleaning up temporary files...
    ssh %SSH_USER%@%PI_HOST% "rm -rf /tmp/dist /tmp/package.json /tmp/public /tmp/deployment"
)

echo.
echo 🚀 Starting service...
ssh %SSH_USER%@%PI_HOST% "sudo systemctl start %SERVICE_NAME%"

echo ⏱️ Waiting for service to start...
timeout /t 5 /nobreak >nul

echo.
echo 🔍 Checking service status...
ssh %SSH_USER%@%PI_HOST% "sudo systemctl status %SERVICE_NAME% --no-pager"
if errorlevel 1 (
    echo.
    echo ❌ Service failed to start! Checking logs...
    ssh %SSH_USER%@%PI_HOST% "sudo journalctl -u %SERVICE_NAME% -n 10 --no-pager"
    pause
    exit /b 1
)

echo.
echo 📋 Recent service logs:
ssh %SSH_USER%@%PI_HOST% "sudo journalctl -u %SERVICE_NAME% -n 5 --no-pager"

echo.
echo ✅ Deployment completed successfully!
echo 🌐 Access the GUI at: http://%PI_HOST%:3000
echo 📊 Monitor logs: ssh %SSH_USER%@%PI_HOST% "sudo journalctl -u %SERVICE_NAME% -f"
echo.
echo 💡 Usage examples:
echo    Full deployment:    .\deploy-to-pi.bat
echo    Update only:        .\deploy-to-pi.bat 192.168.10.3 pi --update-only
echo    Custom host/user:   .\deploy-to-pi.bat 192.168.1.100 admin

pause
