import { Request, Response } from 'express';
import { CategoryService } from '../services/categoryService';
import { asyncHandler } from '../utils/errors';

function getParamId(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

export class CategoryController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const result = await CategoryService.listCategories({
      search: req.query.search as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    res.json(result);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const category = await CategoryService.getCategoryById(getParamId(req.params.id));
    res.json({ data: category });
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const category = await CategoryService.createCategory(req.body);
    res.status(201).json({
      message: 'Category created successfully',
      data: category,
    });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const category = await CategoryService.updateCategory(getParamId(req.params.id), req.body);
    res.json({
      message: 'Category updated successfully',
      data: category,
    });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const result = await CategoryService.deleteCategory(getParamId(req.params.id));
    res.json(result);
  });
}
