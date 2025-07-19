# DNSmasq GUI - Deployment Update Instructions

## Quick Update Process

### 1. Transfer the deployment package to your Raspberry Pi:

```bash
# From your Windows machine, copy the zip file to the Pi
scp dnsmasq-gui-deployment.zip pi@192.168.10.3:/tmp/
```

### 2. SSH into your Raspberry Pi:

```bash
ssh pi@192.168.10.3
```

### 3. Run the update deployment script:

```bash
# Extract the deployment package temporarily to get the update script
cd /tmp
unzip dnsmasq-gui-deployment.zip
cd dnsmasq-gui-deployment  # or wherever the files were extracted

# Run the update script
sudo bash deployment/update-deployment.sh
```

## Manual Deployment Process (if automated script fails)

### 1. Stop the existing service:
```bash
sudo systemctl stop dnsmasq-gui
```

### 2. Backup existing installation:
```bash
sudo mv /opt/dnsmasq-gui /opt/dnsmasq-gui.backup.$(date +%Y%m%d_%H%M%S)
```

### 3. Create new installation directory:
```bash
sudo mkdir -p /opt/dnsmasq-gui
cd /opt/dnsmasq-gui
```

### 4. Extract deployment package:
```bash
sudo unzip /tmp/dnsmasq-gui-deployment.zip
```

### 5. Fix ownership and permissions:
```bash
sudo chown -R pi:pi /opt/dnsmasq-gui
sudo chmod -R 755 /opt/dnsmasq-gui
sudo chmod +x /opt/dnsmasq-gui/deployment/*.sh
```

### 6. Install dependencies:
```bash
cd /opt/dnsmasq-gui
sudo -u pi npm install --production
```

### 7. Update systemd service:
```bash
sudo cp deployment/dnsmasq-gui.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dnsmasq-gui
sudo systemctl start dnsmasq-gui
```

### 8. Check status:
```bash
sudo systemctl status dnsmasq-gui
```

## Troubleshooting

### Check service logs:
```bash
journalctl -u dnsmasq-gui -f
```

### Check application logs:
```bash
cd /opt/dnsmasq-gui
sudo -u pi npm start  # Run manually to see errors
```

### Verify file permissions:
```bash
ls -la /opt/dnsmasq-gui
# All files should be owned by pi:pi
```

## Service Management Commands

```bash
# Start service
sudo systemctl start dnsmasq-gui

# Stop service
sudo systemctl stop dnsmasq-gui

# Restart service
sudo systemctl restart dnsmasq-gui

# Check status
sudo systemctl status dnsmasq-gui

# View logs
journalctl -u dnsmasq-gui -n 50
```
