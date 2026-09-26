import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ReceiptService } from '../services/receiptService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class ReceiptController {
  /**
   * POST /api/operations/receipts
   * Create a new receipt in DRAFT state
   */
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const receipt = await ReceiptService.createReceipt(req.body, req.userId);
    res.status(201).json({
      message: 'Receipt created successfully',
      data: receipt,
    });
  });

  /**
   * GET /api/operations/receipts
   * List receipts with filtering
   */
  static list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, warehouseId, search, limit, offset } = req.query;

    const result = await ReceiptService.getReceipts({
      status: typeof status === 'string' ? status : undefined,
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      search: typeof search === 'string' ? search : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      message: 'Receipts retrieved successfully',
      ...result,
    });
  });

  /**
   * GET /api/operations/receipts/:id
   * Get single receipt details
   */
  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const receipt = await ReceiptService.getReceiptById(id);
    res.json({
      message: 'Receipt retrieved successfully',
      data: receipt,
    });
  });

  /**
   * PATCH /api/operations/receipts/:id
   * Update receipt details or transition status (DRAFT -> READY)
   */
  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const receipt = await ReceiptService.updateReceipt(id, req.body);
    res.json({
      message: 'Receipt updated successfully',
      data: receipt,
    });
  });

  /**
   * POST /api/operations/receipts/:id/validate
   * Atomically validate receipt, update inventory, and mark DONE
   */
  static validate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const receipt = await ReceiptService.validateReceipt(id, req.userId);
    res.json({
      message: 'Receipt validated successfully. Stock levels updated.',
      data: receipt,
    });
  });

  /**
   * POST /api/operations/receipts/:id/cancel
   * Cancel receipt without mutating stock
   */
  static cancel = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const receipt = await ReceiptService.cancelReceipt(id);
    res.json({
      message: 'Receipt canceled successfully',
      data: receipt,
    });
  });
}
