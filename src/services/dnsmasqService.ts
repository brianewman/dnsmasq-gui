import fs from 'fs-extra';
import path from 'path';
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
        const mockConfig = this.getMockConfig();
        
        // Try to load real data from separate files if they exist
        const realStaticLeases = await this.loadStaticLeases();
        if (realStaticLeases.length > 0) {
          mockConfig.staticLeases = realStaticLeases;
        }
        
        const realRanges = await this.loadRangesFromFile();
        if (realRanges.length > 0) {
          mockConfig.dhcpRanges = realRanges;
        }
        
        const realOptions = await this.loadOptionsFromFile();
        if (realOptions.length > 0) {
          mockConfig.dhcpOptions = realOptions;
        }
        
        return mockConfig;
      }
      
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const config = this.parseConfig(configContent);
      
      // Load data from our separate files
      const staticLeases = await this.loadStaticLeases();
      if (staticLeases.length > 0) {
        config.staticLeases = staticLeases;
      }
      
      const ranges = await this.loadRangesFromFile();
      if (ranges.length > 0) {
        config.dhcpRanges = ranges;
      }
      
      const options = await this.loadOptionsFromFile();
      if (options.length > 0) {
        config.dhcpOptions = options;
      }
      
      // Load advanced settings and merge them into the config
      const advancedSettings = await this.loadAdvancedSettings();
      Object.assign(config, advancedSettings);
      
      // Load DNS records from hosts file and CNAME records from main config
      const dnsRecords = await this.loadDnsRecords();
      config.dnsRecords = dnsRecords;
      
      // Load cache settings from main config file
      const cacheSettings = await this.loadCacheSettingsFromMainConfig();
      Object.assign(config, cacheSettings);
      
      return config;
    } catch (error) {
      console.error('Failed to read dnsmasq config:', error);
      console.log('Returning mock data for development');
      return this.getMockConfig();
    }
  }

  private async loadStaticLeases(): Promise<StaticLease[]> {
    try {
      const staticLeasesPath = config.dnsmasq.staticLeasesConfigFile;
      
      if (!await fs.pathExists(staticLeasesPath)) {
        return [];
      }
      
      const content = await fs.readFile(staticLeasesPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      const staticLeases: StaticLease[] = [];
      
      for (const line of lines) {
        if (line.startsWith('dhcp-host=')) {
          const parts = line.substring('dhcp-host='.length).split(',');
          if (parts.length >= 2) {
            const macAddress = parts[0];
            const ipAddress = parts[1];
            const hostname = parts[2] || '';
            
            staticLeases.push({
              id: `static-${macAddress.replace(/:/g, '')}`,
              macAddress,
              ipAddress,
              hostname
            });
          }
        }
      }
      
      console.log(`Loaded ${staticLeases.length} static leases from ${staticLeasesPath}`);
      return staticLeases;
    } catch (error) {
      console.error('Failed to load static leases:', error);
      return [];
    }
  }

  private async loadRangesFromFile(): Promise<DhcpRange[]> {
    try {
      const rangesPath = config.dnsmasq.rangesConfigFile;
      
      if (!await fs.pathExists(rangesPath)) {
        return [];
      }
      
      const content = await fs.readFile(rangesPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      const ranges: DhcpRange[] = [];
      
      for (const line of lines) {
        let actualLine = line.trim();
        let isActive = true;
        
        // Check if line is commented out (inactive)
        if (actualLine.startsWith('#')) {
          isActive = false;
          // Remove comment and (inactive) suffix
          actualLine = actualLine.substring(1).replace('(inactive)', '').trim();
        }
        
        // Skip non-dhcp-range lines
        if (!actualLine.startsWith('dhcp-range=')) {
          continue;
        }
        
        const rangeValue = actualLine.substring('dhcp-range='.length);
          const parts = rangeValue.split(',');
          
          let startIp, endIp, netmask, leaseTime, tag;
          let partIndex = 0;
          
          // Check if first part is a tag (format: set:tagname)
          if (parts[0]?.startsWith('set:')) {
            tag = parts[0].substring(4); // Remove 'set:' prefix
            partIndex = 1;
          }
          
          // Parse remaining parts: startIp, endIp, netmask, leaseTime
          if (parts.length >= partIndex + 3) {
            startIp = parts[partIndex];
            endIp = parts[partIndex + 1];
            netmask = parts[partIndex + 2];
            leaseTime = parts[partIndex + 3] || '12h';
            
            ranges.push({
              id: `range-${ranges.length}`,
              startIp,
              endIp,
              netmask,
              leaseTime,
              tag,
              active: isActive
            });
          }
      }
      
      console.log(`Loaded ${ranges.length} DHCP ranges from ${rangesPath}`);
      return ranges;
    } catch (error) {
      console.error('Failed to load ranges from file:', error);
      return [];
    }
  }

  private async loadOptionsFromFile(): Promise<DhcpOption[]> {
    try {
      const optionsPath = config.dnsmasq.optionsConfigFile;
      
      if (!await fs.pathExists(optionsPath)) {
        return [];
      }
      
      const content = await fs.readFile(optionsPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      const options: DhcpOption[] = [];
      
      for (const line of lines) {
        let actualLine = line.trim();
        let isActive = true;
        
        // Check if line is commented out (inactive)
        if (actualLine.startsWith('#')) {
          isActive = false;
          // Remove comment and (inactive) suffix
          actualLine = actualLine.substring(1).replace('(inactive)', '').trim();
        }
        
        // Skip non-dhcp-option lines
        if (!actualLine.startsWith('dhcp-option=')) {
          continue;
        }
        
        const optionValue = actualLine.substring('dhcp-option='.length);
          let tag: string | undefined;
          let remainingValue = optionValue;
          
          // Check if there's a tag prefix
          if (optionValue.startsWith('tag:')) {
            const tagEnd = optionValue.indexOf(',');
            if (tagEnd !== -1) {
              tag = optionValue.substring(4, tagEnd);
              remainingValue = optionValue.substring(tagEnd + 1);
            }
          }
          
          const parts = remainingValue.split(',');
          if (parts.length >= 2) {
            const option = parts[0];
            const value = parts.slice(1).join(','); // In case value contains commas
            
            options.push({
              id: `option-${options.length}`,
              option,
              value,
              tag,
              active: isActive
            });
          }
      }
      
      console.log(`Loaded ${options.length} DHCP options from ${optionsPath}`);
      return options;
    } catch (error) {
      console.error('Failed to load options from file:', error);
      return [];
    }
  }

  private async loadAdvancedSettings(): Promise<Partial<DnsmasqConfig>> {
    try {
      const advancedPath = config.dnsmasq.advancedConfigFile;
      
      if (!await fs.pathExists(advancedPath)) {
        return {};
      }
      
      const content = await fs.readFile(advancedPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      const advancedSettings: Partial<DnsmasqConfig> = {};
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Parse domain settings
        if (trimmedLine.startsWith('domain=')) {
          advancedSettings.domainName = trimmedLine.split('=')[1];
        }
        
        // Parse boolean settings
        if (trimmedLine === 'expand-hosts') {
          advancedSettings.expandHosts = true;
        }
        if (trimmedLine === 'no-resolv') {
          advancedSettings.noResolv = true;
        }
        if (trimmedLine === 'no-hosts') {
          advancedSettings.noHosts = true;
        }
        if (trimmedLine === 'stop-dns-rebind') {
          advancedSettings.noDnsRebind = true;
        }
        if (trimmedLine === 'rebind-localhost-ok') {
          advancedSettings.stopDnsRebind = true;
        }
        if (trimmedLine === 'dhcp-authoritative') {
          advancedSettings.dhcpAuthoritative = true;
        }
        if (trimmedLine === 'bind-interfaces') {
          advancedSettings.bindInterfaces = true;
        }
        if (trimmedLine === 'log-queries') {
          advancedSettings.logQueries = true;
        }
        if (trimmedLine === 'log-dhcp') {
          advancedSettings.logDhcp = true;
        }
        if (trimmedLine === 'no-daemon') {
          advancedSettings.noDaemon = true;
        }
        
        // Parse numeric settings - Skip cache settings as they're in main config
        // if (trimmedLine.startsWith('cache-size=')) {
        //   advancedSettings.cacheSize = parseInt(trimmedLine.split('=')[1]) || 150;
        // }
        // if (trimmedLine.startsWith('neg-ttl=')) {
        //   advancedSettings.negTtl = parseInt(trimmedLine.split('=')[1]) || 3600;
        // }
        // if (trimmedLine.startsWith('local-ttl=')) {
        //   advancedSettings.localTtl = parseInt(trimmedLine.split('=')[1]) || 0;
        // }
        // Note: dhcp-lease-max is not a valid dnsmasq option - lease time is set per dhcp-range
        
        // Parse string settings
        if (trimmedLine.startsWith('log-facility=')) {
          advancedSettings.logFacility = trimmedLine.split('=')[1];
        }
        
        // Note: dhcp-leasetime is not a valid global dnsmasq option
        // Lease time is set per dhcp-range, not globally
        // The dhcpLeasetime field is a UI-only setting for default values
        
        // Parse upstream servers
        if (trimmedLine.startsWith('server=')) {
          if (!advancedSettings.upstreamServers) {
            advancedSettings.upstreamServers = [];
          }
          advancedSettings.upstreamServers.push(trimmedLine.split('=')[1]);
        }
        
        // Parse interfaces
        if (trimmedLine.startsWith('interface=')) {
          if (!advancedSettings.interfaces) {
            advancedSettings.interfaces = [];
          }
          advancedSettings.interfaces.push({
            name: trimmedLine.split('=')[1],
            enabled: true
          });
        }
      }
      
      console.log(`Loaded advanced settings from ${advancedPath}`);
      return advancedSettings;
    } catch (error) {
      console.error('Failed to load advanced settings:', error);
      return {};
    }
  }

  private async loadCacheSettingsFromMainConfig(): Promise<Partial<DnsmasqConfig>> {
    try {
      // Try to load cache settings from advanced config file first, then fall back to main config
      const advancedConfigPath = config.dnsmasq.advancedConfigFile;
      const mainConfigPath = this.configPath;
      
      let configPath = advancedConfigPath;
      let exists = await fs.pathExists(advancedConfigPath);
      
      if (!exists) {
        console.log(`Advanced config file does not exist, checking main config: ${mainConfigPath}`);
        configPath = mainConfigPath;
        exists = await fs.pathExists(mainConfigPath);
        
        if (!exists) {
          console.log(`Main config file does not exist: ${mainConfigPath}`);
          return {};
        }
      }
      
      const content = await fs.readFile(configPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      const cacheSettings: Partial<DnsmasqConfig> = {};
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Parse cache settings
        if (trimmedLine.startsWith('cache-size=')) {
          cacheSettings.cacheSize = parseInt(trimmedLine.split('=')[1]) || 150;
        }
        if (trimmedLine.startsWith('neg-ttl=')) {
          cacheSettings.negTtl = parseInt(trimmedLine.split('=')[1]) || 3600;
        }
        if (trimmedLine.startsWith('local-ttl=')) {
          cacheSettings.localTtl = parseInt(trimmedLine.split('=')[1]) || 0;
        }
      }
      
      console.log(`Loaded cache settings from config: ${configPath}`);
      return cacheSettings;
    } catch (error) {
      console.error('Failed to load cache settings from config:', error);
      return {};
    }
  }

  private async loadDnsRecords(): Promise<DnsRecord[]> {
    try {
      const records: DnsRecord[] = [];
      
      // Load A records from hosts file
      const hostsRecords = await this.loadARecordsFromHostsFile();
      
      // Load CNAME records from separate config file
      const cnameRecords = await this.loadCnameRecords();
      
      // Create a map to combine A records with their aliases and MAC addresses
      const recordMap = new Map<string, DnsRecord>();
      
      // First, add all A records
      for (const record of hostsRecords) {
        recordMap.set(record.name, record);
      }
      
      // Get static DHCP leases to match MAC addresses
      const staticLeases = await this.loadStaticLeases();
      
      // Add MAC addresses to records that have static DHCP reservations
      for (const [hostname, record] of recordMap) {
        const matchingLease = staticLeases.find(lease => 
          lease.hostname === hostname || lease.ipAddress === record.value
        );
        if (matchingLease) {
          record.macAddress = matchingLease.macAddress;
        }
      }
      
      // Process CNAME records and add them as aliases to existing A records
      for (const cnameRecord of cnameRecords) {
        const targetRecord = recordMap.get(cnameRecord.value);
        if (targetRecord) {
          // Add CNAME as alias to the target A record
          if (!targetRecord.aliases) {
            targetRecord.aliases = [];
          }
          targetRecord.aliases.push(cnameRecord.name);
        } else {
          // CNAME points to something not in our hosts file, add it as a separate record
          recordMap.set(cnameRecord.name, cnameRecord);
        }
      }
      
      // Convert map back to array
      records.push(...recordMap.values());
      
      console.log(`Loaded ${records.length} DNS records (${hostsRecords.length} A records, ${cnameRecords.length} CNAME records)`);
      return records;
      
    } catch (error) {
      console.error('Failed to load DNS records:', error);
      return [];
    }
  }

  private async loadARecordsFromHostsFile(): Promise<DnsRecord[]> {
    try {
      const hostsPath = config.dnsmasq.hostsFile;
      
      if (!await fs.pathExists(hostsPath)) {
        console.log(`Hosts file not found: ${hostsPath}`);
        return [];
      }
      
      const content = await fs.readFile(hostsPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      const records: DnsRecord[] = [];
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const ipAddress = parts[0];
          const hostname = parts[1];
          
          // Validate IP address format
          if (this.isValidIP(ipAddress)) {
            records.push({
              id: `dns-a-${records.length}`,
              type: 'A',
              name: hostname,
              value: ipAddress,
              aliases: []
            });
          }
        }
      }
      
      console.log(`Loaded ${records.length} A records from ${hostsPath}`);
      return records;
      
    } catch (error) {
      console.error('Failed to load A records from hosts file:', error);
      return [];
    }
  }

  private async loadCnameRecords(): Promise<DnsRecord[]> {
    try {
      const cnameConfigPath = config.dnsmasq.cnamesConfigFile;
      
      if (!await fs.pathExists(cnameConfigPath)) {
        console.log(`CNAME config file not found: ${cnameConfigPath}`);
        return [];
      }

      // Load domain name directly from main config to avoid circular dependency
      const localDomain = await this.loadDomainNameFromMainConfig();
      
      const content = await fs.readFile(cnameConfigPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      const records: DnsRecord[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Parse CNAME records (format: cname=alias,target)
        if (trimmedLine.startsWith('cname=')) {
          const cnameValue = trimmedLine.substring('cname='.length);
          const parts = cnameValue.split(',');
          if (parts.length >= 2) {
            let alias = parts[0].trim();
            let target = parts[1].trim();
            
            // Strip local domain from hostnames if present
            if (localDomain) {
              alias = this.stripLocalDomain(alias, localDomain);
              target = this.stripLocalDomain(target, localDomain);
            }
            
            records.push({
              id: `dns-cname-${records.length}`,
              type: 'CNAME',
              name: alias,
              value: target
            });
          }
        }
      }
      
      console.log(`Loaded ${records.length} CNAME records from ${cnameConfigPath}`);
      return records;
      
    } catch (error) {
      console.error('Failed to load CNAME records from config file:', error);
      return [];
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
      // Update main advanced settings configuration
      await this.updateAdvancedSettings(newConfig);
      
      // Update static leases in a separate file
      await this.updateStaticLeases(newConfig.staticLeases);
      
      // Update DHCP ranges and options in separate configuration files
      await this.updateRangesAndOptions(newConfig);
      
      console.log('Configuration updated successfully');
      
    } catch (error) {
      console.error('Failed to update dnsmasq config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      console.error('Error details:', errorMessage);
      console.error('Error stack:', errorStack);
      throw new Error(`Could not update dnsmasq configuration: ${errorMessage}`);
    }
  }

  private async updateAdvancedSettings(newConfig: DnsmasqConfig): Promise<void> {
    try {
      let configLines: string[] = [];
      
      // Start with header comment
      configLines.push('# DNSmasq advanced configuration managed by dnsmasq-gui');
      configLines.push('# This section contains general DNS and DHCP settings');
      configLines.push('');
      
      // General Settings
      if (newConfig.domainName) {
        configLines.push(`domain=${newConfig.domainName}`);
      }
      
      if (newConfig.expandHosts) {
        configLines.push('expand-hosts');
      }
      
      // Cache settings
      configLines.push(`cache-size=${newConfig.cacheSize || 150}`);
      if (newConfig.negTtl !== undefined) {
        configLines.push(`neg-ttl=${newConfig.negTtl}`);
      }
      if (newConfig.localTtl !== undefined) {
        configLines.push(`local-ttl=${newConfig.localTtl}`);
      }
      
      // DNS Settings
      if (newConfig.noResolv) {
        configLines.push('no-resolv');
      }
      
      if (newConfig.noHosts) {
        configLines.push('no-hosts');
      }
      
      if (newConfig.noDnsRebind) {
        configLines.push('stop-dns-rebind');
      }
      
      if (newConfig.stopDnsRebind) {
        configLines.push('rebind-localhost-ok');
      }
      
      // DHCP Settings
      if (newConfig.dhcpAuthoritative) {
        configLines.push('dhcp-authoritative');
      }
      
      // Note: dhcp-leasetime is not a valid dnsmasq global option
      // Lease time is configured per dhcp-range in the ranges configuration file
      // The dhcpLeasetime field is used as a default value for new ranges only
      
      // Note: dhcp-lease-max is not a valid dnsmasq option
      // Lease time is configured per dhcp-range in the ranges configuration file
      
      // Network Interface Settings
      if (newConfig.bindInterfaces) {
        configLines.push('bind-interfaces');
      }
      
      // Add enabled interfaces
      if (newConfig.interfaces && newConfig.interfaces.length > 0) {
        for (const iface of newConfig.interfaces) {
          if (iface.enabled || typeof iface === 'string') {
            const ifaceName = typeof iface === 'string' ? iface : iface.name;
            configLines.push(`interface=${ifaceName}`);
          }
        }
      }
      
      // Upstream DNS servers
      if (newConfig.upstreamServers && newConfig.upstreamServers.length > 0) {
        for (const server of newConfig.upstreamServers) {
          configLines.push(`server=${server}`);
        }
      }
      
      // Logging Settings
      if (newConfig.logQueries) {
        configLines.push('log-queries');
      }
      
      if (newConfig.logDhcp) {
        configLines.push('log-dhcp');
      }
      
      if (newConfig.logFacility) {
        configLines.push(`log-facility=${newConfig.logFacility}`);
      }
      
      // System Settings
      if (newConfig.noDaemon) {
        configLines.push('no-daemon');
      }
      
      // Include managed files
      configLines.push('');
      configLines.push('# Include managed configuration files');
      configLines.push(`conf-file=${config.dnsmasq.staticLeasesConfigFile}`);
      configLines.push(`conf-file=${config.dnsmasq.rangesConfigFile}`);
      configLines.push(`conf-file=${config.dnsmasq.optionsConfigFile}`);
      
      // Write the configuration
      const configContent = configLines.join('\n') + '\n';
      
      // Create advanced settings config file path
      const advancedConfigPath = config.dnsmasq.advancedConfigFile;
      
      // Ensure the directory exists
      const configDir = require('path').dirname(advancedConfigPath);
      await fs.ensureDir(configDir);
      console.log(`Ensured directory exists: ${configDir}`);
      
      await fs.writeFile(advancedConfigPath, configContent);
      console.log(`Updated advanced settings in ${advancedConfigPath}`);
      
      // Note: DNSmasq will need to be restarted to pick up configuration changes
      // This happens automatically when restart() or reload() methods are called
      
    } catch (error) {
      console.error('Failed to update advanced settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      throw error;
    }
  }

  private async updateRangesAndOptions(dnsmasqConfig: DnsmasqConfig): Promise<void> {
    try {
      // Write DHCP ranges to a separate file
      const rangesPath = config.dnsmasq.rangesConfigFile;
      
      // Ensure the directory exists
      await fs.ensureDir(require('path').dirname(rangesPath));
      
      let rangesContent = '# DHCP ranges managed by dnsmasq-gui\n# This file is auto-generated, do not edit manually\n\n';
      
      for (const range of dnsmasqConfig.dhcpRanges || []) {
        let rangeStr = `dhcp-range=`;
        // Add tag first if specified (DNSmasq standard format)
        if (range.tag) rangeStr += `set:${range.tag},`;
        rangeStr += `${range.startIp},${range.endIp}`;
        // Add netmask (default to 255.255.255.0 if not specified)
        rangeStr += `,${range.netmask || '255.255.255.0'}`;
        rangeStr += `,${range.leaseTime}`;
        
        // Comment out inactive ranges
        if (range.active === false) {
          rangeStr = `# ${rangeStr} (inactive)`;
        }
        
        rangesContent += `${rangeStr}\n`;
      }
      
      await fs.writeFile(rangesPath, rangesContent);
      console.log(`Updated ${dnsmasqConfig.dhcpRanges?.length || 0} DHCP ranges in ${rangesPath}`);
      
      // Write DHCP options to a separate file
      const optionsPath = config.dnsmasq.optionsConfigFile;
      
      // Ensure the directory exists
      await fs.ensureDir(require('path').dirname(optionsPath));
      
      let optionsContent = '# DHCP options managed by dnsmasq-gui\n# This file is auto-generated, do not edit manually\n\n';
      
      for (const option of dnsmasqConfig.dhcpOptions || []) {
        let optionStr = `dhcp-option=`;
        if (option.tag) optionStr += `tag:${option.tag},`;
        optionStr += `${option.option},${option.value}`;
        
        // Comment out inactive options
        if (option.active === false) {
          optionStr = `# ${optionStr} (inactive)`;
        }
        
        optionsContent += `${optionStr}\n`;
      }
      
      await fs.writeFile(optionsPath, optionsContent);
      console.log(`Updated ${dnsmasqConfig.dhcpOptions?.length || 0} DHCP options in ${optionsPath}`);
      
    } catch (error) {
      console.error('Failed to update ranges and options:', error);
      throw error;
    }
  }

  private async updateStaticLeases(staticLeases: StaticLease[]): Promise<void> {
    try {
      const staticLeasesPath = config.dnsmasq.staticLeasesConfigFile;
      
      // Ensure the directory exists
      await fs.ensureDir(require('path').dirname(staticLeasesPath));
      
      let content = '# Static DHCP leases managed by dnsmasq-gui\n# This file is auto-generated, do not edit manually\n\n';
      
      for (const lease of staticLeases) {
        // Format: dhcp-host=mac,ip,hostname,lease-time
        const hostname = lease.hostname ? `,${lease.hostname}` : '';
        content += `dhcp-host=${lease.macAddress},${lease.ipAddress}${hostname}\n`;
      }
      
      await fs.writeFile(staticLeasesPath, content);
      console.log(`Updated ${staticLeases.length} static leases in ${staticLeasesPath}`);
      
      // Note: DNSmasq will need to be restarted to pick up static lease changes
      // This happens automatically when restart() or reload() methods are called
      
    } catch (error) {
      console.error('Failed to update static leases file:', error);
      throw error;
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

  async createStaticReservation(macAddress: string, ipAddress: string, hostname?: string): Promise<void> {
    try {
      // Validate MAC address format
      const macRegex = /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/;
      if (!macRegex.test(macAddress)) {
        throw new Error('Invalid MAC address format. Expected format: XX:XX:XX:XX:XX:XX');
      }

      // Validate IP address format
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(ipAddress)) {
        throw new Error('Invalid IP address format');
      }

      // Validate hostname format if provided
      if (hostname) {
        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$/;
        if (!hostnameRegex.test(hostname)) {
          throw new Error('Invalid hostname format. Use only letters, numbers, hyphens, and periods.');
        }
      }

      const config = await this.getConfig();
      
      // Check for duplicate MAC address
      const existingMac = config.staticLeases.find(lease => 
        lease.macAddress.toLowerCase() === macAddress.toLowerCase()
      );
      if (existingMac) {
        throw new Error('A reservation already exists for this MAC address');
      }

      // Check for duplicate IP address
      const existingIp = config.staticLeases.find(lease => lease.ipAddress === ipAddress);
      if (existingIp) {
        throw new Error('A reservation already exists for this IP address');
      }

      const newReservation: StaticLease = {
        id: `static-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        macAddress: macAddress.toLowerCase(),
        ipAddress,
        hostname: hostname || ''
      };

      config.staticLeases.push(newReservation);
      await this.updateConfig(config);
    } catch (error) {
      console.error('Failed to create static reservation:', error);
      throw error;
    }
  }

  async updateStaticReservation(id: string, macAddress: string, ipAddress: string, hostname?: string): Promise<void> {
    try {
      // Validate MAC address format
      const macRegex = /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/;
      if (!macRegex.test(macAddress)) {
        throw new Error('Invalid MAC address format. Expected format: XX:XX:XX:XX:XX:XX');
      }

      // Validate IP address format
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(ipAddress)) {
        throw new Error('Invalid IP address format');
      }

      // Validate hostname format if provided
      if (hostname) {
        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$/;
        if (!hostnameRegex.test(hostname)) {
          throw new Error('Invalid hostname format. Use only letters, numbers, hyphens, and periods.');
        }
      }

      const config = await this.getConfig();
      const reservationIndex = config.staticLeases.findIndex(lease => lease.id === id);
      
      if (reservationIndex === -1) {
        throw new Error('Reservation not found');
      }

      // Check for duplicate MAC address (excluding current reservation)
      const existingMac = config.staticLeases.find(lease => 
        lease.id !== id && lease.macAddress.toLowerCase() === macAddress.toLowerCase()
      );
      if (existingMac) {
        throw new Error('A reservation already exists for this MAC address');
      }

      // Check for duplicate IP address (excluding current reservation)
      const existingIp = config.staticLeases.find(lease => 
        lease.id !== id && lease.ipAddress === ipAddress
      );
      if (existingIp) {
        throw new Error('A reservation already exists for this IP address');
      }

      // Update the reservation
      config.staticLeases[reservationIndex] = {
        ...config.staticLeases[reservationIndex],
        macAddress: macAddress.toLowerCase(),
        ipAddress,
        hostname: hostname || ''
      };

      await this.updateConfig(config);
    } catch (error) {
      console.error('Failed to update static reservation:', error);
      throw error;
    }
  }

  async deleteStaticReservation(id: string): Promise<void> {
    try {
      const config = await this.getConfig();
      const reservationIndex = config.staticLeases.findIndex(lease => lease.id === id);
      
      if (reservationIndex === -1) {
        throw new Error('Reservation not found');
      }

      config.staticLeases.splice(reservationIndex, 1);
      await this.updateConfig(config);
    } catch (error) {
      console.error('Failed to delete static reservation:', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    console.log('Starting DNSmasq restart operation...');
    try {
      // Only skip on Windows development environment, not on Linux
      if (process.platform === 'win32') {
        console.log('Windows development mode: Simulating DNSmasq restart');
        return;
      }
      
      // Use systemctl directly to restart dnsmasq on Linux
      const { stdout, stderr } = await execAsync('sudo systemctl restart dnsmasq');
      
      console.log('DNSmasq service restarted successfully');
      if (stdout) {
        console.log('Restart stdout:', stdout);
      }
      if (stderr) {
        console.log('Restart stderr:', stderr);
      }
      
    } catch (error: any) {
      console.log('Failed to restart dnsmasq service:', error.message);
      throw new Error(`Failed to restart DNSmasq service: ${error.message}`);
    }
  }

  async reload(): Promise<void> {
    console.log('Starting DNSmasq reload operation...');
    try {
      // Only skip on Windows development environment, not on Linux
      if (process.platform === 'win32') {
        console.log('Windows development mode: Simulating DNSmasq reload');
        return;
      }
      
      // Use systemctl directly to reload dnsmasq on Linux
      const { stdout, stderr } = await execAsync('sudo systemctl reload dnsmasq');
      
      console.log('DNSmasq service reloaded successfully');
      if (stdout) {
        console.log('Reload stdout:', stdout);
      }
      if (stderr) {
        console.log('Reload stderr:', stderr);
      }
      
    } catch (error: any) {
      console.log('Failed to reload dnsmasq service:', error.message);
      throw new Error(`Failed to reload DNSmasq service: ${error.message}`);
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
        console.log('Parsing dhcp-range:', rangeValue);
        let parts = rangeValue.split(',');
        
        let tag: string | undefined;
        let startIdx = 0;
        
        // Check if the first part is a tag (set:tagname)
        if (parts[0].startsWith('set:')) {
          tag = parts[0].substring(4); // Remove 'set:' prefix
          startIdx = 1;
          console.log('Found tag:', tag);
        }
        
        if (parts.length >= startIdx + 2) {
          const range: DhcpRange = {
            id: `range-${config.dhcpRanges.length}`,
            startIp: parts[startIdx],
            endIp: parts[startIdx + 1],
            leaseTime: parts[startIdx + 3] || '24h'
          };
          
          if (tag) {
            range.tag = tag;
          }
          
          // Handle netmask if provided
          if (parts.length > startIdx + 2 && parts[startIdx + 2] && 
              parts[startIdx + 2].match(/^\d+\.\d+\.\d+\.\d+$/)) {
            range.netmask = parts[startIdx + 2];
            console.log('Found netmask:', range.netmask);
          }
          
          console.log('Parsed range:', range);
          config.dhcpRanges.push(range);
        }
      }
      // Add more parsing logic for other options...
    }

    console.log('Final config with dhcpRanges:', config.dhcpRanges);
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
      let rangeStr = `dhcp-range=`;
      // Add tag first if specified (DNSmasq standard format)
      if (range.tag) rangeStr += `set:${range.tag},`;
      rangeStr += `${range.startIp},${range.endIp}`;
      // Add netmask (default to 255.255.255.0 if not specified)
      rangeStr += `,${range.netmask || '255.255.255.0'}`;
      rangeStr += `,${range.leaseTime}`;
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

  // DHCP Ranges management methods
  async getRanges(): Promise<DhcpRange[]> {
    try {
      const config = await this.getConfig();
      return config.dhcpRanges || [];
    } catch (error) {
      console.error('Failed to get DHCP ranges:', error);
      return [];
    }
  }

  async createRange(range: Omit<DhcpRange, 'id'>): Promise<DhcpRange> {
    const config = await this.getConfig();
    
    // Generate unique ID
    const id = `range-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRange: DhcpRange = { id, ...range };
    
    // Validate IP addresses
    if (!this.isValidIP(range.startIp) || !this.isValidIP(range.endIp)) {
      throw new Error('Invalid IP address format');
    }
    
    // Add to config
    if (!config.dhcpRanges) {
      config.dhcpRanges = [];
    }
    config.dhcpRanges.push(newRange);
    
    // Update configuration file
    await this.updateConfig(config);
    
    return newRange;
  }

  async updateRange(id: string, updates: Partial<Omit<DhcpRange, 'id'>>): Promise<DhcpRange> {
    const config = await this.getConfig();
    
    if (!config.dhcpRanges) {
      throw new Error('No DHCP ranges found');
    }
    
    const rangeIndex = config.dhcpRanges.findIndex(range => range.id === id);
    if (rangeIndex === -1) {
      throw new Error('DHCP range not found');
    }
    
    // Validate IP addresses if provided
    if (updates.startIp && !this.isValidIP(updates.startIp)) {
      throw new Error('Invalid start IP address format');
    }
    if (updates.endIp && !this.isValidIP(updates.endIp)) {
      throw new Error('Invalid end IP address format');
    }
    
    // Update range
    config.dhcpRanges[rangeIndex] = { ...config.dhcpRanges[rangeIndex], ...updates };
    
    // Update configuration file
    await this.updateConfig(config);
    
    return config.dhcpRanges[rangeIndex];
  }

  async deleteRange(id: string): Promise<void> {
    const config = await this.getConfig();
    
    if (!config.dhcpRanges) {
      throw new Error('No DHCP ranges found');
    }
    
    const rangeIndex = config.dhcpRanges.findIndex(range => range.id === id);
    if (rangeIndex === -1) {
      throw new Error('DHCP range not found');
    }
    
    // Remove range
    config.dhcpRanges.splice(rangeIndex, 1);
    
    // Update configuration file
    await this.updateConfig(config);
  }

  // DHCP Options management methods
  async getOptions(): Promise<DhcpOption[]> {
    try {
      const config = await this.getConfig();
      return config.dhcpOptions || [];
    } catch (error) {
      console.error('Failed to get DHCP options:', error);
      return [];
    }
  }

  async createOption(optionData: { optionNumber: number | string, value: string, tag?: string, description?: string, active?: boolean }): Promise<DhcpOption> {
    const config = await this.getConfig();
    
    // Generate unique ID
    const id = `option-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newOption: DhcpOption = { 
      id, 
      option: optionData.optionNumber, 
      value: optionData.value, 
      tag: optionData.tag,
      active: optionData.active
    };
    
    // Add to config
    if (!config.dhcpOptions) {
      config.dhcpOptions = [];
    }
    config.dhcpOptions.push(newOption);
    
    // Update configuration file
    await this.updateConfig(config);
    
    return newOption;
  }

  async updateOption(id: string, updates: Partial<{ optionNumber: number | string, value: string, tag?: string, description?: string, active?: boolean }>): Promise<DhcpOption> {
    const config = await this.getConfig();
    
    if (!config.dhcpOptions) {
      throw new Error('No DHCP options found');
    }
    
    const optionIndex = config.dhcpOptions.findIndex(option => option.id === id);
    if (optionIndex === -1) {
      throw new Error('DHCP option not found');
    }
    
    // Update option
    if (updates.optionNumber !== undefined) {
      config.dhcpOptions[optionIndex].option = updates.optionNumber;
    }
    if (updates.value !== undefined) {
      config.dhcpOptions[optionIndex].value = updates.value;
    }
    if (updates.tag !== undefined) {
      config.dhcpOptions[optionIndex].tag = updates.tag;
    }
    if (updates.active !== undefined) {
      config.dhcpOptions[optionIndex].active = updates.active;
    }
    
    // Update configuration file
    await this.updateConfig(config);
    
    return config.dhcpOptions[optionIndex];
  }

  async deleteOption(id: string): Promise<void> {
    const config = await this.getConfig();
    
    if (!config.dhcpOptions) {
      throw new Error('No DHCP options found');
    }
    
    const optionIndex = config.dhcpOptions.findIndex(option => option.id === id);
    if (optionIndex === -1) {
      throw new Error('DHCP option not found');
    }
    
    // Remove option
    config.dhcpOptions.splice(optionIndex, 1);
    
    // Update configuration file
    await this.updateConfig(config);
  }

  // DNS Record CRUD operations
  async getDnsRecords(): Promise<DnsRecord[]> {
    const config = await this.getConfig();
    return config.dnsRecords;
  }

  async createDnsRecord(recordData: Omit<DnsRecord, 'id'>): Promise<DnsRecord> {
    // Load current DNS records to check for duplicates
    const currentRecords = await this.loadDnsRecords();
    
    // Generate unique ID
    const id = `dns-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate required fields
    if (!recordData.name || !recordData.value || !recordData.type) {
      throw new Error('DNS record name, value, and type are required');
    }

    // Validate hostname format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(recordData.name)) {
      throw new Error('Invalid hostname format');
    }

    // For A records, validate IP address
    if (recordData.type === 'A' && !this.isValidIP(recordData.value)) {
      throw new Error('Invalid IP address format');
    }

    // Check for duplicate names
    const existingRecord = currentRecords.find((r: DnsRecord) => r.name === recordData.name);
    if (existingRecord) {
      throw new Error(`DNS record with hostname '${recordData.name}' already exists`);
    }

    const newRecord: DnsRecord = {
      id,
      ...recordData
    };

    // Add to current records array
    currentRecords.push(newRecord);
    
    // Create a temporary config object with the updated records
    const tempConfig = { dnsRecords: currentRecords } as DnsmasqConfig;
    
    // Update configuration files directly
    await this.updateDnsRecordFiles(tempConfig);
    
    return newRecord;
  }

  async updateDnsRecord(hostname: string, recordData: Partial<Omit<DnsRecord, 'id'>>): Promise<DnsRecord> {
    // Load current DNS records to find the one to update
    const currentRecords = await this.loadDnsRecords();
    
    const recordIndex = currentRecords.findIndex((r: DnsRecord) => r.name === hostname);
    if (recordIndex === -1) {
      throw new Error('DNS record not found');
    }

    const existingRecord = currentRecords[recordIndex];

    // If name is being changed, check for duplicates
    if (recordData.name && recordData.name !== existingRecord.name) {
      const duplicateRecord = currentRecords.find((r: DnsRecord) => r.name === recordData.name);
      if (duplicateRecord) {
        throw new Error(`DNS record with hostname '${recordData.name}' already exists`);
      }
    }

    // Validate hostname format if provided
    if (recordData.name && !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(recordData.name)) {
      throw new Error('Invalid hostname format');
    }

    // For A records, validate IP address if provided
    if (recordData.value && (recordData.type === 'A' || existingRecord.type === 'A')) {
      if (!this.isValidIP(recordData.value)) {
        throw new Error('Invalid IP address format');
      }
    }

    // Update the record
    const updatedRecord = {
      ...existingRecord,
      ...recordData
    };

    // Update the record in the array
    currentRecords[recordIndex] = updatedRecord;
    
    // Create a temporary config object with the updated records
    const tempConfig = { dnsRecords: currentRecords } as DnsmasqConfig;
    
    // Update configuration files directly
    await this.updateDnsRecordFiles(tempConfig);
    
    return updatedRecord;
  }

  async deleteDnsRecord(hostname: string): Promise<void> {
    // Load current DNS records to find the one to delete
    const currentRecords = await this.loadDnsRecords();
    
    const recordIndex = currentRecords.findIndex((r: DnsRecord) => r.name === hostname);
    if (recordIndex === -1) {
      throw new Error('DNS record not found');
    }

    // Remove record from the array
    currentRecords.splice(recordIndex, 1);
    
    // Create a temporary config object with the updated records
    const tempConfig = { dnsRecords: currentRecords } as DnsmasqConfig;
    
    // Update configuration files directly
    await this.updateDnsRecordFiles(tempConfig);
  }

  private async updateDnsRecordFiles(config: DnsmasqConfig): Promise<void> {
    try {
      // Get the current domain name for CNAME processing
      const currentConfig = await this.getConfig();
      const localDomain = currentConfig.domainName;
      
      // Separate A records and CNAME records
      const aRecords = config.dnsRecords.filter(r => r.type === 'A');
      const cnameRecords = config.dnsRecords.filter(r => r.type === 'CNAME');
      
      // Also collect aliases from A records to write as CNAME records
      const aliasRecords: Array<{name: string, value: string}> = [];
      for (const record of aRecords) {
        if (record.aliases && record.aliases.length > 0) {
          for (const alias of record.aliases) {
            aliasRecords.push({
              name: alias,
              value: record.name
            });
          }
        }
      }

      // Update hosts file with A records
      await this.updateHostsFile(aRecords);
      
      // Update main config file with CNAME records (including aliases)
      const allCnameRecords = [
        ...cnameRecords.map(r => ({name: r.name, value: r.value})),
        ...aliasRecords
      ];
      
      // Apply domain expansion to CNAME records if local domain is configured
      const processedCnameRecords = this.processCnameRecordsWithDomain(allCnameRecords, localDomain);
      
      await this.updateCnameRecords(processedCnameRecords);
      
      console.log(`Updated DNS records: ${aRecords.length} A records, ${processedCnameRecords.length} CNAME records`);
      
    } catch (error) {
      console.error('Failed to update DNS record files:', error);
      throw new Error('Failed to update DNS record files');
    }
  }

  private async updateHostsFile(aRecords: DnsRecord[]): Promise<void> {
    try {
      const hostsPath = config.dnsmasq.hostsFile;
      
      // Create hosts file content
      const hostsContent = aRecords
        .map(record => `${record.value}\t${record.name}`)
        .join('\n');
      
      await fs.writeFile(hostsPath, hostsContent + '\n', 'utf8');
      console.log(`Updated hosts file: ${hostsPath}`);
      
    } catch (error) {
      console.error('Failed to update hosts file:', error);
      throw error;
    }
  }

  private async updateCnameRecords(cnameRecords: Array<{name: string, value: string}>): Promise<void> {
    try {
      const cnameConfigPath = config.dnsmasq.cnamesConfigFile;
      
      // Create the dnsmasq.d directory if it doesn't exist
      const configDir = path.dirname(cnameConfigPath);
      await fs.ensureDir(configDir);
      
      // Generate content for the CNAME config file
      let configContent = '# DNS CNAME Records managed by DNSmasq GUI\n';
      configContent += '# This file is auto-generated, do not edit manually\n\n';
      
      if (cnameRecords.length > 0) {
        const cnameLines = cnameRecords
          .map(record => `cname=${record.name},${record.value}`)
          .join('\n');
        
        configContent += cnameLines + '\n';
      } else {
        configContent += '# No CNAME records configured\n';
      }
      
      await fs.writeFile(cnameConfigPath, configContent, 'utf8');
      console.log(`Updated CNAME config file with ${cnameRecords.length} CNAME records: ${cnameConfigPath}`);
      
    } catch (error) {
      console.error('Failed to update CNAME records:', error);
      throw error;
    }
  }

  /**
   * Process CNAME records to append local domain to bare hostnames
   * @param cnameRecords - Array of CNAME records with name and value
   * @param localDomain - The local domain to append (e.g., "example.com")
   * @returns Processed CNAME records with domain expansion applied
   */
  private processCnameRecordsWithDomain(
    cnameRecords: Array<{name: string, value: string}>, 
    localDomain?: string
  ): Array<{name: string, value: string}> {
    if (!localDomain) {
      // If no local domain is configured, return records as-is
      return cnameRecords;
    }

    return cnameRecords.map(record => {
      let processedName = record.name;
      let processedValue = record.value;

      // Check if hostname (alias) needs domain expansion
      // If hostname contains no periods, it's a bare hostname
      if (!processedName.includes('.')) {
        processedName = `${processedName}.${localDomain}`;
      }

      // Check if target hostname needs domain expansion
      // If target contains no periods, it's a bare hostname
      if (!processedValue.includes('.')) {
        processedValue = `${processedValue}.${localDomain}`;
      }

      return {
        name: processedName,
        value: processedValue
      };
    });
  }

  /**
   * Strip local domain from hostname if it ends with the local domain
   * @param hostname - The hostname that may have the local domain appended
   * @param localDomain - The local domain to strip (e.g., "example.com")
   * @returns Hostname with local domain stripped if present
   */
  private stripLocalDomain(hostname: string, localDomain: string): string {
    if (!localDomain || !hostname) {
      return hostname;
    }

    const domainSuffix = `.${localDomain}`;
    
    // If hostname ends with the local domain, strip it
    if (hostname.endsWith(domainSuffix)) {
      return hostname.substring(0, hostname.length - domainSuffix.length);
    }

    return hostname;
  }

  /**
   * Load domain name directly from main config file to avoid circular dependency
   */
  private async loadDomainNameFromMainConfig(): Promise<string | undefined> {
    try {
      if (!await fs.pathExists(this.configPath)) {
        return undefined;
      }
      
      const content = await fs.readFile(this.configPath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('domain=')) {
          return trimmedLine.substring('domain='.length).trim();
        }
      }
      
      return undefined;
    } catch (error) {
      console.error('Failed to load domain name from main config:', error);
      return undefined;
    }
  }

  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
}
