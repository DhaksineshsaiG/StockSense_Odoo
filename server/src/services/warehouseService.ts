import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/errors';

export interface WarehouseListParams {
  search?: string;
  code?: string;
  page?: number | string;
  limit?: number | string;
}

export interface CreateWarehouseInput {
  name: string;
  code: string;
  address?: string | null;
}

export interface UpdateWarehouseInput {
  name?: string;
  code?: string;
  address?: string | null;
}

export class WarehouseService {
  /**
   * List warehouses with search, code filtering, relation counts, and pagination.
   */
  static async listWarehouses(params: WarehouseListParams = {}) {
    const { search, code, page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.WarehouseWhereInput = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (code && code.trim()) {
      where.code = { contains: code.trim(), mode: 'insensitive' };
    }

    const [total, warehouses] = await Promise.all([
      prisma.warehouse.count({ where }),
      prisma.warehouse.findMany({
        where,
        include: {
          _count: {
            select: {
              locations: true,
              operations: true,
            },
          },
        },
        orderBy: { code: 'asc' },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      data: warehouses.map((wh) => ({
        id: wh.id,
        name: wh.name,
        code: wh.code,
        address: wh.address,
        createdAt: wh.createdAt,
        updatedAt: wh.updatedAt,
        locationsCount: wh._count.locations,
        operationsCount: wh._count.operations,
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
   * Get warehouse detail including locations, on-hand stock summary, and operation count.
   * Uses StockQuant as the single source of truth for stock levels.
   */
  static async getWarehouseById(id: string) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            stockQuants: {
              select: {
                quantity: true,
                reservedQuantity: true,
              },
            },
          },
          orderBy: { code: 'asc' },
        },
        _count: {
          select: {
            operations: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new AppError(`Warehouse with ID '${id}' not found`, 404);
    }

    let totalOnHand = 0;
    let totalReserved = 0;

    const locations = warehouse.locations.map((loc) => {
      let locOnHand = 0;
      let locReserved = 0;

      for (const quant of loc.stockQuants) {
        locOnHand += quant.quantity;
        locReserved += quant.reservedQuantity;
      }

      totalOnHand += locOnHand;
      totalReserved += locReserved;

      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        type: loc.type,
        createdAt: loc.createdAt,
        onHand: locOnHand,
        reservedQuantity: locReserved,
        freeToUse: locOnHand - locReserved,
      };
    });

    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
      operationsCount: warehouse._count.operations,
      stockSummary: {
        totalOnHand,
        totalReserved,
        freeToUse: totalOnHand - totalReserved,
      },
      locations,
    };
  }

  /**
   * Create a new warehouse with unique normalized code.
   */
  static async createWarehouse(data: CreateWarehouseInput) {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Warehouse name is required', 400);
    }
    if (!data.code || !data.code.trim()) {
      throw new AppError('Warehouse code is required', 400);
    }

    const trimmedName = data.name.trim();
    const normalizedCode = data.code.trim().toUpperCase();

    const existing = await prisma.warehouse.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new AppError(`Warehouse with code '${normalizedCode}' already exists`, 400);
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: trimmedName,
        code: normalizedCode,
        address: data.address ? data.address.trim() : null,
      },
    });

    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
    };
  }

  /**
   * Update mutable fields of an existing warehouse.
   */
  static async updateWarehouse(id: string, data: UpdateWarehouseInput) {
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Warehouse with ID '${id}' not found`, 404);
    }

    const updateData: Prisma.WarehouseUpdateInput = {};

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) {
        throw new AppError('Warehouse name cannot be empty', 400);
      }
      updateData.name = trimmed;
    }

    if (data.code !== undefined) {
      const normalizedCode = data.code.trim().toUpperCase();
      if (!normalizedCode) {
        throw new AppError('Warehouse code cannot be empty', 400);
      }
      if (normalizedCode !== existing.code) {
        const collision = await prisma.warehouse.findFirst({
          where: { code: normalizedCode, id: { not: id } },
        });
        if (collision) {
          throw new AppError(`Warehouse with code '${normalizedCode}' already exists`, 400);
        }
        updateData.code = normalizedCode;
      }
    }

    if (data.address !== undefined) {
      updateData.address = data.address ? data.address.trim() : null;
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      address: updated.address,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Safe deletion: only allowed if warehouse has no locations, operations, or historical references.
   */
  static async deleteWarehouse(id: string) {
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Warehouse with ID '${id}' not found`, 404);
    }

    const [locationCount, operationCount] = await Promise.all([
      prisma.location.count({ where: { warehouseId: id } }),
      prisma.operation.count({ where: { warehouseId: id } }),
    ]);

    if (locationCount > 0) {
      throw new AppError(
        `Cannot delete warehouse '${existing.name}' (${existing.code}) because it contains ${locationCount} location(s). Delete or reassign locations first.`,
        400
      );
    }

    if (operationCount > 0) {
      throw new AppError(
        `Cannot delete warehouse '${existing.name}' (${existing.code}) because it has ${operationCount} associated operation(s). Operational history must be preserved.`,
        400
      );
    }

    // Clean up any empty sequences and delete warehouse
    await prisma.$transaction(async (tx) => {
      await tx.operationSequence.deleteMany({ where: { warehouseId: id } });
      await tx.warehouse.delete({ where: { id } });
    });

    return {
      message: 'Warehouse deleted successfully',
      id,
    };
  }
}
