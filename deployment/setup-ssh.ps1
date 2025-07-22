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
    $null = ssh -o ConnectTimeout=5 -o BatchMode=yes "$PI_USER@$PI_HOST" "echo 'SSH key authentication already works!'" 2>$null
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
    
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N ""
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
Write-Host "📤 Setting up SSH key on Raspberry Pi..." -ForegroundColor Yellow

# Read the public key
if (-not (Test-Path $sshPubKeyPath)) {
    Write-Host "❌ Public key not found at $sshPubKeyPath" -ForegroundColor Red
    Write-Host "Please make sure SSH keys were generated correctly."
    Read-Host "Press Enter to continue"
    exit 1
}

$publicKey = Get-Content $sshPubKeyPath -Raw
$publicKey = $publicKey.Trim()

Write-Host ""
Write-Host "📋 Your public key:" -ForegroundColor Cyan
Write-Host $publicKey -ForegroundColor Gray
Write-Host ""

Write-Host "🔧 Manual setup required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Connect to your Raspberry Pi:" -ForegroundColor White
Write-Host "   ssh $PI_USER@$PI_HOST" -ForegroundColor Gray
Write-Host ""
Write-Host "2. On the Raspberry Pi, run these commands:" -ForegroundColor White
Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Gray
Write-Host "   nano ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Paste the public key shown above into the file" -ForegroundColor White
Write-Host "4. Save and exit (Ctrl+X, Y, Enter)" -ForegroundColor White
Write-Host ""
Write-Host "5. Set proper permissions:" -ForegroundColor White
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Gray
Write-Host "   exit" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Test the connection:" -ForegroundColor White
Write-Host "   ssh $PI_USER@$PI_HOST" -ForegroundColor Gray
Write-Host "   (should connect without asking for password)" -ForegroundColor Gray
Write-Host ""
Write-Host "7. Run the deployment script:" -ForegroundColor White
Write-Host "   .\deployment\deploy.sh --update-only" -ForegroundColor Gray

Write-Host ""
Write-Host "💡 Alternative: Use the manual setup batch file:" -ForegroundColor Cyan
Write-Host "   .\deployment\setup-ssh-manual.bat" -ForegroundColor Gray

Write-Host ""
Read-Host "Press Enter to continue"
