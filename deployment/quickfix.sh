#!/bin/bash
# Quick fix script for common DNSmasq GUI service issues
# Run this on the Raspberry Pi when the service is restarting

set -e

SERVICE_NAME="dnsmasq-gui"
APP_DIR="/opt/dnsmasq-gui"

echo "🔧 Quick Fix for DNSmasq GUI Service Issues"
echo "=========================================="

# Stop the service to prevent restart loop
echo "1. Stopping service..."
sudo systemctl stop $SERVICE_NAME

# Check and fix file permissions
echo "2. Fixing file permissions..."
sudo chown -R dnsmasq-gui:dnsmasq-gui $APP_DIR
sudo chmod -R 755 $APP_DIR
sudo chmod 644 $APP_DIR/.env

# Ensure DNSmasq files are accessible
echo "3. Setting up DNSmasq file access..."
sudo touch /var/lib/dhcp/dhcpd.leases
sudo chgrp dnsmasq-gui /etc/dnsmasq.conf /var/lib/dhcp/dhcpd.leases
sudo chmod g+rw /etc/dnsmasq.conf /var/lib/dhcp/dhcpd.leases

# Create log directory
echo "4. Setting up logging..."
sudo mkdir -p /var/log/dnsmasq-gui
sudo chown dnsmasq-gui:dnsmasq-gui /var/log/dnsmasq-gui

# Test Node.js application
echo "5. Testing application..."
cd $APP_DIR
echo "Running application test for 5 seconds..."
timeout 5s sudo -u dnsmasq-gui node dist/index.js || {
    echo "❌ Application failed to start. Common issues:"
    echo "   - Missing .env file"
    echo "   - Wrong file permissions" 
    echo "   - Missing Node.js dependencies"
    echo "   - Port already in use"
    echo ""
    echo "Check the error above and run:"
    echo "   sudo /opt/dnsmasq-gui/troubleshoot.sh"
    exit 1
}

echo "✅ Application test passed"

# Reinstall dependencies if needed
echo "6. Ensuring dependencies are installed..."
sudo npm ci --production

# Start the service
echo "7. Starting service..."
sudo systemctl start $SERVICE_NAME

# Check status
sleep 3
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ Service is now running!"
    sudo systemctl status $SERVICE_NAME --no-pager -l
else
    echo "❌ Service still failing. Check logs:"
    sudo journalctl -u $SERVICE_NAME -n 20 --no-pager
fi
