@echo off
REM Deploy dnsmasq-gui to Raspberry Pi from Windows
REM Usage: deploy-to-pi.bat [pi-hostname-or-ip] [ssh-user]

setlocal

set PI_HOST=%1
if "%PI_HOST%"=="" set PI_HOST=raspberrypi.local

set SSH_USER=%2
if "%SSH_USER%"=="" set SSH_USER=pi

set APP_DIR=/opt/dnsmasq-gui
set SERVICE_NAME=dnsmasq-gui

echo 🚀 Deploying dnsmasq-gui to %SSH_USER%@%PI_HOST%

echo 📦 Stopping existing service (if running)...
ssh %SSH_USER%@%PI_HOST% "sudo systemctl stop %SERVICE_NAME% 2>/dev/null || true"

echo 📥 Pulling latest code...
ssh %SSH_USER%@%PI_HOST% "cd %APP_DIR% && sudo git pull origin main"

echo 🔧 Installing dependencies...
ssh %SSH_USER%@%PI_HOST% "cd %APP_DIR% && sudo npm ci --only=production"

echo 🏗️ Building application...
ssh %SSH_USER%@%PI_HOST% "cd %APP_DIR% && sudo npm run build"

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

echo 🔧 Creating required config files if they don't exist...
ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-static-leases.conf"
ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-ranges.conf"
ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-options.conf"
ssh %SSH_USER%@%PI_HOST% "sudo touch /etc/dnsmasq.d/dnsmasq-advanced.conf"
ssh %SSH_USER%@%PI_HOST% "sudo chown dnsmasq-gui:dnsmasq-gui /etc/dnsmasq.d/dnsmasq-*.conf"

echo 🚀 Starting and enabling service...
ssh %SSH_USER%@%PI_HOST% "sudo systemctl enable %SERVICE_NAME%"
ssh %SSH_USER%@%PI_HOST% "sudo systemctl start %SERVICE_NAME%"

echo ⏱️ Waiting for service to start...
timeout /t 5 /nobreak > nul

echo 🔍 Checking service status...
ssh %SSH_USER%@%PI_HOST% "sudo systemctl status %SERVICE_NAME% --no-pager || true"

echo 📋 Service logs (last 20 lines):
ssh %SSH_USER%@%PI_HOST% "sudo journalctl -u %SERVICE_NAME% -n 20 --no-pager || true"

echo ✅ Deployment complete!
echo 🌐 Access the GUI at: http://%PI_HOST%:3000
echo 📊 Check logs with: ssh %SSH_USER%@%PI_HOST% "sudo journalctl -u %SERVICE_NAME% -f"

pause
