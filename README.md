# DNSmasq GUI

A modern web-based graphical user interface for managing DNSmasq configuration on Raspberry Pi and other Linux systems.

![DNSmasq GUI Dashboard](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-ISC-blue)
![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.8-blue)

## 🚀 Features

- **🌐 Web-based Interface**: Modern, responsive Bootstrap-based UI
- **🔐 Secure Authentication**: JWT-based login system with bcrypt password hashing
- **🏠 DHCP Management**: Configure multiple network ranges, options, and static reservations
- **📡 DNS Configuration**: Manage A, AAAA, CNAME, MX, TXT, SRV, and PTR records
- **📊 Real-time Monitoring**: View active DHCP leases and service status
- **🔄 Lease Management**: Convert dynamic leases to static reservations with one click
- **🌍 Multi-network Support**: Handle multiple networks with DHCP relay support
- **🍓 Raspberry Pi Optimized**: Designed specifically for Raspberry Pi deployment
- **🛠️ Easy Deployment**: Automated deployment scripts and troubleshooting tools

## 📸 Screenshots

*Screenshots will be added as the project develops*

## 🎯 Target Use Cases

- **Home Lab Management**: Perfect for managing home networks and lab environments
- **Small Business Networks**: Manage multiple VLANs and network segments
- **IoT Networks**: Separate IoT devices with dedicated DHCP ranges
- **Guest Networks**: Easy guest network configuration and management
- **Educational Environments**: Learn networking concepts with a visual interface

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: HTML5, Bootstrap 5, Vanilla JavaScript
- **Security**: JWT, bcrypt, Helmet.js, CORS
- **Target Platform**: Raspberry Pi 4B with Raspberry Pi OS Lite

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm
- TypeScript
- Access to DNSmasq configuration files (for production)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd dnsmasq-gui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

### Default Login Credentials

- **Username**: `admin`
- **Password**: `admin`

⚠️ **Change these credentials in production!**

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://your-pi-ip:3000

# DNSmasq paths (adjust for your system)
DNSMASQ_CONFIG_PATH=/etc/dnsmasq.conf
DNSMASQ_HOSTS_PATH=/etc/hosts
DNSMASQ_LEASES_PATH=/var/lib/dhcp/dhcpd.leases
DNSMASQ_ADDITIONAL_CONFIG_DIR=/etc/dnsmasq.d
```

### Raspberry Pi Deployment

1. Copy the built application to your Raspberry Pi
2. Install Node.js on the Pi
3. Set up the environment variables
4. Configure systemd service (see `deployment/` directory)
5. Ensure the web application has appropriate permissions to read/write DNSmasq files

## Project Structure

```
dnsmasq-gui/
├── src/
│   ├── config/           # Application configuration
│   ├── middleware/       # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic services  
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Application entry point
├── public/              # Static frontend files
│   ├── css/
│   ├── js/
│   └── index.html
├── examples/            # Example configurations
├── dist/               # Compiled JavaScript (generated)
└── docs/               # Additional documentation
```

## Features

### Dashboard
- Service status monitoring
- Quick statistics (active leases, static reservations)
- Service restart functionality

### DHCP Management
- Configure DHCP ranges for multiple networks
- Set DHCP options (gateway, DNS, NTP, etc.)
- Manage static IP reservations
- Support for DHCP relay configurations

### DNS Management
- Create and manage DNS records (A, AAAA, CNAME, MX, TXT, SRV, PTR)
- Configure upstream DNS servers
- Manage local domain resolution

### Lease Management
- View all active DHCP leases
- Convert dynamic leases to static reservations
- Monitor lease expiration times

### Network Configuration
- Configure listening interfaces
- Manage network-specific settings
- Support for tagged VLANs

### Advanced Settings
- Cache configuration
- Logging options
- Security settings
- Performance tuning

## Development Status

This project is in early development. Current status:

- ✅ Project structure and TypeScript setup
- ✅ Basic Express.js server with authentication
- ✅ Frontend HTML structure with Bootstrap UI
- ✅ DNSmasq configuration parser (basic)
- ✅ DHCP lease reading functionality
- 🔄 Frontend JavaScript implementation (in progress)
- ⏳ Complete DNSmasq configuration management
- ⏳ Production deployment scripts
- ⏳ Testing and documentation

## Contributing

This is a personal project for managing DNSmasq on a home Raspberry Pi setup. Contributions are welcome!

## License

ISC License - see LICENSE file for details.

## Roadmap

### Phase 1: Core Functionality ✅
- Basic web server setup
- Authentication system
- Configuration file parsing
- Basic UI structure

### Phase 2: DHCP Features (Next)
- Complete DHCP range management
- DHCP options configuration
- Static lease management
- Lease conversion functionality

### Phase 3: DNS Features
- DNS record management
- Upstream server configuration
- Advanced DNS settings

### Phase 4: Production Ready
- Systemd service configuration
- Security hardening
- Performance optimization
- Comprehensive testing

### Phase 5: Advanced Features
- Configuration backup/restore
- Network monitoring
- Usage statistics
- Mobile-responsive enhancements
