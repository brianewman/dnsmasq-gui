#!/bin/bash
# Deployment script for DNSmasq GUI on Raspberry Pi

set -e

echo "🚀 Deploying DNSmasq GUI to Raspberry Pi..."

# Configuration
PI_USER="pi"
PI_HOST="192.168.10.3"
APP_DIR="/opt/dnsmasq-gui"
SERVICE_NAME="dnsmasq-gui"

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment package
echo "📄 Creating deployment package..."
tar -czf dnsmasq-gui.tar.gz \
    dist/ \
    public/ \
    package.json \
    package-lock.json \
    deployment/ \
    examples/ \
    .env.example

# Copy to Raspberry Pi
echo "🔄 Copying files to Raspberry Pi..."
scp dnsmasq-gui.tar.gz ${PI_USER}@${PI_HOST}:/tmp/

# Also copy troubleshooting script
echo "📋 Copying troubleshooting script..."
scp deployment/troubleshoot.sh ${PI_USER}@${PI_HOST}:/tmp/

# Deploy on Raspberry Pi
echo "🎯 Deploying on Raspberry Pi..."
ssh ${PI_USER}@${PI_HOST} << EOF
    # Stop existing service
    sudo systemctl stop ${SERVICE_NAME} || true

    # Backup existing installation
    if [ -d "${APP_DIR}" ]; then
        sudo mv ${APP_DIR} ${APP_DIR}.backup.\$(date +%Y%m%d_%H%M%S)
    fi

    # Create application directory
    sudo mkdir -p ${APP_DIR}
    cd ${APP_DIR}

    # Extract application
    sudo tar -xzf /tmp/dnsmasq-gui.tar.gz -C ${APP_DIR} --strip-components=0

    # Install dependencies
    sudo npm ci --production

    # Create dnsmasq-gui user if it doesn't exist
    if ! id "dnsmasq-gui" &>/dev/null; then
        sudo useradd -r -s /bin/false dnsmasq-gui
    fi

    # Set permissions
    sudo chown -R dnsmasq-gui:dnsmasq-gui ${APP_DIR}
    
    # Create environment file from example
    if [ ! -f ${APP_DIR}/.env ]; then
        sudo cp ${APP_DIR}/.env.example ${APP_DIR}/.env
        echo "⚠️  Please edit ${APP_DIR}/.env with your configuration"
    fi

    # Install systemd service
    sudo cp ${APP_DIR}/deployment/dnsmasq-gui.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}

    # Add dnsmasq-gui user to necessary groups for file access
    sudo usermod -a -G adm dnsmasq-gui
    
    # Set up DNSmasq file permissions for the GUI to manage
    sudo chgrp dnsmasq-gui /etc/dnsmasq.conf 2>/dev/null || echo "Warning: Could not change group for dnsmasq.conf"
    sudo chmod g+rw /etc/dnsmasq.conf 2>/dev/null || echo "Warning: Could not set permissions for dnsmasq.conf"
    
    # Ensure DHCP leases file exists and is accessible
    sudo touch /var/lib/dhcp/dhcpd.leases
    sudo chgrp dnsmasq-gui /var/lib/dhcp/dhcpd.leases 2>/dev/null || echo "Warning: Could not change group for dhcp leases"
    sudo chmod g+rw /var/lib/dhcp/dhcpd.leases 2>/dev/null || echo "Warning: Could not set permissions for dhcp leases"

    # Set up log directory
    sudo mkdir -p /var/log/dnsmasq-gui
    sudo chown dnsmasq-gui:dnsmasq-gui /var/log/dnsmasq-gui

    # Copy troubleshooting script
    sudo cp /tmp/troubleshoot.sh ${APP_DIR}/
    sudo chmod +x ${APP_DIR}/troubleshoot.sh
    sudo chown dnsmasq-gui:dnsmasq-gui ${APP_DIR}/troubleshoot.sh

    # Test the application before starting the service
    echo "🧪 Testing application startup..."
    cd ${APP_DIR}
    if sudo -u dnsmasq-gui timeout 10s node dist/index.js; then
        echo "✅ Application test successful"
    else
        echo "⚠️  Application test failed - check logs after deployment"
    fi

    # Install systemd service
    sudo cp ${APP_DIR}/deployment/dnsmasq-gui.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}

    # Start service
    echo "🚀 Starting service..."
    sudo systemctl start ${SERVICE_NAME}
    
    # Wait a moment and check status
    sleep 3
    if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
        echo "✅ Service started successfully"
        sudo systemctl status ${SERVICE_NAME} --no-pager
    else
        echo "❌ Service failed to start"
        echo "Recent logs:"
        sudo journalctl -u ${SERVICE_NAME} -n 20 --no-pager
    fi
EOF

# Cleanup
rm dnsmasq-gui.tar.gz

echo "✅ Deployment complete!"
echo ""
echo "Service status check:"
if ssh ${PI_USER}@${PI_HOST} "sudo systemctl is-active --quiet ${SERVICE_NAME}"; then
    echo "✅ Service is running"
else
    echo "❌ Service is not running"
    echo ""
    echo "To troubleshoot:"
    echo "  ssh ${PI_USER}@${PI_HOST}"
    echo "  sudo /opt/dnsmasq-gui/troubleshoot.sh"
fi
echo ""
echo "Next steps:"
echo "1. Edit /opt/dnsmasq-gui/.env on your Raspberry Pi"
echo "2. Access the GUI at http://192.168.10.3:3000"
echo "3. Default login: admin/admin (change this!)"
echo ""
echo "If the service is restarting, run the troubleshooting script:"
echo "  ssh ${PI_USER}@${PI_HOST} 'sudo /opt/dnsmasq-gui/troubleshoot.sh'"
