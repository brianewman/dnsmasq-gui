#!/bin/bash

# Setup script for dnsmasq static leases configuration
# This script configures dnsmasq to include our separate static leases file

STATIC_LEASES_FILE="/tmp/dnsmasq-static-leases.conf"
DNSMASQ_CONF="/etc/dnsmasq.conf"
INCLUDE_LINE="conf-file=/tmp/dnsmasq-static-leases.conf"

echo "Setting up dnsmasq static leases configuration..."

# Create the static leases file with initial empty content
if [ ! -f "$STATIC_LEASES_FILE" ]; then
    echo "Creating static leases configuration file..."
    sudo tee "$STATIC_LEASES_FILE" > /dev/null << EOF
# Static DHCP leases managed by dnsmasq-gui
# This file is auto-generated, do not edit manually

EOF
    sudo chmod 644 "$STATIC_LEASES_FILE"
    echo "Created $STATIC_LEASES_FILE"
fi

# Check if the include line already exists in dnsmasq.conf
if ! grep -q "^conf-file=/tmp/dnsmasq-static-leases.conf" "$DNSMASQ_CONF"; then
    echo "Adding static leases include to dnsmasq configuration..."
    
    # Backup the original config
    sudo cp "$DNSMASQ_CONF" "$DNSMASQ_CONF.backup.$(date +%Y%m%d-%H%M%S)"
    
    # Add the include line
    echo "" | sudo tee -a "$DNSMASQ_CONF" > /dev/null
    echo "# Include static leases managed by dnsmasq-gui" | sudo tee -a "$DNSMASQ_CONF" > /dev/null
    echo "$INCLUDE_LINE" | sudo tee -a "$DNSMASQ_CONF" > /dev/null
    
    echo "Added include line to $DNSMASQ_CONF"
else
    echo "Static leases include already configured in $DNSMASQ_CONF"
fi

# Make sure dnsmasq-gui can write to the static leases file
sudo chown root:dnsmasq-gui "$STATIC_LEASES_FILE"
sudo chmod 664 "$STATIC_LEASES_FILE"

echo "Static leases configuration setup complete!"
echo "The dnsmasq-gui application can now manage static leases in $STATIC_LEASES_FILE"
echo "Remember to restart dnsmasq: sudo systemctl restart dnsmasq"
