// DNSmasq GUI Frontend JavaScript

class DnsmasqGUI {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.apiBase = '/api';
        this.currentConfig = null;
        
        // Sorting state
        this.currentSort = {
            column: null,
            direction: 'asc'
        };
        
        // Filtering state
        this.currentFilters = {
            network: '',
            type: '',
            status: '',
            search: ''
        };
        
        this.currentReservationFilters = {
            network: '',
            status: '',
            search: ''
        };
        
        this.currentLeases = [];
        this.currentStaticLeases = [];
        this.currentReservations = [];
        this.currentDhcpRanges = [];
        
        // Don't call init automatically, let the DOMContentLoaded handler control this
    }

    async init() {
        console.log('Initializing DNSmasq GUI...');
        
        // Check if user is authenticated
        if (!this.token) {
            this.showLoginModal();
            return;
        }
        
        // Verify the existing token
        const tokenValid = await this.verifyToken();
        
        if (!tokenValid) {
            this.showLoginModal();
            return;
        }
        
        console.log('Authentication successful, loading dashboard');
        this.initEventListeners();
        this.loadDashboard();
    }

    initEventListeners() {
        console.log('Setting up event listeners');
        
        // Sidebar navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('[data-section]').dataset.section;
                this.showSection(section);
            });
        });

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        // Login button in modal footer
        const loginButton = document.getElementById('loginBtn');
        if (loginButton) {
            console.log('Setting up login button event listener');
            loginButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        // Logout button
        const logoutButton = document.getElementById('logoutBtn');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Add event listener for restart button
        const restartBtn = document.getElementById('restart-service-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartService());
        }
        
        // Add sorting event listeners for DHCP leases table
        this.initSortingListeners();
        
        // Add filtering event listeners for DHCP leases table
        this.initFilterListeners();
        
        // Add filtering event listeners for DHCP reservations table
        this.initReservationFilterListeners();
        
        // Add click listeners for dashboard cards
        this.initDashboardCardListeners();
    }
    
    initDashboardCardListeners() {
        // Active Leases card - navigate to DHCP Leases with IP Address sorting
        const activeLeasesCard = document.getElementById('active-leases-card');
        if (activeLeasesCard) {
            activeLeasesCard.addEventListener('click', () => {
                this.navigateToLeases('ipAddress', 'asc');
            });
        }
        
        // Static Reservations card - navigate to DHCP Reservations section
        const staticLeasesCard = document.getElementById('static-leases-card');
        if (staticLeasesCard) {
            staticLeasesCard.addEventListener('click', () => {
                this.showSection('reservations');
            });
        }
    }
    
    navigateToLeases(sortColumn, sortDirection) {
        // Set the desired sort parameters
        this.currentSort.column = sortColumn;
        this.currentSort.direction = sortDirection;
        
        // Navigate to the leases section
        this.showSection('leases');
    }
    
    initSortingListeners() {
        // Add click listeners to sortable table headers
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.target.closest('.sortable').dataset.sort;
                this.sortLeases(column);
            });
        });
    }
    
    initFilterListeners() {
        // Add change listeners to filter controls
        const networkFilter = document.getElementById('network-filter');
        const typeFilter = document.getElementById('type-filter');
        const statusFilter = document.getElementById('status-filter');
        const searchFilter = document.getElementById('search-filter');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        
        if (networkFilter) {
            networkFilter.addEventListener('change', (e) => {
                this.currentFilters.network = e.target.value;
                this.applyFiltersAndRender();
            });
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.applyFiltersAndRender();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFiltersAndRender();
            });
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.applyFiltersAndRender();
            });
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }
    
    initReservationFilterListeners() {
        // Add change listeners to reservation filter controls
        const networkFilter = document.getElementById('reservations-network-filter');
        const statusFilter = document.getElementById('reservations-status-filter');
        const searchFilter = document.getElementById('reservations-search-filter');
        const clearFiltersBtn = document.getElementById('clear-reservations-filters-btn');
        
        if (networkFilter) {
            networkFilter.addEventListener('change', (e) => {
                this.currentReservationFilters.network = e.target.value;
                this.applyReservationFiltersAndRender();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentReservationFilters.status = e.target.value;
                this.applyReservationFiltersAndRender();
            });
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.currentReservationFilters.search = e.target.value;
                this.applyReservationFiltersAndRender();
            });
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearReservationFilters();
            });
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        document.getElementById(`${sectionName}-section`).style.display = 'block';

        // Update sidebar
        document.querySelectorAll('[data-section]').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Load section data
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'dhcp':
                this.loadDhcpConfig();
                break;
            case 'leases':
                this.loadLeases();
                // Initialize sorting headers after the section is shown and data is loaded
                setTimeout(() => this.updateSortHeaders(), 200);
                break;
            case 'reservations':
                this.loadReservations();
                break;
            case 'dns':
                this.loadDnsConfig();
                break;
            case 'network':
                this.loadNetworkConfig();
                break;
            case 'settings':
                this.loadAdvancedSettings();
                break;
        }
    }

    async loadDashboard() {
        try {
            // Load service status
            const statusResponse = await this.apiCall('/dnsmasq/status');
            this.updateServiceStatus(statusResponse);

            // Load lease counts
            const leasesResponse = await this.apiCall('/dnsmasq/leases');
            this.updateLeaseCounts(leasesResponse);

            // Load config for static lease count
            const configResponse = await this.apiCall('/dnsmasq/config');
            this.updateConfigInfo(configResponse);

        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showDashboardError();
        }
    }

    updateServiceStatus(statusResponse) {
        const statusElement = document.getElementById('service-status');
        const uptimeElement = document.getElementById('service-uptime');
        const uptimeValueElement = document.getElementById('uptime-value');
        
        if (statusResponse.success) {
            const status = statusResponse.data.status;
            const uptime = statusResponse.data.uptime;
            const statusIcon = status === 'running' ? 'bi-circle-fill text-success' : 'bi-circle-fill text-danger';
            const statusText = status.toUpperCase();
            
            statusElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="bi ${statusIcon} me-2"></i>
                    <div>
                        <strong>${statusText}</strong>
                        <br><small class="text-muted">Last checked: ${new Date().toLocaleTimeString()}</small>
                    </div>
                </div>
            `;
            
            // Show/hide uptime based on service status and availability
            if (status === 'running' && uptime && uptime !== 'Unknown') {
                uptimeValueElement.textContent = uptime;
                uptimeElement.style.display = 'block';
            } else {
                uptimeElement.style.display = 'none';
            }
        } else {
            statusElement.innerHTML = `
                <div class="text-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>Status Unknown
                </div>
            `;
            uptimeElement.style.display = 'none';
        }
    }

    updateLeaseCounts(leasesResponse) {
        const activeCountElement = document.getElementById('active-leases-count');
        const leasesCountBadge = document.getElementById('leases-count');
        
        if (leasesResponse.success) {
            const count = leasesResponse.data.length;
            const expiredCount = leasesResponse.data.filter(lease => 
                new Date(lease.expiry) < new Date()
            ).length;
            
            activeCountElement.innerHTML = `
                <div class="h4 mb-1">${count}</div>
                <small class="text-muted">
                    ${expiredCount > 0 ? `(${expiredCount} expired)` : 'All active'}
                </small>
            `;
            
            if (leasesCountBadge) {
                leasesCountBadge.textContent = count;
            }
        } else {
            activeCountElement.innerHTML = '<span class="text-muted">Error loading</span>';
            if (leasesCountBadge) {
                leasesCountBadge.textContent = '?';
            }
        }
    }

    updateConfigInfo(configResponse) {
        const staticCountElement = document.getElementById('static-leases-count');
        
        if (configResponse.success) {
            this.currentConfig = configResponse.data;
            const staticCount = configResponse.data.staticLeases.length;
            const rangeCount = configResponse.data.dhcpRanges.length;
            
            staticCountElement.innerHTML = `
                <div class="h4 mb-1">${staticCount}</div>
                <small class="text-muted">
                    ${rangeCount} DHCP range${rangeCount !== 1 ? 's' : ''}
                </small>
            `;
        } else {
            staticCountElement.innerHTML = '<span class="text-muted">Error loading</span>';
        }
    }

    showDashboardError() {
        ['service-status', 'active-leases-count', 'static-leases-count'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<span class="text-danger">Error loading</span>';
            }
        });
    }

    async loadLeases() {
        try {
            // Load both leases and static config in parallel
            const [leasesResponse, configResponse] = await Promise.all([
                this.apiCall('/dnsmasq/leases'),
                this.apiCall('/dnsmasq/config')
            ]);
            
            if (leasesResponse.success && configResponse.success) {
                // Store the data for filtering and sorting
                this.currentLeases = leasesResponse.data;
                this.currentStaticLeases = configResponse.data.staticLeases || [];
                this.currentDhcpRanges = configResponse.data.dhcpRanges || [];
                
                // Populate network filter options
                this.populateNetworkFilter();
                
                // Apply current filters and sorting, then render
                this.applyFiltersAndRender();
            } else {
                document.getElementById('leases-tbody').innerHTML = 
                    '<tr><td colspan="6" class="text-center text-muted">Failed to load leases</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load leases:', error);
            document.getElementById('leases-tbody').innerHTML = 
                '<tr><td colspan="6" class="text-center text-danger">Error loading leases</td></tr>';
        }
    }

    renderLeases(leases, staticLeases = []) {
        const tbody = document.getElementById('leases-tbody');
        tbody.innerHTML = '';

        if (leases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No active leases found</td></tr>';
            return;
        }

        leases.forEach(lease => {
            const row = document.createElement('tr');
            
            // Check if this lease has a static reservation
            const staticLease = staticLeases.find(staticLease => 
                staticLease.macAddress.toLowerCase() === lease.macAddress.toLowerCase()
            );
            const isStatic = !!staticLease;
            
            // Use hostname from static lease if available, otherwise use DHCP lease hostname
            const displayHostname = isStatic && staticLease.hostname ? 
                staticLease.hostname : 
                (lease.hostname && lease.hostname !== '*' ? lease.hostname : '<em>Unknown</em>');
            
            // Calculate time remaining
            const expiry = new Date(lease.expiry);
            const now = new Date();
            const timeRemaining = expiry > now ? 
                this.formatTimeRemaining(expiry - now) : 
                '<span class="text-danger">Expired</span>';
            
            // Get network information
            const networkInfo = this.getNetworkFromIP(lease.ipAddress);
            
            // Add visual indicator for static leases
            const staticBadge = isStatic ? '<span class="badge bg-success ms-2">Static</span>' : '';
            const rowClass = isStatic ? 'table-success' : '';
            
            row.className = rowClass;
            row.innerHTML = `
                <td>
                    <strong>${lease.ipAddress}</strong>
                </td>
                <td>
                    <code class="small">${lease.macAddress}</code>
                </td>
                <td>
                    <span class="text-primary">${displayHostname}</span>${staticBadge}
                </td>
                <td>
                    <span class="badge bg-info">${networkInfo.tag}</span><br>
                    <small class="text-muted">${networkInfo.network}</small>
                </td>
                <td>
                    <small class="text-muted">
                        ${isStatic ? 'Static Reservation' : `${expiry.toLocaleString()}<br>(${timeRemaining})`}
                    </small>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        ${isStatic ? 
                            '<button class="btn btn-sm btn-success" disabled title="Already a static reservation"><i class="bi bi-bookmark-check"></i> Static</button>' :
                            `<button class="btn btn-sm btn-outline-primary" 
                                onclick="app.convertToStatic('${lease.macAddress}', '${lease.hostname || ''}', '${lease.ipAddress}')"
                                title="Convert to static reservation">
                            <i class="bi bi-bookmark"></i> Make Static
                        </button>`
                        }
                        <button class="btn btn-sm btn-outline-info" 
                                onclick="app.showLeaseDetails('${lease.macAddress}')"
                                title="Show lease details">
                            <i class="bi bi-info-circle"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    sortLeases(column) {
        // Cycle through three states: asc -> desc -> unsorted (null)
        if (this.currentSort.column === column) {
            if (this.currentSort.direction === 'asc') {
                this.currentSort.direction = 'desc';
            } else if (this.currentSort.direction === 'desc') {
                // Third click: clear sorting (unsorted state)
                this.currentSort.column = null;
                this.currentSort.direction = 'asc'; // Reset direction for next time
            }
        } else {
            // New column: start with ascending
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }
        
        this.applyFiltersAndRender();
    }
    
    applySortAndRender() {
        if (this.currentLeases.length === 0) return;
        
        // If no sort column is specified, use original order (no sorting)
        let sortedLeases;
        if (!this.currentSort.column) {
            sortedLeases = [...this.currentLeases];
        } else {
            sortedLeases = [...this.currentLeases].sort((a, b) => {
                let aVal, bVal;
                
                // Get static lease info for hostname resolution
                const aStatic = this.currentStaticLeases.find(s => 
                    s.macAddress.toLowerCase() === a.macAddress.toLowerCase()
                );
                const bStatic = this.currentStaticLeases.find(s => 
                    s.macAddress.toLowerCase() === b.macAddress.toLowerCase()
                );
                
                switch (this.currentSort.column) {
                    case 'ipAddress':
                        // Sort IP addresses numerically
                        aVal = a.ipAddress.split('.').map(num => parseInt(num, 10));
                        bVal = b.ipAddress.split('.').map(num => parseInt(num, 10));
                        for (let i = 0; i < 4; i++) {
                            if (aVal[i] !== bVal[i]) {
                                return this.currentSort.direction === 'asc' ? 
                                    aVal[i] - bVal[i] : bVal[i] - aVal[i];
                            }
                        }
                        return 0;
                        
                    case 'macAddress':
                        aVal = a.macAddress.toLowerCase();
                        bVal = b.macAddress.toLowerCase();
                        break;
                        
                    case 'hostname':
                        // Use static lease hostname if available, otherwise DHCP hostname
                        aVal = (aStatic?.hostname || (a.hostname && a.hostname !== '*' ? a.hostname : 'Unknown')).toLowerCase();
                        bVal = (bStatic?.hostname || (b.hostname && b.hostname !== '*' ? b.hostname : 'Unknown')).toLowerCase();
                        break;
                        
                    case 'expiry':
                        // Sort by expiry date, but put static leases first or last depending on direction
                        const aIsStatic = !!aStatic;
                        const bIsStatic = !!bStatic;
                        
                        if (aIsStatic && !bIsStatic) {
                            return this.currentSort.direction === 'asc' ? -1 : 1;
                        }
                        if (!aIsStatic && bIsStatic) {
                            return this.currentSort.direction === 'asc' ? 1 : -1;
                        }
                        if (aIsStatic && bIsStatic) {
                            return 0; // Both static, equal
                        }
                        
                        aVal = new Date(a.expiry).getTime();
                        bVal = new Date(b.expiry).getTime();
                        break;
                        
                    default:
                        return 0;
                }
                
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return this.currentSort.direction === 'asc' ? 
                        aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                } else {
                    return this.currentSort.direction === 'asc' ? 
                        aVal - bVal : bVal - aVal;
                }
            });
        }
        
        this.renderLeases(sortedLeases, this.currentStaticLeases);
        this.updateSortHeaders();
    }
    
    applyFiltersAndRender() {
        if (this.currentLeases.length === 0) return;
        
        // First apply filters
        let filteredLeases = this.filterLeases(this.currentLeases);
        
        // Then apply sorting if any
        if (this.currentSort.column) {
            filteredLeases = this.sortFilteredLeases(filteredLeases);
        }
        
        this.renderLeases(filteredLeases, this.currentStaticLeases);
        this.updateSortHeaders();
        this.updateFilterCounts(filteredLeases);
    }
    
    filterLeases(leases) {
        return leases.filter(lease => {
            // Check if this lease has a static reservation
            const staticLease = this.currentStaticLeases.find(staticLease => 
                staticLease.macAddress.toLowerCase() === lease.macAddress.toLowerCase()
            );
            const isStatic = !!staticLease;
            
            // Network filter
            if (this.currentFilters.network) {
                const networkInfo = this.getNetworkFromIP(lease.ipAddress);
                if (networkInfo.network !== this.currentFilters.network) {
                    return false;
                }
            }
            
            // Type filter
            if (this.currentFilters.type) {
                if (this.currentFilters.type === 'static' && !isStatic) {
                    return false;
                }
                if (this.currentFilters.type === 'dynamic' && isStatic) {
                    return false;
                }
            }
            
            // Status filter
            if (this.currentFilters.status) {
                const now = new Date();
                const expiry = new Date(lease.expiry);
                const isExpired = expiry < now;
                
                if (this.currentFilters.status === 'active' && (isExpired && !isStatic)) {
                    return false;
                }
                if (this.currentFilters.status === 'expired' && (!isExpired || isStatic)) {
                    return false;
                }
            }
            
            // Search filter (MAC, IP, or hostname)
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const macMatch = lease.macAddress.toLowerCase().includes(searchTerm);
                const ipMatch = lease.ipAddress.toLowerCase().includes(searchTerm);
                
                // Use hostname from static lease if available, otherwise use DHCP lease hostname
                const displayHostname = (staticLease?.hostname || (lease.hostname && lease.hostname !== '*' ? lease.hostname : '')).toLowerCase();
                const hostnameMatch = displayHostname.includes(searchTerm);
                
                if (!macMatch && !ipMatch && !hostnameMatch) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    sortFilteredLeases(leases) {
        return [...leases].sort((a, b) => {
            let aVal, bVal;
            
            // Get static lease info for hostname resolution
            const aStatic = this.currentStaticLeases.find(s => 
                s.macAddress.toLowerCase() === a.macAddress.toLowerCase()
            );
            const bStatic = this.currentStaticLeases.find(s => 
                s.macAddress.toLowerCase() === b.macAddress.toLowerCase()
            );
            
            switch (this.currentSort.column) {
                case 'ipAddress':
                    // Sort IP addresses numerically
                    aVal = a.ipAddress.split('.').map(num => parseInt(num, 10));
                    bVal = b.ipAddress.split('.').map(num => parseInt(num, 10));
                    for (let i = 0; i < 4; i++) {
                        if (aVal[i] !== bVal[i]) {
                            return this.currentSort.direction === 'asc' ? 
                                aVal[i] - bVal[i] : bVal[i] - aVal[i];
                        }
                    }
                    return 0;
                    
                case 'macAddress':
                    aVal = a.macAddress.toLowerCase();
                    bVal = b.macAddress.toLowerCase();
                    break;
                    
                case 'hostname':
                    // Use static lease hostname if available, otherwise DHCP hostname
                    aVal = (aStatic?.hostname || (a.hostname && a.hostname !== '*' ? a.hostname : 'Unknown')).toLowerCase();
                    bVal = (bStatic?.hostname || (b.hostname && b.hostname !== '*' ? b.hostname : 'Unknown')).toLowerCase();
                    break;
                    
                case 'network':
                    // Sort by network tag first, then by network address
                    const aNetworkInfo = this.getNetworkFromIP(a.ipAddress);
                    const bNetworkInfo = this.getNetworkFromIP(b.ipAddress);
                    aVal = `${aNetworkInfo.tag}-${aNetworkInfo.network}`;
                    bVal = `${bNetworkInfo.tag}-${bNetworkInfo.network}`;
                    break;
                    
                case 'expiry':
                    // Sort by expiry date, but put static leases first or last depending on direction
                    const aIsStatic = !!aStatic;
                    const bIsStatic = !!bStatic;
                    
                    if (aIsStatic && !bIsStatic) {
                        return this.currentSort.direction === 'asc' ? -1 : 1;
                    }
                    if (!aIsStatic && bIsStatic) {
                        return this.currentSort.direction === 'asc' ? 1 : -1;
                    }
                    if (aIsStatic && bIsStatic) {
                        return 0; // Both static, equal
                    }
                    
                    aVal = new Date(a.expiry).getTime();
                    bVal = new Date(b.expiry).getTime();
                    break;
                    
                default:
                    return 0;
            }
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return this.currentSort.direction === 'asc' ? 
                    aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                return this.currentSort.direction === 'asc' ? 
                    aVal - bVal : bVal - aVal;
            }
        });
    }
    
    getNetworkFromIP(ipAddress) {
        // Find which DHCP range this IP belongs to
        for (const range of this.currentDhcpRanges) {
            if (this.isIpInRange(ipAddress, range)) {
                const networkAddr = this.getNetworkAddress(range.startIp, range.netmask || '255.255.255.0');
                const cidr = this.netmaskToCidr(range.netmask || '255.255.255.0');
                const tag = range.tag || 'default';
                return {
                    tag: tag,
                    network: `${networkAddr}/${cidr}`,
                    displayName: `${tag} (${networkAddr}/${cidr})`
                };
            }
        }
        
        // Fallback: if not in any range, use simple /24 network
        const parts = ipAddress.split('.');
        const networkAddr = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        return {
            tag: 'unknown',
            network: `${networkAddr}/24`,
            displayName: `unknown (${networkAddr}/24)`
        };
    }
    
    isIpInRange(ipAddress, range) {
        const ip = this.ipToNumber(ipAddress);
        const startIp = this.ipToNumber(range.startIp);
        const endIp = this.ipToNumber(range.endIp);
        return ip >= startIp && ip <= endIp;
    }
    
    ipToNumber(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    }
    
    getNetworkAddress(ipAddress, netmask) {
        const ip = this.ipToNumber(ipAddress);
        const mask = this.ipToNumber(netmask);
        const network = (ip & mask) >>> 0;
        return this.numberToIp(network);
    }
    
    numberToIp(num) {
        return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
    }
    
    netmaskToCidr(netmask) {
        const mask = this.ipToNumber(netmask);
        return (mask >>> 0).toString(2).split('1').length - 1;
    }
    
    clearFilters() {
        this.currentFilters = {
            network: '',
            type: '',
            status: '',
            search: ''
        };
        
        // Reset filter controls
        const networkFilter = document.getElementById('network-filter');
        const typeFilter = document.getElementById('type-filter');
        const statusFilter = document.getElementById('status-filter');
        const searchFilter = document.getElementById('search-filter');
        
        if (networkFilter) networkFilter.value = '';
        if (typeFilter) typeFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (searchFilter) searchFilter.value = '';
        
        // Re-render with no filters and update counts
        this.applyFiltersAndRender();
    }
    
    updateFilterCounts(filteredLeases) {
        const leasesCount = document.getElementById('leases-count');
        if (leasesCount) {
            const totalCount = this.currentLeases.length;
            const filteredCount = filteredLeases.length;
            
            if (filteredCount === totalCount) {
                leasesCount.textContent = totalCount;
                leasesCount.className = 'badge bg-info';
            } else {
                leasesCount.textContent = `${filteredCount}/${totalCount}`;
                leasesCount.className = 'badge bg-warning';
            }
        }
    }
    
    populateNetworkFilter() {
        const networkFilter = document.getElementById('network-filter');
        if (!networkFilter) return;
        
        // Get networks from DHCP ranges
        const networks = new Map();
        
        // Add networks from DHCP ranges
        this.currentDhcpRanges.forEach(range => {
            const networkAddr = this.getNetworkAddress(range.startIp, range.netmask || '255.255.255.0');
            const cidr = this.netmaskToCidr(range.netmask || '255.255.255.0');
            const tag = range.tag || 'default';
            const network = `${networkAddr}/${cidr}`;
            const displayName = `${tag} (${network})`;
            
            networks.set(network, {
                tag: tag,
                network: network,
                displayName: displayName
            });
        });
        
        // Add networks from current leases that might not be in ranges
        this.currentLeases.forEach(lease => {
            const networkInfo = this.getNetworkFromIP(lease.ipAddress);
            if (!networks.has(networkInfo.network)) {
                networks.set(networkInfo.network, networkInfo);
            }
        });
        
        // Clear existing options except the first one
        networkFilter.innerHTML = '<option value="">All Networks</option>';
        
        // Add network options sorted by display name
        Array.from(networks.values())
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .forEach(networkInfo => {
                const option = document.createElement('option');
                option.value = networkInfo.network;
                option.textContent = networkInfo.displayName;
                networkFilter.appendChild(option);
            });
    }
    
    updateSortHeaders() {
        // Reset all headers
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Update current sort header
        const currentHeader = document.querySelector(`[data-sort="${this.currentSort.column}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sort-${this.currentSort.direction}`);
        }
    }

    formatTimeRemaining(milliseconds) {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return '< 1m';
        }
    }

    async convertToStatic(macAddress, hostname, ipAddress) {
        if (!confirm(`Convert lease for ${macAddress} to static reservation?\n\nThis will create a permanent reservation for:\nIP: ${ipAddress}\nMAC: ${macAddress}\nHostname: ${hostname || '(none)'}`)) {
            return;
        }

        try {
            const response = await this.apiCall(`/dnsmasq/leases/${macAddress}/static`, 'POST', { 
                hostname: hostname || null,
                ipAddress: ipAddress 
            });
            
            if (response.success) {
                this.showAlert('success', 'Static reservation created successfully!');
                this.loadLeases(); // Refresh the lease list
                this.loadDashboard(); // Refresh dashboard counts
            } else {
                this.showAlert('danger', response.error || 'Failed to convert lease to static reservation');
            }
        } catch (error) {
            console.error('Error converting to static:', error);
            this.showAlert('danger', 'Failed to convert lease to static reservation');
        }
    }

    showLeaseDetails(macAddress) {
        // Find the lease data
        const tbody = document.getElementById('leases-tbody');
        const rows = tbody.querySelectorAll('tr');
        
        for (const row of rows) {
            if (row.innerHTML.includes(macAddress)) {
                const cells = row.querySelectorAll('td');
                const ipAddress = cells[0].textContent.trim();
                const hostname = cells[2].textContent.trim();
                const expiry = cells[3].textContent.trim();
                
                this.showModal('Lease Details', `
                    <div class="row">
                        <div class="col-sm-4"><strong>IP Address:</strong></div>
                        <div class="col-sm-8"><code>${ipAddress}</code></div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-sm-4"><strong>MAC Address:</strong></div>
                        <div class="col-sm-8"><code>${macAddress}</code></div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-sm-4"><strong>Hostname:</strong></div>
                        <div class="col-sm-8">${hostname === 'Unknown' ? '<em>Not set</em>' : hostname}</div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-sm-4"><strong>Expires:</strong></div>
                        <div class="col-sm-8"><small>${expiry}</small></div>
                    </div>
                `);
                break;
            }
        }
    }

    showAlert(type, message) {
        // Remove any existing alerts
        const existingAlert = document.querySelector('.alert-dismissible');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insert at the top of the main content area
        const mainContent = document.querySelector('.col-md-9.col-lg-10');
        mainContent.insertBefore(alertDiv, mainContent.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showModal(title, content) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('detailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.innerHTML = `
                <div class="modal fade" id="detailsModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="detailsModalTitle"></h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="detailsModalBody">
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Update modal content
        document.getElementById('detailsModalTitle').textContent = title;
        document.getElementById('detailsModalBody').innerHTML = content;

        // Show modal
        const bootstrapModal = new bootstrap.Modal(document.getElementById('detailsModal'));
        bootstrapModal.show();
    }

    async restartService() {
        if (!confirm('Restart DNSmasq service? This will briefly interrupt network services.')) return;

        try {
            const response = await this.apiCall('/dnsmasq/restart', 'POST');
            if (response.success) {
                alert('DNSmasq service restarted successfully!');
                this.loadDashboard();
            }
        } catch (error) {
            alert('Failed to restart DNSmasq service');
            console.error(error);
        }
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                console.log('Login successful');
                this.token = data.token;
                localStorage.setItem('authToken', this.token);
                document.getElementById('username-display').textContent = data.user.username;
                
                // Hide login modal
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                // Show main content
                const mainContent = document.querySelector('.container-fluid');
                if (mainContent) {
                    mainContent.style.display = 'block';
                }
                
                // Initialize the app
                this.initEventListeners();
                this.loadDashboard();
            } else {
                errorDiv.textContent = data.error || 'Login failed';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Connection error';
            errorDiv.style.display = 'block';
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        this.token = null;
        this.showLoginModal();
    }

    showLoginModal() {
        // Hide main content
        const mainContent = document.querySelector('.container-fluid');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
        
        // Get modal element
        const loginModal = document.getElementById('loginModal');
        
        if (!loginModal) {
            console.error('Login modal not found!');
            return;
        }
        
        // Set up event listeners for modal buttons
        this.initEventListeners();
        
        try {
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const modal = new bootstrap.Modal(loginModal, {
                    backdrop: 'static',
                    keyboard: false
                });
                modal.show();
            } else {
                throw new Error('Bootstrap not available');
            }
        } catch (error) {
            console.error('Bootstrap modal failed:', error);
            
            // Manual modal display
            loginModal.classList.add('show');
            loginModal.style.display = 'block';
            loginModal.setAttribute('aria-modal', 'true');
            loginModal.setAttribute('role', 'dialog');
            
            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.style.zIndex = '1040';
            document.body.appendChild(backdrop);
            
            // Ensure modal is on top
            loginModal.style.zIndex = '1050';
        }
    }

    async verifyToken() {
        try {
            console.log('Verifying token...');
            const response = await this.apiCall('/auth/verify');
            console.log('Verify response:', response);
            return response.success;
        } catch (error) {
            console.log('Token verification failed:', error);
            return false;
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        console.log(`API Call: ${method} ${this.apiBase}${endpoint}`);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Add authorization header if token exists
        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, options);
            const result = await response.json();
            console.log(`API Response:`, result);
            return result;
        } catch (error) {
            console.error(`API Error:`, error);
            throw error;
        }
    }

    // Placeholder methods for other sections
    loadDhcpConfig() {
        console.log('Loading DHCP configuration...');
    }

    loadDnsConfig() {
        console.log('Loading DNS configuration...');
    }

    loadNetworkConfig() {
        console.log('Loading network configuration...');
    }

    loadAdvancedSettings() {
        console.log('Loading advanced settings...');
    }

    // DHCP Reservations Management
    async loadReservations() {
        try {
            // Load reservations, config (for DHCP ranges), and leases (for status detection) in parallel
            const [reservationsResponse, configResponse, leasesResponse] = await Promise.all([
                fetch('/api/dnsmasq/reservations', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                }),
                this.apiCall('/dnsmasq/config'),
                this.apiCall('/dnsmasq/leases')
            ]);

            if (!reservationsResponse.ok) {
                throw new Error(`Failed to load reservations: ${reservationsResponse.status}`);
            }

            const reservationsResult = await reservationsResponse.json();
            if (!reservationsResult.success) {
                throw new Error(reservationsResult.error || 'Failed to load reservations');
            }

            // Store DHCP ranges for network detection
            if (configResponse.success) {
                this.currentDhcpRanges = configResponse.data.dhcpRanges || [];
            }

            // Store current leases for status detection
            if (leasesResponse.success) {
                this.currentLeases = leasesResponse.data;
            }

            this.currentReservations = reservationsResult.data; // Store for later reference
            
            // Populate network filter options
            this.populateReservationNetworkFilter();
            
            // Apply filters and render
            this.applyReservationFiltersAndRender();
            
            document.getElementById('reservations-count').textContent = reservationsResult.data.length;
        } catch (error) {
            console.error('Error loading reservations:', error);
            document.getElementById('reservations-table-body').innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-danger">
                        <i class="bi bi-exclamation-circle me-2"></i>
                        Error loading reservations: ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    displayReservations(reservations) {
        const tbody = document.getElementById('reservations-table-body');
        
        if (reservations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="bi bi-bookmark me-2 text-muted"></i>
                        No static reservations configured
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = reservations.map(reservation => {
            const network = this.getNetworkFromIP(reservation.ipAddress);
            const networkBadge = `<span class="badge bg-info">${network.displayName}</span>`;
            
            // Check if this reservation is currently active (has a matching lease)
            const isActive = this.currentLeases && this.currentLeases.some(lease => 
                lease.macAddress.toLowerCase() === reservation.macAddress.toLowerCase()
            );
            
            const statusBadge = isActive 
                ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Active</span>'
                : '<span class="badge bg-secondary"><i class="bi bi-dash-circle"></i> Inactive</span>';

            return `
                <tr>
                    <td>
                        <code class="text-dark">${reservation.macAddress}</code>
                    </td>
                    <td>
                        <code class="text-primary">${reservation.ipAddress}</code>
                    </td>
                    <td>${reservation.hostname || '<em class="text-muted">Not set</em>'}</td>
                    <td>${networkBadge}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="app.editReservation('${reservation.id}')"
                                    title="Edit reservation">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="app.deleteReservation('${reservation.id}')"
                                    title="Delete reservation">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    populateReservationNetworkFilter() {
        const networkFilter = document.getElementById('reservations-network-filter');
        if (!networkFilter || !this.currentReservations) return;
        
        // Get networks from current reservations
        const networks = new Map();
        
        // Add networks from DHCP ranges
        this.currentDhcpRanges.forEach(range => {
            const networkAddr = this.getNetworkAddress(range.startIp, range.netmask || '255.255.255.0');
            const cidr = this.netmaskToCidr(range.netmask || '255.255.255.0');
            const tag = range.tag || 'default';
            const network = `${networkAddr}/${cidr}`;
            const displayName = `${tag} (${network})`;
            
            networks.set(network, {
                tag: tag,
                network: network,
                displayName: displayName
            });
        });
        
        // Add networks from current reservations that might not be in ranges
        this.currentReservations.forEach(reservation => {
            const networkInfo = this.getNetworkFromIP(reservation.ipAddress);
            if (!networks.has(networkInfo.network)) {
                networks.set(networkInfo.network, networkInfo);
            }
        });
        
        // Clear existing options except the first one
        networkFilter.innerHTML = '<option value="">All Networks</option>';
        
        // Add network options sorted by display name
        Array.from(networks.values())
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .forEach(networkInfo => {
                const option = document.createElement('option');
                option.value = networkInfo.network;
                option.textContent = networkInfo.displayName;
                networkFilter.appendChild(option);
            });
    }
    
    applyReservationFiltersAndRender() {
        if (!this.currentReservations || this.currentReservations.length === 0) {
            this.displayReservations([]);
            this.updateReservationFilterCounts([]);
            return;
        }
        
        // Apply filters
        const filteredReservations = this.filterReservations(this.currentReservations);
        
        // Render filtered results
        this.displayReservations(filteredReservations);
        this.updateReservationFilterCounts(filteredReservations);
    }
    
    filterReservations(reservations) {
        return reservations.filter(reservation => {
            // Network filter
            if (this.currentReservationFilters.network) {
                const networkInfo = this.getNetworkFromIP(reservation.ipAddress);
                if (networkInfo.network !== this.currentReservationFilters.network) {
                    return false;
                }
            }
            
            // Status filter
            if (this.currentReservationFilters.status) {
                const isActive = this.currentLeases && this.currentLeases.some(lease => 
                    lease.macAddress.toLowerCase() === reservation.macAddress.toLowerCase()
                );
                
                if (this.currentReservationFilters.status === 'active' && !isActive) {
                    return false;
                }
                if (this.currentReservationFilters.status === 'inactive' && isActive) {
                    return false;
                }
            }
            
            // Search filter (MAC, IP, or hostname)
            if (this.currentReservationFilters.search) {
                const searchTerm = this.currentReservationFilters.search.toLowerCase();
                const macMatch = reservation.macAddress.toLowerCase().includes(searchTerm);
                const ipMatch = reservation.ipAddress.toLowerCase().includes(searchTerm);
                const hostnameMatch = (reservation.hostname || '').toLowerCase().includes(searchTerm);
                
                if (!macMatch && !ipMatch && !hostnameMatch) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    clearReservationFilters() {
        this.currentReservationFilters = {
            network: '',
            status: '',
            search: ''
        };
        
        // Reset filter controls
        const networkFilter = document.getElementById('reservations-network-filter');
        const statusFilter = document.getElementById('reservations-status-filter');
        const searchFilter = document.getElementById('reservations-search-filter');
        
        if (networkFilter) networkFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (searchFilter) searchFilter.value = '';
        
        // Re-render with no filters and update counts
        this.applyReservationFiltersAndRender();
    }
    
    updateReservationFilterCounts(filteredReservations) {
        const reservationsCount = document.getElementById('reservations-count');
        if (reservationsCount) {
            const totalCount = this.currentReservations.length;
            const filteredCount = filteredReservations.length;
            
            if (filteredCount === totalCount) {
                reservationsCount.textContent = totalCount;
                reservationsCount.className = 'badge bg-warning';
            } else {
                reservationsCount.textContent = `${filteredCount}/${totalCount}`;
                reservationsCount.className = 'badge bg-info';
            }
        }
    }

    showAddReservationModal() {
        // Clear form
        document.getElementById('reservation-form').reset();
        document.getElementById('reservation-id').value = '';
        document.getElementById('reservation-modal-title').textContent = 'Add DHCP Reservation';
        document.getElementById('reservation-error').style.display = 'none';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
        modal.show();
        
        // Setup form submission
        document.getElementById('save-reservation-btn').onclick = () => this.saveReservation();
    }

    editReservation(id) {
        // Find the reservation
        const reservation = this.currentReservations?.find(r => r.id === id);
        if (!reservation) {
            alert('Reservation not found');
            return;
        }

        // Populate form
        document.getElementById('reservation-id').value = reservation.id;
        document.getElementById('reservation-mac').value = reservation.macAddress;
        document.getElementById('reservation-ip').value = reservation.ipAddress;
        document.getElementById('reservation-hostname').value = reservation.hostname || '';
        document.getElementById('reservation-modal-title').textContent = 'Edit DHCP Reservation';
        document.getElementById('reservation-error').style.display = 'none';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
        modal.show();
        
        // Setup form submission
        document.getElementById('save-reservation-btn').onclick = () => this.saveReservation();
    }

    async saveReservation() {
        const form = document.getElementById('reservation-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('reservation-id').value;
        const macAddress = document.getElementById('reservation-mac').value.trim();
        const ipAddress = document.getElementById('reservation-ip').value.trim();
        const hostname = document.getElementById('reservation-hostname').value.trim();
        
        const isEdit = !!id;
        const url = isEdit ? `/api/dnsmasq/reservations/${id}` : '/api/dnsmasq/reservations';
        const method = isEdit ? 'PUT' : 'POST';
        
        const errorDiv = document.getElementById('reservation-error');
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    macAddress,
                    ipAddress,
                    hostname: hostname || undefined
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                errorDiv.textContent = result.error || 'Failed to save reservation';
                errorDiv.style.display = 'block';
                return;
            }

            // Success - close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('reservationModal'));
            modal.hide();
            
            this.loadReservations();
            this.loadDashboard(); // Refresh dashboard counts
            
            // Show success message
            const action = isEdit ? 'updated' : 'created';
            alert(`Reservation ${action} successfully!`);
            
        } catch (error) {
            console.error('Error saving reservation:', error);
            errorDiv.textContent = 'Network error occurred while saving reservation';
            errorDiv.style.display = 'block';
        }
    }

    deleteReservation(id) {
        // Find the reservation
        const reservation = this.currentReservations?.find(r => r.id === id);
        if (!reservation) {
            alert('Reservation not found');
            return;
        }

        // Populate delete modal
        document.getElementById('delete-reservation-mac').textContent = reservation.macAddress;
        document.getElementById('delete-reservation-ip').textContent = reservation.ipAddress;
        document.getElementById('delete-reservation-hostname').textContent = reservation.hostname || 'Not set';
        
        // Show delete modal
        const modal = new bootstrap.Modal(document.getElementById('deleteReservationModal'));
        modal.show();
        
        // Setup delete confirmation
        document.getElementById('confirm-delete-reservation-btn').onclick = () => this.confirmDeleteReservation(id);
    }

    async confirmDeleteReservation(id) {
        try {
            const response = await fetch(`/api/dnsmasq/reservations/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                alert(`Error: ${result.error || 'Failed to delete reservation'}`);
                return;
            }

            // Success - close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteReservationModal'));
            modal.hide();
            
            this.loadReservations();
            this.loadDashboard(); // Refresh dashboard counts
            
            alert('Reservation deleted successfully!');
            
        } catch (error) {
            console.error('Error deleting reservation:', error);
            alert('Network error occurred while deleting reservation');
        }
    }
}

// Global functions for HTML onclick handlers
let app;

window.addEventListener('DOMContentLoaded', () => {
    // Initialize the app class
    try {
        app = new DnsmasqGUI();
        app.init();  // This will show the login modal
        enableAutoRefresh();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});

function convertToStatic(macAddress, hostname, ipAddress) {
    app.convertToStatic(macAddress, hostname, ipAddress);
}

function showLeaseDetails(macAddress) {
    app.showLeaseDetails(macAddress);
}

function restartService() {
    app.restartService();
}

function logout() {
    app.logout();
}

// Placeholder functions for HTML onclick handlers (to be implemented)
function addDhcpRange() {
    alert('DHCP Range management will be implemented next!');
}

function addDhcpOption() {
    alert('DHCP Options management will be implemented next!');
}

function addDnsRecord() {
    alert('DNS Record management will be implemented next!');
}

function addUpstreamServer() {
    alert('Upstream server management will be implemented next!');
}

function refreshLeases() {
    if (app) {
        app.loadLeases();
    }
}

// Auto-refresh functionality
function enableAutoRefresh() {
    setInterval(() => {
        if (app.token) {
            // Only refresh if we're on the dashboard or leases page
            const currentSection = document.querySelector('.content-section[style="display: block;"], .content-section:not([style*="display: none"])');
            if (currentSection) {
                const sectionId = currentSection.id;
                if (sectionId === 'dashboard-section') {
                    app.loadDashboard();
                } else if (sectionId === 'leases-section') {
                    app.loadLeases();
                } else if (sectionId === 'reservations-section') {
                    app.loadReservations();
                }
            }
        }
    }, 30000); // Refresh every 30 seconds
}