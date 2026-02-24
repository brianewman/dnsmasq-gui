# DNS Record Types Analysis Report

## Overview
This report analyzes the data field requirements for standard DNS record types to determine the optimal UI design approach for the DNSmasq GUI.

## DNS Record Types and Data Fields

### 1. A Record (Address Record)
**Purpose**: Maps hostname to IPv4 address
**Fields**:
- **Name** (required): Hostname/domain name
- **Value/Target** (required): IPv4 address (e.g., 192.168.1.100)
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN (Internet), rarely changed

**Example**: `example.local` → `192.168.1.100`

---

### 2. AAAA Record (IPv6 Address Record)
**Purpose**: Maps hostname to IPv6 address
**Fields**:
- **Name** (required): Hostname/domain name
- **Value/Target** (required): IPv6 address (e.g., 2001:db8::1)
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: `example.local` → `2001:db8::1`

---

### 3. CNAME Record (Canonical Name)
**Purpose**: Creates an alias for another domain name
**Fields**:
- **Name** (required): Alias name
- **Value/Target** (required): Canonical domain name
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: `www.example.local` → `example.local`

---

### 4. MX Record (Mail Exchange)
**Purpose**: Specifies mail server for domain
**Fields**:
- **Name** (required): Domain name
- **Value/Target** (required): Mail server hostname
- **Priority** (required): Preference value (0-65535, lower = higher priority)
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: `example.local` → Priority: `10`, Target: `mail.example.local`

---

### 5. TXT Record (Text Record)
**Purpose**: Stores arbitrary text data
**Fields**:
- **Name** (required): Domain name
- **Value/Target** (required): Text string (up to 255 chars per string, multiple strings allowed)
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: `example.local` → `"v=spf1 include:_spf.google.com ~all"`

---

### 6. SRV Record (Service Record)
**Purpose**: Defines location of services
**Fields**:
- **Name** (required): Service name (format: `_service._protocol.domain`)
- **Value/Target** (required): Target hostname
- **Priority** (required): Priority value (0-65535)
- **Weight** (required): Weight for same priority (0-65535)
- **Port** (required): Service port number (0-65535)
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: `_sip._tcp.example.local` → Priority: `10`, Weight: `5`, Port: `5060`, Target: `sip.example.local`

---

### 7. PTR Record (Pointer Record)
**Purpose**: Reverse DNS lookup (IP to hostname)
**Fields**:
- **Name** (required): Reverse IP format (e.g., `100.1.168.192.in-addr.arpa`)
- **Value/Target** (required): Hostname
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: `100.1.168.192.in-addr.arpa` → `example.local`

---

### 8. NS Record (Name Server)
**Purpose**: Delegates subdomain to nameserver
**Fields**:
- **Name** (required): Domain/subdomain name
- **Value/Target** (required): Nameserver hostname
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: `subdomain.example.local` → `ns1.example.local`

---

### 9. SOA Record (Start of Authority)
**Purpose**: Defines authoritative information about DNS zone
**Fields**:
- **Name** (required): Domain name
- **Primary NS** (required): Primary nameserver
- **Admin Email** (required): Administrator email (dots become @)
- **Serial** (required): Zone serial number
- **Refresh** (required): Refresh interval in seconds
- **Retry** (required): Retry interval in seconds
- **Expire** (required): Expiration time in seconds
- **Minimum TTL** (required): Minimum TTL for negative responses
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: Complex multi-field record with 8+ required fields

---

### 10. CAA Record (Certificate Authority Authorization)
**Purpose**: Specifies which CAs can issue certificates
**Fields**:
- **Name** (required): Domain name
- **Flags** (required): Critical flag (0 or 128)
- **Tag** (required): Property tag ("issue", "issuewild", "iodef")
- **Value** (required): Property value (CA domain or URL)
- **TTL** (optional): Time to live in seconds
- **Class** (optional): Usually IN

**Example**: `example.local` → Flags: `0`, Tag: `"issue"`, Value: `"letsencrypt.org"`

---

## Field Analysis Summary

### Common Fields (All Records)
- **Name/Hostname** (required)
- **TTL** (optional, default can be set)
- **Class** (optional, almost always "IN")

### Variable Fields by Record Type
| Record Type | Unique Required Fields | Unique Optional Fields | Complexity |
|-------------|----------------------|----------------------|------------|
| A           | IPv4 Address         | -                    | Simple     |
| AAAA        | IPv6 Address         | -                    | Simple     |
| CNAME       | Target Domain        | -                    | Simple     |
| MX          | Target Domain, Priority | -                 | Medium     |
| TXT         | Text Value           | -                    | Simple     |
| SRV         | Target, Priority, Weight, Port | -        | Complex    |
| PTR         | Target Domain        | -                    | Simple*    |
| NS          | Nameserver           | -                    | Simple     |
| SOA         | 7+ required fields   | -                    | Very Complex |
| CAA         | Flags, Tag, Value    | -                    | Medium     |

