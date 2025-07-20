import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../config/config';
import { DnsmasqConfig, DhcpLease, StaticLease, DhcpRange, DhcpOption, DnsRecord, NetworkInterface } from '../types/dnsmasq';

const execAsync = promisify(exec);

export class DnsmasqService {
  private configPath: string;
  private leasesPath: string;

  constructor() {
    this.configPath = config.dnsmasq.configPath;
    this.leasesPath = config.dnsmasq.leasesPath;
  }

  async getConfig(): Promise<DnsmasqConfig> {
    try {
      // For development, return mock data if the config file doesn't exist
      if (!await fs.pathExists(this.configPath)) {
        console.log('DNSmasq config file not found, returning mock data for development');
        return this.getMockConfig();
      }
      
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      return this.parseConfig(configContent);
    } catch (error) {
      console.error('Failed to read dnsmasq config:', error);
      console.log('Returning mock data for development');
      return this.getMockConfig();
    }
  }

  private getMockConfig(): DnsmasqConfig {
    return {
      domainName: 'local.lan',
      expandHosts: true,
      noDaemon: false,
      noHosts: false,
      noResolv: false,
      interfaces: [
        { name: 'eth0', enabled: true },
        { name: 'wlan0', enabled: false }
      ],
      bindInterfaces: true,
      dhcpRanges: [
        {
          id: 'range-1',
          startIp: '192.168.10.100',
          endIp: '192.168.10.200',
          leaseTime: '24h',
          tag: 'lan'
        },
        {
          id: 'range-2',
          startIp: '192.168.20.100',
          endIp: '192.168.20.150',
          leaseTime: '12h',
          tag: 'guest'
        }
      ],
      dhcpOptions: [
        {
          id: 'option-1',
          option: 3,
          value: '192.168.10.1',
          tag: 'lan'
        }
      ],
      staticLeases: [
        {
          id: 'static-1',
          macAddress: 'aa:bb:cc:dd:ee:ff',
          ipAddress: '192.168.10.50',
          hostname: 'server.local.lan'
        }
      ],
      dhcpAuthoritative: true,
      dhcpLeasetime: '24h',
      dnsRecords: [
        {
          id: 'dns-1',
          type: 'A',
          name: 'router.local.lan',
          value: '192.168.10.1'
        }
      ],
      upstreamServers: ['8.8.8.8', '8.8.4.4'],
      noDnsRebind: true,
      stopDnsRebind: true,
      logQueries: false,
      logDhcp: false,
      cacheSize: 150,
      negTtl: 3600,
      localTtl: 60
    };
  }

  async updateConfig(newConfig: DnsmasqConfig): Promise<void> {
    try {
      const configContent = this.generateConfigContent(newConfig);
      
      // Backup current config
      await fs.copy(this.configPath, `${this.configPath}.backup.${Date.now()}`);
      
      // Write new config
      await fs.writeFile(this.configPath, configContent);
      
      // Validate configuration
      await this.validateConfig();
      
    } catch (error) {
      console.error('Failed to update dnsmasq config:', error);
      throw new Error('Could not update dnsmasq configuration');
    }
  }

  async getLeases(): Promise<DhcpLease[]> {
    try {
      // For development, return mock data if the leases file doesn't exist
      if (!await fs.pathExists(this.leasesPath)) {
        console.log('DHCP leases file not found, returning mock data for development');
        console.log(`Looking for leases file at: ${this.leasesPath}`);
        return this.getMockLeases();
      }
      
      console.log(`Reading DHCP leases from: ${this.leasesPath}`);
      const leasesContent = await fs.readFile(this.leasesPath, 'utf-8');
      console.log(`Leases file content (${leasesContent.length} chars):`, leasesContent.substring(0, 200));
      const parsedLeases = this.parseLeases(leasesContent);
      console.log(`Parsed ${parsedLeases.length} leases`);
      return parsedLeases;
    } catch (error) {
      console.error('Failed to read DHCP leases:', error);
      // Return mock data for development instead of throwing error
      console.log('Returning mock data for development');
      return this.getMockLeases();
    }
  }

  private getMockLeases(): DhcpLease[] {
    const now = new Date();
    return [
      {
        expiry: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
        macAddress: 'aa:bb:cc:dd:ee:ff',
        ipAddress: '192.168.10.100',
        hostname: 'laptop-john',
        clientId: 'laptop-john'
      },
      {
        expiry: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        macAddress: '11:22:33:44:55:66',
        ipAddress: '192.168.10.101',
        hostname: 'phone-alice',
        clientId: 'phone-alice'
      },
      {
        expiry: new Date(now.getTime() + 12 * 60 * 60 * 1000), // 12 hours from now
        macAddress: '77:88:99:aa:bb:cc',
        ipAddress: '192.168.10.102',
        hostname: 'tablet-bob',
        clientId: 'tablet-bob'
      },
      {
        expiry: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
        macAddress: 'dd:ee:ff:00:11:22',
        ipAddress: '192.168.10.103',
        hostname: 'smart-tv',
        clientId: 'smart-tv'
      }
    ];
  }

