#!/bin/bash

# Create deployment package for DNSmasq GUI
# Run this script from the project root directory

echo "Creating DNSmasq GUI deployment package..."

# Clean any existing deployment archives
rm -f dnsmasq-gui-deployment.tar.gz

# Create tar.gz archive (Linux-friendly)
tar -czf dnsmasq-gui-deployment.tar.gz \
    --exclude='deployment/UPDATE_INSTRUCTIONS.md' \
    --exclude='deployment/create-deployment.sh' \
    package.json \
    package-lock.json \
    dist/ \
    public/ \
    deployment/

echo "✓ Created dnsmasq-gui-deployment.tar.gz"
echo ""
echo "Deployment package ready:"
echo "  - dnsmasq-gui-deployment.tar.gz (Linux deployment)"
echo ""
echo "Upload to Pi with:"
echo "  scp dnsmasq-gui-deployment.tar.gz pi@192.168.10.3:/tmp/"
