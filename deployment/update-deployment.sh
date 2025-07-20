#!/bin/bash

# DNSmasq GUI Update Deployment Script
# This script safely updates an existing installation

set -e  # Exit on any error

INSTALL_DIR="/opt/dnsmasq-gui"
SERVICE_NAME="dnsmasq-gui"
USER="pi"
GROUP="pi"

echo "=== DNSmasq GUI Update Deployment ==="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Check if deployment archive exists
DEPLOYMENT_FILE=""
if [ -f "/tmp/dnsmasq-gui-deployment.tar.gz" ]; then
    DEPLOYMENT_FILE="/tmp/dnsmasq-gui-deployment.tar.gz"
    EXTRACT_CMD="tar -xzf"
elif [ -f "/tmp/dnsmasq-gui-deployment.zip" ]; then
    DEPLOYMENT_FILE="/tmp/dnsmasq-gui-deployment.zip"
    EXTRACT_CMD="unzip -q"
else
    echo "Error: No deployment package found in /tmp/"
    echo "Looking for: dnsmasq-gui-deployment.tar.gz or dnsmasq-gui-deployment.zip"
    exit 1
fi

echo "Found deployment package: $DEPLOYMENT_FILE"

# Stop the service if running
echo "Stopping $SERVICE_NAME service..."
systemctl stop $SERVICE_NAME || true

# Backup existing installation
if [ -d "$INSTALL_DIR" ]; then
    echo "Backing up existing installation..."
    mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create installation directory
echo "Creating installation directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Extract deployment package
echo "Extracting deployment package..."
$EXTRACT_CMD "$DEPLOYMENT_FILE" || {
    echo "Error: Failed to extract deployment package"
    exit 1
}

# Fix file ownership
echo "Setting correct file permissions..."
chown -R $USER:$GROUP "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"
chmod +x "$INSTALL_DIR/deployment/"*.sh

# Install/update Node.js dependencies
echo "Installing Node.js dependencies..."
sudo -u $USER npm install --production

# Copy/update systemd service file
echo "Updating systemd service..."
cp "$INSTALL_DIR/deployment/dnsmasq-gui.service" /etc/systemd/system/
systemctl daemon-reload

# Install restart handler system
echo "Installing restart handler..."
if [ -f "$INSTALL_DIR/deployment/dnsmasq-restart-handler.sh" ]; then
    cp "$INSTALL_DIR/deployment/dnsmasq-restart-handler.sh" /opt/dnsmasq-gui/restart-handler.sh
    chmod +x /opt/dnsmasq-gui/restart-handler.sh
    
    # Install systemd service and timer
    cp "$INSTALL_DIR/deployment/dnsmasq-restart-handler.service" /etc/systemd/system/
    cp "$INSTALL_DIR/deployment/dnsmasq-restart-handler.timer" /etc/systemd/system/
    
    systemctl daemon-reload
    systemctl enable dnsmasq-restart-handler.timer
    systemctl start dnsmasq-restart-handler.timer
    
    echo "✓ Restart handler installed and enabled"
else
    echo "⚠ Warning: Restart handler files not found in deployment"
fi

# Enable and start service
echo "Starting $SERVICE_NAME service..."
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

# Check service status
echo "Checking service status..."
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "✓ $SERVICE_NAME service is running successfully"
    echo "✓ Application available at: http://$(hostname -I | awk '{print $1}'):3000"
else
    echo "✗ $SERVICE_NAME service failed to start"
    echo "Check logs with: journalctl -u $SERVICE_NAME -f"
    exit 1
fi

echo "=== Deployment completed successfully ==="
