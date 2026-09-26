import prisma from '../config/db';
import { AppError } from '../utils/errors';

export interface CreateReorderRuleInput {
  locationId: string;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface UpdateReorderRuleInput {
  minQuantity?: number;
  maxQuantity?: number;
}

export class ReorderRuleService {
  /**
   * Get all reorder rules for a given product.
   */
  static async getRulesForProduct(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(`Product with ID '${productId}' not found`, 404);
    }

    const rules = await prisma.reorderRule.findMany({
      where: { productId },
      include: {
        location: {
          include: { warehouse: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rules.map((r) => ({
      id: r.id,
      productId: r.productId,
      locationId: r.locationId,
      locationCode: r.location.code,
      locationName: r.location.name,
      warehouseId: r.location.warehouseId,
      warehouseCode: r.location.warehouse.code,
      warehouseName: r.location.warehouse.name,
      minQuantity: r.minQuantity,
      maxQuantity: r.maxQuantity,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get single reorder rule by ID.
   */
  static async getRuleById(id: string) {
    const rule = await prisma.reorderRule.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        location: {
          include: { warehouse: true },
        },
      },
    });

    if (!rule) {
      throw new AppError(`Reorder rule with ID '${id}' not found`, 404);
    }

    return {
      id: rule.id,
      productId: rule.productId,
      product: rule.product,
      locationId: rule.locationId,
      locationCode: rule.location.code,
      locationName: rule.location.name,
      warehouseId: rule.location.warehouseId,
      warehouseCode: rule.location.warehouse.code,
      warehouseName: rule.location.warehouse.name,
      minQuantity: rule.minQuantity,
      maxQuantity: rule.maxQuantity,
      createdAt: rule.createdAt,
    };
  }

  /**
   * Create reorder rule for a product at a specific location.
   */
  static async createRule(productId: string, data: CreateReorderRuleInput) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(`Product with ID '${productId}' not found`, 404);
    }

    if (!data.locationId) {
      throw new AppError('locationId is required for reorder rule', 400);
    }

    const location = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!location) {
      throw new AppError(`Location with ID '${data.locationId}' not found`, 404);
    }

    // Prevent duplicate reorder rules for product + location
    const existing = await prisma.reorderRule.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId: data.locationId,
        },
      },
    });

    if (existing) {
      throw new AppError('Reorder rule already exists for this product and location', 400);
    }

    const minQty = data.minQuantity !== undefined ? Number(data.minQuantity) : 0.0;
    const maxQty = data.maxQuantity !== undefined ? Number(data.maxQuantity) : 0.0;

    if (isNaN(minQty) || minQty < 0) {
      throw new AppError('minQuantity must be a non-negative number', 400);
    }
    if (isNaN(maxQty) || maxQty < 0) {
      throw new AppError('maxQuantity must be a non-negative number', 400);
    }
    if (maxQty < minQty) {
      throw new AppError('maxQuantity cannot be less than minQuantity', 400);
    }

    const rule = await prisma.reorderRule.create({
      data: {
        productId,
        locationId: data.locationId,
        minQuantity: minQty,
        maxQuantity: maxQty,
      },
      include: {
        location: {
          include: { warehouse: true },
        },
      },
    });

    return {
      id: rule.id,
      productId: rule.productId,
      locationId: rule.locationId,
      locationCode: rule.location.code,
      locationName: rule.location.name,
      warehouseId: rule.location.warehouseId,
      warehouseCode: rule.location.warehouse.code,
      warehouseName: rule.location.warehouse.name,
      minQuantity: rule.minQuantity,
      maxQuantity: rule.maxQuantity,
      createdAt: rule.createdAt,
    };
  }

  /**
   * Update min/max quantities on an existing reorder rule.
   */
  static async updateRule(id: string, data: UpdateReorderRuleInput) {
    const existing = await prisma.reorderRule.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Reorder rule with ID '${id}' not found`, 404);
    }

    const newMin = data.minQuantity !== undefined ? Number(data.minQuantity) : existing.minQuantity;
    const newMax = data.maxQuantity !== undefined ? Number(data.maxQuantity) : existing.maxQuantity;

    if (isNaN(newMin) || newMin < 0) {
      throw new AppError('minQuantity must be a non-negative number', 400);
    }
    if (isNaN(newMax) || newMax < 0) {
      throw new AppError('maxQuantity must be a non-negative number', 400);
    }
    if (newMax < newMin) {
      throw new AppError('maxQuantity cannot be less than minQuantity', 400);
    }

    const updated = await prisma.reorderRule.update({
      where: { id },
      data: {
        minQuantity: newMin,
        maxQuantity: newMax,
      },
      include: {
        location: {
          include: { warehouse: true },
        },
      },
    });

    return {
      id: updated.id,
      productId: updated.productId,
      locationId: updated.locationId,
      locationCode: updated.location.code,
      locationName: updated.location.name,
      warehouseId: updated.location.warehouseId,
      warehouseCode: updated.location.warehouse.code,
      warehouseName: updated.location.warehouse.name,
      minQuantity: updated.minQuantity,
      maxQuantity: updated.maxQuantity,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Delete a reorder rule.
   */
  static async deleteRule(id: string) {
    const existing = await prisma.reorderRule.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Reorder rule with ID '${id}' not found`, 404);
    }

    await prisma.reorderRule.delete({ where: { id } });

    return {
      message: 'Reorder rule deleted successfully',
      id,
    };
  }
}
