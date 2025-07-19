#!/bin/bash
# Troubleshooting script for DNSmasq GUI service issues
# Run this on the Raspberry Pi to diagnose problems

echo "🔍 DNSmasq GUI Service Troubleshooting"
echo "======================================"

SERVICE_NAME="dnsmasq-gui"
APP_DIR="/opt/dnsmasq-gui"

# Check if service exists
echo "1. Checking service status..."
if systemctl list-units --full -all | grep -q "$SERVICE_NAME.service"; then
    echo "✅ Service exists"
    systemctl status $SERVICE_NAME --no-pager
else
    echo "❌ Service not found"
fi

echo -e "\n2. Checking service logs..."
journalctl -u $SERVICE_NAME -n 50 --no-pager

echo -e "\n3. Checking application files..."
if [ -d "$APP_DIR" ]; then
    echo "✅ Application directory exists: $APP_DIR"
    ls -la $APP_DIR
    
    if [ -f "$APP_DIR/dist/index.js" ]; then
        echo "✅ Main application file exists"
    else
        echo "❌ Main application file missing: $APP_DIR/dist/index.js"
    fi
    
    if [ -f "$APP_DIR/.env" ]; then
        echo "✅ Environment file exists"
        echo "Environment variables:"
        grep -v "SECRET\|PASSWORD" $APP_DIR/.env | head -10
    else
        echo "❌ Environment file missing: $APP_DIR/.env"
    fi
else
    echo "❌ Application directory missing: $APP_DIR"
fi

echo -e "\n4. Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "✅ Node.js version: $(node --version)"
    echo "✅ npm version: $(npm --version)"
else
    echo "❌ Node.js not installed"
fi

echo -e "\n5. Checking file permissions..."
if [ -d "$APP_DIR" ]; then
    echo "Application directory permissions:"
    ls -ld $APP_DIR
    echo "Application files ownership:"
    ls -la $APP_DIR/ | head -10
fi

echo -e "\n6. Checking user account..."
if id "dnsmasq-gui" &>/dev/null; then
    echo "✅ dnsmasq-gui user exists"
    id dnsmasq-gui
else
    echo "❌ dnsmasq-gui user missing"
fi

echo -e "\n7. Testing Node.js application manually..."
if [ -f "$APP_DIR/dist/index.js" ] && [ -f "$APP_DIR/.env" ]; then
    echo "Attempting to run application manually..."
    cd $APP_DIR
    sudo -u dnsmasq-gui NODE_ENV=production node dist/index.js &
    APP_PID=$!
    sleep 3
    if kill -0 $APP_PID 2>/dev/null; then
        echo "✅ Application started successfully (PID: $APP_PID)"
        kill $APP_PID
    else
        echo "❌ Application failed to start or crashed immediately"
    fi
fi

echo -e "\n8. Checking port availability..."
if netstat -tlnp | grep -q ":3000"; then
    echo "⚠️  Port 3000 is already in use:"
    netstat -tlnp | grep ":3000"
else
    echo "✅ Port 3000 is available"
fi

echo -e "\n9. Checking DNSmasq files accessibility..."
DNSMASQ_CONF="/etc/dnsmasq.conf"
DHCP_LEASES="/var/lib/dhcp/dhcpd.leases"

if [ -f "$DNSMASQ_CONF" ]; then
    echo "✅ DNSmasq config exists: $DNSMASQ_CONF"
    ls -la $DNSMASQ_CONF
    if sudo -u dnsmasq-gui test -r $DNSMASQ_CONF; then
        echo "✅ dnsmasq-gui user can read config"
    else
        echo "❌ dnsmasq-gui user cannot read config"
    fi
else
    echo "❌ DNSmasq config missing: $DNSMASQ_CONF"
fi

if [ -f "$DHCP_LEASES" ]; then
    echo "✅ DHCP leases file exists: $DHCP_LEASES"
    ls -la $DHCP_LEASES
    if sudo -u dnsmasq-gui test -r $DHCP_LEASES; then
        echo "✅ dnsmasq-gui user can read leases"
    else
        echo "❌ dnsmasq-gui user cannot read leases"
    fi
else
    echo "❌ DHCP leases file missing: $DHCP_LEASES"
fi

echo -e "\n10. System resource check..."
echo "Memory usage:"
free -h
echo "Disk usage:"
df -h /opt
echo "CPU load:"
uptime

echo -e "\n" 
echo "🏁 Troubleshooting complete!"
echo "==========================================="
echo "Common fixes:"
echo "1. Check the journalctl logs above for specific error messages"
echo "2. Ensure all files have correct ownership: sudo chown -R dnsmasq-gui:dnsmasq-gui $APP_DIR"
echo "3. Check .env file configuration"
echo "4. Ensure Node.js dependencies are installed: cd $APP_DIR && sudo npm ci --production"
echo "5. Test manual startup to see immediate error messages"
