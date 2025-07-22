#!/bin/bash
# SSH Setup Helper for DNSmasq GUI Deployment

echo "🔐 SSH Setup Helper for Raspberry Pi Deployment"
echo "=============================================="

PI_USER="pi"
PI_HOST="192.168.10.3"

echo ""
echo "This script will help you set up SSH key authentication for deployment."
echo "Target: ${PI_USER}@${PI_HOST}"
echo ""

# Test current connection
echo "🔌 Testing current SSH connection..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes ${PI_USER}@${PI_HOST} "echo 'SSH key authentication already works!'" 2>/dev/null; then
    echo "✅ SSH key authentication is already set up!"
    echo "You can now run the deployment script."
    exit 0
fi

echo "❌ SSH key authentication not set up."
echo ""

# Check if SSH keys exist
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "🔑 No SSH keys found. Generating new SSH key pair..."
    echo ""
    read -p "Press Enter to generate SSH keys, or Ctrl+C to cancel..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH keys generated successfully!"
else
    echo "🔑 SSH keys found at ~/.ssh/id_rsa"
fi

echo ""
echo "📤 Copying SSH key to Raspberry Pi..."
echo "You will be prompted for the password for ${PI_USER}@${PI_HOST}"
echo ""

if ssh-copy-id ${PI_USER}@${PI_HOST}; then
    echo ""
    echo "✅ SSH key copied successfully!"
    echo ""
    echo "🧪 Testing SSH key authentication..."
    if ssh -o ConnectTimeout=5 -o BatchMode=yes ${PI_USER}@${PI_HOST} "echo 'SSH key authentication works!'" 2>/dev/null; then
        echo "✅ SSH key authentication is working!"
        echo ""
        echo "🚀 You can now run the deployment script:"
        echo "   ./deployment/deploy.sh"
        echo "   ./deployment/deploy.sh --update-only"
    else
        echo "❌ SSH key authentication test failed."
        echo "Please check your SSH configuration."
    fi
else
    echo ""
    echo "❌ Failed to copy SSH key."
    echo ""
    echo "Manual setup instructions:"
    echo "1. Make sure SSH is enabled on your Raspberry Pi"
    echo "2. Check that the IP address (${PI_HOST}) is correct"
    echo "3. Verify the username (${PI_USER}) is correct"
    echo "4. Try connecting manually: ssh ${PI_USER}@${PI_HOST}"
fi

echo ""
echo "💡 Alternative: You can also use password authentication by removing"
echo "   the '-o BatchMode=yes' option from the deployment script, but"
echo "   SSH keys are more secure and convenient."
