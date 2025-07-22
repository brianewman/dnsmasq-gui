# Raspberry Pi Deployment Guide

## Prerequisites

1. **SSH Access**: Ensure you can SSH to your Raspberry Pi
2. **Git**: Make sure git is installed on the Pi
3. **Node.js**: Node.js 18+ should be installed on the Pi
4. **Repository**: The repository should already be cloned to `/opt/dnsmasq-gui`

## Quick Deployment (Option 1)

Run the deployment script from your Windows machine:

```batch
# Deploy to default Pi (raspberrypi.local with user pi)
deploy-to-pi.bat

# Or specify custom hostname/IP and user
deploy-to-pi.bat 192.168.1.100 myuser
```

## Manual Deployment (Option 2)

If you prefer to deploy manually:

### 1. SSH to your Raspberry Pi

```bash
ssh pi@raspberrypi.local
```

### 2. Navigate to the app directory and pull latest code

```bash
cd /opt/dnsmasq-gui
sudo git pull origin main
```

### 3. Install dependencies and build

```bash
sudo npm ci --only=production
sudo npm run build
```

### 4. Set up user and permissions

```bash
sudo useradd -r -s /bin/false dnsmasq-gui 2>/dev/null || true
sudo chown -R dnsmasq-gui:dnsmasq-gui /opt/dnsmasq-gui
sudo chmod +x /opt/dnsmasq-gui/dist/index.js
```

### 5. Set up sudoers permissions

```bash
sudo cp deployment/dnsmasq-gui-sudoers /etc/sudoers.d/dnsmasq-gui
sudo chmod 440 /etc/sudoers.d/dnsmasq-gui
```

### 6. Install systemd service

```bash
sudo cp deployment/dnsmasq-gui.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### 7. Create required directories and files

```bash
sudo mkdir -p /etc/dnsmasq.d
sudo touch /etc/dnsmasq.hosts
sudo chown dnsmasq-gui:dnsmasq-gui /etc/dnsmasq.hosts

# Create config files if they don't exist
sudo touch /etc/dnsmasq.d/dnsmasq-static-leases.conf
sudo touch /etc/dnsmasq.d/dnsmasq-ranges.conf
sudo touch /etc/dnsmasq.d/dnsmasq-options.conf
sudo touch /etc/dnsmasq.d/dnsmasq-advanced.conf
sudo chown dnsmasq-gui:dnsmasq-gui /etc/dnsmasq.d/dnsmasq-*.conf
```

### 8. Start and enable the service

```bash
sudo systemctl enable dnsmasq-gui
sudo systemctl start dnsmasq-gui
```

### 9. Check service status

```bash
sudo systemctl status dnsmasq-gui
sudo journalctl -u dnsmasq-gui -f
```

## DNS Records Configuration

The application will now read:

- **A Records**: From `/etc/dnsmasq.hosts` (format: `IP hostname`)
- **CNAME Records**: From `/etc/dnsmasq.conf` (format: `cname=alias,target`)
- **MAC Addresses**: From static DHCP reservations in config files

## Sample DNS Records

### /etc/dnsmasq.hosts
```
192.168.1.10 server.local
192.168.1.20 pi.local
192.168.1.30 nas.local
```

### /etc/dnsmasq.conf (CNAME records)
```
cname=www.server.local,server.local
cname=files.nas.local,nas.local
```

## Access the GUI

Once deployed, access the web interface at:
- `http://[PI-IP]:3000`
- Navigate to "DNS Records" section to see the enhanced table

## Troubleshooting

### Check service logs
```bash
sudo journalctl -u dnsmasq-gui -f
```

### Check service status
```bash
sudo systemctl status dnsmasq-gui
```

### Restart service
```bash
sudo systemctl restart dnsmasq-gui
```

### Check file permissions
```bash
ls -la /etc/dnsmasq.hosts
ls -la /etc/dnsmasq.d/
```
