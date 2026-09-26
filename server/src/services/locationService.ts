import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/errors';

export const VALID_LOCATION_TYPES = ['INTERNAL', 'VENDOR', 'CUSTOMER', 'INVENTORY_LOSS'] as const;
export type LocationType = typeof VALID_LOCATION_TYPES[number];

export interface LocationListParams {
  warehouseId?: string;
  search?: string;
  type?: string;
  page?: number | string;
  limit?: number | string;
}

export interface CreateLocationInput {
  name: string;
  code?: string;
  type?: string;
}

export interface UpdateLocationInput {
  name?: string;
  code?: string;
  type?: string;
  warehouseId?: string;
}

export class LocationService {
  /**
   * List locations with search, type filter, warehouse filter, and pagination.
   */
  static async listLocations(params: LocationListParams = {}) {
    const { warehouseId, search, type, page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.LocationWhereInput = {};

    if (warehouseId && warehouseId.trim()) {
      where.warehouseId = warehouseId.trim();
    }

    if (type && type.trim()) {
      const upperType = type.trim().toUpperCase();
      if (!VALID_LOCATION_TYPES.includes(upperType as LocationType)) {
        throw new AppError(
          `Invalid location type '${type}'. Valid types are: ${VALID_LOCATION_TYPES.join(', ')}`,
          400
        );
      }
      where.type = upperType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, locations] = await Promise.all([
      prisma.location.count({ where }),
      prisma.location.findMany({
        where,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          stockQuants: {
            select: {
              quantity: true,
              reservedQuantity: true,
            },
          },
        },
        orderBy: { code: 'asc' },
        skip,
        take: limitNum,
      }),
    ]);

    const formattedData = locations.map((loc) => {
      let onHand = 0;
      let reserved = 0;

      for (const quant of loc.stockQuants) {
        onHand += quant.quantity;
        reserved += quant.reservedQuantity;
      }

      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        type: loc.type,
        warehouseId: loc.warehouseId,
        warehouse: loc.warehouse,
        createdAt: loc.createdAt,
        onHand,
        reservedQuantity: reserved,
        freeToUse: onHand - reserved,
      };
    });

