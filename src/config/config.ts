export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
  jwtExpiresIn: '24h',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // DNSmasq specific configuration
  dnsmasq: {
    configPath: process.env.DNSMASQ_CONFIG_PATH || './dev/dnsmasq.conf',
    hostsPath: process.env.DNSMASQ_HOSTS_PATH || './dev/hosts',
    leasesPath: process.env.DNSMASQ_LEASES_PATH || './dev/dnsmasq.leases',
    additionalConfigDir: process.env.DNSMASQ_ADDITIONAL_CONFIG_DIR || './dev/dnsmasq.d',
    rangesConfigFile: process.env.DNSMASQ_RANGES_CONFIG_FILE || './dev/dnsmasq.d/dnsmasq-ranges.conf',
    optionsConfigFile: process.env.DNSMASQ_OPTIONS_CONFIG_FILE || './dev/dnsmasq.d/dnsmasq-options.conf',
    staticLeasesConfigFile: process.env.DNSMASQ_STATIC_LEASES_CONFIG_FILE || './dev/dnsmasq.d/dnsmasq-static-leases.conf',
    advancedConfigFile: process.env.DNSMASQ_ADVANCED_CONFIG_FILE || './dev/dnsmasq.d/dnsmasq-advanced.conf',
    
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
