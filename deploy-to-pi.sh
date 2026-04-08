#!/bin/bash
# Wrapper for dnsmasq-gui deployment
# Usage: ./deploy-to-pi.sh [hostname] [user] [--update-only]

set -e

# Check for required target IP/hostname
if [ -z "$1" ]; then
    echo "❌ Error: Target IP address or hostname is required."
    echo "Usage: ./deploy-to-pi.sh [hostname-or-ip] [user] [--update-only]"
    echo "Example: ./deploy-to-pi.sh 192.168.1.50 pi"
    exit 1
fi

PI_HOST="$1"
PI_USER=${2:-"pi"}
EXTRA_ARGS=""

# Shift to check for additional flags like --update-only
if [[ "$3" == "--update-only" ]]; then
    EXTRA_ARGS="--update-only"
fi

echo "🚀 Launching deployment for $PI_USER@$PI_HOST..."
bash deployment/deploy.sh --host "$PI_HOST" --user "$PI_USER" $EXTRA_ARGS
