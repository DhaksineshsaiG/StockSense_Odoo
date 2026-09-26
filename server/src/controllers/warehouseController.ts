import { Request, Response } from 'express';
import { WarehouseService } from '../services/warehouseService';
import { LocationService } from '../services/locationService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class WarehouseController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const result = await WarehouseService.listWarehouses({
      search: req.query.search as string,
      code: req.query.code as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json(result);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const warehouse = await WarehouseService.getWarehouseById(getParamId(req.params.id));
    res.json({ data: warehouse });
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const warehouse = await WarehouseService.createWarehouse(req.body);
    res.status(201).json({
      message: 'Warehouse created successfully',
      data: warehouse,
    });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const warehouse = await WarehouseService.updateWarehouse(getParamId(req.params.id), req.body);
    res.json({
      message: 'Warehouse updated successfully',
      data: warehouse,
    });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await WarehouseService.deleteWarehouse(getParamId(req.params.id));
    res.json(result);
  });

  static listLocations = asyncHandler(async (req: Request, res: Response) => {
    const warehouseId = getParamId(req.params.warehouseId);
    const result = await LocationService.listLocations({
      warehouseId,
      search: req.query.search as string,
      type: req.query.type as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json(result);
  });

  static createLocation = asyncHandler(async (req: Request, res: Response) => {
    const warehouseId = getParamId(req.params.warehouseId);
    const location = await LocationService.createLocation(warehouseId, req.body);
    res.status(201).json({
      message: 'Location created successfully',
      data: location,
    });
  });
}
