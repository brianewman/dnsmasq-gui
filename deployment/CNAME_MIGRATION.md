# CNAME Records Configuration Improvement

## Overview

This update separates CNAME records from the main `dnsmasq.conf` file into a dedicated configuration file at `/etc/dnsmasq.d/dnsmasq-cnames.conf`.

## Benefits

1. **Better Organization**: CNAME records are now isolated from the main configuration
2. **Easier Management**: Can edit CNAME records independently without touching the main config
3. **Selective Reloading**: Only CNAME changes trigger specific file updates
4. **Backup/Restore**: Can backup just the CNAME configuration separately
5. **Version Control**: Easier to track changes to specific record types
6. **Consistency**: Aligns with existing structure where DHCP ranges, options, and static leases each have their own files

## File Structure

### Before
```
/etc/dnsmasq.conf          # Main config + CNAME records
/etc/dnsmasq.hosts         # A records
/etc/dnsmasq.d/
├── dnsmasq-ranges.conf    # DHCP ranges
├── dnsmasq-options.conf   # DHCP options
├── dnsmasq-static-leases.conf # Static DHCP leases
└── dnsmasq-advanced.conf  # Advanced settings
```

### After
```
/etc/dnsmasq.conf          # Main config only
/etc/dnsmasq.hosts         # A records
/etc/dnsmasq.d/
├── dnsmasq-ranges.conf    # DHCP ranges
├── dnsmasq-options.conf   # DHCP options
├── dnsmasq-static-leases.conf # Static DHCP leases
├── dnsmasq-cnames.conf    # CNAME records (NEW)
└── dnsmasq-advanced.conf  # Advanced settings
```

## Migration

### Automatic Migration
- The deployment script now includes automatic migration via `migrate-cnames.sh`
- Existing CNAME records are moved from `/etc/dnsmasq.conf` to `/etc/dnsmasq.d/dnsmasq-cnames.conf`
- Original configuration is backed up with timestamp
- Ensures `conf-dir=/etc/dnsmasq.d` directive is present in main config

### Manual Migration (if needed)
```bash
# Run the migration script manually
sudo bash /opt/dnsmasq-gui/deployment/migrate-cnames.sh

# Verify migration
grep "^cname=" /etc/dnsmasq.conf          # Should return nothing
cat /etc/dnsmasq.d/dnsmasq-cnames.conf    # Should show migrated CNAME records
```

## Implementation Details

### Code Changes
- **Config**: Added `cnamesConfigFile` path to configuration
- **Service**: Updated `updateCnameRecords()` to write to separate file
- **Service**: Updated `loadCnameRecords()` to read from separate file
- **Deployment**: Added CNAME file creation and permission setup
- **Environment**: Added `DNSMASQ_CNAMES_CONFIG_FILE` environment variable

### File Permissions
```bash
# CNAME configuration file permissions
-rw-rw-r-- 1 root dnsmasq-gui /etc/dnsmasq.d/dnsmasq-cnames.conf
```

### Environment Variable
```bash
# Add to .env file (optional, has sensible default)
DNSMASQ_CNAMES_CONFIG_FILE=/etc/dnsmasq.d/dnsmasq-cnames.conf
```

## Testing

1. **Before Migration**: Record any existing CNAME records
2. **Deploy**: Run normal deployment (migration is automatic)
3. **Verify**: Check that CNAME records are working correctly
4. **Clean**: Confirm main config no longer contains CNAME entries

## Rollback (if needed)

If rollback is required:
```bash
# Restore from backup
sudo cp /etc/dnsmasq.conf.backup.YYYYMMDD_HHMMSS /etc/dnsmasq.conf

# Remove separate CNAME file
sudo rm /etc/dnsmasq.d/dnsmasq-cnames.conf

# Restart DNSmasq
sudo systemctl restart dnsmasq
```

## Benefits for Users

- **Administrators**: Cleaner main configuration file
- **Backup Systems**: Can selectively backup different configuration types
- **Troubleshooting**: Easier to isolate CNAME-related issues
- **Version Control**: Better tracking of changes to specific record types
- **Scalability**: Better organization as number of CNAME records grows
