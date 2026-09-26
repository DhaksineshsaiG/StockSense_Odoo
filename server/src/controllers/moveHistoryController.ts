import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MoveHistoryService } from '../services/moveHistoryService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class MoveHistoryController {
  /**
   * GET /api/operations/moves (or /api/ledger/moves)
   * List immutable stock moves / ledger entries with rich filtering and pagination
   */
  static list = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      type,
      status,
      warehouseId,
      categoryId,
      productId,
      locationId,
      search,
      fromDate,
      toDate,
      sortOrder,
      limit,
      offset,
    } = req.query;

    const result = await MoveHistoryService.getMoveHistory({
      type: typeof type === 'string' ? type : undefined,
      status: typeof status === 'string' ? status : undefined,
      warehouseId: typeof warehouseId === 'string' ? warehouseId : undefined,
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      productId: typeof productId === 'string' ? productId : undefined,
      locationId: typeof locationId === 'string' ? locationId : undefined,
      search: typeof search === 'string' ? search : undefined,
      fromDate: typeof fromDate === 'string' ? fromDate : undefined,
      toDate: typeof toDate === 'string' ? toDate : undefined,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      message: 'Stock moves retrieved successfully',
      ...result,
    });
  });

  /**
   * GET /api/operations/moves/:id (or /api/ledger/moves/:id)
   * Get detailed audit information for a single StockMove record
   */
  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = getParamId(req.params.id);
    const move = await MoveHistoryService.getMoveById(id);
    res.json({
      message: 'Stock move retrieved successfully',
      data: move,
    });
  });
}
