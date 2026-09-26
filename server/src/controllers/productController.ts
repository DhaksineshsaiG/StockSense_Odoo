import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { ReorderRuleService } from '../services/reorderRuleService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class ProductController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const result = await ProductService.listProducts({
      search: req.query.search as string,
      sku: req.query.sku as string,
      categoryId: req.query.categoryId as string,
      warehouseId: req.query.warehouseId as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
      sortBy: req.query.sortBy as string,
      order: req.query.order as string,
    });
    res.json(result);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.getProductById(getParamId(req.params.id));
    res.json({ data: product });
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({
      message: 'Product created successfully',
      data: product,
    });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.updateProduct(getParamId(req.params.id), req.body);
    res.json({
      message: 'Product updated successfully',
      data: product,
    });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await ProductService.deleteProduct(getParamId(req.params.id));
    res.json(result);
  });

  static setStock = asyncHandler(async (req: Request, res: Response) => {
    const result = await ProductService.setProductStock(getParamId(req.params.id), req.body);
    res.json({
      message: 'Product stock updated successfully',
      data: result,
    });
  });

  static getReorderRules = asyncHandler(async (req: Request, res: Response) => {
    const rules = await ReorderRuleService.getRulesForProduct(getParamId(req.params.id));
    res.json({ data: rules });
  });

  static createReorderRule = asyncHandler(async (req: Request, res: Response) => {
    const rule = await ReorderRuleService.createRule(getParamId(req.params.id), req.body);
    res.status(201).json({
      message: 'Reorder rule created successfully',
      data: rule,
    });
  });
}
