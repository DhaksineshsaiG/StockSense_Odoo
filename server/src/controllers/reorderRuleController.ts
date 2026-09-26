import { Request, Response } from 'express';
import { ReorderRuleService } from '../services/reorderRuleService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class ReorderRuleController {
  static getForProduct = asyncHandler(async (req: Request, res: Response) => {
    const rules = await ReorderRuleService.getRulesForProduct(getParamId(req.params.id));
    res.json({ data: rules });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const rule = await ReorderRuleService.getRuleById(getParamId(req.params.id));
    res.json({ data: rule });
  });

  static createForProduct = asyncHandler(async (req: Request, res: Response) => {
    const rule = await ReorderRuleService.createRule(getParamId(req.params.id), req.body);
    res.status(201).json({
      message: 'Reorder rule created successfully',
      data: rule,
    });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const rule = await ReorderRuleService.updateRule(getParamId(req.params.id), req.body);
    res.json({
      message: 'Reorder rule updated successfully',
      data: rule,
    });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await ReorderRuleService.deleteRule(getParamId(req.params.id));
    res.json(result);
  });
}
