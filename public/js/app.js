// Keystone LAN Services Frontend JavaScript

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
        
        this.currentDnsSort = {
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
        
        this.currentDnsFilters = {
            source: '',
            search: ''
        };
        
        this.currentLeases = [];
        this.currentStaticLeases = [];
        this.currentReservations = [];
        this.currentDhcpRanges = [];
        this.currentOptions = [];
        this.allOptions = []; // Backup of all options for filtering
        this.currentDnsRecords = [];
        this.currentNtpConfig = { enabled: false, servers: [], allowSubnets: [] };
        
        // Sidebar state
        this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        
        // Don't call init automatically, let the DOMContentLoaded handler control this
    }

    async init() {
        console.log('Initializing Keystone LAN Services...');
        
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
        this.applySidebarState();
        this.initEventListeners();
        this.loadDashboard();
    }

    applySidebarState() {
        if (this.sidebarCollapsed) {
            document.body.classList.add('sidebar-collapsed');
        } else {
            document.body.classList.remove('sidebar-collapsed');
        }
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
        this.applySidebarState();
    }

    initEventListeners() {
        console.log('Setting up event listeners');
        
        // Sidebar navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const linkElement = e.target.closest('[data-section]');
                const section = linkElement.dataset.section;
                this.showSection(section);
            });
        });

        // Sidebar toggle
        const toggleBtn = document.getElementById('toggle-sidebar');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Sidebar logout
        const sidebarLogout = document.getElementById('sidebar-logout');
        if (sidebarLogout) {
            sidebarLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        // Password field Enter key handler
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.login();
                }
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
        
        // Add filtering event listeners for DNS records table
        this.initDnsFilterListeners();
        
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
        // DHCP Service card - navigate to Leases
        const dhcpServiceCard = document.getElementById('dhcp-service-card');
        if (dhcpServiceCard) {
            dhcpServiceCard.addEventListener('click', () => {
                this.showSection('leases');
            });
        }

        // DNS Service card - navigate to DNS records
        const dnsServiceCard = document.getElementById('dns-service-card');
        if (dnsServiceCard) {
            dnsServiceCard.addEventListener('click', () => {
                this.showSection('dns');
            });
        }

        // NTP Service card - navigate to NTP section
        const ntpStatusCard = document.getElementById('ntp-status-card');
        if (ntpStatusCard) {
            ntpStatusCard.addEventListener('click', () => {
                this.showSection('ntp');
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
    
    initSortingListeners(tableSelector = null) {
        // Add click listeners to sortable table headers
        const selector = tableSelector ? `${tableSelector} .sortable` : '.sortable';
        document.querySelectorAll(selector).forEach(header => {
            // Remove any existing click listeners to prevent duplicates
            header.replaceWith(header.cloneNode(true));
        });
        
        // Re-select elements after cloning to remove old listeners
        document.querySelectorAll(selector).forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.target.closest('.sortable').dataset.sort;
                const table = e.target.closest('table');
                
                if (table && table.id === 'ranges-table') {
                    this.sortRanges(column);
                } else if (table && table.id === 'options-table') {
                    this.sortOptions(column);
                } else if (table && table.id === 'reservations-table') {
                    this.sortReservations(column);
                } else if (table && table.id === 'dns-records-table') {
                    this.sortDnsRecords(column);
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

    initDnsFilterListeners() {
        // Add change listeners to DNS filter controls
        const sourceFilter = document.getElementById('dns-source-filter');
        const searchFilter = document.getElementById('dns-search-filter');
        const clearFiltersBtn = document.getElementById('clear-dns-filters-btn');
        
        if (sourceFilter) {
            sourceFilter.addEventListener('change', (e) => {
                this.currentDnsFilters.source = e.target.value;
                this.updateFilterVisualState(sourceFilter);
                this.applyDnsFiltersAndRender();
            });
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.currentDnsFilters.search = e.target.value;
                this.updateFilterVisualState(searchFilter);
                this.applyDnsFiltersAndRender();
            });
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearDnsFilters();
            });
        }
    }

    initModalEventListeners() {
        // Handle modal accessibility - prevent aria-hidden focus issues
        const modals = ['reservationModal', 'deleteReservationModal', 'loginModal', 'rangeModal', 'deleteRangeModal', 'optionModal', 'deleteOptionModal', 'dnsRecordModal', 'deleteDnsRecordModal'];
        
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
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update sidebar
        document.querySelectorAll('[data-section]').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            
            // Update header title
            const titleElement = document.getElementById('section-title');
            if (titleElement) {
                const spanText = activeLink.querySelector('span');
                titleElement.textContent = spanText ? spanText.textContent : sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
            }
        }

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
                // Add a slight delay to ensure the section is fully rendered
                setTimeout(() => this.loadAdvancedSettings(), 100);
                break;
            case 'ntp':
                this.loadNtpSettings();
                break;
        }
    }

    navigateToReservationsWithMac(macAddress) {
        // Navigate to reservations section
        this.showSection('reservations');
        
        // Set the search filter to the MAC address
        setTimeout(() => {
            const searchFilter = document.getElementById('reservations-search-filter');
            if (searchFilter) {
                searchFilter.value = macAddress;
                this.currentReservationFilters.search = macAddress;
                this.updateFilterVisualState(searchFilter);
                this.applyReservationFiltersAndRender();
            }
        }, 300); // Wait for section to load
    }

    async loadDashboard() {
        try {
            // Load service status
            const statusResponse = await this.apiCall('/dnsmasq/status');

            // Load lease counts
            const leasesResponse = await this.apiCall('/dnsmasq/leases');
            
            // Load config for dashboard data
            const configResponse = await this.apiCall('/dnsmasq/config');
            
            // Update DHCP and DNS cards with status and counts
            this.updateServiceCards(statusResponse, leasesResponse, configResponse);

            // Load NTP status for dashboard
            await this.loadNtpDashboardInfo();

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

    async loadNtpDashboardInfo() {
        try {
            const response = await fetch('/api/ntp/status', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const result = await response.json();
            
            if (result.success) {
                this.updateNtpDashboardCard(result.data);
            } else {
                this.showNtpDashboardError();
            }
        } catch (error) {
            console.error('Failed to load NTP dashboard info:', error);
            this.showNtpDashboardError();
        }
    }

    updateNtpDashboardCard(status) {
        const serviceBadge = document.getElementById('ntp-dash-service');
        const syncBadge = document.getElementById('ntp-dash-sync');
        const sourceText = document.getElementById('ntp-dash-source');

        if (!status) return;

        // Service Status
        if (serviceBadge) {
            const isRunning = status.active === true;
            serviceBadge.textContent = isRunning ? 'RUNNING' : 'STOPPED';
            serviceBadge.className = `badge ${isRunning ? 'bg-success' : 'bg-danger'}`;
        }

        // Sync Status
        if (syncBadge) {
            const isSynced = status.synchronized === true;
            syncBadge.textContent = isSynced ? 'SYNCED' : 'SEARCHING';
            syncBadge.className = `badge ${isSynced ? 'bg-info text-dark' : 'bg-warning text-dark'}`;
        }

        // Source
        if (sourceText) {
            sourceText.textContent = status.source || 'None';
            sourceText.title = status.source || 'None';
        }
    }

    showNtpDashboardError() {
        ['ntp-dash-service', 'ntp-dash-sync'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = 'ERROR';
                el.className = 'badge bg-danger';
            }
        });
        const source = document.getElementById('ntp-dash-source');
        if (source) source.textContent = '-';
    }

    updateServiceCards(statusResponse, leasesResponse, configResponse) {
        const isRunning = statusResponse.success && statusResponse.data.status === 'running';
        const config = configResponse.success ? configResponse.data : null;
        
        // DHCP Card
        const dhcpStatusBadge = document.getElementById('dhcp-dash-status');
        const activeLeasesCount = document.getElementById('active-leases-count-dash');
        const staticResCount = document.getElementById('static-reservations-count-dash');
        
        if (dhcpStatusBadge && config) {
            const hasDhcp = config.dhcpRanges && config.dhcpRanges.length > 0;
            if (!isRunning) {
                dhcpStatusBadge.textContent = 'STOPPED';
                dhcpStatusBadge.className = 'badge bg-danger';
            } else if (!hasDhcp) {
                dhcpStatusBadge.textContent = 'DISABLED';
                dhcpStatusBadge.className = 'badge bg-secondary';
            } else {
                dhcpStatusBadge.textContent = 'ACTIVE';
                dhcpStatusBadge.className = 'badge bg-success';
            }
        }
        
        if (activeLeasesCount && leasesResponse.success) {
            activeLeasesCount.textContent = leasesResponse.data.length;
        }
        
        if (staticResCount && config) {
            staticResCount.textContent = (config.staticLeases || []).length;
        }
        
        // DNS Card
        const dnsStatusBadge = document.getElementById('dns-dash-status');
        const dnsRecordsCount = document.getElementById('dns-records-count-dash');
        const upstreamServersCount = document.getElementById('upstream-servers-count-dash');
        
        if (dnsStatusBadge && config) {
            const isDnsEnabled = config.port !== 0; // standard dnsmasq: port=0 disables dns
            if (!isRunning) {
                dnsStatusBadge.textContent = 'STOPPED';
                dnsStatusBadge.className = 'badge bg-danger';
            } else if (!isDnsEnabled) {
                dnsStatusBadge.textContent = 'DISABLED';
                dnsStatusBadge.className = 'badge bg-secondary';
            } else {
                dnsStatusBadge.textContent = 'ACTIVE';
                dnsStatusBadge.className = 'badge bg-success';
            }
        }
        
        if (dnsRecordsCount && config) {
            // Only count A records as primary host records
            const aRecords = (config.dnsRecords || []).filter(r => r.type === 'A');
            dnsRecordsCount.textContent = aRecords.length;
        }
        
        if (upstreamServersCount && config) {
            upstreamServersCount.textContent = (config.upstreamServers || []).length;
        }
    }

    showDashboardError() {
        ['dhcp-dash-status', 'dns-dash-status'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'ERROR';
                element.className = 'badge bg-danger';
            }
        });
    }

    // Helper to check if the user is currently typing or has a modal open
    isUserInteracting() {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)
        );
        
        const isModalOpen = document.querySelector('.modal.show') !== null;
        
        return isInputFocused || isModalOpen;
    }

    async refreshNtpStatusOnly() {
        try {
            const result = await this.apiCall('/ntp/status');
            if (result.success) {
                // Update dashboard card if present
                this.updateNtpDashboardCard(result.data);
                
                // Update settings page status card if present
                const statusText = document.getElementById('ntp-status-text');
                const syncText = document.getElementById('ntp-sync-text');
                const sourceText = document.getElementById('ntp-source-text');
                
                if (statusText) {
                    const isRunning = result.data.active === true;
                    statusText.textContent = isRunning ? 'RUNNING' : 'STOPPED';
                    statusText.style.color = isRunning ? 'var(--bs-success)' : 'var(--bs-danger)';
                }
                
                if (syncText) {
                    const isSynced = result.data.synchronized === true;
                    syncText.textContent = isSynced ? 'SYNCED' : 'SEARCHING';
                    syncText.style.color = isSynced ? 'var(--bs-info)' : 'var(--bs-warning)';
                }
                
                if (sourceText) {
                    sourceText.textContent = result.data.source || 'None';
                }
            }
        } catch (err) {
            console.error('Failed to auto-refresh NTP status:', err);
        }
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
            let ipAddressDisplay = `<code class="text-primary fw-bold">${lease.ipAddress}</code>`;
            if (isStatic && staticLease.ipAddress !== lease.ipAddress) {
                ipAddressDisplay = `<code class="text-primary fw-bold">${lease.ipAddress}</code><br><small class="text-muted">Reserved: <code class="text-muted">${staticLease.ipAddress}</code></small>`;
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
                    <div class="d-flex align-items-center flex-wrap gap-2">
                        <span class="badge bg-info">${networkInfo.tag}</span>
                        <small class="text-muted">${networkInfo.network}</small>
                    </div>
                </td>
                <td>
                    <small class="text-muted">
                        ${isStatic ? 'Static Reservation' : `${expiry.toLocaleString()}<br>(${timeRemaining})`}
                    </small>
                </td>
                <td>
                    <div class="btn-group" role="group">
                    </div>
                </td>
            `;

            const btnGroup = row.querySelector('.btn-group');

            if (isStatic) {
                // Edit Button
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-sm btn-outline-primary';
                editBtn.title = 'Edit static reservation';
                editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
                editBtn.onclick = () => this.editStaticReservation(staticLease.macAddress, staticLease.hostname || '', staticLease.ipAddress);
                btnGroup.appendChild(editBtn);

                // Delete Button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger';
                deleteBtn.title = 'Delete static reservation';
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.onclick = () => this.deleteStaticReservation(staticLease.macAddress, staticLease.hostname || '', staticLease.ipAddress);
                btnGroup.appendChild(deleteBtn);
            } else {
                // Convert to Static Button
                const staticBtn = document.createElement('button');
                staticBtn.className = 'btn btn-sm btn-outline-primary';
                staticBtn.title = 'Convert to static reservation';
                staticBtn.innerHTML = '<i class="bi bi-bookmark"></i> Make Static';
                staticBtn.onclick = () => this.convertToStatic(lease.macAddress, lease.hostname || '', lease.ipAddress);
                btnGroup.appendChild(staticBtn);
            }

            // Details Button
            const detailsBtn = document.createElement('button');
            detailsBtn.className = 'btn btn-sm btn-outline-info';
            detailsBtn.title = 'Show lease details';
            detailsBtn.innerHTML = '<i class="bi bi-info-circle"></i>';
            detailsBtn.onclick = () => this.showLeaseDetails(lease.macAddress);
            btnGroup.appendChild(detailsBtn);

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
        if (!ipAddress || typeof ipAddress !== 'string') {
            return { tag: 'unknown', network: 'none', displayName: 'unknown' };
        }

        try {
            const ipNum = this.ipToNumber(ipAddress);
            
            // First pass: Direct range match (Strictly within Start IP and End IP)
            // This handles cases where multiple ranges might be carved out of the same subnet
            for (const range of this.currentDhcpRanges) {
                if (this.isIpInRange(ipAddress, range)) {
                    const mask = range.netmask || '255.255.255.0';
                    const networkAddr = this.getNetworkAddress(range.startIp, mask);
                    const cidr = this.netmaskToCidr(mask);
                    const tag = range.tag || 'default';
                    return {
                        tag: tag,
                        network: `${networkAddr}/${cidr}`,
                        displayName: `${tag} (${networkAddr}/${cidr})`
                    };
                }
            }
            
            // Second pass: Subnet membership
            // Crucial for identifying the network for reservations that fall outside the dynamic pool
            for (const range of this.currentDhcpRanges) {
                const mask = range.netmask || '255.255.255.0';
                const maskNum = this.ipToNumber(mask);
                const rangeStartNum = this.ipToNumber(range.startIp);
                
                if ((ipNum & maskNum) === (rangeStartNum & maskNum)) {
                    const networkAddr = this.numberToIp((rangeStartNum & maskNum) >>> 0);
                    const cidr = this.netmaskToCidr(mask);
                    const tag = range.tag || 'default';
                    return {
                        tag: tag,
                        network: `${networkAddr}/${cidr}`,
                        displayName: `${tag} (${networkAddr}/${cidr})`
                    };
                }
            }
        } catch (e) {
            console.error('Network detection error:', e);
        }
        
        // Fallback: if not in any range/subnet, use simple /24 network
        const parts = ipAddress.split('.');
        const networkAddr = parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : '0.0.0.0';
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
        if (!tagFilter) return;
        
        // Store the current selection
        const currentSelection = tagFilter.value;
        
        // Merge tags from both existing options AND all DHCP ranges
        const tags = new Set();

        (this.allOptions || []).forEach(option => {
            if (option.tag && option.tag.trim()) {
                tags.add(option.tag.trim());
            }
        });

        (this.currentDhcpRanges || []).forEach(range => {
            if (range.tag && range.tag.trim()) {
                tags.add(range.tag.trim());
            }
        });
        
        // Sort tags alphabetically
        const sortedTags = Array.from(tags).sort();
        
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        
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
        // Populate the Bootstrap confirmation modal
        document.getElementById('make-static-mac').textContent = macAddress;
        document.getElementById('make-static-ip').textContent = ipAddress;
        document.getElementById('make-static-hostname').textContent = hostname || '(none)';

        const modalEl = document.getElementById('makeStaticModal');
        const modal = new bootstrap.Modal(modalEl);

        // Clone the confirm button to remove any previous event listeners
        const confirmBtn = document.getElementById('make-static-confirm-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', async () => {
            modal.hide();
            try {
                const response = await this.apiCall(`/dnsmasq/leases/${macAddress}/static`, 'POST', {
                    hostname: hostname || null,
                    ipAddress: ipAddress
                });
                if (response.success) {
                    this.showAlert('success', 'Static reservation created successfully!');
                    this.loadLeases();
                    this.loadDashboard();
                    this.showBanner('DHCP reservation created. Reload the service to apply changes.');
                } else {
                    this.showAlert('danger', response.error || 'Failed to convert lease to static reservation');
                }
            } catch (error) {
                console.error('Error converting to static:', error);
                this.showAlert('danger', 'Failed to convert lease to static reservation');
            }
        });

        modal.show();
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
        // Populate the Bootstrap delete confirmation modal
        document.getElementById('delete-reservation-mac').textContent = macAddress;
        document.getElementById('delete-reservation-ip').textContent = ipAddress;
        document.getElementById('delete-reservation-hostname').textContent = hostname || 'Not set';

        const modalEl = document.getElementById('deleteReservationModal');
        const modal = new bootstrap.Modal(modalEl);

        // Clone button to remove any stacked listeners
        const confirmBtn = document.getElementById('confirm-delete-reservation-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            modal.hide();
            // Find the reservation ID by MAC address
            this.apiCall('/dnsmasq/config').then(configResponse => {
                if (configResponse.success) {
                    const reservation = configResponse.data.staticLeases.find(
                        lease => lease.macAddress.toLowerCase() === macAddress.toLowerCase()
                    );
                    if (reservation) {
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
                    this.loadLeases();
                    this.loadReservations();
                    this.loadDashboard();
                    this.showBanner('DHCP reservation deleted. Reload the service to apply changes.');
                } else {
                    this.showAlert('danger', response.error || 'Failed to delete static reservation');
                }
            }).catch(error => {
                console.error('Error deleting static reservation:', error);
                this.showAlert('danger', 'Failed to delete static reservation');
            });
        });

        modal.show();
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
                    <div class="d-flex flex-column gap-2">
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-25">
                            <span class="text-muted small text-uppercase fw-bold">IP Address</span>
                            <code class="text-primary">${ipAddress}</code>
                        </div>
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-25">
                            <span class="text-muted small text-uppercase fw-bold">MAC Address</span>
                            <code class="small">${macAddress}</code>
                        </div>
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-25">
                            <span class="text-muted small text-uppercase fw-bold">Manufacturer</span>
                            <span id="manufacturerInfo">
                                <span class="spinner-border spinner-border-sm text-info" role="status"></span>
                                <span class="ms-2 text-muted small">Loading...</span>
                            </span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-25">
                            <span class="text-muted small text-uppercase fw-bold">Hostname</span>
                            <span>${hostname === 'Unknown' ? '<em class="text-muted">Not set</em>' : hostname}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary border-opacity-25">
                            <span class="text-muted small text-uppercase fw-bold">Network</span>
                            <small class="text-muted">${network}</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center py-2">
                            <span class="text-muted small text-uppercase fw-bold">Expires</span>
                            <small class="text-muted">${expiry}</small>
                        </div>
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
        const mainContent = document.querySelector('.content-wrapper') || document.getElementById('main-container') || document.body;
        if (mainContent) {
            mainContent.insertBefore(alertDiv, mainContent.firstChild);
        }

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showModal(title, content) {
        document.getElementById('detailsModalTitle').innerHTML = `<i class="bi bi-info-circle me-2 text-info"></i>${title}`;
        document.getElementById('detailsModalBody').innerHTML = content;
        const bootstrapModal = new bootstrap.Modal(document.getElementById('detailsModal'));
        bootstrapModal.show();
    }

    async restartService() {
        const modalEl = document.getElementById('restartServiceModal');
        const modal = new bootstrap.Modal(modalEl);
        
        // Clone button to remove stacked listeners
        const confirmBtn = document.getElementById('confirm-restart-service-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', async () => {
            try {
                newConfirmBtn.disabled = true;
                newConfirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Restarting...';
                
                const response = await this.apiCall('/dnsmasq/restart', 'POST');
                if (response.success) {
                    this.showAlert('success', 'DNSmasq service restarted successfully!');
                    this.dismissBanner();
                    modal.hide();
                    this.loadDashboard();
                } else {
                    this.showAlert('danger', 'Failed to restart DNSmasq: ' + (response.error || 'Unknown error'));
                }
            } catch (error) {
                this.showAlert('danger', 'Failed to restart DNSmasq service');
                console.error(error);
            } finally {
                newConfirmBtn.disabled = false;
                newConfirmBtn.innerHTML = 'Yes, Restart';
            }
        });

        modal.show();
    }

    async reloadService() {
        const modalEl = document.getElementById('reloadServiceModal');
        const modal = new bootstrap.Modal(modalEl);
        
        // Clone button to remove stacked listeners
        const confirmBtn = document.getElementById('confirm-reload-service-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', async () => {
            try {
                newConfirmBtn.disabled = true;
                newConfirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Reloading...';

                const response = await this.apiCall('/dnsmasq/reload', 'POST');
                if (response.success) {
                    this.showAlert('success', 'DNSmasq service reloaded successfully!');
                    this.dismissBanner();
                    modal.hide();
                    this.loadDashboard();
                } else {
                    this.showAlert('danger', 'Failed to reload DNSmasq: ' + (response.error || 'Unknown error'));
                }
            } catch (error) {
                this.showAlert('danger', 'Failed to reload DNSmasq service');
                console.error(error);
            } finally {
                newConfirmBtn.disabled = false;
                newConfirmBtn.innerHTML = 'Yes, Reload';
            }
        });

        modal.show();
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
                const mainContent = document.querySelector('.container-fluid.mt-3');
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
        const mainContent = document.querySelector('.container-fluid.mt-3');
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
            
            if (response.success && response.user) {
                // Set the username display
                document.getElementById('username-display').textContent = response.user.username;
            }
            
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
    async loadDnsConfig() {
        console.log('Loading DNS configuration...');
        try {
            // Load reservations first if not already loaded to ensure MAC address data is available
            const hadReservations = this.currentReservations && this.currentReservations.length > 0;
            if (!hadReservations) {
                console.log('Loading reservations for DNS record MAC address correlation...');
                await this.loadReservations();
                // Give a small delay to ensure backend processes are complete
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const response = await this.apiCall('/dnsmasq/config');
            console.log('DNS config response:', response);
            
            if (response.success && response.data.dnsRecords) {
                // Store the original records for filtering (never overwrite this)
                this.currentDnsRecords = response.data.dnsRecords;
                this.currentDomainName = response.data.domainName;
                
                // Apply current filters and render the table
                this.applyDnsFiltersAndRender();
            } else {
                console.error('Failed to load DNS records:', response.error);
                document.getElementById('dns-records-container').innerHTML = 
                    '<div class="alert alert-warning">Failed to load DNS records</div>';
            }
        } catch (error) {
            console.error('Error loading DNS configuration:', error);
            document.getElementById('dns-records-container').innerHTML = 
                '<div class="alert alert-danger">Error loading DNS records: ' + error.message + '</div>';
        }
    }

    displayDnsRecords(records) {
        const container = document.getElementById('dns-records-container');
        
        if (!records || records.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No DNS records found</div>';
            return;
        }

        // Never overwrite currentDnsRecords - it should only be set during initial load

        let html = `
            <div class="table-responsive">
                <table class="table table-striped table-hover" id="dns-records-table">
                    <thead class="table-dark">
                        <tr>
                            <th class="sortable" data-sort="type" style="cursor: pointer;">
                                <i class="bi bi-tag me-1"></i>Type <i class="bi bi-chevron-expand text-muted sort-icon"></i>
                            </th>
                            <th class="sortable" data-sort="name" style="cursor: pointer;">
                                <i class="bi bi-pc-display me-1"></i>Hostname <i class="bi bi-chevron-expand text-muted sort-icon"></i>
                            </th>
                            <th class="sortable" data-sort="value" style="cursor: pointer;">
                                <i class="bi bi-globe me-1"></i>IP Address <i class="bi bi-chevron-expand text-muted sort-icon"></i>
                            </th>
                            <th class="sortable" data-sort="aliases" style="cursor: pointer;">
                                <i class="bi bi-link-45deg me-1"></i>Aliases (<span class="badge bg-primary">CNAME</span>) <i class="bi bi-chevron-expand text-muted sort-icon"></i>
                            </th>
                            <th class="sortable" data-sort="macAddress" style="cursor: pointer;">
                                <i class="bi bi-hdd-network me-1"></i>MAC Address <i class="bi bi-chevron-expand text-muted sort-icon"></i>
                            </th>
                            <th width="120"><i class="bi bi-gear me-1"></i>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="dns-records-table-body">`;

        records.forEach(record => {
            let aliasesArray = record.aliases && record.aliases.length > 0 ? record.aliases : [];
            const domainName = this.currentDomainName;
            
            let displayName = record.name;
            let displayValue = record.value;
            
            if (domainName) {
                const suffix = '.' + domainName;
                aliasesArray = aliasesArray.map(alias => 
                    alias.endsWith(suffix) ? alias.substring(0, alias.length - suffix.length) : alias
                );
                
                if (displayName && displayName.endsWith(suffix)) {
                    displayName = displayName.substring(0, displayName.length - suffix.length);
                }
                
                if (record.type === 'CNAME' && displayValue && displayValue.endsWith(suffix)) {
                    displayValue = displayValue.substring(0, displayValue.length - suffix.length);
                }
            }

            const aliases = aliasesArray.length > 0 ? 
                aliasesArray.join(', ') : '<span class="text-muted">-</span>';
            
            // Make MAC address clickable if it exists
            let macAddress;
            if (record.macAddress) {
                macAddress = `<a href="#" class="text-decoration-none" 
                    onclick="app.navigateToReservationsWithMac('${record.macAddress}')" 
                    title="View DHCP reservation for ${record.macAddress}">
                    <code class="text-primary">${record.macAddress}</code>
                </a>`;
            } else {
                macAddress = '<span class="text-muted">-</span>';
            }
            
            html += `
                <tr>
                    <td><span class="badge bg-primary">${record.type}</span></td>
                    <td><strong>${displayName}</strong></td>
                    <td><code class="text-primary">${displayValue}</code></td>
                    <td>${aliases}</td>
                    <td class="text-muted small">${macAddress}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editDnsRecord('${record.id}')"
                                    title="Edit DNS record">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteDnsRecord('${record.id}')"
                                    title="Delete DNS record">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>`;

        container.innerHTML = html;
        
        // Reinitialize sorting listeners for the DNS records table only
        this.initSortingListeners('#dns-records-table');
        
        console.log(`Displayed ${records.length} DNS records`);
    }

    loadNetworkConfig() {
        console.log('Loading network configuration...');
    }

    // Load advanced settings
    async loadAdvancedSettings() {
        try {
            console.log('loadAdvancedSettings() called');
            
            // Wait a moment to ensure the settings section is visible
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('Making API request to /api/dnsmasq/config');
            const response = await fetch('/api/dnsmasq/config', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            console.log('Response status:', response.status);
            if (!response.ok) throw new Error(`Failed to load configuration: ${response.status}`);
            
            const result = await response.json();
            console.log('Received result:', result);
            
            if (!result.success) {
                throw new Error('API returned error: ' + (result.error || 'Unknown error'));
            }
            
            const config = result.data;
            console.log('Config data:', config);
            
            // General Settings
            console.log('Setting form values...');
            const domainElement = document.getElementById('domain-name');
            if (domainElement) {
                domainElement.value = config.domainName || '';
                console.log('Set domain-name to:', config.domainName || '');
            } else {
                console.error('Could not find domain-name element');
            }
            
            const defaultIpElement = document.getElementById('default-ip-address');
            if (defaultIpElement) {
                defaultIpElement.value = config.defaultIpAddress || '';
                console.log('Set default-ip-address to:', config.defaultIpAddress || '');
            } else {
                console.error('Could not find default-ip-address element');
            }
            
            const expandElement = document.getElementById('expand-hosts');
            if (expandElement) {
                expandElement.checked = config.expandHosts || false;
                console.log('Set expand-hosts to:', config.expandHosts || false);
            } else {
                console.error('Could not find expand-hosts element');
            }
            
            document.getElementById('cache-size').value = config.cacheSize || 150;
            document.getElementById('neg-ttl').value = config.negTtl || 3600;
            document.getElementById('local-ttl').value = config.localTtl || 0;
            
            // DNS Settings
            document.getElementById('no-resolv').checked = config.noResolv || false;
            document.getElementById('no-hosts').checked = config.noHosts || false;
            document.getElementById('no-dns-rebind').checked = config.noDnsRebind || false;
            document.getElementById('stop-dns-rebind').checked = config.stopDnsRebind || false;
            document.getElementById('log-facility').value = config.logFacility || '';
            
            // DHCP Settings
            document.getElementById('dhcp-authoritative').checked = config.dhcpAuthoritative || false;
            
            // Network Interface Settings
            document.getElementById('bind-interfaces').checked = config.bindInterfaces || false;
            
            // Logging Settings
            document.getElementById('log-queries').checked = config.logQueries || false;
            document.getElementById('log-dhcp').checked = config.logDhcp || false;
            
            // System Settings
            document.getElementById('no-daemon').checked = config.noDaemon || false;
            
            // Load upstream servers
            this.loadUpstreamServers(config.upstreamServers || []);
            
            // Load network interfaces
            this.loadNetworkInterfaces(config.interfaces || []);
            
        } catch (error) {
            console.error('Error loading advanced settings:', error);
            this.showAlert('Error loading advanced settings: ' + error.message, 'danger');
        }
    }

    // Save advanced settings
    async saveAdvancedSettings() {
        const saveBtn = document.getElementById('save-settings-btn');
        const originalText = saveBtn.innerHTML;
        
        try {
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Saving...';
            saveBtn.disabled = true;

            // First, get the current configuration to preserve existing data
            const currentConfigResponse = await fetch('/api/dnsmasq/config', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!currentConfigResponse.ok) {
                throw new Error('Failed to load current configuration');
            }
            
            const currentConfigResult = await currentConfigResponse.json();
            
            if (!currentConfigResult.success) {
                throw new Error('Failed to load current configuration: ' + (currentConfigResult.error || 'Unknown error'));
            }
            
            const currentConfig = currentConfigResult.data;

            // Collect all form data and merge with existing configuration
            const config = {
                // Preserve existing arrays that aren't managed in Advanced Settings
                staticLeases: currentConfig.staticLeases || [],
                dhcpRanges: currentConfig.dhcpRanges || [],
                dhcpOptions: currentConfig.dhcpOptions || [],
                dnsRecords: currentConfig.dnsRecords || [],
                
                // General Settings
                domainName: document.getElementById('domain-name').value.trim(),
                defaultIpAddress: document.getElementById('default-ip-address').value.trim(),
                expandHosts: document.getElementById('expand-hosts').checked,
                cacheSize: parseInt(document.getElementById('cache-size').value) || 150,
                negTtl: parseInt(document.getElementById('neg-ttl').value) || 3600,
                localTtl: parseInt(document.getElementById('local-ttl').value) || 0,
                
                // DNS Settings
                noResolv: document.getElementById('no-resolv').checked,
                noHosts: document.getElementById('no-hosts').checked,
                noDnsRebind: document.getElementById('no-dns-rebind').checked,
                stopDnsRebind: document.getElementById('stop-dns-rebind').checked,
                logFacility: document.getElementById('log-facility').value,
                
                // DHCP Settings
                dhcpAuthoritative: document.getElementById('dhcp-authoritative').checked,
                
                // Network Interface Settings
                bindInterfaces: document.getElementById('bind-interfaces').checked,
                
                // Logging Settings
                logQueries: document.getElementById('log-queries').checked,
                logDhcp: document.getElementById('log-dhcp').checked,
                
                // System Settings
                noDaemon: document.getElementById('no-daemon').checked,
                
                // Collect upstream servers
                upstreamServers: this.collectUpstreamServers(),
                
                // Collect network interfaces
                interfaces: this.collectNetworkInterfaces()
            };

            console.log('Saving configuration:', config);

            const response = await fetch('/api/dnsmasq/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(config)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response body:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('Configuration saved:', result);
            
            this.showAlert('success', 'Configuration saved successfully!');
            this.showBanner('Configuration updated. Reload the DNSmasq service to apply changes.');
            
        } catch (error) {
            console.error('Error saving advanced settings:', error);
            this.showAlert('danger', 'Error saving configuration: ' + error.message);
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    // Load upstream servers into the UI
    loadUpstreamServers(servers) {
        const container = document.getElementById('upstream-servers-container');
        container.innerHTML = '';
        
        if (servers.length === 0) {
            servers = ['8.8.8.8', '8.8.4.4']; // Default Google DNS
        }
        
        servers.forEach((server, index) => {
            this.addUpstreamServerRow(server, index);
        });
    }

    // Add upstream server row
    addUpstreamServerRow(server = '', index = null) {
        const container = document.getElementById('upstream-servers-container');
        const actualIndex = index !== null ? index : container.children.length;
        
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control upstream-server" placeholder="8.8.8.8" value="${server}">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        container.appendChild(div);
    }

    // Add new upstream server
    addUpstreamServer() {
        this.addUpstreamServerRow();
    }

    // Collect upstream servers from form
    collectUpstreamServers() {
        const inputs = document.querySelectorAll('.upstream-server');
        return Array.from(inputs)
            .map(input => input.value.trim())
            .filter(value => value !== '');
    }

    // Load network interfaces
    loadNetworkInterfaces(interfaces) {
        const container = document.getElementById('network-interfaces-container');
        container.innerHTML = '';
        
        // Get available network interfaces (this would normally come from the server)
        const availableInterfaces = ['eth0', 'wlan0', 'br0', 'enp0s3', 'wlp2s0'];
        
        availableInterfaces.forEach(iface => {
            const div = document.createElement('div');
            div.className = 'form-check mb-2';
            div.innerHTML = `
                <input class="form-check-input network-interface" type="checkbox" 
                       value="${iface}" id="interface-${iface}" 
                       ${interfaces.includes(iface) ? 'checked' : ''}>
                <label class="form-check-label" for="interface-${iface}">
                    ${iface}
                </label>
            `;
            container.appendChild(div);
        });
    }

    // Collect selected network interfaces
    collectNetworkInterfaces() {
        const checkboxes = document.querySelectorAll('.network-interface:checked');
        return Array.from(checkboxes).map(cb => cb.value);
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
            
            const resCount = document.getElementById('reservations-count');
            if (resCount) {
                resCount.textContent = reservationsResult.data.length;
            }
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
                    <td>
                        <div class="d-flex align-items-center flex-wrap gap-2">
                            <span class="badge bg-info">${network.tag}</span>
                            <small class="text-muted">${network.network}</small>
                        </div>
                    </td>
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
            // Tag filter: when a specific tag is selected, include:
            // 1. Options that match the tag exactly
            // 2. Options with no tag (global options that apply to all networks)
            if (this.currentOptionFilters.tag) {
                const matchesTag = option.tag && option.tag.toLowerCase() === this.currentOptionFilters.tag.toLowerCase();
                const isGlobal = !option.tag || !option.tag.trim();
                if (!matchesTag && !isGlobal) {
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

    clearDnsFilters() {
        this.currentDnsFilters = { source: '', search: '' };
        
        // Clear UI controls
        const sourceFilter = document.getElementById('dns-source-filter');
        const searchFilter = document.getElementById('dns-search-filter');
        
        if (sourceFilter) {
            sourceFilter.value = '';
            this.updateFilterVisualState(sourceFilter);
        }
        if (searchFilter) {
            searchFilter.value = '';
            this.updateFilterVisualState(searchFilter);
        }
        
        // Re-render with no filters and update counts
        this.applyDnsFiltersAndRender();
    }

    updateDnsFilterCounts(filteredRecords) {
        const dnsRecordsCount = document.getElementById('dns-records-count');
        if (dnsRecordsCount) {
            const totalCount = this.currentDnsRecords ? this.currentDnsRecords.length : 0;
            const filteredCount = filteredRecords.length;
            
            if (filteredCount === totalCount) {
                dnsRecordsCount.textContent = totalCount;
                dnsRecordsCount.className = 'badge bg-info';
            } else {
                dnsRecordsCount.textContent = `${filteredCount}/${totalCount}`;
                dnsRecordsCount.className = 'badge bg-warning';
            }
        }
    }

    // DNS Records sorting functions
    sortDnsRecords(column) {
        // Cycle through three states: asc -> desc -> unsorted (null)
        if (this.currentDnsSort.column === column) {
            if (this.currentDnsSort.direction === 'asc') {
                this.currentDnsSort.direction = 'desc';
            } else if (this.currentDnsSort.direction === 'desc') {
                // Third click: clear sorting (unsorted state)
                this.currentDnsSort.column = null;
                this.currentDnsSort.direction = 'asc'; // Reset direction for next time
            } else {
                // This shouldn't happen, but handle it by going to ascending
                this.currentDnsSort.column = column;
                this.currentDnsSort.direction = 'asc';
            }
        } else {
            // New column OR clicking on unsorted column: start with ascending
            this.currentDnsSort.column = column;
            this.currentDnsSort.direction = 'asc';
        }
        
        this.applyDnsFiltersAndRender();
    }

    applyDnsFiltersAndRender() {
        if (!this.currentDnsRecords || this.currentDnsRecords.length === 0) {
            this.renderDnsRecords([]);
            this.updateDnsFilterCounts([]);
            return;
        }
        
        // Apply filters
        let filteredRecords = this.filterDnsRecords(this.currentDnsRecords);
        
        // Apply sorting if any
        if (this.currentDnsSort.column) {
            filteredRecords = this.sortFilteredDnsRecords(filteredRecords);
        }
        
        // Render filtered and sorted results
        this.renderDnsRecords(filteredRecords);
        this.updateDnsSortHeaders();
        this.updateDnsFilterCounts(filteredRecords);
    }

    filterDnsRecords(records) {
        return records.filter(record => {
            // Source filter (A records with MAC addresses are from DHCP leases)
            if (this.currentDnsFilters.source) {
                const isFromDhcp = record.type === 'A' && record.macAddress;
                const isFromHosts = !isFromDhcp;
                
                if (this.currentDnsFilters.source === 'dhcp' && !isFromDhcp) {
                    return false;
                }
                if (this.currentDnsFilters.source === 'hosts' && !isFromHosts) {
                    return false;
                }
            }
            
            // Search filter (hostname, IP address, or aliases)
            if (this.currentDnsFilters.search) {
                const searchTerm = this.currentDnsFilters.search.toLowerCase();
                const hostname = (record.name || '').toLowerCase();
                const ipAddress = (record.value || '').toLowerCase();
                const aliases = record.aliases ? record.aliases.join(' ').toLowerCase() : '';
                const macAddress = (record.macAddress || '').toLowerCase();
                
                if (!hostname.includes(searchTerm) && 
                    !ipAddress.includes(searchTerm) && 
                    !aliases.includes(searchTerm) &&
                    !macAddress.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    sortFilteredDnsRecords(records) {
        return [...records].sort((a, b) => {
            let aVal, bVal;
            
            switch (this.currentDnsSort.column) {
                case 'type':
                    aVal = (a.type || '').toLowerCase();
                    bVal = (b.type || '').toLowerCase();
                    break;
                    
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    break;
                    
                case 'value':
                    // Sort IP addresses numerically if they are valid IPs
                    if (this.isValidIP(a.value) && this.isValidIP(b.value)) {
                        aVal = this.ipToNumber(a.value);
                        bVal = this.ipToNumber(b.value);
                        return this.currentDnsSort.direction === 'asc' ? 
                            aVal - bVal : bVal - aVal;
                    } else {
                        aVal = (a.value || '').toLowerCase();
                        bVal = (b.value || '').toLowerCase();
                    }
                    break;
                    
                case 'aliases':
                    // Sort by first alias if available
                    aVal = (a.aliases && a.aliases.length > 0 ? a.aliases[0] : '').toLowerCase();
                    bVal = (b.aliases && b.aliases.length > 0 ? b.aliases[0] : '').toLowerCase();
                    break;
                    
                case 'macAddress':
                    aVal = (a.macAddress || '').toLowerCase();
                    bVal = (b.macAddress || '').toLowerCase();
                    break;
                    
                default:
                    return 0;
            }
            
            // Handle numeric sorting
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return this.currentDnsSort.direction === 'asc' ? 
                    aVal - bVal : bVal - aVal;
            }
            
            // Handle string sorting
            return this.currentDnsSort.direction === 'asc' ? 
                aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
    }

    renderDnsRecords(records) {
        const tableBody = document.getElementById('dns-records-table-body');
        if (!tableBody) {
            // Table doesn't exist yet, fall back to displayDnsRecords
            this.displayDnsRecords(records);
            return;
        }

        if (records.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-info-circle me-2"></i>No DNS records found
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = records.map(record => {
            let aliasesArray = record.aliases && record.aliases.length > 0 ? record.aliases : [];
            const domainName = this.currentDomainName;
            
            let displayName = record.name;
            let displayValue = record.value;
            
            if (domainName) {
                const suffix = '.' + domainName;
                aliasesArray = aliasesArray.map(alias => 
                    alias.endsWith(suffix) ? alias.substring(0, alias.length - suffix.length) : alias
                );
                
                if (displayName && displayName.endsWith(suffix)) {
                    displayName = displayName.substring(0, displayName.length - suffix.length);
                }
                
                if (record.type === 'CNAME' && displayValue && displayValue.endsWith(suffix)) {
                    displayValue = displayValue.substring(0, displayValue.length - suffix.length);
                }
            }

            const aliases = aliasesArray.length > 0 ? 
                aliasesArray.join(', ') : '<span class="text-muted">-</span>';
            
            // Make MAC address clickable if it exists
            let macAddress;
            if (record.macAddress) {
                macAddress = `<a href="#" class="text-decoration-none" 
                    onclick="app.navigateToReservationsWithMac('${record.macAddress}')" 
                    title="View DHCP reservation for ${record.macAddress}">
                    <code class="text-primary">${record.macAddress}</code>
                </a>`;
            } else {
                macAddress = '<span class="text-muted">-</span>';
            }
            
            return `
                <tr>
                    <td><span class="badge bg-primary">${record.type}</span></td>
                    <td><strong>${displayName}</strong></td>
                    <td><code class="text-primary">${displayValue}</code></td>
                    <td>${aliases}</td>
                    <td class="text-muted small">${macAddress}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editDnsRecord('${record.id}')"
                                    title="Edit DNS record">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteDnsRecord('${record.id}')"
                                    title="Delete DNS record">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateDnsSortHeaders() {
        const table = document.getElementById('dns-records-table');
        if (!table) return;
        
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            const column = header.getAttribute('data-sort');
            
            // Remove existing sort classes
            header.classList.remove('sort-asc', 'sort-desc');
            
            // Add appropriate sort class if this is the active sort column
            if (column === this.currentDnsSort.column) {
                header.classList.add(`sort-${this.currentDnsSort.direction}`);
            }
        });
    }

    // DNS Record Management Methods
    showAddDnsRecordModal() {
        // Clear form
        const form = document.getElementById('dns-record-form');
        form.reset();
        document.getElementById('dns-record-id').value = '';
        document.getElementById('dns-record-modal-title').textContent = 'Add DNS Record';
        document.getElementById('dns-record-error').style.display = 'none';
        
        // Reset button text
        document.getElementById('save-dns-record-btn').innerHTML = '<i class="bi bi-save"></i> Add DNS Record';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('dnsRecordModal'));
        modal.show();
        
        // Setup form submission
        document.getElementById('save-dns-record-btn').onclick = () => this.saveDnsRecord();
    }

    editDnsRecord(recordId) {
        // Find the DNS record
        const record = this.currentDnsRecords?.find(r => r.id === recordId);
        if (!record) {
            alert('DNS record not found');
            return;
        }

        // Store original hostname for identification
        document.getElementById('dns-record-id').value = record.name; // Use hostname instead of ID
        
        let editName = record.name;
        let editValue = record.value;
        const domainName = this.currentDomainName;
        
        if (domainName) {
            const suffix = '.' + domainName;
            if (editName && editName.endsWith(suffix)) {
                editName = editName.substring(0, editName.length - suffix.length);
            }
            if (record.type === 'CNAME' && editValue && editValue.endsWith(suffix)) {
                editValue = editValue.substring(0, editValue.length - suffix.length);
            }
        }
        
        document.getElementById('dns-record-hostname').value = editName;
        document.getElementById('dns-record-ip').value = editValue;
        
        // Handle aliases
        let aliasesArray = record.aliases && record.aliases.length > 0 ? record.aliases : [];
        
        if (domainName) {
            const suffix = '.' + domainName;
            aliasesArray = aliasesArray.map(alias => 
                alias.endsWith(suffix) ? alias.substring(0, alias.length - suffix.length) : alias
            );
        }
        
        const aliases = aliasesArray.length > 0 ? aliasesArray.join('\n') : '';
        document.getElementById('dns-record-aliases').value = aliases;
        
        document.getElementById('dns-record-modal-title').textContent = 'Edit DNS Record';
        document.getElementById('dns-record-error').style.display = 'none';
        
        // Update button text
        document.getElementById('save-dns-record-btn').innerHTML = '<i class="bi bi-save"></i> Update DNS Record';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('dnsRecordModal'));
        modal.show();
        
        // Setup form submission
        document.getElementById('save-dns-record-btn').onclick = () => this.saveDnsRecord();
    }

    async saveDnsRecord() {
        console.log('saveDnsRecord called');
        
        const form = document.getElementById('dns-record-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('dns-record-id').value;
        const hostname = document.getElementById('dns-record-hostname').value.trim();
        const ipAddress = document.getElementById('dns-record-ip').value.trim();
        const aliasesText = document.getElementById('dns-record-aliases').value.trim();
        
        // Parse aliases - split by newlines and clean up
        const aliases = aliasesText 
            ? aliasesText.split('\n').map(alias => alias.trim()).filter(alias => alias.length > 0)
            : [];

        const isEdit = !!id;
        // For edit, use original hostname in URL (stored in id field), for create use /dns-records
        const url = isEdit ? `/dnsmasq/dns-records/${encodeURIComponent(id)}` : '/dnsmasq/dns-records';
        const method = isEdit ? 'PUT' : 'POST';
        
        const errorDiv = document.getElementById('dns-record-error');
        const saveBtn = document.getElementById('save-dns-record-btn');
        const originalText = saveBtn.innerHTML;
        
        try {
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
            saveBtn.disabled = true;
            
            const response = await this.apiCall(url, method, {
                type: 'A',  // For now, we only support A records
                name: hostname,
                value: ipAddress,
                aliases
            });
            
            if (response.success) {
                this.showAlert('success', `DNS record ${isEdit ? 'updated' : 'added'} successfully!`);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('dnsRecordModal'));
                modal.hide();
                
                // Refresh DNS records
                this.loadDnsConfig();
                this.showBanner('DNS record changed. Reload the DNSmasq service to apply changes.');
            } else {
                errorDiv.textContent = response.error || 'Failed to save DNS record';
                errorDiv.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error saving DNS record:', error);
            errorDiv.textContent = 'Failed to save DNS record: ' + error.message;
            errorDiv.style.display = 'block';
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    deleteDnsRecord(recordId) {
        // Find the DNS record
        const record = this.currentDnsRecords?.find(r => r.id === recordId);
        if (!record) {
            this.showAlert('danger', 'DNS record not found');
            return;
        }

        // Populate delete modal
        document.getElementById('delete-dns-record-hostname').textContent = record.name;
        document.getElementById('delete-dns-record-ip').textContent = record.value;

        // Strip domain suffix from aliases (same as table rendering)
        let aliasesArray = record.aliases && record.aliases.length > 0 ? [...record.aliases] : [];
        if (this.currentDomainName) {
            const suffix = '.' + this.currentDomainName;
            aliasesArray = aliasesArray.map(alias =>
                alias.endsWith(suffix) ? alias.substring(0, alias.length - suffix.length) : alias
            );
        }
        const aliasesText = aliasesArray.length > 0 ? aliasesArray.join(', ') : 'None';
        document.getElementById('delete-dns-record-aliases').textContent = aliasesText;

        // Clone confirm button to remove stacked listeners
        const confirmBtn = document.getElementById('confirm-delete-dns-record-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', () => this.confirmDeleteDnsRecord(record.name));

        // Show delete modal
        const modal = new bootstrap.Modal(document.getElementById('deleteDnsRecordModal'));
        modal.show();
    }

    async confirmDeleteDnsRecord(hostname) {
        const confirmBtn = document.getElementById('confirm-delete-dns-record-btn');
        const originalText = confirmBtn.innerHTML;
        
        try {
            confirmBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';
            confirmBtn.disabled = true;
            
            const response = await this.apiCall(`/dnsmasq/dns-records/${encodeURIComponent(hostname)}`, 'DELETE');
            
            if (response.success) {
                this.showAlert('success', 'DNS record deleted successfully!');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteDnsRecordModal'));
                modal.hide();
                
                // Refresh DNS records
                this.loadDnsConfig();
                this.showBanner('DNS record deleted. Reload the DNSmasq service to apply changes.');
            } else {
                this.showAlert('danger', response.error || 'Failed to delete DNS record');
            }
            
        } catch (error) {
            console.error('Error deleting DNS record:', error);
            this.showAlert('danger', 'Failed to delete DNS record: ' + error.message);
        } finally {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }

    // Helper function to check if a string is a valid IP address
    isValidIP(ip) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
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
                    hostname: hostname
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
            this.showAlert('danger', 'Reservation not found');
            return;
        }

        // Populate delete modal
        document.getElementById('delete-reservation-mac').textContent = reservation.macAddress;
        document.getElementById('delete-reservation-ip').textContent = reservation.ipAddress;
        document.getElementById('delete-reservation-hostname').textContent = reservation.hostname || 'Not set';
        
        const modalEl = document.getElementById('deleteReservationModal');
        const modal = new bootstrap.Modal(modalEl);

        // Clone button to remove any stacked listeners
        const confirmBtn = document.getElementById('confirm-delete-reservation-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => this.confirmDeleteReservation(id, modal));

        modal.show();
    }

    async confirmDeleteReservation(id, modal) {
        try {
            const response = await fetch(`/api/dnsmasq/reservations/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                this.showAlert('danger', result.error || 'Failed to delete reservation');
                return;
            }

            // Success - close modal and refresh
            if (modal) modal.hide();
            
            this.loadReservations();
            this.loadDashboard();
            this.showAlert('success', 'Reservation deleted successfully!');
            this.showBanner('DHCP reservation deleted. Reload the service to apply changes.');
            
        } catch (error) {
            console.error('Error deleting reservation:', error);
            this.showAlert('danger', 'Network error occurred while deleting reservation');
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
                    <td>${range.tag ? `<span class="badge bg-info">${range.tag}</span>` : '<span class="text-muted">-</span>'}</td>
                    <td><code class="text-primary">${range.startIp}</code></td>
                    <td><code class="text-primary">${range.endIp}</code></td>
                    <td><code class="text-muted">${range.netmask || '255.255.255.0'}</code></td>
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
                    tag,
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
            this.showAlert('danger', 'Range not found');
            return;
        }

        // Populate modal details
        document.getElementById('delete-range-start').textContent = range.startIp;
        document.getElementById('delete-range-end').textContent = range.endIp;
        document.getElementById('delete-range-tag').textContent = range.tag || 'None';

        // --- Dependency check ---
        const tag = range.tag || '';
        const blockedEl = document.getElementById('delete-range-blocked');
        const blockedDetails = document.getElementById('delete-range-blocked-details');
        const confirmBtn = document.getElementById('confirm-delete-range-btn');

        const dependentOptions = (this.allOptions || []).filter(o =>
            o.tag && tag && o.tag.toLowerCase() === tag.toLowerCase()
        );

        // Check reservations by IP range
        const startParts = range.startIp.split('.').map(Number);
        const endParts = range.endIp.split('.').map(Number);
        const ipInRange = ip => {
            const p = ip.split('.').map(Number);
            for (let i = 0; i < 4; i++) {
                if (p[i] < startParts[i]) return false;
                if (p[i] > endParts[i]) return false;
            }
            return true;
        };
        const dependentReservations = (this.currentReservations || []).filter(r =>
            r.ipAddress && ipInRange(r.ipAddress)
        );

        const hasBlocking = (tag && dependentOptions.length > 0) || dependentReservations.length > 0;

        const modalEl = document.getElementById('deleteRangeModal');
        const modal = new bootstrap.Modal(modalEl);

        if (hasBlocking) {
            const lines = [];
            if (dependentOptions.length > 0) {
                lines.push(`<strong>${dependentOptions.length}</strong> DHCP option(s) use the tag <em>${tag}</em>`);
            }
            if (dependentReservations.length > 0) {
                lines.push(`<strong>${dependentReservations.length}</strong> static reservation(s) have IPs in this range`);
            }
            blockedDetails.innerHTML = lines.map(l => `<div>• ${l}</div>`).join('');
            blockedEl.style.display = 'block';
            confirmBtn.style.display = 'none';
        } else {
            blockedEl.style.display = 'none';
            confirmBtn.style.display = '';

            // Clone button to remove stacked listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            newConfirmBtn.addEventListener('click', () => this.deleteRange(id, modal));
        }

        modal.show();
    }

    async deleteRange(id, modal) {
        try {
            const response = await fetch(`/api/dnsmasq/ranges/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const result = await response.json();

            if (!result.success) {
                this.showAlert('danger', `Failed to delete range: ${result.error}`);
                return;
            }

            if (modal) modal.hide();
            this.loadRanges();
            this.showAlert('success', 'Range deleted successfully!');
            this.showBanner('DHCP range deleted. Reload the service to apply changes.');

        } catch (error) {
            console.error('Error deleting range:', error);
            this.showAlert('danger', 'Network error occurred while deleting range');
        }
    }

    // DHCP Options management methods
    async loadOptions() {
        try {
            const [optionsResponse, configResponse] = await Promise.all([
                fetch('/api/dnsmasq/options', { headers: { 'Authorization': `Bearer ${this.token}` } }),
                fetch('/api/dnsmasq/config', { headers: { 'Authorization': `Bearer ${this.token}` } })
            ]);
            const result = await optionsResponse.json();
            const configResult = await configResponse.json();

            if (!result.success) {
                console.error('Failed to load DHCP options:', result.error);
                return;
            }

            this.allOptions = result.data || [];
            this.currentOptions = result.data || [];

            // Keep currentDhcpRanges fresh so the tag dropdown in the option modal is populated
            if (configResult.success) {
                this.currentDhcpRanges = configResult.data.dhcpRanges || [];
            }

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
                    <td>${option.tag ? `<span class="badge bg-info">${option.tag}</span>` : '<span class="text-muted">All</span>'}</td>
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

    populateOptionTagSelect(selectedTag) {
        const select = document.getElementById('option-tag');
        if (!select) return;

        // Build unique sorted tag list from DHCP ranges
        const tags = [...new Set(
            (this.currentDhcpRanges || []).map(r => r.tag).filter(Boolean)
        )].sort();

        select.innerHTML = '<option value="">All Networks</option>';
        tags.forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag;
            if (tag === selectedTag) opt.selected = true;
            select.appendChild(opt);
        });
    }

    showAddOptionModal() {
        // Clear form
        document.getElementById('option-form').reset();
        document.getElementById('option-id').value = '';
        document.getElementById('option-active').checked = true; // Default to active
        document.getElementById('option-modal-title').textContent = 'Add DHCP Option';
        document.getElementById('option-error').style.display = 'none';
        document.getElementById('option-custom-number').style.display = 'none';
        
        // Auto-populate tag dropdown
        const preselectedTag = this.currentOptionFilters?.tag || '';
        this.populateOptionTagSelect(preselectedTag);
        
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
        
        // Populate tag dropdown and select current value
        this.populateOptionTagSelect(option.tag || '');
        
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
        const tagRaw = document.getElementById('option-tag').value;
        const tag = tagRaw === '' ? '' : tagRaw; // empty string = All Networks = no tag
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
                    tag: tag,
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
            this.showAlert('danger', 'Option not found');
            return;
        }

        // Populate delete modal
        document.getElementById('delete-option-number').textContent = `${option.option} - ${this.getOptionName(option.option)}`;
        document.getElementById('delete-option-value').textContent = option.value;
        document.getElementById('delete-option-tag').textContent = option.tag || 'All clients';
        
        const modalEl = document.getElementById('deleteOptionModal');
        const modal = new bootstrap.Modal(modalEl);

        // Clone button to remove any stacked listeners
        const confirmBtn = document.getElementById('confirm-delete-option-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => this.deleteOption(id, modal));

        modal.show();
    }

    async deleteOption(id, modal) {
        try {
            const response = await fetch(`/api/dnsmasq/options/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                this.showAlert('danger', `Failed to delete option: ${result.error}`);
                return;
            }

            // Success - close modal and refresh
            if (modal) modal.hide();
            
            this.loadOptions();
            this.showAlert('success', 'Option deleted successfully!');
            this.showBanner('DHCP option deleted. Reload the service to apply changes.');
            
        } catch (error) {
            console.error('Error deleting option:', error);
            this.showAlert('danger', 'Network error occurred while deleting option');
        }
    }

    async loadNtpSettings() {
        const containers = {
            servers: document.getElementById('ntp-servers-container'),
            subnets: document.getElementById('ntp-subnets-container'),
            statusText: document.getElementById('ntp-status-text'),
            syncText: document.getElementById('ntp-sync-text'),
            sourceText: document.getElementById('ntp-source-text'),
            badge: document.getElementById('ntp-status-badge')
        };

        try {
            // Load config and status in parallel
            const [configRes, statusRes] = await Promise.all([
                fetch('/api/ntp/config', { headers: { 'Authorization': `Bearer ${this.token}` } }).then(r => r.json()),
                fetch('/api/ntp/status', { headers: { 'Authorization': `Bearer ${this.token}` } }).then(r => r.json())
            ]);

            if (configRes.success) {
                this.currentNtpConfig = configRes.data;
                this.renderNtpSettings(this.currentNtpConfig);
            }

            if (statusRes.success) {
                this.updateNtpStatus(statusRes.data);
            }
        } catch (error) {
            console.error('Failed to load NTP settings:', error);
        }
    }

    updateNtpStatus(status) {
        const statusText = document.getElementById('ntp-status-text');
        const syncText = document.getElementById('ntp-sync-text');
        const sourceText = document.getElementById('ntp-source-text');
        const badgeContainer = document.getElementById('ntp-status-badge');

        if (!status) return;

        const isRunning = status.active === true;
        const isSynced = status.synchronized;

        statusText.innerHTML = isRunning ? 
            '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Running</span>' : 
            '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Stopped</span>';
        
        syncText.innerHTML = isSynced ? 
            '<span class="text-success">Synchronized</span>' : 
            '<span class="text-warning">Unsynchronized</span>';

        sourceText.textContent = status.source || 'None';

        badgeContainer.innerHTML = isRunning && isSynced ? 
            '<span class="badge bg-success">Active & Synced</span>' : 
            (isRunning ? '<span class="badge bg-warning text-dark">Active (Syncing...)</span>' : '<span class="badge bg-danger">Service Down</span>');
    }

    renderNtpSettings(config) {
        document.getElementById('ntp-enabled-switch').checked = config.enabled;
        
        // Render servers
        const serversContainer = document.getElementById('ntp-servers-container');
        serversContainer.innerHTML = '';
        config.servers.forEach((server, index) => this.addNtpServerUI(server, index));

        // Render subnets
        const subnetsContainer = document.getElementById('ntp-subnets-container');
        subnetsContainer.innerHTML = '';
        config.allowSubnets.forEach((subnet, index) => this.addNtpSubnetUI(subnet, index));
    }

    addNtpServer(value = '') {
        const index = document.querySelectorAll('.ntp-server-input').length;
        this.addNtpServerUI(value, index);
    }

    addNtpServerUI(value, index) {
        const container = document.getElementById('ntp-servers-container');
        const div = document.createElement('div');
        div.className = 'input-group mb-2 ntp-server-row';
        div.innerHTML = `
            <span class="input-group-text"><i class="bi bi-server"></i></span>
            <input type="text" class="form-control ntp-server-input" value="${value}" placeholder="pool.ntp.org">
            <button class="btn btn-outline-danger" type="button" onclick="this.closest('.ntp-server-row').remove()">
                <i class="bi bi-trash"></i>
            </button>
        `;
        container.appendChild(div);
    }

    addNtpSubnet(value = '') {
        const index = document.querySelectorAll('.ntp-subnet-input').length;
        this.addNtpSubnetUI(value, index);
    }

    addNtpSubnetUI(value, index) {
        const container = document.getElementById('ntp-subnets-container');
        const div = document.createElement('div');
        div.className = 'input-group mb-2 ntp-subnet-row';
        div.innerHTML = `
            <span class="input-group-text"><i class="bi bi-shield-lock"></i></span>
            <input type="text" class="form-control ntp-subnet-input" value="${value}" placeholder="192.168.1.0/24">
            <button class="btn btn-outline-danger" type="button" onclick="this.closest('.ntp-subnet-row').remove()">
                <i class="bi bi-trash"></i>
            </button>
        `;
        container.appendChild(div);
    }

    async saveNtpSettings() {
        const saveBtn = document.getElementById('save-ntp-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Applying...';

        const enabled = document.getElementById('ntp-enabled-switch').checked;
        const servers = Array.from(document.querySelectorAll('.ntp-server-input')).map(i => i.value.trim()).filter(v => v);
        const allowSubnets = Array.from(document.querySelectorAll('.ntp-subnet-input')).map(i => i.value.trim()).filter(v => v);

        try {
            const response = await fetch('/api/ntp/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ enabled, servers, allowSubnets })
            });

            const result = await response.json();
            if (result.success) {
                alert('NTP settings applied successfully!');
                this.loadNtpSettings();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Save NTP failed:', error);
            alert('Failed to save NTP settings due to a network error.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
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

function editStaticReservation(macAddress, hostname, ipAddress) {
    app.editStaticReservation(macAddress, hostname, ipAddress);
}

function deleteStaticReservation(macAddress, hostname, ipAddress) {
    app.deleteStaticReservation(macAddress, hostname, ipAddress);
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
    if (app && app.showAddDnsRecordModal) {
        app.showAddDnsRecordModal();
    } else {
        console.error('App not initialized or method not available');
    }
}

function editDnsRecord(recordId) {
    if (app && app.editDnsRecord) {
        app.editDnsRecord(recordId);
    } else {
        console.error('App not initialized or method not available');
    }
}

function deleteDnsRecord(recordId) {
    if (app && app.deleteDnsRecord) {
        app.deleteDnsRecord(recordId);
    } else {
        console.error('App not initialized or method not available');
    }
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
        if (!app.token) return;

        // Determine active section
        const currentSection = document.querySelector('.content-section[style="display: block;"], .content-section:not([style*="display: none"])');
        if (!currentSection) return;

        const sectionId = currentSection.id;

        // 1. Dashboard always refreshes (it's monitoring only)
        if (sectionId === 'dashboard-section') {
            app.loadDashboard();
            return;
        }

        // 2. Volatile pages (Leases) refresh unless the user is interacting
        if (sectionId === 'leases-section') {
            if (!app.isUserInteracting()) {
                app.loadLeases();
            }
            return;
        }

        // 3. Status-only refresh for configuration pages
        if (sectionId === 'ntp-section') {
            // Always refresh the "System Time Status" card, but NEVER the settings forms
            app.refreshNtpStatusOnly();
            return;
        }

        // 4. For other configuration pages, we skip auto-refresh entirely 
        // while the user is on the page to prevent losing work-in-progress.
        // The user can use the manual "Refresh" button instead.
        
    }, 30000); // Refresh every 30 seconds
}