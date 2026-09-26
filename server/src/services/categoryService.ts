import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/errors';

export interface CategoryListParams {
  search?: string;
  page?: number | string;
  limit?: number | string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
}

export class CategoryService {
  /**
   * List categories with optional search, pagination, and relation counts.
   */
  static async listCategories(params: CategoryListParams = {}) {
    const { search, page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ProductCategoryWhereInput = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, categories] = await Promise.all([
      prisma.productCategory.count({ where }),
      prisma.productCategory.findMany({
        where,
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      data: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        createdAt: cat.createdAt,
        productsCount: cat._count.products,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get single category by ID with associated products.
   */
  static async getCategoryById(id: string) {
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          select: {
            id: true,
            sku: true,
            name: true,
            uom: true,
            costPrice: true,
            salePrice: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new AppError(`Category with ID '${id}' not found`, 404);
    }

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      productsCount: category._count.products,
      products: category.products,
    };
  }

  /**
   * Create a new category with duplicate prevention.
   */
  static async createCategory(data: CreateCategoryInput) {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Category name is required', 400);
    }

    const trimmedName = data.name.trim();

    const existing = await prisma.productCategory.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });

    if (existing) {
      throw new AppError(`Category '${trimmedName}' already exists`, 400);
    }

    const category = await prisma.productCategory.create({
      data: {
        name: trimmedName,
        description: data.description?.trim() || null,
      },
    });

    return category;
  }

  /**
   * Update category fields.
   */
  static async updateCategory(id: string, data: UpdateCategoryInput) {
    const category = await prisma.productCategory.findUnique({ where: { id } });
    if (!category) {
      throw new AppError(`Category with ID '${id}' not found`, 404);
    }

    const updateData: Prisma.ProductCategoryUpdateInput = {};

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new AppError('Category name cannot be empty', 400);
      }

      const duplicate = await prisma.productCategory.findFirst({
        where: {
          name: { equals: trimmedName, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new AppError(`Category '${trimmedName}' already exists`, 400);
      }

      updateData.name = trimmedName;
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    const updated = await prisma.productCategory.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Safely delete category ensuring no products are linked.
   */
  static async deleteCategory(id: string) {
    const category = await prisma.productCategory.findUnique({ where: { id } });
    if (!category) {
      throw new AppError(`Category with ID '${id}' not found`, 404);
    }

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new AppError(
        `Cannot delete category '${category.name}' because it contains ${productCount} product(s). Reassign or remove products first.`,
        400
      );
    }

    await prisma.productCategory.delete({ where: { id } });

    return {
      message: 'Category deleted successfully',
      id,
    };
  }
}