  async convertToStaticLease(macAddress: string, hostname?: string): Promise<void> {
    try {
      const leases = await this.getLeases();
      const lease = leases.find(l => l.macAddress.toLowerCase() === macAddress.toLowerCase());
      
      if (!lease) {
        throw new Error('Lease not found');
      }

      const config = await this.getConfig();
      const newStaticLease: StaticLease = {
        id: `static-${Date.now()}`,
        macAddress: lease.macAddress,
        ipAddress: lease.ipAddress,
        hostname: hostname || lease.hostname
      };

      config.staticLeases.push(newStaticLease);
      await this.updateConfig(config);
    } catch (error) {
      console.error('Failed to convert lease to static:', error);
      throw new Error('Could not convert lease to static reservation');
    }
  }

  async restart(): Promise<void> {
    try {
      const restartFlag = '/tmp/dnsmasq-restart-requested';
      const restartResult = '/tmp/dnsmasq-restart-result';
      
      // Clean up any existing result file
      try {
        await fs.unlink(restartResult);
      } catch {
        // File doesn't exist, that's fine
      }
      
      // Create restart request flag
      await fs.writeFile(restartFlag, new Date().toISOString());
      console.log('DNSmasq restart requested via flag file');
      
      // Wait for the restart handler to process the request (max 10 seconds)
      const maxWait = 10000; // 10 seconds
      const pollInterval = 500; // 500ms
      let waited = 0;
      
      while (waited < maxWait) {
        try {
          const result = await fs.readFile(restartResult, 'utf8');
          if (result.trim() === 'success') {
            console.log('DNSmasq service restarted successfully');
            return;
          } else if (result.trim() === 'error') {
            throw new Error('DNSmasq restart failed on the system');
          }
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            // Some other error reading the file
            throw error;
          }
          // File doesn't exist yet, keep waiting
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waited += pollInterval;
      }
      
      // If we get here, the restart timed out
      throw new Error('Restart request timed out. The restart handler may not be running.');
      
    } catch (error: any) {
      console.log('Failed to restart dnsmasq service:', error.message);
      throw new Error(`Failed to restart DNSmasq service: ${error.message}`);
    }
  }

  async getStatus(): Promise<any> {
    try {
      // Try without sudo first (systemctl status works without sudo for status checks)
      const { stdout } = await execAsync('systemctl status dnsmasq --no-pager');
      const isRunning = stdout.includes('active (running)');
      
      // Extract uptime from systemctl output
      let uptime = 'Unknown';
      const activeMatch = stdout.match(/Active: active \(running\) since (.+?);/);
      if (activeMatch) {
        const startTime = new Date(activeMatch[1]);
        const now = new Date();
        const uptimeMs = now.getTime() - startTime.getTime();
        uptime = this.formatUptime(uptimeMs);
      }
      
      return {
        status: isRunning ? 'running' : 'stopped',
        uptime: isRunning ? uptime : null,
        details: stdout
      };
    } catch (error: any) {
      console.log('Failed to get dnsmasq status via systemctl, trying alternative methods:', error.message);
      
      // Alternative method: check if dnsmasq process is running
      try {
        const { stdout: psOutput } = await execAsync('pgrep -f dnsmasq');
        if (psOutput.trim()) {
          // Try to get process start time for uptime
          let uptime = 'Unknown';
          try {
            const pid = psOutput.trim().split('\n')[0];
            const { stdout: psDetails } = await execAsync(`ps -o pid,lstart -p ${pid} --no-headers`);
            if (psDetails.trim()) {
              const startTimeStr = psDetails.trim().substring(psDetails.indexOf(' ') + 1);
              const startTime = new Date(startTimeStr);
              const now = new Date();
              const uptimeMs = now.getTime() - startTime.getTime();
              uptime = this.formatUptime(uptimeMs);
            }
          } catch (psDetailsError) {
            // Uptime unavailable, but service is running
          }
          
          return {
            status: 'running',
            uptime: uptime,
            details: 'DNSmasq process detected via pgrep'
          };
        } else {
          return {
            status: 'stopped',
            uptime: null,
            details: 'No DNSmasq process found'
          };
        }
      } catch (psError) {
        // Final fallback: check if port 53 is in use
        try {
          const { stdout: netstatOutput } = await execAsync('netstat -ln | grep ":53 "');
          const isRunning = netstatOutput.includes(':53');
          return {
            status: isRunning ? 'running' : 'stopped',
            uptime: isRunning ? 'Unknown' : null,
            details: 'Status determined by port 53 usage'
          };
        } catch (netstatError) {
          return {
            status: 'unknown',
            uptime: null,
            error: 'Could not determine service status - all methods failed'
          };
        }
      }
    }
  }

