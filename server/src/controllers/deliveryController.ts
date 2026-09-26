import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DeliveryService } from '../services/deliveryService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class DeliveryController {
  /**
   * POST /api/operations/deliveries
   * Create a new delivery order in DRAFT state
   */
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const delivery = await DeliveryService.createDelivery(req.body, req.userId);
    res.status(201).json({
      message: 'Delivery order created successfully',
      data: delivery,
    });
  });

  /**
   * GET /api/operations/deliveries
   * List deliveries with filtering
   */
  static list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, warehouseId, search, limit, offset } = req.query;

    const result = await DeliveryService.getDeliveries({
      status: typeof status === 'string' ? status : undefined,
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      search: typeof search === 'string' ? search : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      message: 'Deliveries retrieved successfully',
      ...result,
    });
  });

  /**
   * GET /api/operations/deliveries/:id
   * Get single delivery details with line availability
   */
  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const delivery = await DeliveryService.getDeliveryById(id);
    res.json({
      message: 'Delivery retrieved successfully',
      data: delivery,
    });
  });

  /**
   * PATCH /api/operations/deliveries/:id
   * Update delivery metadata or line items
   */
  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const delivery = await DeliveryService.updateDelivery(id, req.body);
    res.json({
      message: 'Delivery updated successfully',
      data: delivery,
    });
  });

  /**
   * POST /api/operations/deliveries/:id/check-availability
   * Check stock availability and apply reservation if all lines can be fulfilled
   */
  static checkAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const result = await DeliveryService.checkAvailability(id);
    res.json({
      message: `Availability check complete. Status is now ${result.status}.`,
      ...result,
    });
  });

  /**
   * POST /api/operations/deliveries/:id/validate
   * Atomically validate delivery, deduct stock, release reservation, record StockMove, mark DONE
   */
  static validate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const delivery = await DeliveryService.validateDelivery(id, req.userId);
    res.json({
      message: 'Delivery validated successfully. Outgoing stock deducted.',
      data: delivery,
    });
  });

  /**
   * POST /api/operations/deliveries/:id/cancel
   * Cancel delivery order and release reservations
   */
  static cancel = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const delivery = await DeliveryService.cancelDelivery(id);
    res.json({
      message: 'Delivery canceled successfully',
      data: delivery,
    });
  });
}
