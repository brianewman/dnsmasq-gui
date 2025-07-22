#!/bin/bash

# Migration script to move CNAME records from main dnsmasq.conf to separate file
# This script should be run once during deployment to migrate existing configurations

DNSMASQ_CONF="/etc/dnsmasq.conf"
CNAME_CONF="/etc/dnsmasq.d/dnsmasq-cnames.conf"

echo "🔄 Migrating CNAME records to separate configuration file..."

# Check if main config exists
if [ ! -f "$DNSMASQ_CONF" ]; then
    echo "⚠️  Main dnsmasq.conf not found at $DNSMASQ_CONF"
    exit 0
fi

# Extract CNAME records from main config
CNAME_RECORDS=$(grep "^cname=" "$DNSMASQ_CONF" 2>/dev/null || true)

if [ -z "$CNAME_RECORDS" ]; then
    echo "ℹ️  No CNAME records found in main configuration"
else
    echo "📝 Found CNAME records in main configuration:"
    echo "$CNAME_RECORDS"
    
    # Create backup of main config
    sudo cp "$DNSMASQ_CONF" "$DNSMASQ_CONF.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Created backup of main configuration"
    
    # Create the new CNAME config file
    sudo tee "$CNAME_CONF" > /dev/null << EOF
# DNS CNAME Records managed by DNSmasq GUI
# This file is auto-generated, do not edit manually

$CNAME_RECORDS
EOF
    
    # Set proper permissions
    sudo chown root:dnsmasq-gui "$CNAME_CONF"
    sudo chmod 664 "$CNAME_CONF"
    
    # Remove CNAME records from main config
    sudo sed -i '/^cname=/d' "$DNSMASQ_CONF"
    
    # Remove any empty lines that might be left
    sudo sed -i '/^$/N;/^\n$/d' "$DNSMASQ_CONF"
    
    echo "✅ Migrated CNAME records to $CNAME_CONF"
    echo "✅ Removed CNAME records from main configuration"
fi

# Ensure the dnsmasq.d directory is included in main config
if ! grep -q "^conf-dir=/etc/dnsmasq.d" "$DNSMASQ_CONF"; then
    echo "📂 Adding dnsmasq.d directory inclusion to main config..."
    echo "" | sudo tee -a "$DNSMASQ_CONF" > /dev/null
    echo "# Include additional configuration files" | sudo tee -a "$DNSMASQ_CONF" > /dev/null
    echo "conf-dir=/etc/dnsmasq.d" | sudo tee -a "$DNSMASQ_CONF" > /dev/null
    echo "✅ Added conf-dir directive to main configuration"
else
    echo "ℹ️  conf-dir directive already present in main configuration"
fi

echo "🎉 CNAME migration completed successfully!"
echo ""
echo "CNAME records are now managed in: $CNAME_CONF"
echo "Main configuration backed up with timestamp"
