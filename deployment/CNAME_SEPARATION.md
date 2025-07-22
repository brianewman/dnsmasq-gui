# CNAME Records Separation

## Overview

As of the latest deployment, CNAME records have been moved from the main DNSmasq configuration file (`/etc/dnsmasq.conf`) to a dedicated configuration file (`/etc/dnsmasq.d/dnsmasq-cnames.conf`) for better organization and management.

## Benefits

- **Better Organization**: CNAME records are separated from main configuration
- **Easier Management**: Can edit CNAME records independently
- **Selective Reloading**: Only CNAME changes trigger file updates
- **Backup/Restore**: Can backup CNAME configuration separately
- **Version Control**: Better tracking of CNAME-specific changes
- **Consistency**: Aligns with existing modular config structure

## File Locations

| Record Type | File Location | Management |
|-------------|---------------|------------|
| A Records | `/etc/dnsmasq.hosts` | DNSmasq GUI |
| CNAME Records | `/etc/dnsmasq.d/dnsmasq-cnames.conf` | DNSmasq GUI |
| DHCP Ranges | `/etc/dnsmasq.d/dnsmasq-ranges.conf` | DNSmasq GUI |
| DHCP Options | `/etc/dnsmasq.d/dnsmasq-options.conf` | DNSmasq GUI |
| Static Leases | `/etc/dnsmasq.d/dnsmasq-static-leases.conf` | DNSmasq GUI |
| Advanced Settings | `/etc/dnsmasq.d/dnsmasq-advanced.conf` | DNSmasq GUI |

## Migration Process

The migration is **automatic** during deployment:

1. **Detection**: Script scans `/etc/dnsmasq.conf` for existing CNAME records
2. **Backup**: Creates timestamped backup of main configuration
3. **Migration**: Moves CNAME records to `/etc/dnsmasq.d/dnsmasq-cnames.conf`
4. **Cleanup**: Removes CNAME records from main configuration
5. **Restart**: Automatically restarts DNSmasq to load new configuration

### Manual Migration

If you need to run the migration manually:

```bash
sudo bash /opt/dnsmasq-gui/deployment/migrate-cnames.sh
```

## File Format

The CNAME configuration file follows DNSmasq's standard format:

```bash
# DNS CNAME Records managed by DNSmasq GUI
# This file is auto-generated, do not edit manually

cname=alias1,target1
cname=alias2,target2
cname=www,webserver
```

## Important Notes

### DNSmasq Restart Required

When CNAME records are changed, DNSmasq must be restarted to recognize the changes:

```bash
sudo systemctl restart dnsmasq
```

The DNSmasq GUI handles this automatically when making changes through the web interface.

### File Permissions

The CNAME configuration file has specific permissions:

```bash
-rw-rw-r-- 1 root dnsmasq-gui /etc/dnsmasq.d/dnsmasq-cnames.conf
```

This allows the DNSmasq GUI to read and write the file while maintaining security.

### Include Directive

DNSmasq must be configured to include the `/etc/dnsmasq.d/` directory:

```bash
# In /etc/dnsmasq.conf
conf-dir=/etc/dnsmasq.d/,*.conf
```

This directive tells DNSmasq to automatically include all `.conf` files in the `/etc/dnsmasq.d/` directory.

## Troubleshooting

### CNAME Records Not Working

1. **Check if file exists**:
   ```bash
   ls -la /etc/dnsmasq.d/dnsmasq-cnames.conf
   ```

2. **Verify file contents**:
   ```bash
   cat /etc/dnsmasq.d/dnsmasq-cnames.conf
   ```

3. **Test DNSmasq configuration**:
   ```bash
   sudo dnsmasq --test -C /etc/dnsmasq.conf
   ```

4. **Restart DNSmasq**:
   ```bash
   sudo systemctl restart dnsmasq
   ```

5. **Test DNS resolution**:
   ```bash
   nslookup your-cname-alias 127.0.0.1
   ```

### File Permission Issues

If the DNSmasq GUI cannot write to the CNAME file:

```bash
sudo chown root:dnsmasq-gui /etc/dnsmasq.d/dnsmasq-cnames.conf
sudo chmod 664 /etc/dnsmasq.d/dnsmasq-cnames.conf
```

## Environment Variables

The CNAME configuration file path can be customized via environment variable:

```bash
# In /opt/dnsmasq-gui/.env
DNSMASQ_CNAMES_CONFIG_FILE=/etc/dnsmasq.d/dnsmasq-cnames.conf
```

## Web Interface

The DNSmasq GUI web interface continues to work exactly the same:

1. Navigate to **DNS Management** section
2. Add/edit/delete CNAME records (shown as "Aliases")
3. Changes are automatically saved to the new CNAME configuration file
4. DNSmasq is automatically restarted to apply changes

The separation is transparent to end users - the interface remains unchanged while providing better backend organization.
