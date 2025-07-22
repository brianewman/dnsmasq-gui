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

# Test SSH connection first
echo "🔌 Testing SSH connection to ${PI_HOST}..."

# Define SSH key path - handle both Windows and Unix environments
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -d "/mnt/c/Users" ]]; then
    # Windows environment (Git Bash/MSYS/Cygwin)
    # Try multiple Windows SSH key locations
    WINDOWS_USER=$(whoami)
    SSH_KEY_PATH="/mnt/c/Users/$WINDOWS_USER/.ssh/id_rsa"
    # Also try the USERPROFILE path if it exists
    if [ -n "$USERPROFILE" ] && [ -f "$USERPROFILE/.ssh/id_rsa" ]; then
        SSH_KEY_PATH="$USERPROFILE/.ssh/id_rsa"
    fi
else
    # Unix environment
    SSH_KEY_PATH="$HOME/.ssh/id_rsa"
fi


echo "Looking for SSH key at: $SSH_KEY_PATH"

# Create a temporary copy of the SSH key with proper permissions if needed
TEMP_KEY_PATH=""
if [ -f "$SSH_KEY_PATH" ]; then
    # Check if the key has bad permissions (Windows filesystem issue)
    if [[ "$(stat -c %a "$SSH_KEY_PATH" 2>/dev/null)" == "777" ]] || [[ "$(ls -la "$SSH_KEY_PATH" | cut -c1-10)" == "-rwxrwxrwx" ]]; then
        echo "⚠️  SSH key has insecure permissions, creating temporary copy..."
        TEMP_KEY_PATH="/tmp/ssh_key_$$"
        cp "$SSH_KEY_PATH" "$TEMP_KEY_PATH"
        chmod 600 "$TEMP_KEY_PATH"
        SSH_KEY_PATH="$TEMP_KEY_PATH"
    fi
fi

# Test SSH connection - try without explicit key first (relies on SSH agent or default discovery)
if ssh -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no ${PI_USER}@${PI_HOST} "echo 'Connection test successful'" >/dev/null 2>&1; then
    echo "✅ SSH connection successful (using default key discovery)"
    # Use BatchMode without explicit key for authentication
    BATCH_MODE="-o BatchMode=yes"
elif [ -f "$SSH_KEY_PATH" ] && ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no ${PI_USER}@${PI_HOST} "echo 'Connection test successful'" >/dev/null 2>&1; then
    echo "✅ SSH connection successful (using explicit key)"
    # Use BatchMode with explicit key for authentication
    BATCH_MODE="-i $SSH_KEY_PATH -o BatchMode=yes"
else
    echo ""
    echo "❌ SSH key authentication failed!"
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "SSH key not found at: $SSH_KEY_PATH"
    else
        echo "SSH key exists but authentication failed"
    fi
    echo ""
    echo "You have two options:"
    echo ""
    echo "1. 🔐 Set up SSH key authentication (recommended):"
    echo "   - Run: .\deployment\setup-ssh.ps1"
    echo "   - Or manually follow the setup instructions"
    echo ""
    echo "2. ⚠️  Continue with password authentication (less secure):"
    echo "   - This will prompt for your password multiple times"
    echo "   - Use this option only for testing"
    echo ""
    echo -n "Continue with password authentication? (y/N): "
    read -r CONTINUE_WITH_PASSWORD
    
    if [[ "$CONTINUE_WITH_PASSWORD" =~ ^[Yy]$ ]]; then
        echo "⚠️  Proceeding with password authentication..."
        # Remove BatchMode for password authentication
        BATCH_MODE=""
    else
        echo ""
        echo "Please set up SSH key authentication first:"
        echo "   .\deployment\setup-ssh.ps1"
        echo ""
        exit 1
    fi
fi

