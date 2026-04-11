export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
  jwtExpiresIn: '24h',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // DNSmasq specific configuration
  dnsmasq: {
    configPath: '/app/configs/dnsmasq.conf',
    hostsPath: '/etc/hosts',
    hostsFile: '/app/configs/hosts',
    leasesPath: '/app/data/dnsmasq.leases',
    additionalConfigDir: '/app/configs/dnsmasq.d',
    rangesConfigFile: '/app/configs/dnsmasq.d/dnsmasq-ranges.conf',
    optionsConfigFile: '/app/configs/dnsmasq.d/dnsmasq-options.conf',
    staticLeasesConfigFile: '/app/configs/dnsmasq.d/dnsmasq-static-leases.conf',
    cnamesConfigFile: '/app/configs/dnsmasq.d/dnsmasq-cnames.conf',
    advancedConfigFile: '/app/configs/dnsmasq.d/dnsmasq-advanced.conf',
    
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
