import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AdjustmentService } from '../services/adjustmentService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class AdjustmentController {
  /**
   * POST /api/operations/adjustments
   * Create a new inventory adjustment in DRAFT state
   */
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const adjustment = await AdjustmentService.createAdjustment(req.body, req.userId);
    res.status(201).json({
      message: 'Inventory adjustment created successfully',
      data: adjustment,
    });
  });

  /**
   * GET /api/operations/adjustments
   * List inventory adjustments with filtering
   */
  static list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, warehouseId, search, limit, offset } = req.query;

    const result = await AdjustmentService.getAdjustments({
      status: typeof status === 'string' ? status : undefined,
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      search: typeof search === 'string' ? search : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      message: 'Inventory adjustments retrieved successfully',
      ...result,
    });
  });

  /**
   * GET /api/operations/adjustments/:id
   * Get single inventory adjustment details
   */
  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const adjustment = await AdjustmentService.getAdjustmentById(id);
    res.json({
      message: 'Inventory adjustment retrieved successfully',
      data: adjustment,
    });
  });

  /**
   * PATCH /api/operations/adjustments/:id
   * Update inventory adjustment metadata or status
   */
  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const adjustment = await AdjustmentService.updateAdjustment(id, req.body);
    res.json({
      message: 'Inventory adjustment updated successfully',
      data: adjustment,
    });
  });

  /**
   * POST /api/operations/adjustments/:id/validate
   * Atomically validate inventory adjustment and reconcile stock
   */
  static validate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const adjustment = await AdjustmentService.validateAdjustment(id, req.userId);
    res.json({
      message: 'Inventory adjustment validated successfully. Stock reconciled.',
      data: adjustment,
    });
  });

  /**
   * POST /api/operations/adjustments/:id/cancel
   * Cancel inventory adjustment without modifying stock
   */
  static cancel = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const adjustment = await AdjustmentService.cancelAdjustment(id);
    res.json({
      message: 'Inventory adjustment canceled successfully',
      data: adjustment,
    });
  });
}
