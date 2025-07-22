import { Router } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/express';
import { DnsmasqConfig, DhcpLease, StaticLease } from '../types/dnsmasq';
import { DnsmasqService } from '../services/dnsmasqService';
import { OuiService } from '../services/ouiService';
import fetch from 'node-fetch';

export const dnsmasqRoutes = Router();

const dnsmasqService = new DnsmasqService();
const ouiService = new OuiService();

// Get current dnsmasq configuration
dnsmasqRoutes.get('/config', async (req: AuthenticatedRequest, res) => {
  try {
    const config = await dnsmasqService.getConfig();
    res.json({
      success: true,
      data: config
    } as ApiResponse<DnsmasqConfig>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration'
    } as ApiResponse);
  }
});

// Update dnsmasq configuration
dnsmasqRoutes.put('/config', async (req: AuthenticatedRequest, res) => {
  try {
    const config: DnsmasqConfig = req.body;
    console.log('Received config update request:', JSON.stringify(config, null, 2));
    await dnsmasqService.updateConfig(config);
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Configuration update failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: `Failed to update configuration: ${errorMessage}`,
      error: `Failed to update configuration: ${errorMessage}`
    } as ApiResponse);
  }
});

// Get current DHCP leases
dnsmasqRoutes.get('/leases', async (req: AuthenticatedRequest, res) => {
  try {
    const leases = await dnsmasqService.getLeases();
    res.json({
      success: true,
      data: leases
    } as ApiResponse<DhcpLease[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve leases'
    } as ApiResponse);
  }
});

// Convert dynamic lease to static reservation
dnsmasqRoutes.post('/leases/:macAddress/static', async (req: AuthenticatedRequest, res) => {
  try {
    const { macAddress } = req.params;
    const { hostname } = req.body;
    
    await dnsmasqService.convertToStaticLease(macAddress, hostname);
    res.json({
      success: true,
      message: 'Lease converted to static reservation'
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to convert lease to static'
    } as ApiResponse);
  }
});

// Get all static reservations
dnsmasqRoutes.get('/reservations', async (req: AuthenticatedRequest, res) => {
  try {
    const config = await dnsmasqService.getConfig();
    res.json({
      success: true,
      data: config.staticLeases
    } as ApiResponse<StaticLease[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve reservations'
    } as ApiResponse);
  }
});

// Create new static reservation
dnsmasqRoutes.post('/reservations', async (req: AuthenticatedRequest, res) => {
  try {
    const { macAddress, ipAddress, hostname } = req.body;
    
    if (!macAddress || !ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'MAC address and IP address are required'
      } as ApiResponse);
    }

    await dnsmasqService.createStaticReservation(macAddress, ipAddress, hostname);
    res.json({
      success: true,
      message: 'Static reservation created successfully'
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create reservation'
    } as ApiResponse);
  }
});

// Update static reservation
dnsmasqRoutes.put('/reservations/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { macAddress, ipAddress, hostname } = req.body;
    
    if (!macAddress || !ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'MAC address and IP address are required'
      } as ApiResponse);
    }

    await dnsmasqService.updateStaticReservation(id, macAddress, ipAddress, hostname);
    res.json({
      success: true,
      message: 'Static reservation updated successfully'
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update reservation'
    } as ApiResponse);
  }
});

// Delete static reservation
dnsmasqRoutes.delete('/reservations/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await dnsmasqService.deleteStaticReservation(id);
    res.json({
      success: true,
      message: 'Static reservation deleted successfully'
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete reservation'
    } as ApiResponse);
  }
});

// Reload dnsmasq service (less disruptive than restart)
dnsmasqRoutes.post('/reload', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      } as ApiResponse);
      return;
    }

    await dnsmasqService.reload();
    res.json({
      success: true,
      message: 'DNSmasq service reloaded'
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reload dnsmasq service'
    } as ApiResponse);
  }
});

// Restart dnsmasq service
dnsmasqRoutes.post('/restart', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      } as ApiResponse);
      return;
    }

    await dnsmasqService.restart();
    res.json({
      success: true,
      message: 'DNSmasq service restarted'
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to restart dnsmasq service'
    } as ApiResponse);
  }
});

// Get dnsmasq service status
dnsmasqRoutes.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    const status = await dnsmasqService.getStatus();
    res.json({
      success: true,
      data: status
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get service status'
    } as ApiResponse);
  }
});

// DHCP Ranges endpoints
// Get all DHCP ranges
dnsmasqRoutes.get('/ranges', async (req: AuthenticatedRequest, res) => {
  try {
    const ranges = await dnsmasqService.getRanges();
    res.json({
      success: true,
      data: ranges
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve DHCP ranges'
    } as ApiResponse);
  }
});

// Create a new DHCP range
dnsmasqRoutes.post('/ranges', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      } as ApiResponse);
      return;
    }

    const { startIp, endIp, leaseTime, tag, netmask, active } = req.body;

    // Validation
    if (!startIp || !endIp) {
      res.status(400).json({
        success: false,
        error: 'Start IP and End IP are required'
      } as ApiResponse);
      return;
    }

    const newRange = await dnsmasqService.createRange({
      startIp,
      endIp,
      leaseTime: leaseTime || '12h',
      tag: tag || undefined,
      netmask: netmask || '255.255.255.0',
      active
    });

    res.json({
      success: true,
      data: newRange,
      message: 'DHCP range created successfully'
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create DHCP range'
    } as ApiResponse);
  }
});

