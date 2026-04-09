#!/bin/sh

# Clean up function
cleanup() {
    echo "🛑 Shutting down Keystone LAN Services..."
    [ -n "$DNSMASQ_PID" ] && kill $DNSMASQ_PID
    [ -n "$GUI_PID" ] && kill $GUI_PID
    # Use pkill for chrony since it might have changed PIDs
    pkill chronyd
    exit 0
}

# Trap signals
trap cleanup INT TERM

# Start dnsmasq in the background
echo "🌐 Starting DNSmasq..."
dnsmasq --keep-in-foreground &
DNSMASQ_PID=$!

# Start the Node.js GUI
echo "🚀 Starting Keystone LAN Services..."
node dist/index.js &
GUI_PID=$!

# Chrony initialization
if [ -f /etc/chrony/chrony.conf ]; then
    echo "🕒 Starting NTP (Chrony)..."
    # Start chrony in foreground for the logs, or omit -d to let it daemonize
    # We'll use daemon mode so the service management in Node works better
    chronyd
fi

# Keep the script running
wait
