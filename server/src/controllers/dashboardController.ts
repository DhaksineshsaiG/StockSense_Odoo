import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DashboardService } from '../services/dashboardService';
import { asyncHandler } from '../utils/errors';

export class DashboardController {
  /**
   * GET /api/dashboard
   * Real-time read-only inventory metrics, KPIs, alerts, pending operations, and activity
   */
  static getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { warehouseId, categoryId, type, status } = req.query;

    const data = await DashboardService.getDashboardData({
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      type: typeof type === 'string' ? type : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    res.json({
      message: 'Dashboard data retrieved successfully',
      data,
      ...data,
    });
  });
}
