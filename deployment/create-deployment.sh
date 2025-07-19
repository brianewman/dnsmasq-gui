#!/bin/bash

# Create deployment package for DNSmasq GUI
# Run this script from the project root directory

echo "Creating DNSmasq GUI deployment package..."

# Clean any existing deployment archives
rm -f dnsmasq-gui-deployment.tar.gz dnsmasq-gui-deployment.zip

# Create tar.gz archive (Linux-friendly)
tar -czf dnsmasq-gui-deployment.tar.gz \
    package.json \
    package-lock.json \
    dist/ \
    public/ \
    deployment/ \
    --exclude=deployment/UPDATE_INSTRUCTIONS.md \
    --exclude=deployment/create-deployment.sh

echo "✓ Created dnsmasq-gui-deployment.tar.gz"

# Also create zip as fallback
zip -r dnsmasq-gui-deployment.zip \
    package.json \
    package-lock.json \
    dist/ \
    public/ \
    deployment/ \
    -x "deployment/UPDATE_INSTRUCTIONS.md" "deployment/create-deployment.sh"

echo "✓ Created dnsmasq-gui-deployment.zip (fallback)"
echo ""
echo "Deployment packages ready:"
echo "  - dnsmasq-gui-deployment.tar.gz (recommended for Linux)"
echo "  - dnsmasq-gui-deployment.zip (Windows/fallback)"
echo ""
echo "Upload to Pi with:"
echo "  scp dnsmasq-gui-deployment.tar.gz pi@192.168.10.3:/tmp/"
