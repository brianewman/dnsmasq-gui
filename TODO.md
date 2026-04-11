# Keystone LAN Services - TODO List

## High Priority Features

### 🔐 User / Password Management
- [ ] Add user management interface
- [ ] Support for multiple user accounts
- [ ] Role-based access control (admin, read-only, etc.)
- [ ] Password change functionality
- [ ] User session management
- [ ] Password strength requirements
- [ ] Account lockout after failed attempts

### 🌐 Network Interfaces Management
- [ ] Dynamic network interface detection
- [ ] Interface configuration UI
- [ ] Support for bridge interfaces
- [ ] VLAN interface support
- [ ] Interface status monitoring
- [ ] Bind to specific interfaces configuration

### 📝 DNS Record Types Support

#### DNS Host Records (Priority 1)
- [ ] Add AAAA records (IPv6) to existing DNS Records table
- [ ] Rename "DNS Records" page to "DNS Host Records"
- [ ] Update table to support both A and AAAA record types with type selector
- [ ] Implement IPv6 address validation for AAAA records
- [ ] Update MAC address correlation to work with both A and AAAA records

#### DNS Service Records (Priority 2)
- [ ] Create new "DNS Service Records" page/section
- [ ] Add TXT records support (text records for verification, SPF, etc.)
- [ ] Add NS records support (name server delegation)
- [ ] Add MX records support (mail exchange with priority)
- [ ] Add SRV records support (service records with priority, weight, port)
- [ ] Implement service-specific validation for each record type
- [ ] Create unified table interface for service records

#### Not Implemented (By Design)
- [x] CNAME records (aliases - already handled via existing GUI)
- [x] PTR records (reverse DNS - not needed for typical DNSmasq use)
- [x] SOA records (start of authority - too complex for typical users)
- [x] CAA records (certificate authority - advanced use case)

## UI/UX Improvements

### 🎨 Advanced Settings Enhancements
- [ ] Remove "Run in foreground" (no-daemon) option
- [ ] Add DNS query logging levels
- [ ] Add DHCP lease time configuration
- [ ] Add DNS cache configuration options
- [ ] Add security settings (DNS rebinding protection)
- [ ] Add performance tuning options
- [ ] Add backup/restore configuration
- [ ] Add configuration validation

### 🔔 Banner and Notifications
- [ ] Change button color on "Change Detected" banner (currently generic)
- [ ] Add different banner types (info, warning, error, success)
- [ ] Improve banner styling and positioning
- [ ] Add auto-dismiss timers for banners
- [ ] Add notification sound options

## Technical Improvements

### 🔧 Backend Enhancements
- [ ] Configuration file backup before changes
- [ ] Configuration rollback functionality
- [ ] Real-time configuration validation
- [ ] Improved error handling and logging
- [ ] API rate limiting
- [ ] WebSocket support for real-time updates
- [ ] Configuration change history/audit log

### 📊 Monitoring and Analytics
- [ ] DNS query statistics
- [ ] DHCP lease usage graphs
- [ ] Network traffic monitoring
- [ ] Performance metrics dashboard
- [ ] Log file viewer and search
- [ ] Export functionality for reports

### 🛡️ Security Enhancements
- [ ] HTTPS/TLS support
- [ ] CSRF protection
- [ ] Input sanitization improvements
- [ ] Secure session management
- [ ] API authentication improvements
- [ ] Security headers implementation

## Feature Enhancements

### 📱 Mobile Responsiveness
- [ ] Improve mobile layout
- [ ] Touch-friendly controls
- [ ] Responsive tables
- [ ] Mobile navigation improvements

### 🔍 Search and Filtering
- [ ] Global search across all sections
- [ ] Advanced filtering options
- [ ] Saved filter presets
- [ ] Export filtered results

### 📋 Import/Export
- [ ] Configuration import/export
- [ ] CSV import for bulk operations
- [ ] Backup scheduling
- [ ] Configuration templates

### 🔄 Auto-refresh and Real-time Updates
- [ ] Auto-refresh toggles for data tables
- [ ] Real-time lease status updates
- [ ] Live DNS query monitoring
- [ ] WebSocket-based live updates

## Documentation and Help

### 📚 User Documentation
- [ ] In-app help system
- [ ] Tooltips for configuration options
- [ ] Configuration examples
- [ ] Troubleshooting guide
- [ ] Video tutorials

### 🧪 Testing and Quality
- [ ] Unit tests for frontend
- [ ] Integration tests
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Cross-browser compatibility

## Nice-to-Have Features

### 🎯 Advanced Networking
- [ ] IPv6 support improvements
- [ ] DNS-over-HTTPS (DoH) support
- [ ] DNS-over-TLS (DoT) support
- [ ] Custom DNS filtering rules
- [ ] Geolocation-based DNS responses

### 🔌 Integrations
- [ ] Active Directory integration
- [ ] LDAP authentication
- [ ] SNMP monitoring support
- [ ] Syslog integration
- [ ] Webhook notifications

### 📈 Scalability
- [ ] Multi-server support
- [ ] Load balancing configuration
- [ ] Cluster management
- [ ] High availability setup

---

## Completed Features ✅
- [x] Favicon implementation
- [x] MAC address linking in DNS records
- [x] Basic DHCP reservation management
- [x] DNS record management (A records)
- [x] Service control (start/stop/reload)
- [x] Basic authentication
- [x] Dashboard with service status
- [x] DHCP lease management
- [x] Network filtering and search
- [x] Static reservation creation from leases

---

## Staged Configuration & Save/Restore System

### Phase 1: Core Staging Infrastructure
- [ ] Implement config-staging/ directory for temporary configuration files
- [ ] On startup, copy live config to staging if staging does not exist
- [ ] All GUI edits write to staging files only
- [ ] Add backend API for copying between live and staging
- [ ] Implement change detection (compare staging vs live)
- [ ] Show "Changes Detected" banner if differences exist
- [ ] Update banner wording and replace buttons with: Apply Changes, Review Changes, Revert Changes

### Phase 2: Change Review & Apply Workflow
- [ ] Implement Review Changes modal with file-by-file diff viewer
- [ ] Implement Apply Changes (copy staging to live, reload/restart dnsmasq as needed)
- [ ] Implement Revert Changes (copy live to staging, repopulate GUI)
- [ ] Warn user if changes require a full restart
- [ ] Automatic backup of live config before applying changes

### Phase 3: UX & Reliability Enhancements
- [ ] Show change summary (files modified, added, deleted)
- [ ] Show last modified time for changes
- [ ] Error handling and rollback if apply fails
- [ ] Performance optimizations for large configs
- [ ] (Optional) Add simple validation for field formats (IP, MAC, etc.)

---

*Last updated: July 24, 2025*
