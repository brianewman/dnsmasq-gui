import { Router } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/express';
import { DnsmasqConfig, DhcpLease, StaticLease } from '../types/dnsmasq';
import { DnsmasqService } from '../services/dnsmasqService';

export const dnsmasqRoutes = Router();

const dnsmasqService = new DnsmasqService();

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
    await dnsmasqService.updateConfig(config);
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
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