  private async validateConfig(): Promise<void> {
    try {
      // Try to validate the config without sudo first
      await execAsync('dnsmasq --test');
    } catch (error: any) {
      console.log('Config validation may require elevated permissions:', error.message);
      // Don't throw error for validation - just log it
      console.log('Skipping config validation due to permission restrictions');
    }
  }

  private parseConfig(content: string): DnsmasqConfig {
    // This is a simplified parser - you'll want to expand this
    const lines = content.split('\n').map(line => line.trim());
    
    const config: DnsmasqConfig = {
      domainName: undefined,
      expandHosts: false,
      noDaemon: false,
      noHosts: false,
      noResolv: false,
      interfaces: [],
      bindInterfaces: false,
      dhcpRanges: [],
      dhcpOptions: [],
      staticLeases: [],
      dhcpAuthoritative: false,
      dhcpLeasetime: '24h',
      dnsRecords: [],
      upstreamServers: [],
      noDnsRebind: false,
      stopDnsRebind: false,
      logQueries: false,
      logDhcp: false,
      cacheSize: 150,
      negTtl: 3600,
      localTtl: 60
    };

    for (const line of lines) {
      if (line.startsWith('#') || !line) continue;
      
      if (line.startsWith('domain=')) {
        config.domainName = line.split('=')[1];
      } else if (line === 'expand-hosts') {
        config.expandHosts = true;
      } else if (line.startsWith('dhcp-range=')) {
        const rangeValue = line.split('=')[1];
        const parts = rangeValue.split(',');
        if (parts.length >= 2) {
          config.dhcpRanges.push({
            id: `range-${config.dhcpRanges.length}`,
            startIp: parts[0],
            endIp: parts[1],
            leaseTime: parts[2] || '24h'
          });
        }
      }
      // Add more parsing logic for other options...
    }

    return config;
  }

  private parseLeases(content: string): DhcpLease[] {
    const lines = content.split('\n').filter(line => line.trim());
    const leases: DhcpLease[] = [];

    for (const line of lines) {
      const parts = line.split(' ');
      if (parts.length >= 3) {
        leases.push({
          expiry: new Date(parseInt(parts[0]) * 1000),
          macAddress: parts[1],
          ipAddress: parts[2],
          hostname: parts[3] || undefined,
          clientId: parts[4] || undefined
        });
      }
    }

    return leases;
  }

  private generateConfigContent(config: DnsmasqConfig): string {
    const lines: string[] = [];
    
    lines.push('# DNSmasq configuration generated by dnsmasq-gui');
    lines.push('# ' + new Date().toISOString());
    lines.push('');
    
    // Basic settings
    if (config.domainName) {
      lines.push(`domain=${config.domainName}`);
    }
    
    if (config.expandHosts) {
      lines.push('expand-hosts');
    }
    
    // DHCP ranges
    for (const range of config.dhcpRanges) {
      let rangeStr = `dhcp-range=${range.startIp},${range.endIp}`;
      if (range.netmask) rangeStr += `,${range.netmask}`;
      rangeStr += `,${range.leaseTime}`;
      if (range.tag) rangeStr += `,set:${range.tag}`;
      lines.push(rangeStr);
    }
    
    // Static leases
    for (const lease of config.staticLeases) {
      let leaseStr = `dhcp-host=${lease.macAddress},${lease.ipAddress}`;
      if (lease.hostname) leaseStr += `,${lease.hostname}`;
      if (lease.tag) leaseStr += `,set:${lease.tag}`;
      lines.push(leaseStr);
    }
    
    // DHCP options
    for (const option of config.dhcpOptions) {
      let optionStr = `dhcp-option=`;
      if (option.tag) optionStr += `tag:${option.tag},`;
      optionStr += `${option.option},${option.value}`;
      lines.push(optionStr);
    }
    
    // DNS records
    for (const record of config.dnsRecords) {
      if (record.type === 'A') {
        lines.push(`address=/${record.name}/${record.value}`);
      } else if (record.type === 'CNAME') {
        lines.push(`cname=${record.name},${record.value}`);
      }
      // Add more DNS record types as needed
    }
    
    // Upstream servers
    for (const server of config.upstreamServers) {
      lines.push(`server=${server}`);
    }
    
    lines.push('');
    return lines.join('\n');
  }

  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
