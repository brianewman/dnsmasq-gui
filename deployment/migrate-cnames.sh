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
    
    # Check if domain expansion is configured and fix CNAME records if needed
    DOMAIN_SUFFIX=$(grep "^domain=" "$DNSMASQ_CONF" 2>/dev/null | cut -d'=' -f2 | tr -d ' ')
    EXPAND_HOSTS=$(grep "^expand-hosts" "$DNSMASQ_CONF" 2>/dev/null)
    
    if [ -n "$DOMAIN_SUFFIX" ] && [ -n "$EXPAND_HOSTS" ]; then
        echo "🔧 Domain expansion detected (domain=$DOMAIN_SUFFIX), updating CNAME format..."
        
        # Create a temporary file with domain-expanded CNAME records
        sudo awk -v domain="$DOMAIN_SUFFIX" '
        BEGIN { 
            print "# DNS CNAME Records managed by DNSmasq GUI"
            print "# This file is auto-generated, do not edit manually"
            print ""
        }
        /^cname=/ { 
            sub(/^cname=/, "")
            split($0, parts, ",")
            alias = parts[1]
            target = parts[2]
            
            # Add domain suffix if not already present
            if (alias !~ /\./) alias = alias "." domain
            if (target !~ /\./) target = target "." domain
            
            print "cname=" alias "," target
        }
        ' "$CNAME_CONF" | sudo tee "$CNAME_CONF.tmp" > /dev/null
        
        sudo mv "$CNAME_CONF.tmp" "$CNAME_CONF"
        echo "✅ Updated CNAME records with domain expansion"
    fi
    
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

# Restart DNSmasq to load the new CNAME configuration
echo "🔄 Restarting DNSmasq to load new CNAME configuration..."
if systemctl is-active --quiet dnsmasq; then
    sudo systemctl restart dnsmasq
    if [ $? -eq 0 ]; then
        echo "✅ DNSmasq restarted successfully"
    else
        echo "⚠️  DNSmasq restart failed - you may need to restart manually"
    fi
else
    echo "ℹ️  DNSmasq is not running - it will load the new configuration when started"
fi
