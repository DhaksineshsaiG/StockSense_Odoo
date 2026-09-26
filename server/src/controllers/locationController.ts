import { Request, Response } from 'express';
import { LocationService } from '../services/locationService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class LocationController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const result = await LocationService.listLocations({
      warehouseId: req.query.warehouseId as string,
      search: req.query.search as string,
      type: req.query.type as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json(result);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const location = await LocationService.getLocationById(getParamId(req.params.id));
    res.json({ data: location });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const location = await LocationService.updateLocation(getParamId(req.params.id), req.body);
    res.json({
      message: 'Location updated successfully',
      data: location,
    });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await LocationService.deleteLocation(getParamId(req.params.id));
    res.json(result);
  });
}