*PTR records are simple in fields but complex in name format (reverse IP)

---

## UI Design Recommendations

### Option 1: Single Unified Table ❌ **Not Recommended**
**Pros**:
- Single interface to maintain
- Consistent user experience

**Cons**:
- Too many conditional fields would make the interface confusing
- SOA and SRV records have vastly different field requirements
- Complex validation rules for different record types
- Poor user experience due to field overload
- Difficult to provide context-specific help

### Option 2: Separate Table Per Record Type ❌ **Not Recommended**
**Pros**:
- Perfect field customization per type
- Clear validation rules

**Cons**:
- Too many separate interfaces to maintain
- Navigation becomes complex
- Code duplication for similar record types
- Poor user experience (too much clicking between types)

### Option 3: Grouped Tables by Complexity ✅ **RECOMMENDED**

#### Group A: Simple Address Records
**Table**: "Address Records"
**Record Types**: A, AAAA
**Fields**: Name, Type (dropdown), Address, TTL
**UI**: Single table with type selector

#### Group B: Alias and Pointer Records
**Table**: "Alias & Pointer Records"  
**Record Types**: CNAME, PTR, NS
**Fields**: Name, Type (dropdown), Target, TTL
**UI**: Single table with type selector and smart name validation

#### Group C: Mail and Priority Records
**Table**: "Mail & Service Records"
**Record Types**: MX
**Fields**: Name, Type (dropdown), Target, Priority, TTL
**UI**: Single table with priority field

#### Group D: Service Records
**Table**: "Service Records"
**Record Types**: SRV
**Fields**: Service Name, Protocol (dropdown), Domain, Target, Priority, Weight, Port, TTL
**UI**: Dedicated interface with service builder helper

#### Group E: Text Records
**Table**: "Text Records"
**Record Types**: TXT, CAA
**Fields**: Name, Type (dropdown), Value/Text, Additional Fields (conditional), TTL
**UI**: Single table with expandable additional fields for CAA

#### Group F: Zone Authority
**Table**: "Zone Authority"
**Record Types**: SOA
**Fields**: All SOA-specific fields
**UI**: Dedicated form interface (rarely used in DNSmasq)

---

## Implementation Strategy

### Phase 1: Core Record Types (Immediate)
- **Address Records Table**: A, AAAA records
- **Alias Records Table**: CNAME, PTR records
- **Text Records Table**: TXT records

### Phase 2: Advanced Records (Medium Priority)
- **Mail Records Table**: MX records
- **Service Records Table**: SRV records

### Phase 3: Specialized Records (Lower Priority)
- **Authority Records**: NS, SOA records
- **Security Records**: CAA records

---

## Technical Considerations

### Database Schema
```sql
-- Flexible schema to support all record types
dns_records (
    id PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('A','AAAA','CNAME','MX','TXT','SRV','PTR','NS','SOA','CAA'),
    ttl INT DEFAULT 3600,
    
    -- Simple records (A, AAAA, CNAME, PTR, NS, TXT)
    target_value TEXT,
    
    -- Priority-based records (MX, SRV)
    priority INT,
    weight INT,
    port INT,
    
    -- CAA records
    flags INT,
    tag VARCHAR(50),
    
    -- SOA records
    primary_ns VARCHAR(255),
    admin_email VARCHAR(255),
    serial_number BIGINT,
    refresh_interval INT,
    retry_interval INT,
    expire_time INT,
    minimum_ttl INT,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Frontend Components
1. **RecordTypeSelector**: Dropdown to choose record type
2. **ConditionalFields**: Shows/hides fields based on record type
3. **SmartValidation**: Type-specific validation rules
4. **RecordPreview**: Shows how the record will appear in DNS

---

## Conclusion

The **Grouped Tables by Complexity** approach provides the best balance of usability and maintainability. It groups similar record types together while keeping complex records separate, ensuring a clean user experience without overwhelming the interface.

**Recommended Implementation Order**:
1. Start with Address Records (A/AAAA) - most commonly used
2. Add Alias Records (CNAME/PTR) - second most common
3. Add Text Records (TXT) - increasingly important for verification
4. Add Mail Records (MX) and Service Records (SRV) as needed
5. Consider Authority and Security records for advanced users

This approach allows for incremental development while maintaining a logical and user-friendly interface structure.

---

*Report generated: July 24, 2025*
