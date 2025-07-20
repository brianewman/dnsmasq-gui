#!/bin/bash

# DNSmasq service restart script
# This script allows the dnsmasq-gui service to request a restart
# without requiring direct sudo privileges in the main process

RESTART_FLAG="/tmp/dnsmasq-restart-requested"
RESTART_RESULT="/tmp/dnsmasq-restart-result"

# Clean up any existing flag files
rm -f "$RESTART_RESULT"

# Check if restart was requested
if [ -f "$RESTART_FLAG" ]; then
    echo "$(date): Restart requested, executing..." >> /var/log/dnsmasq-gui-restart.log
    
    # Remove the request flag
    rm -f "$RESTART_FLAG"
    
    # Try to restart dnsmasq
    if systemctl restart dnsmasq; then
        echo "success" > "$RESTART_RESULT"
        echo "$(date): DNSmasq restarted successfully" >> /var/log/dnsmasq-gui-restart.log
    else
        echo "error" > "$RESTART_RESULT" 
        echo "$(date): DNSmasq restart failed" >> /var/log/dnsmasq-gui-restart.log
    fi
    
    # Set permissions so the web service can read the result
    chmod 644 "$RESTART_RESULT"
fi
