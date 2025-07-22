# CNAME External DNS Resolution Fix

## Problem Summary

CNAME records were working correctly for local DNS queries (from localhost/127.0.0.1) but failing for external DNS queries (from Windows clients) with "Non-existent domain" errors.

## Root Cause

When DNSmasq is configured with:
- `expand-hosts` enabled
- `domain=voicelab.xyz` specified  
- `local=/voicelab.xyz/` directive

CNAME records must use **Fully Qualified Domain Names (FQDN)** to work properly with external DNS clients.

### Technical Details

**Original (broken) format:**
```
cname=unifi,gordita
```

**Fixed (working) format:**  
```
cname=unifi.voicelab.xyz,gordita.voicelab.xyz
```

## Why This Happens

1. **Local queries**: DNSmasq applies internal resolution logic that works with short names
2. **External queries**: DNSmasq requires explicit FQDN for CNAME records when domain expansion is configured
3. **Domain expansion**: The `expand-hosts` directive affects A records in hosts files but CNAME records need explicit domain suffixes

## Solution Implemented

### 1. Enhanced DNSmasq GUI Service

**File:** `src/services/dnsmasqService.ts`

Added automatic domain expansion methods:
- `getDomainSuffix()` - Reads domain configuration from dnsmasq.conf
- `addDomainSuffixIfNeeded()` - Adds domain suffix to hostnames without dots
- Updated `updateCnameRecords()` to automatically format CNAME records with FQDN

**Key Code:**
```typescript
private async updateCnameRecords(cnameRecords: Array<{name: string, value: string}>): Promise<void> {
  const domainSuffix = await this.getDomainSuffix();
  
  const cnameLines = cnameRecords
    .map(record => {
      const alias = this.addDomainSuffixIfNeeded(record.name, domainSuffix);
      const target = this.addDomainSuffixIfNeeded(record.value, domainSuffix);
      return `cname=${alias},${target}`;
    })
    .join('\n');
}
```

### 2. Enhanced Migration Script

**File:** `deployment/migrate-cnames.sh`

Added automatic domain expansion detection and fixing:
- Detects `domain=` and `expand-hosts` configuration
- Automatically converts short CNAME records to FQDN format
- Preserves existing FQDN records unchanged

**Key Code:**
```bash
DOMAIN_SUFFIX=$(grep "^domain=" "$DNSMASQ_CONF" | cut -d'=' -f2)
EXPAND_HOSTS=$(grep "^expand-hosts" "$DNSMASQ_CONF")

if [ -n "$DOMAIN_SUFFIX" ] && [ -n "$EXPAND_HOSTS" ]; then
    # Apply domain expansion to CNAME records
    awk -v domain="$DOMAIN_SUFFIX" '
    /^cname=/ { 
        # Add domain suffix if not already present
        if (alias !~ /\./) alias = alias "." domain
        if (target !~ /\./) target = target "." domain
        print "cname=" alias "," target
    }'
fi
```

## Testing Results

### Before Fix:
```cmd
C:\> nslookup unifi 192.168.10.3
*** UnKnown can't find unifi: Non-existent domain

C:\> nslookup unifi.voicelab.xyz 192.168.10.3  
*** UnKnown can't find unifi.voicelab.xyz: Non-existent domain
```

### After Fix:
```cmd
C:\> nslookup unifi 192.168.10.3
Server:  192.168.10.3
Address: 192.168.10.3#53
unifi   canonical name = gordita.voicelab.xyz.
Name:    gordita.voicelab.xyz
Address: 192.168.1.100

C:\> nslookup unifi.voicelab.xyz 192.168.10.3
Server:  192.168.10.3
Address: 192.168.10.3#53
unifi.voicelab.xyz      canonical name = gordita.voicelab.xyz.
Name:    gordita.voicelab.xyz
Address: 192.168.1.100
```

## Implementation Benefits

1. **Automatic Detection**: System automatically detects domain expansion configuration
2. **Backward Compatibility**: Existing FQDN records are preserved unchanged
3. **Future-Proof**: New CNAME records will automatically use proper formatting
4. **External Compatibility**: CNAME records now work correctly for all DNS clients
5. **Short Name Support**: Both short names and FQDN work for DNS queries

## Configuration Requirements

For this fix to work, DNSmasq must be configured with:

```conf
# Required for domain expansion
domain=your-domain.com
expand-hosts

# Required for local domain handling  
local=/your-domain.com/

# Required for including separate CNAME file
conf-dir=/etc/dnsmasq.d/,*.conf
```

## Files Modified

1. **src/services/dnsmasqService.ts** - Added domain expansion logic
2. **deployment/migrate-cnames.sh** - Enhanced migration with domain expansion
3. **deployment/CNAME_SEPARATION.md** - Updated documentation

## Deployment Instructions

1. Deploy updated code with `deployment/deploy.sh`
2. Migration script automatically detects and fixes domain expansion
3. DNSmasq automatically restarted with new configuration
4. Test external DNS resolution from Windows clients

## Troubleshooting

If CNAME records still don't work externally:

1. **Check domain configuration:**
   ```bash
   grep -E "^(domain|expand-hosts|local=)" /etc/dnsmasq.conf
   ```

2. **Verify CNAME format:**
   ```bash
   head -10 /etc/dnsmasq.d/dnsmasq-cnames.conf
   ```

3. **Test DNSmasq configuration:**
   ```bash
   sudo dnsmasq --test -C /etc/dnsmasq.conf
   ```

4. **Restart DNSmasq:**
   ```bash
   sudo systemctl restart dnsmasq
   ```

5. **Test resolution:**
   ```bash
   nslookup your-alias.your-domain.com 192.168.10.3
   ```

## Resolution Status: ✅ COMPLETE

- ✅ External DNS queries now work correctly
- ✅ Automatic domain expansion implemented  
- ✅ Migration script handles existing installations
- ✅ Future CNAME records will be properly formatted
- ✅ Both short names and FQDN work for queries
