# DNSmasq GUI Deployment

This directory contains the deployment scripts and configuration for deploying the DNSmasq GUI to a Raspberry Pi.

## Quick Deployment

### Full Deployment (First Time)
```bash
./deployment/deploy.sh
```

This will:
- Build the application
- Create a deployment package
- Stop any existing service
- Install/update all files and dependencies
- Set up permissions and system configuration
- Start the service

### Update-Only Deployment (Faster for Code Changes)
```bash
./deployment/deploy.sh --update-only
```

This will:
- Build the application
- Only replace the application files (dist/, public/, package.json)
- Update dependencies if needed
- Restart the service

**Use this for faster deployments when you only need to update your code.**

## Configuration

### Raspberry Pi Settings
Edit `deploy.sh` if your Raspberry Pi has different settings:
```bash
PI_USER="pi"              # SSH username
PI_HOST="192.168.10.3"    # IP address
APP_DIR="/opt/dnsmasq-gui" # Installation directory
SERVICE_NAME="dnsmasq-gui" # Systemd service name
```

### Application Settings
After deployment, configure the application:
1. SSH to your Raspberry Pi
2. Edit `/opt/dnsmasq-gui/.env` with your settings
3. Restart the service: `sudo systemctl restart dnsmasq-gui`

## Troubleshooting

### Check Service Status
```bash
ssh pi@192.168.10.3 'sudo systemctl status dnsmasq-gui'
```

### View Logs
```bash
ssh pi@192.168.10.3 'sudo journalctl -u dnsmasq-gui -f'
```

### Manual Service Management
```bash
# Restart service
ssh pi@192.168.10.3 'sudo systemctl restart dnsmasq-gui'

# Stop service
ssh pi@192.168.10.3 'sudo systemctl stop dnsmasq-gui'

# Start service
ssh pi@192.168.10.3 'sudo systemctl start dnsmasq-gui'
```

### Common Issues

1. **Service won't start**: Check `/opt/dnsmasq-gui/.env` configuration
2. **Permission errors**: Run full deployment to reset permissions
3. **DNS operations fail**: Ensure DNSmasq service is running and configured

## Files

- `deploy.sh` - Main deployment script
- `dnsmasq-gui.service` - Systemd service configuration
- `dnsmasq-gui-sudoers` - Sudo permissions for DNSmasq operations
- `setup-static-leases.sh` - DNSmasq configuration setup

## Security

The deployment sets up:
- Dedicated `dnsmasq-gui` user with minimal privileges
- Proper file permissions for DNSmasq configuration files
- Sudo scripts for safe service management
- Secure systemd service configuration

## Default Access

After successful deployment:
- **URL**: http://192.168.10.3:3000
- **Username**: admin
- **Password**: admin

**⚠️ Change the default password immediately after first login!**
