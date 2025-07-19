# Raspberry Pi Setup Guide for DNSmasq GUI

## Prerequisites

Before running the deployment script, you need to set up your Raspberry Pi with the necessary dependencies.

### Option 1: Automated Setup (Recommended)

1. Copy the setup script to your Raspberry Pi:
   ```bash
   scp deployment/setup-pi.sh pi@192.168.10.3:/tmp/
   ```

2. SSH into your Raspberry Pi:
   ```bash
   ssh pi@192.168.10.3
   ```

3. Run the setup script:
   ```bash
   chmod +x /tmp/setup-pi.sh
   sudo /tmp/setup-pi.sh
   ```

### Option 2: Manual Setup

If you prefer to set things up manually:

#### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Install Node.js LTS
```bash
# Install Node.js from NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 3. Install DNSmasq
```bash
sudo apt install -y dnsmasq
```

#### 4. Install System Dependencies
```bash
sudo apt install -y curl wget git tar gzip systemd sudo
```

#### 5. Prepare DNSmasq Files
```bash
# Stop DNSmasq (will be managed by systemd later)
sudo systemctl stop dnsmasq
sudo systemctl disable dnsmasq

# Create necessary directories
sudo mkdir -p /etc/dnsmasq.d
sudo mkdir -p /var/lib/dhcp
sudo mkdir -p /var/log

# Create DHCP leases file
sudo touch /var/lib/dhcp/dhcpd.leases
sudo chown root:root /var/lib/dhcp/dhcpd.leases
sudo chmod 644 /var/lib/dhcp/dhcpd.leases
```

#### 6. Configure Firewall (Optional)
```bash
# If you're using ufw
sudo ufw allow 3000/tcp comment "DNSmasq GUI"
sudo ufw allow 53/udp comment "DNS"
sudo ufw allow 67/udp comment "DHCP"
```

## Security Considerations

### File Permissions

The DNSmasq GUI needs to read and write DNSmasq configuration files. You have a few options:

#### Option A: Add GUI user to appropriate groups
```bash
# After deployment, add the dnsmasq-gui user to necessary groups
sudo usermod -a -G adm dnsmasq-gui
```

#### Option B: Use sudo with specific permissions
Create a sudoers file for the dnsmasq-gui user:

```bash
sudo visudo -f /etc/sudoers.d/dnsmasq-gui
```

Add these lines:
```
# Allow dnsmasq-gui to manage dnsmasq service and files
dnsmasq-gui ALL=(root) NOPASSWD: /bin/systemctl start dnsmasq
dnsmasq-gui ALL=(root) NOPASSWD: /bin/systemctl stop dnsmasq
dnsmasq-gui ALL=(root) NOPASSWD: /bin/systemctl restart dnsmasq
dnsmasq-gui ALL=(root) NOPASSWD: /bin/systemctl reload dnsmasq
dnsmasq-gui ALL=(root) NOPASSWD: /bin/systemctl status dnsmasq
dnsmasq-gui ALL=(root) NOPASSWD: /usr/bin/dnsmasq --test
```

#### Option C: Set specific file permissions
```bash
# Make config files writable by dnsmasq-gui group
sudo groupadd dnsmasq-gui
sudo chgrp dnsmasq-gui /etc/dnsmasq.conf
sudo chmod 664 /etc/dnsmasq.conf
sudo chgrp -R dnsmasq-gui /etc/dnsmasq.d
sudo chmod -R 664 /etc/dnsmasq.d
```

## Network Configuration

### Static IP (Recommended)

Set a static IP for your Raspberry Pi to make deployment easier:

1. Edit the DHCP client configuration:
   ```bash
   sudo nano /etc/dhcpcd.conf
   ```

2. Add these lines (adjust for your network):
   ```
   interface eth0
   static ip_address=192.168.10.3/24
   static routers=192.168.10.1
   static domain_name_servers=8.8.8.8 8.8.4.4
   ```

3. Restart networking:
   ```bash
   sudo systemctl restart dhcpcd
   ```

## Testing the Setup

After setup is complete:

1. Verify Node.js installation:
   ```bash
   node --version  # Should show v18+ or v20+
   npm --version
   ```

2. Verify DNSmasq installation:
   ```bash
   dnsmasq --version
   ```

3. Check system status:
   ```bash
   systemctl status dnsmasq
   sudo systemctl status networking
   ```

## Next Steps

Once the Pi is set up:

1. Update the `PI_HOST` in your `deploy.sh` script to match your Pi's IP
2. Run the deployment script from your development machine
3. Configure your environment variables in `/opt/dnsmasq-gui/.env`
4. Set up proper file permissions for DNSmasq files

## Troubleshooting

### Common Issues

**Permission Denied Errors**: Make sure the dnsmasq-gui user has proper permissions to read/write DNSmasq files.

**Service Won't Start**: Check the systemd journal:
```bash
sudo journalctl -u dnsmasq-gui -f
```

**Can't Connect to GUI**: Verify the firewall allows port 3000 and the service is listening:
```bash
sudo netstat -tlnp | grep 3000
```

**DNSmasq Configuration Issues**: Test the configuration:
```bash
sudo dnsmasq --test
```
