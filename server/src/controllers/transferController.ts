import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TransferService } from '../services/transferService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class TransferController {
  /**
   * POST /api/operations/transfers
   * Create a new internal transfer in DRAFT state
   */
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const transfer = await TransferService.createTransfer(req.body, req.userId);
    res.status(201).json({
      message: 'Internal transfer created successfully',
      data: transfer,
    });
  });

  /**
   * GET /api/operations/transfers
   * List internal transfers with filtering
   */
  static list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, warehouseId, search, limit, offset } = req.query;

    const result = await TransferService.getTransfers({
      status: typeof status === 'string' ? status : undefined,
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      search: typeof search === 'string' ? search : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      message: 'Internal transfers retrieved successfully',
      ...result,
    });
  });

  /**
   * GET /api/operations/transfers/:id
   * Get single internal transfer details
   */
  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const transfer = await TransferService.getTransferById(id);
    res.json({
      message: 'Internal transfer retrieved successfully',
      data: transfer,
    });
  });

  /**
   * PATCH /api/operations/transfers/:id
   * Update internal transfer metadata or status (DRAFT -> READY)
   */
  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const transfer = await TransferService.updateTransfer(id, req.body);
    res.json({
      message: 'Internal transfer updated successfully',
      data: transfer,
    });
  });

  /**
   * POST /api/operations/transfers/:id/validate
   * Atomically validate internal transfer and move stock between locations
   */
  static validate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const transfer = await TransferService.validateTransfer(id, req.userId);
    res.json({
      message: 'Internal transfer validated successfully. Stock moved.',
      data: transfer,
    });
  });

  /**
   * POST /api/operations/transfers/:id/cancel
   * Cancel internal transfer without modifying stock
   */
  static cancel = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const transfer = await TransferService.cancelTransfer(id);
    res.json({
      message: 'Internal transfer canceled successfully',
      data: transfer,
    });
  });
}
