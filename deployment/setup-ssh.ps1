# SSH Setup Helper for DNSmasq GUI Deployment (PowerShell)

Write-Host "🔐 SSH Setup Helper for Raspberry Pi Deployment" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$PI_USER = "pi"
$PI_HOST = "192.168.10.3"

Write-Host ""
Write-Host "This script will help you set up SSH key authentication for deployment."
Write-Host "Target: $PI_USER@$PI_HOST"
Write-Host ""

# Test current connection
Write-Host "🔌 Testing current SSH connection..." -ForegroundColor Yellow
try {
    $result = ssh -o ConnectTimeout=5 -o BatchMode=yes "$PI_USER@$PI_HOST" "echo 'SSH key authentication already works!'" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH key authentication is already set up!" -ForegroundColor Green
        Write-Host "You can now run the deployment script."
        Read-Host "Press Enter to continue"
        exit 0
    }
} catch {
    # Connection failed, continue with setup
}

Write-Host "❌ SSH key authentication not set up." -ForegroundColor Red
Write-Host ""

# Check if SSH keys exist
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
$sshPubKeyPath = "$env:USERPROFILE\.ssh\id_rsa.pub"

if (-not (Test-Path $sshKeyPath)) {
    Write-Host "🔑 No SSH keys found. Generating new SSH key pair..." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to generate SSH keys, or Ctrl+C to cancel"
    
    # Create .ssh directory if it doesn't exist
    $sshDir = "$env:USERPROFILE\.ssh"
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
    }
    
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""'
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH keys generated successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to generate SSH keys." -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
} else {
    Write-Host "🔑 SSH keys found at $sshKeyPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "📤 Copying SSH key to Raspberry Pi..." -ForegroundColor Yellow
Write-Host "You will be prompted for the password for $PI_USER@$PI_HOST"
Write-Host ""

# Read the public key
if (-not (Test-Path $sshPubKeyPath)) {
    Write-Host "❌ Public key not found at $sshPubKeyPath" -ForegroundColor Red
    Write-Host "Please make sure SSH keys were generated correctly."
    Read-Host "Press Enter to continue"
    exit 1
}

$publicKey = Get-Content $sshPubKeyPath -Raw
$publicKey = $publicKey.Trim()

Write-Host "📋 Your public key:" -ForegroundColor Cyan
Write-Host $publicKey -ForegroundColor Gray
Write-Host ""

# Try to copy the key using SSH
Write-Host "Attempting to add key to Raspberry Pi..." -ForegroundColor Yellow
try {
    $command = "mkdir -p ~/.ssh && echo '$publicKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh && echo 'SSH key added successfully'"
    $result = ssh "$PI_USER@$PI_HOST" $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ SSH key copied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🧪 Testing SSH key authentication..." -ForegroundColor Yellow
        
        try {
            ssh -o ConnectTimeout=5 -o BatchMode=yes "$PI_USER@$PI_HOST" "echo 'SSH key authentication works!'" 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ SSH key authentication is working!" -ForegroundColor Green
                Write-Host ""
                Write-Host "🚀 You can now run the deployment script:" -ForegroundColor Cyan
                Write-Host "   .\deployment\deploy.sh" -ForegroundColor White
                Write-Host "   .\deployment\deploy.sh --update-only" -ForegroundColor White
            } else {
                Write-Host "⚠️  SSH key authentication test inconclusive." -ForegroundColor Yellow
                Write-Host "Try running the deployment script - it should work now."
            }
        } catch {
            Write-Host "⚠️  Could not test SSH key authentication, but key was copied." -ForegroundColor Yellow
            Write-Host "Try running the deployment script."
        }
    } else {
        throw "SSH command failed"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Automatic SSH key copy failed." -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Manual method:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Copy this public key to your clipboard:" -ForegroundColor White
    Write-Host $publicKey -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Run this command and paste the key when you see the shell prompt:" -ForegroundColor White
    Write-Host "   ssh $PI_USER@$PI_HOST" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. On the Raspberry Pi, run these commands:" -ForegroundColor White
    Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Gray
    Write-Host "   echo 'PASTE_YOUR_KEY_HERE' >> ~/.ssh/authorized_keys" -ForegroundColor Gray
    Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Gray
    Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Gray
    Write-Host "   exit" -ForegroundColor Gray
}

Write-Host ""
Write-Host "💡 Alternative: You can also manually edit the deployment script to use" -ForegroundColor Cyan
Write-Host "   password authentication instead of SSH keys, but keys are more secure." -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to continue"
