#!/bin/bash

# Test script to verify CNAME domain handling functionality

echo "🧪 Testing CNAME domain handling functionality..."

PI_HOST="192.168.10.3"

echo ""
echo "📋 Current CNAME configuration:"
ssh pi@${PI_HOST} "cat /etc/dnsmasq.d/dnsmasq-cnames.conf"

echo ""
echo "📋 Current domain configuration:"
ssh pi@${PI_HOST} "grep 'domain=' /etc/dnsmasq.d/dnsmasq-advanced.conf 2>/dev/null || echo 'No domain configured'"

echo ""
echo "🔧 Setting a test domain (example.com) for testing..."
# This would typically be done through the web interface, but for testing we can set it directly

echo ""
echo "💡 To test the functionality:"
echo "1. Go to Advanced Settings and set a domain name (e.g., 'example.com')"
echo "2. Go to DNS Records and add a record with aliases like 'www' and 'mail'"
echo "3. Check the CNAME file to see if 'www.example.com' and 'mail.example.com' are written"
echo "4. Reload the web interface to see if the bare hostnames 'www' and 'mail' are displayed"
echo ""
echo "📍 Web interface: http://${PI_HOST}:3000"