# Check if this is an update-only deployment
if [ "$1" == "--update-only" ]; then
    echo "🔄 Performing update-only deployment..."
    
    # Create a minimal package for update
    tar -czf dnsmasq-gui-update.tar.gz dist/ public/ package.json
    
    # Copy to Raspberry Pi
    scp -o ConnectTimeout=30 $BATCH_MODE dnsmasq-gui-update.tar.gz ${PI_USER}@${PI_HOST}:/tmp/
    
    # Deploy the updates
    ssh -o ConnectTimeout=30 $BATCH_MODE ${PI_USER}@${PI_HOST} << 'EOF'
        echo "🔄 Updating application files..."
        
        # Stop service
        sudo systemctl stop dnsmasq-gui
        
        # Backup current dist directory
        if [ -d "/opt/dnsmasq-gui/dist" ]; then
            sudo mv /opt/dnsmasq-gui/dist /opt/dnsmasq-gui/dist.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        # Extract update files
        cd /opt/dnsmasq-gui
        sudo tar -xzf /tmp/dnsmasq-gui-update.tar.gz -C /opt/dnsmasq-gui --strip-components=0
        
        # Update npm dependencies if package.json changed
        sudo npm ci --production --silent
        
        # Ensure proper ownership
        sudo chown -R dnsmasq-gui:dnsmasq-gui /opt/dnsmasq-gui/dist /opt/dnsmasq-gui/public
        
        # Start service
        sudo systemctl start dnsmasq-gui
        
        # Cleanup
        rm -f /tmp/dnsmasq-gui-update.tar.gz
        
        # Check status
        sleep 3
        if sudo systemctl is-active --quiet dnsmasq-gui; then
            echo "✅ Service restarted successfully"
            echo "📊 Service Status:"
            sudo systemctl status dnsmasq-gui --no-pager -l
        else
            echo "❌ Service failed to restart"
            echo "📋 Error Logs:"
            sudo journalctl -u dnsmasq-gui -n 10 --no-pager
        fi
EOF
    
    # Cleanup local file
    rm dnsmasq-gui-update.tar.gz
    
    echo "✅ Update deployment complete!"
    echo "📍 Service is running at: http://${PI_HOST}:3000"
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
scp -o ConnectTimeout=30 $BATCH_MODE dnsmasq-gui.tar.gz ${PI_USER}@${PI_HOST}:/tmp/

# Also copy troubleshooting script
echo "📋 Copying troubleshooting script..."
scp -o ConnectTimeout=30 $BATCH_MODE deployment/troubleshoot.sh ${PI_USER}@${PI_HOST}:/tmp/

# Deploy on Raspberry Pi
echo "🎯 Deploying on Raspberry Pi..."
ssh -o ConnectTimeout=30 $BATCH_MODE ${PI_USER}@${PI_HOST} << 'EOF'
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
    
    # Start the application in the background and capture the PID
    sudo -u dnsmasq-gui node dist/index.js &
    APP_PID=$!
    
    # Wait a few seconds for startup
    sleep 3
    
    # Check if the process is still running
    if kill -0 $APP_PID 2>/dev/null; then
        echo "✅ Application test successful (PID: $APP_PID)"
        # Kill the test process
        kill $APP_PID 2>/dev/null || true
        wait $APP_PID 2>/dev/null || true
    else
        echo "⚠️  Application test failed - process exited during startup"
        echo "📋 Checking for any error output..."
        # The process already exited, no need to kill it
    fi

EOF

# Start the service
echo "🚀 Starting service..."
ssh -o ConnectTimeout=30 $BATCH_MODE ${PI_USER}@${PI_HOST} << 'EOF'
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

# Cleanup
rm dnsmasq-gui.tar.gz

# Cleanup temporary SSH key if created
if [ -n "$TEMP_KEY_PATH" ] && [ -f "$TEMP_KEY_PATH" ]; then
    rm "$TEMP_KEY_PATH"
fi

# Final status check and completion message
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
echo "⚙️  Don't forget to configure your environment in /opt/dnsmasq-gui/.env if needed"
