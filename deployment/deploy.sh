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

# Check if we should create a full deployment package or just update files
if [ "$1" == "--update-only" ]; then
    echo "🔄 Performing update-only deployment..."
    
    # Copy built files to temporary location on Pi
    echo "📁 Copying dist files..."
    scp -r dist/* ${PI_USER}@${PI_HOST}:/tmp/dnsmasq-gui-dist-update/
    
    echo "📁 Copying public files..."
    scp -r public/* ${PI_USER}@${PI_HOST}:/tmp/dnsmasq-gui-public-update/
    
    # Deploy the updates
    ssh ${PI_USER}@${PI_HOST} << 'EOF'
        echo "🔄 Updating application files..."
        
        # Stop service
        sudo systemctl stop dnsmasq-gui
        
        # Update files
        sudo rsync -av /tmp/dnsmasq-gui-dist-update/ /opt/dnsmasq-gui/dist/
        sudo rsync -av /tmp/dnsmasq-gui-public-update/ /opt/dnsmasq-gui/public/
        
        # Fix permissions
        sudo chown -R dnsmasq-gui:dnsmasq-gui /opt/dnsmasq-gui/dist/
        sudo chown -R dnsmasq-gui:dnsmasq-gui /opt/dnsmasq-gui/public/
        
        # Start service
        sudo systemctl start dnsmasq-gui
        
        # Cleanup
        rm -rf /tmp/dnsmasq-gui-dist-update /tmp/dnsmasq-gui-public-update
        
        # Check status
        sleep 3
        if sudo systemctl is-active --quiet dnsmasq-gui; then
            echo "✅ Service restarted successfully"
        else
            echo "❌ Service failed to restart"
            sudo journalctl -u dnsmasq-gui -n 10 --no-pager
        fi
EOF
    
    echo "✅ Update deployment complete!"
    exit 0
fi

# Full deployment process
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
ssh ${PI_USER}@${PI_HOST} << 'EOF'
    # Stop existing service
    sudo systemctl stop dnsmasq-gui || true

    # Backup existing installation if it exists
    if [ -d "/opt/dnsmasq-gui" ]; then
        sudo mv /opt/dnsmasq-gui /opt/dnsmasq-gui.backup.$(date +%Y%m%d_%H%M%S)
    fi

    # Create application directory
    sudo mkdir -p /opt/dnsmasq-gui
    cd /opt/dnsmasq-gui

    # Extract application
    sudo tar -xzf /tmp/dnsmasq-gui.tar.gz -C /opt/dnsmasq-gui --strip-components=0

    # Install dependencies (skip if node_modules exists and package-lock.json hasn't changed)
    echo "📦 Installing dependencies..."
    sudo npm ci --production --silent

    # Create dnsmasq-gui user if it doesn't exist
    if ! id "dnsmasq-gui" &>/dev/null; then
        echo "👤 Creating dnsmasq-gui user..."
        sudo useradd -r -s /bin/false dnsmasq-gui
    fi

    # Set permissions
    sudo chown -R dnsmasq-gui:dnsmasq-gui /opt/dnsmasq-gui
    
    # Create environment file from example if it doesn't exist
    if [ ! -f /opt/dnsmasq-gui/.env ]; then
        sudo cp /opt/dnsmasq-gui/.env.example /opt/dnsmasq-gui/.env
        sudo chown dnsmasq-gui:dnsmasq-gui /opt/dnsmasq-gui/.env
        echo "⚠️  Please edit /opt/dnsmasq-gui/.env with your configuration"
    fi

    # Install systemd service
    echo "⚙️  Installing systemd service..."
    sudo cp /opt/dnsmasq-gui/deployment/dnsmasq-gui.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable dnsmasq-gui

    # Set up permissions for DNSmasq file management
    echo "🔐 Setting up file permissions..."
    
    # Add dnsmasq-gui user to necessary groups
    sudo usermod -a -G adm dnsmasq-gui
    
    # Set up DNSmasq configuration directories
    sudo mkdir -p /etc/dnsmasq.d
    sudo chown root:dnsmasq-gui /etc/dnsmasq.d
    sudo chmod 775 /etc/dnsmasq.d
    
    # Set up main dnsmasq.conf permissions
    if [ -f /etc/dnsmasq.conf ]; then
        sudo chgrp dnsmasq-gui /etc/dnsmasq.conf
        sudo chmod g+rw /etc/dnsmasq.conf
    fi
    
    # Create and set up hosts file
    sudo touch /etc/dnsmasq.hosts
    sudo chown root:dnsmasq-gui /etc/dnsmasq.hosts
    sudo chmod 664 /etc/dnsmasq.hosts
    
    # Ensure DHCP leases file exists and is accessible
    sudo mkdir -p /var/lib/dhcp
    sudo touch /var/lib/dhcp/dhcpd.leases
    sudo chgrp dnsmasq-gui /var/lib/dhcp/dhcpd.leases
    sudo chmod g+rw /var/lib/dhcp/dhcpd.leases

    # Set up log directory
    sudo mkdir -p /var/log/dnsmasq-gui
    sudo chown dnsmasq-gui:dnsmasq-gui /var/log/dnsmasq-gui

    # Set up static leases configuration
    echo "🔧 Setting up DNSmasq configuration files..."
    if [ -f "/opt/dnsmasq-gui/deployment/setup-static-leases.sh" ]; then
        bash /opt/dnsmasq-gui/deployment/setup-static-leases.sh
    fi

    # Install restart handler system (for reload/restart functionality)
    echo "🔧 Setting up DNSmasq restart handlers..."
    
    # Install sudo scripts for restart/reload operations
    sudo cp /opt/dnsmasq-gui/deployment/dnsmasq-gui-sudoers /etc/sudoers.d/dnsmasq-gui
    sudo chmod 440 /etc/sudoers.d/dnsmasq-gui
    
    # Create restart/reload scripts that work with NoNewPrivileges
    sudo tee /usr/local/bin/dnsmasq-restart > /dev/null << 'RESTART_SCRIPT'
#!/bin/bash
systemctl restart dnsmasq
RESTART_SCRIPT
    
    sudo tee /usr/local/bin/dnsmasq-reload > /dev/null << 'RELOAD_SCRIPT'
#!/bin/bash
systemctl reload dnsmasq
RELOAD_SCRIPT
    
    sudo chmod +x /usr/local/bin/dnsmasq-restart /usr/local/bin/dnsmasq-reload

    # Test the application before starting the service
    echo "🧪 Testing application startup..."
    cd /opt/dnsmasq-gui
    if sudo -u dnsmasq-gui timeout 10s node dist/index.js 2>/dev/null; then
        echo "✅ Application test successful"
    else
        echo "⚠️  Application test failed - will attempt to start service anyway"
    fi

EOF

# Handle different deployment modes
if [[ "$1" == "--update-only" ]]; then
    echo "🔄 Performing update-only deployment..."
    ssh ${PI_USER}@${PI_HOST} << 'EOF'
        # Update deployment mode - only replace application files
        echo "🔄 Updating application files..."
        
        # Stop service
        sudo systemctl stop dnsmasq-gui || true
        
        # Backup current dist directory
        if [ -d "/opt/dnsmasq-gui/dist" ]; then
            sudo mv /opt/dnsmasq-gui/dist /opt/dnsmasq-gui/dist.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        # Extract only the application files (dist and public directories)
        cd /opt/dnsmasq-gui
        sudo tar -xzf /tmp/dnsmasq-gui.tar.gz -C /opt/dnsmasq-gui --strip-components=0 dist/ public/ package.json
        
        # Update npm dependencies if package.json changed
        sudo npm ci --production --silent
        
        # Ensure proper ownership
        sudo chown -R dnsmasq-gui:dnsmasq-gui /opt/dnsmasq-gui/dist /opt/dnsmasq-gui/public
        
        echo "✅ Application files updated"
EOF
else
    echo "🏗️  Performing full deployment..."
    # The full deployment logic above already ran
fi

# Start the service
echo "🚀 Starting service..."
ssh ${PI_USER}@${PI_HOST} << 'EOF'
    # Start the service
    sudo systemctl start dnsmasq-gui
    
    # Wait a moment for startup
    sleep 3
    
    # Check service status
    if sudo systemctl is-active --quiet dnsmasq-gui; then
        echo "✅ DNSmasq GUI service is running"
        
        # Show service status
        echo "📊 Service Status:"
        sudo systemctl status dnsmasq-gui --no-pager -l
        
        # Show recent logs
        echo ""
        echo "📋 Recent Logs (last 10 lines):"
        sudo journalctl -u dnsmasq-gui --no-pager -n 10
        
    else
        echo "❌ DNSmasq GUI service failed to start"
        echo "📋 Error Logs:"
        sudo journalctl -u dnsmasq-gui --no-pager -n 20
        exit 1
    fi
EOF

EOF

# Cleanup
rm dnsmasq-gui.tar.gz

# Final status check and completion message
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "📍 Service is running at: http://${PI_HOST}:3000"
    echo ""
    echo "💡 Useful commands:"
    echo "   View logs: ssh ${PI_USER}@${PI_HOST} 'sudo journalctl -u dnsmasq-gui -f'"
    echo "   Restart service: ssh ${PI_USER}@${PI_HOST} 'sudo systemctl restart dnsmasq-gui'"
    echo "   Update only: $0 --update-only"
    echo ""
    echo "🔐 Default login: admin/admin (change this in the web interface!)"
    echo ""
    if [[ "$1" != "--update-only" ]]; then
        echo "⚙️  Don't forget to configure your environment in /opt/dnsmasq-gui/.env if needed"
    fi
else
    echo ""
    echo "❌ Deployment failed! Check the logs above for details."
    exit 1
fi
