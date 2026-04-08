#!/bin/bash
# Pre-deployment setup script for Raspberry Pi
# Run this on the Raspberry Pi before deploying the DNSmasq GUI

set -e

echo "🍓 Setting up Raspberry Pi for DNSmasq GUI deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository for latest LTS)
echo "🟢 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed: $(node --version)"
fi

# Verify npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js manually."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install system dependencies and NTP
echo "🔧 Installing system dependencies and NTP..."
sudo apt install -y \
    curl \
    wget \
    git \
    tar \
    gzip \
    systemd \
    sudo \
    chrony

# Install and configure NTP (Chrony)
echo "🕒 Configuring NTP (Chrony)..."
sudo systemctl enable chrony
sudo systemctl start chrony
# Allow the local subnet (this script assumes a typical /24 network for now)
echo "allow 192.168.0.0/16" | sudo tee -a /etc/chrony/chrony.conf > /dev/null
echo "allow 10.0.0.0/8" | sudo tee -a /etc/chrony/chrony.conf > /dev/null
echo "allow 172.16.0.0/12" | sudo tee -a /etc/chrony/chrony.conf > /dev/null
sudo systemctl restart chrony

# Ensure dnsmasq daemon package is installed
# (Sometimes only dnsmasq-base is installed as a dependency, which lacks the service and config files)
echo "🌐 Ensuring the full DNSmasq package is installed..."
sudo apt install -y dnsmasq
echo "✅ DNSmasq version: $(dnsmasq --version | head -1)"

# Stop dnsmasq for now (will be managed by systemd)
echo "⏸️ Stopping DNSmasq service..."
sudo systemctl stop dnsmasq || true
sudo systemctl disable dnsmasq || true

# Create necessary directories with proper permissions
echo "📁 Setting up directories..."
sudo mkdir -p /etc/dnsmasq.d
sudo mkdir -p /var/lib/dhcp
sudo mkdir -p /var/log

# Set up proper permissions for dnsmasq files
echo "🔒 Setting up file permissions..."
sudo touch /etc/dnsmasq.conf
sudo chown root:root /etc/dnsmasq.conf
sudo chmod 644 /etc/dnsmasq.conf

# Create dhcp leases file if it doesn't exist
sudo touch /var/lib/dhcp/dhcpd.leases
sudo chown root:root /var/lib/dhcp/dhcpd.leases
sudo chmod 644 /var/lib/dhcp/dhcpd.leases

# Set up log rotation for DNSmasq
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/dnsmasq-gui << 'LOGROTATE_EOF'
/var/log/dnsmasq-gui/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 dnsmasq-gui dnsmasq-gui
    postrotate
        systemctl reload dnsmasq-gui || true
    endscript
}
LOGROTATE_EOF

# Configure firewall (if ufw is enabled)
echo "🔥 Configuring firewall..."
if systemctl is-active --quiet ufw; then
    echo "UFW is active, adding rules..."
    sudo ufw allow 3000/tcp comment "DNSmasq GUI"
    sudo ufw allow 53/udp comment "DNS"
    sudo ufw allow 67/udp comment "DHCP"
    sudo ufw allow 123/udp comment "NTP"
else
    echo "UFW is not active, skipping firewall configuration"
fi

# Display system information
echo ""
echo "🏁 Pre-deployment setup complete!"
echo ""
echo "System Information:"
echo "=================="
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "Kernel: $(uname -r)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "DNSmasq: $(dnsmasq --version 2>&1 | head -1)"
echo ""
echo "Your Raspberry Pi is now ready for DNSmasq GUI deployment!"
echo "Run the deploy.sh script from your development machine."
