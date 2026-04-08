import { Router } from 'express';
import { NtpService } from '../services/ntpService';
import { AuthenticatedRequest, ApiResponse } from '../types/express';
import { authMiddleware } from '../middleware/auth';

export const ntpRoutes = Router();
const ntpService = new NtpService();

// Get NTP configuration
ntpRoutes.get('/config', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const config = await ntpService.getConfig();
    res.json({
      success: true,
      data: config
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve NTP configuration'
    } as ApiResponse);
  }
});

// Update NTP configuration
ntpRoutes.put('/config', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin privileges required' });
    }

    await ntpService.updateConfig(req.body);
    res.json({
      success: true,
      message: 'NTP configuration updated successfully'
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update NTP configuration'
    } as ApiResponse);
  }
});

// Get NTP status
ntpRoutes.get('/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const status = await ntpService.getStatus();
    res.json({
      success: true,
      data: status
    } as ApiResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve NTP status'
    } as ApiResponse);
  }
});

export default ntpRoutes;