// Update an existing DHCP range
dnsmasqRoutes.put('/ranges/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      } as ApiResponse);
      return;
    }

    const { id } = req.params;
    const { startIp, endIp, leaseTime, tag, netmask, active } = req.body;

    const updatedRange = await dnsmasqService.updateRange(id, {
      startIp,
      endIp,
      leaseTime,
      tag,
      netmask,
      active
    });

    res.json({
      success: true,
      data: updatedRange,
      message: 'DHCP range updated successfully'
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update DHCP range'
    } as ApiResponse);
  }
});

// Delete a DHCP range
dnsmasqRoutes.delete('/ranges/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      } as ApiResponse);
      return;
    }

    const { id } = req.params;
    await dnsmasqService.deleteRange(id);

    res.json({
      success: true,
      message: 'DHCP range deleted successfully'
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete DHCP range'
    } as ApiResponse);
  }
});

// DHCP Options endpoints
// Get all DHCP options
dnsmasqRoutes.get('/options', async (req: AuthenticatedRequest, res) => {
  try {
    const options = await dnsmasqService.getOptions();
    res.json({
      success: true,
      data: options
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve DHCP options'
    } as ApiResponse);
  }
});

// Create a new DHCP option
dnsmasqRoutes.post('/options', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      } as ApiResponse);
      return;
    }

    const { optionNumber, value, tag, description, active } = req.body;

    // Validation
    if (!optionNumber || !value) {
      res.status(400).json({
        success: false,
        error: 'Option number and value are required'
      } as ApiResponse);
      return;
    }

    const newOption = await dnsmasqService.createOption({
      optionNumber,
      value,
      tag: tag || undefined,
      description: description || undefined,
      active
    });

    res.json({
      success: true,
      data: newOption,
      message: 'DHCP option created successfully'
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create DHCP option'
    } as ApiResponse);
  }
});

// Update an existing DHCP option
dnsmasqRoutes.put('/options/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      } as ApiResponse);
      return;
    }

    const { id } = req.params;
    const { optionNumber, value, tag, description, active } = req.body;

    const updatedOption = await dnsmasqService.updateOption(id, {
      optionNumber,
      value,
      tag,
      description,
      active
    });

    res.json({
      success: true,
      data: updatedOption,
      message: 'DHCP option updated successfully'
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update DHCP option'
    } as ApiResponse);
  }
});

// Delete a DHCP option
dnsmasqRoutes.delete('/options/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      } as ApiResponse);
      return;
    }

    const { id } = req.params;
    await dnsmasqService.deleteOption(id);

    res.json({
      success: true,
      message: 'DHCP option deleted successfully'
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete DHCP option'
    } as ApiResponse);
  }
});

// OUI Lookup endpoint
dnsmasqRoutes.get('/oui/:oui', async (req: AuthenticatedRequest, res) => {
  try {
    const { oui } = req.params;
    
    // Validate OUI format (should be 6 hex characters)
    if (!/^[0-9A-Fa-f]{6}$/.test(oui)) {
      res.status(400).json({
        success: false,
        error: 'Invalid OUI format. Expected 6 hexadecimal characters.'
      } as ApiResponse);
      return;
    }

    const ouiUpper = oui.toUpperCase();
    
    // First check local database
    let manufacturer = await ouiService.lookupManufacturer(ouiUpper);
    
    if (manufacturer) {
      res.json({
        success: true,
        data: {
          oui: ouiUpper,
          manufacturer,
          source: 'local'
        }
      } as ApiResponse<{oui: string, manufacturer: string, source: string}>);
      return;
    }
    
    // If not found locally, try online lookup
    const services = [
      {
        name: 'macvendors.co',
        url: `https://macvendors.co/api/${ouiUpper}`,
        parser: (data: any) => data?.result?.company || null
      },
      {
        name: 'macvendors.com', 
        url: `https://api.macvendors.com/${ouiUpper}`,
        parser: (data: any) => typeof data === 'string' ? data : null
      },
      {
        name: 'maclookup.app',
        url: `https://api.maclookup.app/v2/macs/${ouiUpper}`,
        parser: (data: any) => data?.company || null
      }
    ];

    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(service.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'dnsmasq-gui/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          manufacturer = service.parser(data);
          
          if (manufacturer && manufacturer.trim() && 
              !manufacturer.toLowerCase().includes('not found') &&
              !manufacturer.toLowerCase().includes('unknown')) {
            
            // Add to local database for future use
            await ouiService.addOuiEntry(ouiUpper, manufacturer.trim());
            
            res.json({
              success: true,
              data: {
                oui: ouiUpper,
                manufacturer: manufacturer.trim(),
                source: 'online'
              }
            } as ApiResponse<{oui: string, manufacturer: string, source: string}>);
            return;
          }
        }
      } catch (error: any) {
        console.log(`${service.name} lookup failed for ${ouiUpper}:`, error.message);
        continue;
      }
    }
    
    // If all services failed
    res.json({
      success: true,
      data: {
        oui: ouiUpper,
        manufacturer: 'Unknown Manufacturer',
        source: 'none'
      }
    } as ApiResponse<{oui: string, manufacturer: string, source: string}>);
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to lookup OUI'
    } as ApiResponse);
  }
});
