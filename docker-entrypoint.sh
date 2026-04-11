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

# Bootstrap configuration if files are missing (first run)
if [ ! -f /app/configs/dnsmasq.conf ]; then
    echo "📦 Initializing default configuration files..."
    cp -rn /app/examples/configs/* /app/configs/
fi

if [ ! -f /app/data/oui-database.json ]; then
    echo "📦 Initializing default data files..."
    cp -rn /app/examples/data/* /app/data/
fi

# Link configuration to system locations
ln -sf /app/configs/dnsmasq.conf /etc/dnsmasq.conf
rm -rf /etc/dnsmasq.d && ln -sf /app/configs/dnsmasq.d /etc/dnsmasq.d
ln -sf /app/configs/hosts /etc/dnsmasq.hosts
ln -sf /app/configs/chrony.conf /etc/chrony/chrony.conf

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
