#!/bin/bash

# Diagnostic script to troubleshoot DNSmasq GUI sudoers configuration
# Run this script on the Raspberry Pi to check sudoers setup

echo "🔍 DNSmasq GUI Sudoers Diagnostic"
echo "=================================="
echo ""

# Check if sudoers file exists
echo "1. Checking sudoers file existence..."
if [ -f "/etc/sudoers.d/dnsmasq-gui" ]; then
    echo "✅ Sudoers file exists: /etc/sudoers.d/dnsmasq-gui"
else
    echo "❌ Sudoers file NOT found: /etc/sudoers.d/dnsmasq-gui"
    echo ""
    echo "To fix this, run the deployment script or manually copy the file:"
    echo "  sudo cp /opt/dnsmasq-gui/deployment/dnsmasq-gui-sudoers /etc/sudoers.d/dnsmasq-gui"
    echo "  sudo chmod 440 /etc/sudoers.d/dnsmasq-gui"
    exit 1
fi

# Check file permissions
echo ""
echo "2. Checking file permissions..."
PERMS=$(stat -c "%a" /etc/sudoers.d/dnsmasq-gui)
if [ "$PERMS" = "440" ]; then
    echo "✅ Correct permissions: 440"
else
    echo "❌ Wrong permissions: $PERMS (should be 440)"
    echo "To fix: sudo chmod 440 /etc/sudoers.d/dnsmasq-gui"
fi

# Check file ownership
echo ""
echo "3. Checking file ownership..."
OWNER=$(stat -c "%U:%G" /etc/sudoers.d/dnsmasq-gui)
if [ "$OWNER" = "root:root" ]; then
    echo "✅ Correct ownership: root:root"
else
    echo "❌ Wrong ownership: $OWNER (should be root:root)"
    echo "To fix: sudo chown root:root /etc/sudoers.d/dnsmasq-gui"
fi

# Check file content
echo ""
echo "4. Sudoers file content:"
echo "------------------------"
cat /etc/sudoers.d/dnsmasq-gui
echo "------------------------"

# Validate sudoers syntax
echo ""
echo "5. Validating sudoers syntax..."
if sudo visudo -c -f /etc/sudoers.d/dnsmasq-gui >/dev/null 2>&1; then
    echo "✅ Sudoers syntax is valid"
else
    echo "❌ Sudoers syntax is INVALID!"
    echo "Error details:"
    sudo visudo -c -f /etc/sudoers.d/dnsmasq-gui
    echo ""
    echo "This is likely due to Windows line endings. To fix:"
    echo "  sudo dos2unix /etc/sudoers.d/dnsmasq-gui"
fi

# Check if dnsmasq-gui user exists
echo ""
echo "6. Checking dnsmasq-gui user..."
if id "dnsmasq-gui" &>/dev/null; then
    echo "✅ User 'dnsmasq-gui' exists"
    echo "   User info: $(id dnsmasq-gui)"
else
    echo "❌ User 'dnsmasq-gui' does NOT exist"
    echo "To fix: sudo useradd -r -s /bin/false dnsmasq-gui"
fi

# Test sudo permissions (if running as dnsmasq-gui user)
echo ""
echo "7. Testing sudo permissions..."
CURRENT_USER=$(whoami)
if [ "$CURRENT_USER" = "dnsmasq-gui" ]; then
    echo "Testing as dnsmasq-gui user..."
    
    # Test systemctl commands
    if sudo -n systemctl status dnsmasq >/dev/null 2>&1; then
        echo "✅ Can run 'sudo systemctl status dnsmasq' without password"
    else
        echo "❌ Cannot run 'sudo systemctl status dnsmasq' without password"
    fi
    
    if sudo -n systemctl --dry-run restart dnsmasq >/dev/null 2>&1; then
        echo "✅ Can run 'sudo systemctl restart dnsmasq' without password"
    else
        echo "❌ Cannot run 'sudo systemctl restart dnsmasq' without password"
    fi
else
    echo "ℹ️  Currently running as: $CURRENT_USER"
    echo "   To test as dnsmasq-gui user, run:"
    echo "   sudo -u dnsmasq-gui $0"
fi

# Check systemctl paths
echo ""
echo "8. Checking systemctl paths..."
SYSTEMCTL_PATH=$(which systemctl)
echo "   systemctl location: $SYSTEMCTL_PATH"

if [ -x "/bin/systemctl" ]; then
    echo "✅ /bin/systemctl exists"
else
    echo "⚠️  /bin/systemctl not found"
fi

if [ -x "/usr/bin/systemctl" ]; then
    echo "✅ /usr/bin/systemctl exists"
else
    echo "⚠️  /usr/bin/systemctl not found"
fi

# Check custom scripts
echo ""
echo "9. Checking custom restart/reload scripts..."
if [ -x "/usr/local/bin/dnsmasq-restart" ]; then
    echo "✅ /usr/local/bin/dnsmasq-restart exists and is executable"
else
    echo "❌ /usr/local/bin/dnsmasq-restart missing or not executable"
fi

if [ -x "/usr/local/bin/dnsmasq-reload" ]; then
    echo "✅ /usr/local/bin/dnsmasq-reload exists and is executable"
else
    echo "❌ /usr/local/bin/dnsmasq-reload missing or not executable"
fi

echo ""
echo "🎯 Diagnostic complete!"
echo ""
echo "📋 Common fixes:"
echo "   1. Fix line endings: sudo dos2unix /etc/sudoers.d/dnsmasq-gui"
echo "   2. Fix permissions: sudo chmod 440 /etc/sudoers.d/dnsmasq-gui"
echo "   3. Validate syntax: sudo visudo -c -f /etc/sudoers.d/dnsmasq-gui"
echo "   4. Test permissions: sudo -u dnsmasq-gui sudo -n systemctl status dnsmasq"