    return {
      data: formattedData,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get location details including warehouse info, product breakdown, and reorder rules.
   */
  static async getLocationById(id: string) {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
          },
        },
        stockQuants: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                uom: true,
                costPrice: true,
                salePrice: true,
              },
            },
          },
          orderBy: { product: { name: 'asc' } },
        },
        reorderRules: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!location) {
      throw new AppError(`Location with ID '${id}' not found`, 404);
    }

    let totalOnHand = 0;
    let totalReserved = 0;

    const products = location.stockQuants.map((quant) => {
      totalOnHand += quant.quantity;
      totalReserved += quant.reservedQuantity;

      return {
        productId: quant.product.id,
        productName: quant.product.name,
        sku: quant.product.sku,
        uom: quant.product.uom,
        costPrice: quant.product.costPrice,
        salePrice: quant.product.salePrice,
        quantity: quant.quantity,
        reservedQuantity: quant.reservedQuantity,
        freeToUse: quant.quantity - quant.reservedQuantity,
        updatedAt: quant.updatedAt,
      };
    });

    const reorderRules = location.reorderRules.map((rule) => ({
      id: rule.id,
      productId: rule.product.id,
      productName: rule.product.name,
      sku: rule.product.sku,
      minQuantity: rule.minQuantity,
      maxQuantity: rule.maxQuantity,
      createdAt: rule.createdAt,
    }));

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      type: location.type,
      warehouseId: location.warehouseId,
      warehouse: location.warehouse,
      createdAt: location.createdAt,
      stockSummary: {
        totalOnHand,
        totalReserved,
        freeToUse: totalOnHand - totalReserved,
      },
      products,
      reorderRules,
    };
  }

  /**
   * Create a new location under a specified warehouse.
   */
  static async createLocation(warehouseId: string, data: CreateLocationInput) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      throw new AppError(`Warehouse with ID '${warehouseId}' not found`, 404);
    }

    if (!data.name || !data.name.trim()) {
      throw new AppError('Location name is required', 400);
    }

    const trimmedName = data.name.trim();

    // Prevent duplicate location names in the same warehouse
    const duplicateInWarehouse = await prisma.location.findFirst({
      where: {
        warehouseId,
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });
    if (duplicateInWarehouse) {
      throw new AppError(`Location with name '${trimmedName}' already exists in this warehouse`, 400);
    }

    // Validate location type
    let locType: string = 'INTERNAL';
    if (data.type && data.type.trim()) {
      const upperType = data.type.trim().toUpperCase();
      if (!VALID_LOCATION_TYPES.includes(upperType as LocationType)) {
        throw new AppError(
          `Invalid location type '${data.type}'. Valid types are: ${VALID_LOCATION_TYPES.join(', ')}`,
          400
        );
      }
      locType = upperType;
    }

    // Derive or validate location code
    let code: string;
    if (data.code && data.code.trim()) {
      code = data.code.trim();
    } else {
      code = `${warehouse.code}/${trimmedName.replace(/\s+/g, '-')}`;
    }

    const existingCode = await prisma.location.findUnique({ where: { code } });
    if (existingCode) {
      throw new AppError(`Location code '${code}' already exists`, 400);
    }

    const location = await prisma.location.create({
      data: {
        warehouseId,
        name: trimmedName,
        code,
        type: locType,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      type: location.type,
      warehouseId: location.warehouseId,
      warehouse: location.warehouse,
      createdAt: location.createdAt,
    };
  }

  /**
   * Update mutable fields of an existing location.
   */
  static async updateLocation(id: string, data: UpdateLocationInput) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Location with ID '${id}' not found`, 404);
    }

    if (data.warehouseId && data.warehouseId !== existing.warehouseId) {
      throw new AppError('warehouseId is immutable. Locations cannot be moved between warehouses.', 400);
    }

    const updateData: Prisma.LocationUpdateInput = {};

    if (data.type !== undefined) {
      const upperType = data.type.trim().toUpperCase();
      if (!VALID_LOCATION_TYPES.includes(upperType as LocationType)) {
        throw new AppError(
          `Invalid location type '${data.type}'. Valid types are: ${VALID_LOCATION_TYPES.join(', ')}`,
          400
        );
      }
      updateData.type = upperType;
    }

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new AppError('Location name cannot be empty', 400);
      }

      const duplicate = await prisma.location.findFirst({
        where: {
          warehouseId: existing.warehouseId,
          name: { equals: trimmedName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new AppError(`Location with name '${trimmedName}' already exists in this warehouse`, 400);
      }

      updateData.name = trimmedName;
    }

    if (data.code !== undefined) {
      const trimmedCode = data.code.trim();
      if (!trimmedCode) {
        throw new AppError('Location code cannot be empty', 400);
      }

      if (trimmedCode !== existing.code) {
        const duplicateCode = await prisma.location.findFirst({
          where: {
            code: trimmedCode,
            id: { not: id },
          },
        });
        if (duplicateCode) {
          throw new AppError(`Location code '${trimmedCode}' already exists`, 400);
        }
        updateData.code = trimmedCode;
      }
    }

    const updated = await prisma.location.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      type: updated.type,
      warehouseId: updated.warehouseId,
      warehouse: updated.warehouse,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Safe deletion: prevent deleting locations with active stock, reorder rules, operations, or history.
   */
  static async deleteLocation(id: string) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Location with ID '${id}' not found`, 404);
    }

    // 1. Check for active or reserved stock
    const activeStock = await prisma.stockQuant.findFirst({
      where: {
        locationId: id,
        OR: [{ quantity: { gt: 0 } }, { reservedQuantity: { gt: 0 } }],
      },
    });
    if (activeStock) {
      throw new AppError(
        `Cannot delete location '${existing.name}' (${existing.code}) because it has active or reserved stock. Adjust or move stock to zero first.`,
        400
      );
    }

    // 2. Check for reorder rules
    const ruleCount = await prisma.reorderRule.count({ where: { locationId: id } });
    if (ruleCount > 0) {
      throw new AppError(
        `Cannot delete location '${existing.name}' (${existing.code}) because it has ${ruleCount} active reorder rule(s). Remove rules first.`,
        400
      );
    }

    // 3. Check for operations referencing this location
    const opCount = await prisma.operation.count({
      where: {
        OR: [{ sourceLocationId: id }, { destLocationId: id }],
      },
    });
    if (opCount > 0) {
      throw new AppError(
        `Cannot delete location '${existing.name}' (${existing.code}) because it is referenced in ${opCount} operation(s). Operational records must be preserved.`,
        400
      );
    }

    // 4. Check for immutable historical stock moves
    const moveCount = await prisma.stockMove.count({
      where: {
        OR: [{ fromLocationId: id }, { toLocationId: id }],
      },
    });
    if (moveCount > 0) {
      throw new AppError(
        `Cannot delete location '${existing.name}' (${existing.code}) because it is referenced in ${moveCount} historical stock move(s). Audit history must be preserved.`,
        400
      );
    }

    // 5. Clean up zero-quants and delete
    await prisma.$transaction(async (tx) => {
      await tx.stockQuant.deleteMany({ where: { locationId: id } });
      await tx.location.delete({ where: { id } });
    });

    return {
      message: 'Location deleted successfully',
      id,
    };
  }
}
