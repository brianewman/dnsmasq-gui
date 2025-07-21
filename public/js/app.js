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
        
        this.currentRangeSort = {
            column: null,
            direction: 'asc'
        };
        
        this.currentOptionSort = {
            column: null,
            direction: 'asc'
        };
        
        this.currentReservationSort = {
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
        
        this.currentRangeFilters = {
            tag: '',
            status: '',
            search: ''
        };
        
        this.currentOptionFilters = {
            tag: '',
            option: '',
            status: '',
            search: ''
        };
        
        this.currentLeases = [];
        this.currentStaticLeases = [];
        this.currentReservations = [];
        this.currentDhcpRanges = [];
        this.currentOptions = [];
        this.allOptions = []; // Backup of all options for filtering
        
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
        
        // Add event listener for reload button
        const reloadBtn = document.getElementById('reload-service-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => this.reloadService());
        }
        
        // Add event listeners for banner buttons
        const bannerReloadBtn = document.getElementById('banner-reload-btn');
        if (bannerReloadBtn) {
            bannerReloadBtn.addEventListener('click', () => this.reloadService());
        }
        
        const bannerRestartBtn = document.getElementById('banner-restart-btn');
        if (bannerRestartBtn) {
            bannerRestartBtn.addEventListener('click', () => this.restartService());
        }
        
        const bannerDismissBtn = document.getElementById('banner-dismiss-btn');
        if (bannerDismissBtn) {
            bannerDismissBtn.addEventListener('click', () => this.dismissBanner());
        }
        
        // Add sorting event listeners for DHCP leases table
        this.initSortingListeners();
        
        // Add filtering event listeners for DHCP leases table
        this.initFilterListeners();
        
        // Add filtering event listeners for DHCP reservations table
        this.initReservationFilterListeners();
        
        // Add filtering event listeners for DHCP ranges table
        this.initRangeFilterListeners();
        
        // Add filtering event listeners for DHCP options table
        this.initOptionFilterListeners();
        
        // Add modal accessibility event listeners
        this.initModalEventListeners();
    }

    // Helper method to update filter visual states
    updateFilterVisualState(element) {
        if (!element) return;
        
        if (element.value && element.value.trim() !== '') {
            element.classList.add('filter-active');
        } else {
            element.classList.remove('filter-active');
        }
    }

    // Update all filter visual states for a given section
    updateAllFilterVisualStates() {
        // Leases filters
        const leaseFilters = [
            'network-filter',
            'type-filter', 
            'status-filter',
            'search-filter'
        ];
        
        // Reservations filters
        const reservationFilters = [
            'reservations-network-filter',
            'reservations-status-filter',
            'reservations-search-filter'
        ];
        
        // Ranges filters
        const rangeFilters = [
            'ranges-tag-filter',
            'ranges-status-filter',
            'ranges-search-filter'
        ];
        
        // Options filters
        const optionFilters = [
            'options-tag-filter',
            'options-option-filter',
            'options-status-filter',
            'options-search-filter'
        ];
        
        // Update all filter states
        [...leaseFilters, ...reservationFilters, ...rangeFilters, ...optionFilters].forEach(filterId => {
            const element = document.getElementById(filterId);
            this.updateFilterVisualState(element);
        });
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
                const table = e.target.closest('table');
                
                if (table && table.id === 'ranges-table') {
                    this.sortRanges(column);
                } else if (table && table.id === 'options-table') {
                    this.sortOptions(column);
                } else if (table && table.id === 'reservations-table') {
                    this.sortReservations(column);
                } else {
                    this.sortLeases(column);
                }
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
                this.updateFilterVisualState(networkFilter);
                this.applyFiltersAndRender();
            });
        }
        
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.updateFilterVisualState(typeFilter);
                this.applyFiltersAndRender();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.updateFilterVisualState(statusFilter);
                this.applyFiltersAndRender();
            });
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.updateFilterVisualState(searchFilter);
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
                this.updateFilterVisualState(networkFilter);
                this.applyReservationFiltersAndRender();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentReservationFilters.status = e.target.value;
                this.updateFilterVisualState(statusFilter);
                this.applyReservationFiltersAndRender();
            });
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.currentReservationFilters.search = e.target.value;
                this.updateFilterVisualState(searchFilter);
                this.applyReservationFiltersAndRender();
            });
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearReservationFilters();
            });
        }
    }

    initRangeFilterListeners() {
        // Add change listeners to range filter controls
        const tagFilter = document.getElementById('ranges-tag-filter');
        const statusFilter = document.getElementById('ranges-status-filter');
        const searchFilter = document.getElementById('ranges-search-filter');
        const clearFiltersBtn = document.getElementById('clear-ranges-filters-btn');
        
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.currentRangeFilters.tag = e.target.value;
                this.updateFilterVisualState(tagFilter);
                this.applyRangeFiltersAndRender();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentRangeFilters.status = e.target.value;
                this.updateFilterVisualState(statusFilter);
                this.applyRangeFiltersAndRender();
            });
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.currentRangeFilters.search = e.target.value;
                this.updateFilterVisualState(searchFilter);
                this.applyRangeFiltersAndRender();
            });
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearRangeFilters();
            });
        }
    }

    initOptionFilterListeners() {
        // Add change listeners to option filter controls
        const tagFilter = document.getElementById('options-tag-filter');
        const optionFilter = document.getElementById('options-option-filter');
        const statusFilter = document.getElementById('options-status-filter');
        const searchFilter = document.getElementById('options-search-filter');
        const clearFiltersBtn = document.getElementById('clear-options-filters-btn');
        
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.currentOptionFilters.tag = e.target.value;
                this.updateFilterVisualState(tagFilter);
                this.applyOptionFiltersAndRender();
            });
        }
        
        if (optionFilter) {
            optionFilter.addEventListener('input', (e) => {
                this.currentOptionFilters.option = e.target.value;
                this.updateFilterVisualState(optionFilter);
                this.applyOptionFiltersAndRender();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentOptionFilters.status = e.target.value;
                this.updateFilterVisualState(statusFilter);
                this.applyOptionFiltersAndRender();
            });
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.currentOptionFilters.search = e.target.value;
                this.updateFilterVisualState(searchFilter);
                this.applyOptionFiltersAndRender();
            });
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearOptionFilters();
            });
        }
    }

    initModalEventListeners() {
        // Handle modal accessibility - prevent aria-hidden focus issues
        const modals = ['reservationModal', 'deleteReservationModal', 'loginModal', 'rangeModal', 'deleteRangeModal', 'optionModal', 'deleteOptionModal'];
        
        modals.forEach(modalId => {
            const modalElement = document.getElementById(modalId);
            if (modalElement) {
                // Before modal is hidden, blur any focused elements inside to prevent accessibility warnings
                modalElement.addEventListener('hide.bs.modal', () => {
                    const focusedElement = modalElement.querySelector(':focus');
                    if (focusedElement) {
                        focusedElement.blur();
                    }
                });

                // When modal is shown, focus on first focusable element for better accessibility
                modalElement.addEventListener('shown.bs.modal', () => {
                    const firstFocusable = modalElement.querySelector('input:not([type="hidden"]), textarea, select, button:not(.btn-close)');
                    if (firstFocusable) {
                        firstFocusable.focus();
                    }
                });
            }
        });

        // Add click listeners for dashboard cards
        this.initDashboardCardListeners();
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
            case 'leases':
                this.loadLeases();
                // Initialize sorting headers and filter visual states after the section is shown and data is loaded
                setTimeout(() => {
                    this.updateSortHeaders();
                    this.updateAllFilterVisualStates();
                }, 200);
                break;
            case 'reservations':
                this.loadReservations();
                setTimeout(() => this.updateAllFilterVisualStates(), 100);
                break;
            case 'ranges':
                this.loadRanges();
                setTimeout(() => this.updateAllFilterVisualStates(), 100);
                break;
            case 'options':
                this.loadOptions();
                setTimeout(() => this.updateAllFilterVisualStates(), 100);
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
            
            // Check if static reservation has different IP than current lease
            let ipAddressDisplay = `<strong>${lease.ipAddress}</strong>`;
            if (isStatic && staticLease.ipAddress !== lease.ipAddress) {
                ipAddressDisplay = `<strong>${lease.ipAddress}</strong><br><small class="text-muted">Reserved: ${staticLease.ipAddress}</small>`;
            }
            
            row.className = rowClass;
            row.innerHTML = `
                <td>
                    ${ipAddressDisplay}
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
                            `<button class="btn btn-sm btn-outline-primary" 
                                onclick="app.editStaticReservation('${staticLease.macAddress}', '${staticLease.hostname || ''}', '${staticLease.ipAddress}')"
                                title="Edit static reservation">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="app.deleteStaticReservation('${staticLease.macAddress}', '${staticLease.hostname || ''}', '${staticLease.ipAddress}')"
                                title="Delete static reservation">
                            <i class="bi bi-trash"></i>
                        </button>` :
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
    
    parseLeaseTimeToMinutes(leaseTimeStr) {
        if (!leaseTimeStr || leaseTimeStr.trim() === '') {
            return 0;
        }
        
        const str = leaseTimeStr.toLowerCase().trim();
        let totalMinutes = 0;
        
        // Parse different time units
        // Examples: "12h", "30m", "1d", "2h30m", "infinite"
        
        if (str === 'infinite') {
            return Number.MAX_SAFE_INTEGER; // Sort infinite to the end
        }
        
        // Extract days (d)
        const daysMatch = str.match(/(\d+)d/);
        if (daysMatch) {
            totalMinutes += parseInt(daysMatch[1]) * 24 * 60;
        }
        
        // Extract hours (h)
        const hoursMatch = str.match(/(\d+)h/);
        if (hoursMatch) {
            totalMinutes += parseInt(hoursMatch[1]) * 60;
        }
        
        // Extract minutes (m)
        const minutesMatch = str.match(/(\d+)m/);
        if (minutesMatch) {
            totalMinutes += parseInt(minutesMatch[1]);
        }
        
        // Extract seconds (s) - convert to fractional minutes
        const secondsMatch = str.match(/(\d+)s/);
        if (secondsMatch) {
            totalMinutes += parseInt(secondsMatch[1]) / 60;
        }
        
        // If no units found, assume it's hours (common default)
        if (totalMinutes === 0 && /^\d+$/.test(str)) {
            totalMinutes = parseInt(str) * 60;
        }
        
        return totalMinutes;
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
        
        if (networkFilter) {
            networkFilter.value = '';
            this.updateFilterVisualState(networkFilter);
        }
        if (typeFilter) {
            typeFilter.value = '';
            this.updateFilterVisualState(typeFilter);
        }
        if (statusFilter) {
            statusFilter.value = '';
            this.updateFilterVisualState(statusFilter);
        }
        if (searchFilter) {
            searchFilter.value = '';
            this.updateFilterVisualState(searchFilter);
        }
        
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
        const reservationsNetworkFilter = document.getElementById('reservations-network-filter');
        
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
        
        // Populate all network filters (excluding ranges which now uses tags)
        [networkFilter, reservationsNetworkFilter].forEach(filter => {
            if (!filter) return;
            
            // Store the current selection
            const currentSelection = filter.value;
            
            // Clear existing options except the first one
            filter.innerHTML = '<option value="">All Networks</option>';
            
            // Add network options sorted by display name
            Array.from(networks.values())
                .sort((a, b) => a.displayName.localeCompare(b.displayName))
                .forEach(networkInfo => {
                    const option = document.createElement('option');
                    option.value = networkInfo.network;
                    option.textContent = networkInfo.displayName;
                    filter.appendChild(option);
                });
                
            // Restore the previous selection if it still exists
            if (currentSelection && Array.from(filter.options).some(option => option.value === currentSelection)) {
                filter.value = currentSelection;
            }
        });
    }

    populateOptionsTagFilter() {
        const tagFilter = document.getElementById('options-tag-filter');
        if (!tagFilter || !this.allOptions) return;
        
        // Store the current selection
        const currentSelection = tagFilter.value;
        
        // Get unique tags from options
        const tags = new Set();
        this.allOptions.forEach(option => {
            if (option.tag && option.tag.trim()) {
                tags.add(option.tag.trim());
            }
        });
        
        // Sort tags
        const sortedTags = Array.from(tags).sort();
        
        // Clear existing options except the first one
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        
        // Add tag options
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
        
        // Restore the previous selection if it still exists
        if (currentSelection && Array.from(tagFilter.options).some(option => option.value === currentSelection)) {
            tagFilter.value = currentSelection;
        }
    }
    
    populateRangeTagFilter() {
        const tagFilter = document.getElementById('ranges-tag-filter');
        if (!tagFilter || !this.currentDhcpRanges) return;
        
        // Store the current selection
        const currentSelection = tagFilter.value;
        
        // Get unique tags from ranges
        const tags = new Set();
        this.currentDhcpRanges.forEach(range => {
            const tag = range.tag || 'default';
            tags.add(tag.trim());
        });
        
        // Sort tags
        const sortedTags = Array.from(tags).sort();
        
        // Clear existing options except the first one
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        
        // Add tag options
        sortedTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
        
        // Restore the previous selection if it still exists
        if (currentSelection && Array.from(tagFilter.options).some(option => option.value === currentSelection)) {
            tagFilter.value = currentSelection;
        }
    }
    
    updateSortHeaders() {
        const table = document.getElementById('leases-table');
        if (!table) return;
        
        // Reset all headers in the leases table
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Update current sort header
        const currentHeader = table.querySelector(`[data-sort="${this.currentSort.column}"]`);
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
                this.showBanner('DHCP reservation created. Reload the service to apply changes.');
            } else {
                this.showAlert('danger', response.error || 'Failed to convert lease to static reservation');
            }
        } catch (error) {
            console.error('Error converting to static:', error);
            this.showAlert('danger', 'Failed to convert lease to static reservation');
        }
    }

    editStaticReservation(macAddress, hostname, ipAddress) {
        // Fill in the reservation form with the current values
        document.getElementById('reservation-mac').value = macAddress;
        document.getElementById('reservation-ip').value = ipAddress;
        document.getElementById('reservation-hostname').value = hostname || '';
        
        // Update form state to edit mode
        const form = document.getElementById('reservation-form');
        if (form) {
            // Store the original MAC address for the update operation
            form.setAttribute('data-edit-mac', macAddress);
            
            // Update modal title
            const modalTitle = document.getElementById('reservation-modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Static Reservation';
            }
            
            // Update submit button text
            const submitBtn = document.getElementById('save-reservation-btn');
            if (submitBtn) {
                submitBtn.textContent = 'Update Reservation';
            }
        }
        
        // Clear any error messages
        document.getElementById('reservation-error').style.display = 'none';
        
        // Setup form submission event handler
        document.getElementById('save-reservation-btn').onclick = () => this.saveReservation();
        
        // Show the reservation modal
        const reservationModal = new bootstrap.Modal(document.getElementById('reservationModal'));
        reservationModal.show();
    }

    deleteStaticReservation(macAddress, hostname, ipAddress) {
        if (!confirm(`Delete static reservation?\n\nThis will remove the permanent reservation for:\nIP: ${ipAddress}\nMAC: ${macAddress}\nHostname: ${hostname || '(none)'}`)) {
            return;
        }

        // First find the reservation ID by MAC address
        this.apiCall('/dnsmasq/config').then(configResponse => {
            if (configResponse.success) {
                const reservation = configResponse.data.staticLeases.find(
                    lease => lease.macAddress.toLowerCase() === macAddress.toLowerCase()
                );
                
                if (reservation) {
                    // Delete the reservation using its ID
                    return this.apiCall(`/dnsmasq/reservations/${reservation.id}`, 'DELETE');
                } else {
                    throw new Error('Static reservation not found');
                }
            } else {
                throw new Error('Failed to fetch reservations');
            }
        }).then(response => {
            if (response.success) {
                this.showAlert('success', 'Static reservation deleted successfully!');
                this.loadLeases(); // Refresh the lease list
                this.loadReservations(); // Refresh reservations list
                this.loadDashboard(); // Refresh dashboard counts
                this.showBanner('DHCP reservation deleted. Reload the service to apply changes.');
            } else {
                this.showAlert('danger', response.error || 'Failed to delete static reservation');
            }
        }).catch(error => {
            console.error('Error deleting static reservation:', error);
            this.showAlert('danger', 'Failed to delete static reservation');
        });
    }

    async getMacManufacturer(macAddress) {
        // Extract OUI (first 3 octets) from MAC address
        const oui = macAddress.replace(/[:-]/g, '').substring(0, 6).toUpperCase();
        
        // Check local storage cache first
        const cachedOuis = JSON.parse(localStorage.getItem('cachedOuis') || '{}');
        if (cachedOuis[oui]) {
            return cachedOuis[oui];
        }
        
        // Look up via server (which checks local database first, then online)
        try {
            const manufacturer = await this.lookupOuiOnline(oui);
            if (manufacturer && manufacturer !== 'Unknown Manufacturer') {
                // Cache the result in local storage for future use
                cachedOuis[oui] = manufacturer;
                localStorage.setItem('cachedOuis', JSON.stringify(cachedOuis));
                return manufacturer;
            }
        } catch (error) {
            console.log('OUI lookup failed:', error.message);
        }
        
        return 'Unknown Manufacturer';
    }

    async lookupOuiOnline(oui) {
        try {
            const response = await fetch(`/api/dnsmasq/oui/${oui}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.manufacturer) {
                    console.log(`OUI ${oui} resolved via server: ${result.data.manufacturer}`);
                    return result.data.manufacturer;
                }
            }
        } catch (error) {
            console.log(`Server OUI lookup failed for ${oui}:`, error.message);
        }
        
        return null;
    }

    async showLeaseDetails(macAddress) {
        // Find the lease data
        const tbody = document.getElementById('leases-tbody');
        const rows = tbody.querySelectorAll('tr');
        
        for (const row of rows) {
            if (row.innerHTML.includes(macAddress)) {
                const cells = row.querySelectorAll('td');
                const ipAddress = cells[0].textContent.trim();
                const hostname = cells[2].textContent.trim();
                const network = cells[3].textContent.trim();
                const expiry = cells[4].textContent.trim();
                
                // Show modal with loading state for manufacturer
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
                        <div class="col-sm-4"><strong>Manufacturer:</strong></div>
                        <div class="col-sm-8" id="manufacturerInfo">
                            <span class="spinner-border spinner-border-sm" role="status"></span>
                            <span class="ms-2">Loading...</span>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-sm-4"><strong>Hostname:</strong></div>
                        <div class="col-sm-8">${hostname === 'Unknown' ? '<em>Not set</em>' : hostname}</div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-sm-4"><strong>Network:</strong></div>
                        <div class="col-sm-8"><small>${network}</small></div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-sm-4"><strong>Expires:</strong></div>
                        <div class="col-sm-8"><small>${expiry}</small></div>
                    </div>
                `);
                
                // Get manufacturer asynchronously and update the modal
                try {
                    const manufacturer = await this.getMacManufacturer(macAddress);
                    const manufacturerElement = document.getElementById('manufacturerInfo');
                    if (manufacturerElement) {
                        manufacturerElement.innerHTML = manufacturer;
                    }
                } catch (error) {
                    console.error('Error getting manufacturer:', error);
                    const manufacturerElement = document.getElementById('manufacturerInfo');
                    if (manufacturerElement) {
                        manufacturerElement.innerHTML = 'Unknown Manufacturer';
                    }
                }
                
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
                this.dismissBanner();
                this.loadDashboard();
            }
        } catch (error) {
            alert('Failed to restart DNSmasq service');
            console.error(error);
        }
    }

    async reloadService() {
        if (!confirm('Reload DNSmasq configuration? This will apply changes without interrupting active connections.')) return;

        try {
            const response = await this.apiCall('/dnsmasq/reload', 'POST');
            if (response.success) {
                alert('DNSmasq service reloaded successfully!');
                this.dismissBanner();
                this.loadDashboard();
            }
        } catch (error) {
            alert('Failed to reload DNSmasq service');
            console.error(error);
        }
    }

    showBanner(message = 'Reload the DNSmasq service to apply recent configuration changes.') {
        const banner = document.getElementById('service-banner');
        const messageSpan = document.getElementById('banner-message');
        if (banner && messageSpan) {
            messageSpan.textContent = message;
            banner.classList.remove('d-none');
        }
    }

    dismissBanner() {
        const banner = document.getElementById('service-banner');
        if (banner) {
            banner.classList.add('d-none');
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
        
        // Store the current selection
        const currentSelection = networkFilter.value;
        
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
            
        // Restore the previous selection if it still exists
        if (currentSelection && Array.from(networkFilter.options).some(option => option.value === currentSelection)) {
            networkFilter.value = currentSelection;
        }
    }
    
    applyReservationFiltersAndRender() {
        if (!this.currentReservations || this.currentReservations.length === 0) {
            this.displayReservations([]);
            this.updateReservationFilterCounts([]);
            return;
        }
        
        // Apply filters
        let filteredReservations = this.filterReservations(this.currentReservations);
        
        // Apply sorting if any
        if (this.currentReservationSort.column) {
            filteredReservations = this.sortFilteredReservations(filteredReservations);
        }
        
        // Render filtered and sorted results
        this.displayReservations(filteredReservations);
        this.updateReservationFilterCounts(filteredReservations);
        this.updateReservationSortHeaders();
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
        
        if (networkFilter) {
            networkFilter.value = '';
            this.updateFilterVisualState(networkFilter);
        }
        if (statusFilter) {
            statusFilter.value = '';
            this.updateFilterVisualState(statusFilter);
        }
        if (searchFilter) {
            searchFilter.value = '';
            this.updateFilterVisualState(searchFilter);
        }
        
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

    // Reservation sorting and filtering functions
    sortReservations(column) {
        // Cycle through three states: asc -> desc -> unsorted (null)
        if (this.currentReservationSort.column === column) {
            if (this.currentReservationSort.direction === 'asc') {
                this.currentReservationSort.direction = 'desc';
            } else if (this.currentReservationSort.direction === 'desc') {
                // Third click: clear sorting (unsorted state)
                this.currentReservationSort.column = null;
                this.currentReservationSort.direction = 'asc'; // Reset direction for next time
            }
        } else {
            // New column: start with ascending
            this.currentReservationSort.column = column;
            this.currentReservationSort.direction = 'asc';
        }
        
        this.applyReservationFiltersAndRender();
    }

    sortFilteredReservations(reservations) {
        return [...reservations].sort((a, b) => {
            let aVal, bVal;
            
            switch (this.currentReservationSort.column) {
                case 'macAddress':
                    aVal = a.macAddress.toLowerCase();
                    bVal = b.macAddress.toLowerCase();
                    break;
                    
                case 'ipAddress':
                    // Sort IP addresses numerically
                    aVal = this.ipToNumber(a.ipAddress);
                    bVal = this.ipToNumber(b.ipAddress);
                    break;
                    
                case 'hostname':
                    aVal = (a.hostname || '').toLowerCase();
                    bVal = (b.hostname || '').toLowerCase();
                    break;
                    
                case 'network':
                    const networkA = this.getNetworkFromIP(a.ipAddress);
                    const networkB = this.getNetworkFromIP(b.ipAddress);
                    aVal = networkA.displayName.toLowerCase();
                    bVal = networkB.displayName.toLowerCase();
                    break;
                    
                case 'status':
                    const isActiveA = this.currentLeases && this.currentLeases.some(lease => 
                        lease.macAddress.toLowerCase() === a.macAddress.toLowerCase()
                    );
                    const isActiveB = this.currentLeases && this.currentLeases.some(lease => 
                        lease.macAddress.toLowerCase() === b.macAddress.toLowerCase()
                    );
                    aVal = isActiveA ? 'active' : 'inactive';
                    bVal = isActiveB ? 'active' : 'inactive';
                    break;
                    
                default:
                    return 0;
            }
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return this.currentReservationSort.direction === 'asc' ? 
                    aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                return this.currentReservationSort.direction === 'asc' ? 
                    aVal - bVal : bVal - aVal;
            }
        });
    }

    updateReservationSortHeaders() {
        const table = document.getElementById('reservations-table');
        if (!table) return;
        
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            const column = header.getAttribute('data-sort');
            
            // Remove existing sort classes
            header.classList.remove('sort-asc', 'sort-desc');
            
            // Add appropriate sort class if this is the active sort column
            if (column === this.currentReservationSort.column) {
                header.classList.add(`sort-${this.currentReservationSort.direction}`);
            }
        });
    }

    // Range sorting and filtering functions
    sortRanges(column) {
        // Cycle through three states: asc -> desc -> unsorted (null)
        if (this.currentRangeSort.column === column) {
            if (this.currentRangeSort.direction === 'asc') {
                this.currentRangeSort.direction = 'desc';
            } else if (this.currentRangeSort.direction === 'desc') {
                // Third click: clear sorting (unsorted state)
                this.currentRangeSort.column = null;
                this.currentRangeSort.direction = 'asc'; // Reset direction for next time
            }
        } else {
            // New column: start with ascending
            this.currentRangeSort.column = column;
            this.currentRangeSort.direction = 'asc';
        }
        
        this.applyRangeFiltersAndRender();
    }

    applyRangeFiltersAndRender() {
        if (!this.currentDhcpRanges || this.currentDhcpRanges.length === 0) {
            this.currentRanges = [];
            this.renderRanges();
            this.updateRangeFilterCounts([]);
            return;
        }
        
        // Apply filters to the full dataset
        let filteredRanges = this.filterRanges(this.currentDhcpRanges);
        
        // Apply sorting if any
        if (this.currentRangeSort.column) {
            filteredRanges = this.sortFilteredRanges(filteredRanges);
        }
        
        // Update current ranges for rendering
        this.currentRanges = filteredRanges;
        
        // Render filtered and sorted results
        this.renderRanges();
        this.updateRangeFilterCounts(filteredRanges);
        this.updateRangeSortHeaders();
    }

    filterRanges(ranges) {
        return ranges.filter(range => {
            // Tag filter
            if (this.currentRangeFilters.tag) {
                const rangeTag = range.tag || 'default';
                if (rangeTag !== this.currentRangeFilters.tag) {
                    return false;
                }
            }
            
            // Status filter (active/inactive)
            if (this.currentRangeFilters.status) {
                const isActive = range.active !== false; // Default to active if not specified
                if (this.currentRangeFilters.status === 'active' && !isActive) {
                    return false;
                }
                if (this.currentRangeFilters.status === 'inactive' && isActive) {
                    return false;
                }
            }
            
            // Search filter
            if (this.currentRangeFilters.search) {
                const searchTerm = this.currentRangeFilters.search.toLowerCase();
                const rangeTag = (range.tag || 'default').toLowerCase();
                return range.startIp.toLowerCase().includes(searchTerm) ||
                       range.endIp.toLowerCase().includes(searchTerm) ||
                       rangeTag.includes(searchTerm) ||
                       (range.leaseTime && range.leaseTime.toLowerCase().includes(searchTerm));
            }
            
            return true;
        });
    }

    sortFilteredRanges(ranges) {
        return [...ranges].sort((a, b) => {
            let aVal, bVal;
            
            switch (this.currentRangeSort.column) {
                case 'tag':
                    aVal = (a.tag || 'default').toLowerCase();
                    bVal = (b.tag || 'default').toLowerCase();
                    break;
                    
                case 'startIp':
                case 'endIp':
                    // Sort IP addresses numerically
                    const ipField = this.currentRangeSort.column;
                    aVal = a[ipField].split('.').map(num => parseInt(num, 10));
                    bVal = b[ipField].split('.').map(num => parseInt(num, 10));
                    for (let i = 0; i < 4; i++) {
                        if (aVal[i] !== bVal[i]) {
                            return this.currentRangeSort.direction === 'asc' ? 
                                aVal[i] - bVal[i] : bVal[i] - aVal[i];
                        }
                    }
                    return 0;
                    
                case 'leaseDuration':
                    // Convert lease time strings to duration in minutes for proper sorting
                    aVal = this.parseLeaseTimeToMinutes(a.leaseTime || '');
                    bVal = this.parseLeaseTimeToMinutes(b.leaseTime || '');
                    return this.currentRangeSort.direction === 'asc' ? 
                        aVal - bVal : bVal - aVal;
                    
                case 'status':
                    aVal = a.active !== false ? 'active' : 'inactive';
                    bVal = b.active !== false ? 'active' : 'inactive';
                    break;
                    
                default:
                    return 0;
            }
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return this.currentRangeSort.direction === 'asc' ? 
                    aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                return this.currentRangeSort.direction === 'asc' ? 
                    aVal - bVal : bVal - aVal;
            }
        });
    }

    clearRangeFilters() {
        this.currentRangeFilters = { tag: '', status: '', search: '' };
        
        // Clear UI controls
        const tagFilter = document.getElementById('ranges-tag-filter');
        const statusFilter = document.getElementById('ranges-status-filter');
        const searchFilter = document.getElementById('ranges-search-filter');
        
        if (tagFilter) {
            tagFilter.value = '';
            this.updateFilterVisualState(tagFilter);
        }
        if (statusFilter) {
            statusFilter.value = '';
            this.updateFilterVisualState(statusFilter);
        }
        if (searchFilter) {
            searchFilter.value = '';
            this.updateFilterVisualState(searchFilter);
        }
        
        // Re-render with no filters and update counts
        this.applyRangeFiltersAndRender();
    }

    updateRangeFilterCounts(filteredRanges) {
        const rangesCount = document.getElementById('ranges-count');
        if (rangesCount) {
            const totalCount = this.currentDhcpRanges ? this.currentDhcpRanges.length : 0;
            const filteredCount = filteredRanges.length;
            
            if (filteredCount === totalCount) {
                rangesCount.textContent = totalCount;
                rangesCount.className = 'badge bg-success';
            } else {
                rangesCount.textContent = `${filteredCount}/${totalCount}`;
                rangesCount.className = 'badge bg-info';
            }
        }
    }

    updateRangeSortHeaders() {
        const table = document.getElementById('ranges-table');
        if (!table) return;
        
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            const column = header.getAttribute('data-sort');
            
            // Remove existing sort classes
            header.classList.remove('sort-asc', 'sort-desc');
            
            // Add appropriate sort class if this is the active sort column
            if (column === this.currentRangeSort.column) {
                header.classList.add(`sort-${this.currentRangeSort.direction}`);
            }
        });
    }

    // Option sorting and filtering functions
    sortOptions(column) {
        // Cycle through three states: asc -> desc -> unsorted (null)
        if (this.currentOptionSort.column === column) {
            if (this.currentOptionSort.direction === 'asc') {
                this.currentOptionSort.direction = 'desc';
            } else if (this.currentOptionSort.direction === 'desc') {
                // Third click: clear sorting (unsorted state)
                this.currentOptionSort.column = null;
                this.currentOptionSort.direction = 'asc'; // Reset direction for next time
            }
        } else {
            // New column: start with ascending
            this.currentOptionSort.column = column;
            this.currentOptionSort.direction = 'asc';
        }
        
        this.applyOptionFiltersAndRender();
    }

    applyOptionFiltersAndRender() {
        if (!this.allOptions || this.allOptions.length === 0) {
            this.currentOptions = [];
            this.renderOptions();
            this.updateOptionFilterCounts([]);
            return;
        }
        
        // Apply filters to the full dataset
        let filteredOptions = this.filterOptions(this.allOptions);
        
        // Apply sorting if any
        if (this.currentOptionSort.column) {
            filteredOptions = this.sortFilteredOptions(filteredOptions);
        }
        
        // Update current options for rendering
        this.currentOptions = filteredOptions;
        
        // Render filtered and sorted results
        this.renderOptions();
        this.updateOptionFilterCounts(filteredOptions);
        this.updateOptionSortHeaders();
    }

    filterOptions(options) {
        return options.filter(option => {
            // Tag filter
            if (this.currentOptionFilters.tag) {
                if (!option.tag || option.tag.toLowerCase() !== this.currentOptionFilters.tag.toLowerCase()) {
                    return false;
                }
            }
            
            // Option filter (option code/name)
            if (this.currentOptionFilters.option) {
                const filterTerm = this.currentOptionFilters.option.toLowerCase();
                const optionCodeMatch = option.option && option.option.toString().toLowerCase().includes(filterTerm);
                const optionNameMatch = this.getOptionName(option.option).toLowerCase().includes(filterTerm);
                if (!optionCodeMatch && !optionNameMatch) {
                    return false;
                }
            }
            
            // Status filter (active/inactive)
            if (this.currentOptionFilters.status) {
                const isActive = option.active !== false; // Default to active if not specified
                if (this.currentOptionFilters.status === 'active' && !isActive) {
                    return false;
                }
                if (this.currentOptionFilters.status === 'inactive' && isActive) {
                    return false;
                }
            }
            
            // Search filter
            if (this.currentOptionFilters.search) {
                const searchTerm = this.currentOptionFilters.search.toLowerCase();
                return (option.tag && option.tag.toLowerCase().includes(searchTerm)) ||
                       (option.option && option.option.toString().toLowerCase().includes(searchTerm)) ||
                       this.getOptionName(option.option).toLowerCase().includes(searchTerm) ||
                       (option.value && option.value.toLowerCase().includes(searchTerm));
            }
            
            return true;
        });
    }

    sortFilteredOptions(options) {
        return [...options].sort((a, b) => {
            let aVal, bVal;
            
            switch (this.currentOptionSort.column) {
                case 'tag':
                    aVal = (a.tag || '').toLowerCase();
                    bVal = (b.tag || '').toLowerCase();
                    break;
                    
                case 'option':
                    aVal = (a.option || '').toLowerCase();
                    bVal = (b.option || '').toLowerCase();
                    break;
                    
                case 'value':
                    aVal = (a.value || '').toLowerCase();
                    bVal = (b.value || '').toLowerCase();
                    break;
                    
                case 'status':
                    aVal = a.active !== false ? 'active' : 'inactive';
                    bVal = b.active !== false ? 'active' : 'inactive';
                    break;
                    
                default:
                    return 0;
            }
            
            return this.currentOptionSort.direction === 'asc' ? 
                aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
    }

    clearOptionFilters() {
        this.currentOptionFilters = { tag: '', option: '', status: '', search: '' };
        
        // Clear UI controls
        const tagFilter = document.getElementById('options-tag-filter');
        const optionFilter = document.getElementById('options-option-filter');
        const statusFilter = document.getElementById('options-status-filter');
        const searchFilter = document.getElementById('options-search-filter');
        
        if (tagFilter) {
            tagFilter.value = '';
            this.updateFilterVisualState(tagFilter);
        }
        if (optionFilter) {
            optionFilter.value = '';
            this.updateFilterVisualState(optionFilter);
        }
        if (statusFilter) {
            statusFilter.value = '';
            this.updateFilterVisualState(statusFilter);
        }
        if (searchFilter) {
            searchFilter.value = '';
            this.updateFilterVisualState(searchFilter);
        }
        
        // Re-render with no filters and update counts
        this.applyOptionFiltersAndRender();
    }

    updateOptionFilterCounts(filteredOptions) {
        const optionsCount = document.getElementById('options-count');
        if (optionsCount) {
            const totalCount = this.allOptions ? this.allOptions.length : 0;
            const filteredCount = filteredOptions.length;
            
            if (filteredCount === totalCount) {
                optionsCount.textContent = totalCount;
                optionsCount.className = 'badge bg-primary';
            } else {
                optionsCount.textContent = `${filteredCount}/${totalCount}`;
                optionsCount.className = 'badge bg-info';
            }
        }
    }

    updateOptionSortHeaders() {
        const table = document.getElementById('options-table');
        if (!table) return;
        
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            const column = header.getAttribute('data-sort');
            
            // Remove existing sort classes
            header.classList.remove('sort-asc', 'sort-desc');
            
            // Add appropriate sort class if this is the active sort column
            if (column === this.currentOptionSort.column) {
                header.classList.add(`sort-${this.currentOptionSort.direction}`);
            }
        });
    }

    showAddReservationModal() {
        // Clear form
        const form = document.getElementById('reservation-form');
        form.reset();
        form.removeAttribute('data-edit-mac'); // Clear any edit mode attributes
        document.getElementById('reservation-id').value = '';
        document.getElementById('reservation-modal-title').textContent = 'Add DHCP Reservation';
        document.getElementById('reservation-error').style.display = 'none';
        
        // Reset button text
        document.getElementById('save-reservation-btn').textContent = 'Add Reservation';
        
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
        console.log('saveReservation called'); // Debug log
        
        const form = document.getElementById('reservation-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('reservation-id').value;
        const macAddress = document.getElementById('reservation-mac').value.trim();
        const ipAddress = document.getElementById('reservation-ip').value.trim();
        const hostname = document.getElementById('reservation-hostname').value.trim();
        
        // Check if this is an edit operation - either by ID (from reservations page) or by MAC (from leases page)
        const editMac = form.getAttribute('data-edit-mac');
        const isEdit = !!id || !!editMac;
        
        console.log('Edit mode:', isEdit, 'ID:', id, 'Edit MAC:', editMac); // Debug log
        
        let url, method, identifier;
        
        if (editMac && !id) {
            // Editing from leases page - need to find the reservation ID by MAC address
            try {
                const reservationsResponse = await this.apiCall('/dnsmasq/config');
                if (reservationsResponse.success) {
                    const reservation = reservationsResponse.data.staticLeases.find(
                        lease => lease.macAddress.toLowerCase() === editMac.toLowerCase()
                    );
                    if (reservation) {
                        identifier = reservation.id;
                        url = `/api/dnsmasq/reservations/${identifier}`;
                        method = 'PUT';
                    } else {
                        throw new Error('Static reservation not found');
                    }
                } else {
                    throw new Error('Failed to fetch reservations');
                }
            } catch (error) {
                console.error('Error finding reservation:', error);
                document.getElementById('reservation-error').textContent = 'Failed to find existing reservation';
                document.getElementById('reservation-error').style.display = 'block';
                return;
            }
        } else if (isEdit) {
            // Editing from reservations page with ID
            identifier = id;
            url = `/api/dnsmasq/reservations/${identifier}`;
            method = 'PUT';
        } else {
            // Creating new reservation
            url = '/api/dnsmasq/reservations';
            method = 'POST';
        }
        
        console.log('API call:', method, url); // Debug log
        
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
            
            // Clear the edit mode attribute
            form.removeAttribute('data-edit-mac');
            
            this.loadReservations();
            this.loadLeases(); // Also refresh leases if we edited from there
            this.loadDashboard(); // Refresh dashboard counts
            
            // Show success message
            const action = (editMac || id) ? 'updated' : 'created';
            this.showAlert('success', `Reservation ${action} successfully!`);
            
            // Show banner to reload service
            this.showBanner(`DHCP reservation ${action}. Reload the service to apply changes.`);
            
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
            
            // Show banner to reload service
            this.showBanner('DHCP reservation deleted. Reload the service to apply changes.');
            
        } catch (error) {
            console.error('Error deleting reservation:', error);
            alert('Network error occurred while deleting reservation');
        }
    }

    // DHCP Ranges management methods
    async loadRanges() {
        try {
            const response = await fetch('/api/dnsmasq/ranges', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const result = await response.json();
            
            if (!result.success) {
                console.error('Failed to load DHCP ranges:', result.error);
                return;
            }
            
            this.currentDhcpRanges = result.data || [];
            this.currentRanges = result.data || [];
            
            // Populate tag filter with available tags
            this.populateRangeTagFilter();
            
            this.applyRangeFiltersAndRender();
            this.updateRangesCount();
        } catch (error) {
            console.error('Error loading DHCP ranges:', error);
        }
    }

    renderRanges() {
        const tableBody = document.getElementById('ranges-table-body');
        if (!tableBody) return;

        if (!this.currentRanges || this.currentRanges.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="bi bi-info-circle me-2"></i>No DHCP ranges configured
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.currentRanges.map(range => {
            const status = this.getRangeStatus(range);
            const statusClass = status === 'Active' ? 'text-success' : 'text-warning';
            const rangeTag = range.tag || 'default';
            
            return `
                <tr>
                    <td>${range.tag ? `<span class="badge bg-secondary">${range.tag}</span>` : '<span class="text-muted">-</span>'}</td>
                    <td><code>${range.startIp}</code></td>
                    <td><code>${range.endIp}</code></td>
                    <td><code>${range.netmask || '255.255.255.0'}</code></td>
                    <td>${range.leaseTime}</td>
                    <td><span class="${statusClass}"><i class="bi bi-circle-fill me-1"></i>${status}</span></td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="app.editRange('${range.id}')" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-info btn-sm" onclick="app.viewRangeOptions('${rangeTag}')" title="View DHCP Options for this range">
                                <i class="bi bi-toggles"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="app.confirmDeleteRange('${range.id}')" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getRangeStatus(range) {
        return range.active !== false ? 'Active' : 'Inactive';
    }

    viewRangeOptions(rangeTag) {
        // Navigate to DHCP Options section
        this.showSection('options');
        
        // Set the tag filter to the range's tag
        this.currentOptionFilters.tag = rangeTag;
        
        // Load options data first, then apply the filter
        this.loadOptions().then(() => {
            // Update the tag filter dropdown after options are loaded
            const tagFilter = document.getElementById('options-tag-filter');
            if (tagFilter) {
                tagFilter.value = rangeTag;
            }
            
            // Apply the filter to show only options for this tag
            this.applyOptionFiltersAndRender();
        });
    }

    getNetworkName(startIp, endIp, tag) {
        // Extract network from IP range
        const startParts = startIp.split('.');
        const networkBase = `${startParts[0]}.${startParts[1]}.${startParts[2]}.0/24`;
        
        if (tag) {
            return `${tag} (${networkBase})`;
        }
        return networkBase;
    }

    updateRangesCount() {
        const countElement = document.getElementById('ranges-count');
        if (countElement && this.currentRanges) {
            countElement.textContent = this.currentRanges.length.toString();
        }
    }

    showAddRangeModal() {
        // Clear form
        document.getElementById('range-form').reset();
        document.getElementById('range-id').value = '';
        document.getElementById('range-active').checked = true; // Default to active
        document.getElementById('range-modal-title').textContent = 'Add DHCP Range';
        document.getElementById('range-error').style.display = 'none';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('rangeModal'));
        modal.show();
        
        // Setup form submission
        document.getElementById('save-range-btn').onclick = () => this.saveRange();
    }

    editRange(id) {
        // Find the range
        const range = this.currentRanges?.find(r => r.id === id);
        if (!range) {
            alert('Range not found');
            return;
        }

        // Populate form
        document.getElementById('range-id').value = range.id;
        document.getElementById('range-start-ip').value = range.startIp;
        document.getElementById('range-end-ip').value = range.endIp;
        document.getElementById('range-lease-time').value = range.leaseTime || '12h';
        document.getElementById('range-tag').value = range.tag || '';
        document.getElementById('range-netmask').value = range.netmask || '255.255.255.0';
        document.getElementById('range-active').checked = range.active !== false;
        document.getElementById('range-modal-title').textContent = 'Edit DHCP Range';
        document.getElementById('range-error').style.display = 'none';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('rangeModal'));
        modal.show();
        
        // Setup form submission
        document.getElementById('save-range-btn').onclick = () => this.saveRange();
    }

    async saveRange() {
        const form = document.getElementById('range-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('range-id').value;
        const startIp = document.getElementById('range-start-ip').value.trim();
        const endIp = document.getElementById('range-end-ip').value.trim();
        const leaseTime = document.getElementById('range-lease-time').value.trim();
        const tag = document.getElementById('range-tag').value.trim();
        const netmask = document.getElementById('range-netmask').value;
        const active = document.getElementById('range-active').checked;

        const errorDiv = document.getElementById('range-error');
        
        try {
            const isEdit = id !== '';
            const url = isEdit ? `/api/dnsmasq/ranges/${id}` : '/api/dnsmasq/ranges';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    startIp,
                    endIp,
                    leaseTime,
                    tag: tag || undefined,
                    netmask,
                    active
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                errorDiv.textContent = result.error || 'Failed to save range';
                errorDiv.style.display = 'block';
                return;
            }

            // Success - close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('rangeModal'));
            modal.hide();
            
            this.loadRanges();
            
            // Show success message
            const action = isEdit ? 'updated' : 'created';
            alert(`Range ${action} successfully!`);
            
            // Show banner to reload service
            this.showBanner(`DHCP range ${action}. Reload the service to apply changes.`);
            
        } catch (error) {
            console.error('Error saving range:', error);
            errorDiv.textContent = 'Network error occurred while saving range';
            errorDiv.style.display = 'block';
        }
    }

    confirmDeleteRange(id) {
        const range = this.currentRanges?.find(r => r.id === id);
        if (!range) {
            alert('Range not found');
            return;
        }

        // Populate delete modal
        document.getElementById('delete-range-start').textContent = range.startIp;
        document.getElementById('delete-range-end').textContent = range.endIp;
        document.getElementById('delete-range-tag').textContent = range.tag || 'None';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('deleteRangeModal'));
        modal.show();
        
        // Setup delete confirmation
        document.getElementById('confirm-delete-range-btn').onclick = () => this.deleteRange(id);
    }

    async deleteRange(id) {
        try {
            const response = await fetch(`/api/dnsmasq/ranges/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                alert(`Failed to delete range: ${result.error}`);
                return;
            }

            // Success - close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteRangeModal'));
            modal.hide();
            
            this.loadRanges();
            alert('Range deleted successfully!');
            
            // Show banner to reload service
            this.showBanner('DHCP range deleted. Reload the service to apply changes.');
            
        } catch (error) {
            console.error('Error deleting range:', error);
            alert('Network error occurred while deleting range');
        }
    }

    // DHCP Options management methods
    async loadOptions() {
        try {
            const response = await fetch('/api/dnsmasq/options', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const result = await response.json();
            
            if (!result.success) {
                console.error('Failed to load DHCP options:', result.error);
                return;
            }
            
            this.allOptions = result.data || [];
            this.currentOptions = result.data || [];
            this.populateOptionsTagFilter();
            this.applyOptionFiltersAndRender();
            this.updateOptionsCount();
        } catch (error) {
            console.error('Error loading DHCP options:', error);
        }
    }

    renderOptions() {
        const tableBody = document.getElementById('options-table-body');
        if (!tableBody) return;

        if (!this.currentOptions || this.currentOptions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="bi bi-info-circle me-2"></i>No DHCP options configured
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.currentOptions.map(option => {
            const optionName = this.getOptionName(option.option);
            const status = option.active !== false ? 'Active' : 'Inactive';
            const statusClass = status === 'Active' ? 'text-success' : 'text-warning';
            
            return `
                <tr>
                    <td>${option.tag ? `<span class="badge bg-secondary">${option.tag}</span>` : '<span class="text-muted">All</span>'}</td>
                    <td><code>${option.option}</code> - ${optionName}</td>
                    <td><code>${option.value}</code></td>
                    <td><span class="${statusClass}"><i class="bi bi-circle-fill me-1"></i>${status}</span></td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="app.editOption('${option.id}')" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="app.confirmDeleteOption('${option.id}')" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getOptionName(optionNumber) {
        const optionNames = {
            '1': 'Subnet Mask',
            '3': 'Router (Gateway)',
            '6': 'Domain Name Server',
            '15': 'Domain Name',
            '28': 'Broadcast Address',
            '42': 'NTP Servers',
            '121': 'Classless Static Route'
        };
        return optionNames[optionNumber.toString()] || `Option ${optionNumber}`;
    }

    updateOptionsCount() {
        const countElement = document.getElementById('options-count');
        if (countElement && this.currentOptions) {
            countElement.textContent = this.currentOptions.length.toString();
        }
    }

    showAddOptionModal() {
        // Clear form
        document.getElementById('option-form').reset();
        document.getElementById('option-id').value = '';
        document.getElementById('option-active').checked = true; // Default to active
        document.getElementById('option-modal-title').textContent = 'Add DHCP Option';
        document.getElementById('option-error').style.display = 'none';
        document.getElementById('option-custom-number').style.display = 'none';
        
        // Auto-populate tag if currently filtering by tag
        if (this.currentOptionFilters.tag) {
            document.getElementById('option-tag').value = this.currentOptionFilters.tag;
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('optionModal'));
        modal.show();
        
        // Setup form submission
        document.getElementById('save-option-btn').onclick = () => this.saveOption();
        
        // Setup custom option number toggle
        document.getElementById('option-number').onchange = (e) => {
            const customField = document.getElementById('option-custom-number');
            if (e.target.value === 'custom') {
                customField.style.display = 'block';
                customField.required = true;
            } else {
                customField.style.display = 'none';
                customField.required = false;
            }
        };
    }

    editOption(id) {
        // Find the option
        const option = this.currentOptions?.find(o => o.id === id);
        if (!option) {
            alert('Option not found');
            return;
        }

        // Populate form
        document.getElementById('option-id').value = option.id;
        document.getElementById('option-number').value = option.option;
        document.getElementById('option-value').value = option.value;
        document.getElementById('option-tag').value = option.tag || '';
        document.getElementById('option-active').checked = option.active !== false;
        document.getElementById('option-modal-title').textContent = 'Edit DHCP Option';
        document.getElementById('option-error').style.display = 'none';
        
        // Handle custom option number display
        const customField = document.getElementById('option-custom-number');
        const standardOptions = ['1', '3', '6', '15', '28', '42', '121'];
        if (!standardOptions.includes(option.option.toString())) {
            // This is a custom option
            document.getElementById('option-number').value = 'custom';
            customField.value = option.option;
            customField.style.display = 'block';
            customField.required = true;
        } else {
            customField.style.display = 'none';
            customField.required = false;
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('optionModal'));
        modal.show();
        
        // Setup form submission
        document.getElementById('save-option-btn').onclick = () => this.saveOption();
        
        // Setup custom option number toggle
        document.getElementById('option-number').onchange = (e) => {
            const customField = document.getElementById('option-custom-number');
            if (e.target.value === 'custom') {
                customField.style.display = 'block';
                customField.required = true;
            } else {
                customField.style.display = 'none';
                customField.required = false;
                customField.value = '';
            }
        };
    }

    async saveOption() {
        const form = document.getElementById('option-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('option-id').value;
        const optionNumberField = document.getElementById('option-number');
        const customNumberField = document.getElementById('option-custom-number');
        const value = document.getElementById('option-value').value.trim();
        const tag = document.getElementById('option-tag').value.trim();
        const active = document.getElementById('option-active').checked;

        let optionNumber;
        if (optionNumberField.value === 'custom') {
            optionNumber = parseInt(customNumberField.value);
            if (!optionNumber || optionNumber < 1 || optionNumber > 254) {
                const errorDiv = document.getElementById('option-error');
                errorDiv.textContent = 'Custom option number must be between 1 and 254';
                errorDiv.style.display = 'block';
                return;
            }
        } else {
            optionNumber = optionNumberField.value;
        }

        const errorDiv = document.getElementById('option-error');
        
        try {
            const isEdit = id !== '';
            const url = isEdit ? `/api/dnsmasq/options/${id}` : '/api/dnsmasq/options';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    optionNumber,
                    value,
                    tag: tag || undefined,
                    active
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                errorDiv.textContent = result.error || 'Failed to save option';
                errorDiv.style.display = 'block';
                return;
            }

            // Success - close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('optionModal'));
            modal.hide();
            
            this.loadOptions();
            
            // Show success message
            const action = isEdit ? 'updated' : 'created';
            alert(`Option ${action} successfully!`);
            
            // Show banner to reload service
            this.showBanner(`DHCP option ${action}. Reload the service to apply changes.`);
            
        } catch (error) {
            console.error('Error saving option:', error);
            errorDiv.textContent = 'Network error occurred while saving option';
            errorDiv.style.display = 'block';
        }
    }

    confirmDeleteOption(id) {
        const option = this.currentOptions?.find(o => o.id === id);
        if (!option) {
            alert('Option not found');
            return;
        }

        // Populate delete modal
        document.getElementById('delete-option-number').textContent = `${option.option} - ${this.getOptionName(option.option)}`;
        document.getElementById('delete-option-value').textContent = option.value;
        document.getElementById('delete-option-tag').textContent = option.tag || 'All clients';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('deleteOptionModal'));
        modal.show();
        
        // Setup delete confirmation
        document.getElementById('confirm-delete-option-btn').onclick = () => this.deleteOption(id);
    }

    async deleteOption(id) {
        try {
            const response = await fetch(`/api/dnsmasq/options/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                alert(`Failed to delete option: ${result.error}`);
                return;
            }

            // Success - close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteOptionModal'));
            modal.hide();
            
            this.loadOptions();
            alert('Option deleted successfully!');
            
            // Show banner to reload service
            this.showBanner('DHCP option deleted. Reload the service to apply changes.');
            
        } catch (error) {
            console.error('Error deleting option:', error);
            alert('Network error occurred while deleting option');
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
                } else if (sectionId === 'ranges-section') {
                    app.loadRanges();
                } else if (sectionId === 'options-section') {
                    app.loadOptions();
                }
            }
        }
    }, 30000); // Refresh every 30 seconds
}