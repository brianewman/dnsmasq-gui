// DNSmasq configuration interfaces

export interface DhcpRange {
  id: string;
  interface?: string;
  startIp: string;
  endIp: string;
  netmask?: string;
  leaseTime: string;
  tag?: string;
  active?: boolean;
}

export interface DhcpOption {
  id: string;
  option: number | string;
  value: string;
  tag?: string;
  force?: boolean;
  active?: boolean;
}

export interface StaticLease {
  id: string;
  macAddress: string;
  ipAddress: string;
  hostname?: string;
  tag?: string;
}

export interface DnsRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'PTR';
  name: string;
  value: string;
  ttl?: number;
  priority?: number; // For MX and SRV records
  weight?: number;   // For SRV records
  port?: number;     // For SRV records
}

export interface NetworkInterface {
  name: string;
  enabled: boolean;
  listenAddress?: string;
}

export interface DnsmasqConfig {
  // Basic settings
  domainName?: string;
  expandHosts: boolean;
  noDaemon: boolean;
  noHosts: boolean;
  noResolv: boolean;
  
  // Network interfaces
  interfaces: NetworkInterface[];
  bindInterfaces: boolean;
  
  // DHCP settings
  dhcpRanges: DhcpRange[];
  dhcpOptions: DhcpOption[];
  staticLeases: StaticLease[];
  dhcpAuthoritative: boolean;
  dhcpLeasetime: string;
  
  // DNS settings
  dnsRecords: DnsRecord[];
  upstreamServers: string[];
  noDnsRebind: boolean;
  stopDnsRebind: boolean;
  
  // Logging
  logQueries: boolean;
  logDhcp: boolean;
  logFacility?: string;
  
  // Advanced options
  cacheSize: number;
  negTtl: number;
  localTtl: number;
}

export interface DhcpLease {
  expiry: Date;
  macAddress: string;
  ipAddress: string;
  hostname?: string;
  clientId?: string;
}
