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
            const statusElement = document.getElementById('service-status');
            if (statusResponse.success) {
                statusElement.innerHTML = `
                    <span class="status-${statusResponse.data.status}">
                        <i class="bi bi-circle-fill me-1"></i>
                        ${statusResponse.data.status.toUpperCase()}
                    </span>
                `;
            }

            // Load lease counts
            const leasesResponse = await this.apiCall('/dnsmasq/leases');
            if (leasesResponse.success) {
                document.getElementById('active-leases-count').textContent = leasesResponse.data.length;
            }

            // Load config for static lease count
            const configResponse = await this.apiCall('/dnsmasq/config');
            if (configResponse.success) {
                this.currentConfig = configResponse.data;
                document.getElementById('static-leases-count').textContent = configResponse.data.staticLeases.length;
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    async loadLeases() {
        try {
            const response = await this.apiCall('/dnsmasq/leases');
            if (response.success) {
                this.renderLeases(response.data);
            }
        } catch (error) {
            console.error('Failed to load leases:', error);
        }
    }

    renderLeases(leases) {
        const tbody = document.getElementById('leases-tbody');
        tbody.innerHTML = '';

        leases.forEach(lease => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lease.ipAddress}</td>
                <td>${lease.macAddress}</td>
                <td>${lease.hostname || '-'}</td>
                <td>${new Date(lease.expiry).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="convertToStatic('${lease.macAddress}', '${lease.hostname || ''}')">
                        <i class="bi bi-bookmark"></i> Make Static
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async convertToStatic(macAddress, hostname) {
        if (!confirm('Convert this lease to a static reservation?')) return;

        try {
            const response = await this.apiCall(`/dnsmasq/leases/${macAddress}/static`, 'POST', { hostname });
            if (response.success) {
                alert('Lease converted to static reservation successfully!');
                this.loadLeases();
                this.loadDashboard(); // Refresh counts
            }
        } catch (error) {
            alert('Failed to convert lease to static reservation');
            console.error(error);
        }
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
});

function convertToStatic(macAddress, hostname) {
    app.convertToStatic(macAddress, hostname);
}

function restartService() {
    app.restartService();
}

function logout() {
    app.logout();
}
