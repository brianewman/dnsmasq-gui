#!/bin/bash
# Deploy dnsmasq-gui to Raspberry Pi
# Usage: ./deploy-to-pi.sh [pi-hostname-or-ip] [ssh-user]

set -e

# Configuration
PI_HOST=${1:-raspberrypi.local}
SSH_USER=${2:-pi}
REPO_URL="https://gitea.voicelab.xyz/brian/dnsmasq-gui.git"
APP_DIR="/opt/dnsmasq-gui"
SERVICE_NAME="dnsmasq-gui"

echo "🚀 Deploying dnsmasq-gui to ${SSH_USER}@${PI_HOST}"

# Function to run commands on the Pi
run_on_pi() {
    ssh ${SSH_USER}@${PI_HOST} "$1"
}

# Function to copy files to the Pi
copy_to_pi() {
    scp "$1" ${SSH_USER}@${PI_HOST}:"$2"
}

echo "📦 Stopping existing service (if running)..."
run_on_pi "sudo systemctl stop ${SERVICE_NAME} 2>/dev/null || true"

echo "📥 Pulling latest code..."
run_on_pi "cd ${APP_DIR} && sudo git pull origin main"

echo "🔧 Installing dependencies..."
run_on_pi "cd ${APP_DIR} && sudo npm ci --only=production"

echo "🏗️  Building application..."
run_on_pi "cd ${APP_DIR} && sudo npm run build"

echo "👤 Setting up user and permissions..."
run_on_pi "sudo useradd -r -s /bin/false dnsmasq-gui 2>/dev/null || true"
run_on_pi "sudo chown -R dnsmasq-gui:dnsmasq-gui ${APP_DIR}"
run_on_pi "sudo chmod +x ${APP_DIR}/dist/index.js"

echo "🔒 Setting up sudoers permissions..."
run_on_pi "sudo cp ${APP_DIR}/deployment/dnsmasq-gui-sudoers /etc/sudoers.d/dnsmasq-gui"
run_on_pi "sudo chmod 440 /etc/sudoers.d/dnsmasq-gui"

echo "🔧 Installing systemd service..."
run_on_pi "sudo cp ${APP_DIR}/deployment/dnsmasq-gui.service /etc/systemd/system/"
run_on_pi "sudo systemctl daemon-reload"

echo "🗂️  Creating required directories..."
run_on_pi "sudo mkdir -p /etc/dnsmasq.d"
run_on_pi "sudo touch /etc/dnsmasq.hosts"
run_on_pi "sudo chown dnsmasq-gui:dnsmasq-gui /etc/dnsmasq.hosts"

echo "🔧 Creating required config files if they don't exist..."
run_on_pi "sudo touch /etc/dnsmasq.d/dnsmasq-static-leases.conf"
run_on_pi "sudo touch /etc/dnsmasq.d/dnsmasq-ranges.conf" 
run_on_pi "sudo touch /etc/dnsmasq.d/dnsmasq-options.conf"
run_on_pi "sudo touch /etc/dnsmasq.d/dnsmasq-advanced.conf"
run_on_pi "sudo chown dnsmasq-gui:dnsmasq-gui /etc/dnsmasq.d/dnsmasq-*.conf"

echo "🚀 Starting and enabling service..."
run_on_pi "sudo systemctl enable ${SERVICE_NAME}"
run_on_pi "sudo systemctl start ${SERVICE_NAME}"

echo "⏱️  Waiting for service to start..."
sleep 5

echo "🔍 Checking service status..."
run_on_pi "sudo systemctl status ${SERVICE_NAME} --no-pager || true"

echo "📋 Service logs (last 20 lines):"
run_on_pi "sudo journalctl -u ${SERVICE_NAME} -n 20 --no-pager || true"

PI_IP=$(run_on_pi "hostname -I | cut -d' ' -f1")
echo "✅ Deployment complete!"
echo "🌐 Access the GUI at: http://${PI_IP}:3000"
echo "📊 Check logs with: ssh ${SSH_USER}@${PI_HOST} 'sudo journalctl -u ${SERVICE_NAME} -f'"
