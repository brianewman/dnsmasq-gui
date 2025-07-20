export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
  jwtExpiresIn: '24h',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // DNSmasq specific configuration
  dnsmasq: {
    configPath: process.env.DNSMASQ_CONFIG_PATH || '/etc/dnsmasq.conf',
    hostsPath: process.env.DNSMASQ_HOSTS_PATH || '/etc/hosts',
    leasesPath: process.env.DNSMASQ_LEASES_PATH || '/var/lib/misc/dnsmasq.leases',
    additionalConfigDir: process.env.DNSMASQ_ADDITIONAL_CONFIG_DIR || '/etc/dnsmasq.d',
    
    // Default network configuration
    defaultDhcpRange: '192.168.1.100,192.168.1.200,24h',
    defaultDnsServers: ['8.8.8.8', '8.8.4.4'],
  },
  
  // Security settings
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60 * 1000, // 15 minutes
  }
};
