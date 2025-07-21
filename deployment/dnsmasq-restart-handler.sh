#!/bin/bash

# DNSmasq service restart/reload script
# This script allows the dnsmasq-gui service to request a restart or reload
# without requiring direct sudo privileges in the main process

RESTART_FLAG="/tmp/dnsmasq-restart-requested"
RESTART_RESULT="/tmp/dnsmasq-restart-result"
RELOAD_FLAG="/tmp/dnsmasq-reload-requested"
RELOAD_RESULT="/tmp/dnsmasq-reload-result"

# Clean up any existing result files
rm -f "$RESTART_RESULT"
rm -f "$RELOAD_RESULT"

# Check if reload was requested (less disruptive)
if [ -f "$RELOAD_FLAG" ]; then
    echo "$(date): Reload requested, executing..." >> /var/log/dnsmasq-gui-restart.log
    
    # Remove the request flag
    rm -f "$RELOAD_FLAG"
    
    # Try to reload dnsmasq using SIGHUP (less disruptive than restart)
    if systemctl reload dnsmasq; then
        echo "success" > "$RELOAD_RESULT"
        echo "$(date): DNSmasq reloaded successfully" >> /var/log/dnsmasq-gui-restart.log
    else
        echo "error" > "$RELOAD_RESULT" 
        echo "$(date): DNSmasq reload failed" >> /var/log/dnsmasq-gui-restart.log
    fi
    
    # Set permissions so the web service can read the result
    chmod 644 "$RELOAD_RESULT"
fi

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
