// DNSmasq GUI Frontend JavaScript

class DnsmasqGUI {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.apiBase = '/api';
        this.currentConfig = null;
        
        this.init();
    }

    async init() {
        // Check if user is authenticated
        if (!this.token || !(await this.verifyToken())) {
            this.showLoginModal();
            return;
        }

        this.initEventListeners();
        this.loadDashboard();
    }

    initEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('[data-section]').dataset.section;
                this.showSection(section);
            });
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
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
        if (statusResponse.success) {
            const status = statusResponse.data.status;
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
        } else {
            statusElement.innerHTML = `
                <div class="text-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>Status Unknown
                </div>
            `;
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
            const response = await this.apiCall('/dnsmasq/leases');
            if (response.success) {
                this.renderLeases(response.data);
            } else {
                document.getElementById('leases-tbody').innerHTML = 
                    '<tr><td colspan="5" class="text-center text-muted">Failed to load leases</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load leases:', error);
            document.getElementById('leases-tbody').innerHTML = 
                '<tr><td colspan="5" class="text-center text-danger">Error loading leases</td></tr>';
        }
    }

    renderLeases(leases) {
        const tbody = document.getElementById('leases-tbody');
        tbody.innerHTML = '';

        if (leases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No active leases found</td></tr>';
            return;
        }

        leases.forEach(lease => {
            const row = document.createElement('tr');
            
            // Calculate time remaining
            const expiry = new Date(lease.expiry);
            const now = new Date();
            const timeRemaining = expiry > now ? 
                this.formatTimeRemaining(expiry - now) : 
                '<span class="text-danger">Expired</span>';
            
            row.innerHTML = `
                <td>
                    <strong>${lease.ipAddress}</strong>
                </td>
                <td>
                    <code class="small">${lease.macAddress}</code>
                </td>
                <td>
                    <span class="text-primary">${lease.hostname || '<em>Unknown</em>'}</span>
                </td>
                <td>
                    <small class="text-muted">
                        ${expiry.toLocaleString()}<br>
                        (${timeRemaining})
                    </small>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="app.convertToStatic('${lease.macAddress}', '${lease.hostname || ''}', '${lease.ipAddress}')"
                                title="Convert to static reservation">
                            <i class="bi bi-bookmark"></i> Make Static
                        </button>
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
                this.token = data.token;
                localStorage.setItem('authToken', this.token);
                document.getElementById('username-display').textContent = data.user.username;
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
                this.init();
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
        const modal = new bootstrap.Modal(document.getElementById('loginModal'));
        modal.show();
    }

    async verifyToken() {
        try {
            const response = await this.apiCall('/auth/verify');
            return response.success;
        } catch {
            return false;
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.apiBase}${endpoint}`, options);
        return await response.json();
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
}

// Global functions for HTML onclick handlers
let app;

window.addEventListener('DOMContentLoaded', () => {
    app = new DnsmasqGUI();
    enableAutoRefresh();
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
                }
            }
        }
    }, 30000); // Refresh every 30 seconds
}
