#!/bin/bash

# Install sudoers configuration for DNSmasq GUI service restart functionality
# Run this script with sudo privileges on the target system

echo "Installing DNSmasq GUI sudoers configuration..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 
   exit 1
fi

# Copy the sudoers file to the correct location
cp dnsmasq-gui-sudoers /etc/sudoers.d/dnsmasq-gui

# Set correct permissions (must be 0440 for sudoers files)
chmod 0440 /etc/sudoers.d/dnsmasq-gui

# Validate the sudoers file
if visudo -c -f /etc/sudoers.d/dnsmasq-gui; then
    echo "✓ Sudoers configuration installed successfully"
    echo "✓ DNSmasq GUI service can now restart DNSmasq without password prompts"
    echo ""
    echo "The following permissions have been granted to user 'dnsmasq-gui':"
    echo "  - systemctl restart dnsmasq (NOPASSWD)"
    echo "  - systemctl status dnsmasq (NOPASSWD)"
else
    echo "❌ Error: Invalid sudoers configuration!"
    rm -f /etc/sudoers.d/dnsmasq-gui
    echo "Installation aborted to prevent sudo issues"
    exit 1
fi

echo "Installation complete!"
