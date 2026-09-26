import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/errors';

export interface MoveHistoryFilters {
  type?: string;
  status?: string;
  warehouseId?: string;
  categoryId?: string;
  productId?: string;
  locationId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export type MoveDirection = 'INCOMING' | 'OUTGOING' | 'INTERNAL' | 'UNKNOWN';

export function deriveDirection(fromLocationId: string | null, toLocationId: string | null): MoveDirection {
  if (!fromLocationId && toLocationId) return 'INCOMING';
  if (fromLocationId && !toLocationId) return 'OUTGOING';
  if (fromLocationId && toLocationId) return 'INTERNAL';
  return 'UNKNOWN';
}

export class MoveHistoryService {
  /**
   * Helper to format a StockMove record into a clean, frontend-friendly response.
   */
  private static formatMove(move: any) {
    const direction = deriveDirection(move.fromLocationId, move.toLocationId);

    // Resolve warehouse from operation or populated location
    const warehouse =
      move.operation?.warehouse ||
      move.toLocation?.warehouse ||
      move.fromLocation?.warehouse ||
      null;

    // Resolve responsible user
    const responsible = move.performedBy
      ? {
          id: move.performedBy.id,
          name: move.performedBy.name,
          email: move.performedBy.email,
          role: move.performedBy.role,
        }
      : move.operation?.responsible
      ? {
          id: move.operation.responsible.id,
          name: move.operation.responsible.name,
          email: move.operation.responsible.email,
          role: move.operation.responsible.role,
        }
      : null;

    return {
      id: move.id,
      reference: move.reference,
      date: move.timestamp,
      timestamp: move.timestamp,
      type: move.type,
      direction,
      status: move.operation?.status || 'DONE',
      quantity: move.quantity,
      uom: move.uom,
      product: {
        id: move.product.id,
        name: move.product.name,
        sku: move.product.sku,
        uom: move.product.uom,
        costPrice: move.product.costPrice,
        salePrice: move.product.salePrice,
      },
      category: move.product.category
        ? {
            id: move.product.category.id,
            name: move.product.category.name,
          }
        : null,
      fromLocation: move.fromLocation
        ? {
            id: move.fromLocation.id,
            name: move.fromLocation.name,
            code: move.fromLocation.code,
            type: move.fromLocation.type,
            warehouseId: move.fromLocation.warehouseId,
          }
        : null,
      toLocation: move.toLocation
        ? {
            id: move.toLocation.id,
            name: move.toLocation.name,
            code: move.toLocation.code,
            type: move.toLocation.type,
            warehouseId: move.toLocation.warehouseId,
          }
        : null,
      warehouse: warehouse
        ? {
            id: warehouse.id,
            name: warehouse.name,
            code: warehouse.code,
          }
        : null,
      responsible,
      operationId: move.operationId,
    };
  }

  /**
   * Retrieves a paginated list of StockMove audit records with comprehensive filtering.
   */
  static async getMoveHistory(filters: MoveHistoryFilters = {}) {
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
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = filters;

    const parsedLimit = Math.min(Math.max(1, limit), 200);
    const parsedOffset = Math.max(0, offset);

    const andConditions: Prisma.StockMoveWhereInput[] = [];

    // Filter by operation type (RECEIPT, DELIVERY, INTERNAL_TRANSFER, ADJUSTMENT)
    if (type) {
      andConditions.push({ type: type.toUpperCase() });
    }

    // Filter by operation status (DONE, READY, DRAFT, etc.)
    if (status) {
      andConditions.push({
        operation: { status: status.toUpperCase() },
      });
    }

    // Filter by product
    if (productId) {
      andConditions.push({ productId });
    }

    // Filter by product category
    if (categoryId) {
      andConditions.push({
        product: { categoryId },
      });
    }

    // Filter by location (source or destination)
    if (locationId) {
      andConditions.push({
        OR: [{ fromLocationId: locationId }, { toLocationId: locationId }],
      });
    }

    // Filter by warehouse (fromLocation warehouse, toLocation warehouse, or operation warehouse)
    if (warehouseId) {
      andConditions.push({
        OR: [
          { fromLocation: { warehouseId } },
          { toLocation: { warehouseId } },
          { operation: { warehouseId } },
        ],
      });
    }

    // Filter by date range (timestamp)
    if (fromDate || toDate) {
      const timestampFilter: Prisma.DateTimeFilter = {};
      if (fromDate) {
        const d = new Date(fromDate);
        if (!isNaN(d.getTime())) {
          timestampFilter.gte = d;
        }
      }
      if (toDate) {
        let d = new Date(toDate);
        if (/^\d{4}-\d{2}-\d{2}$/.test(toDate.trim())) {
          d = new Date(`${toDate.trim()}T23:59:59.999Z`);
        }
        if (!isNaN(d.getTime())) {
          timestampFilter.lte = d;
        }
      }
      if (timestampFilter.gte || timestampFilter.lte) {
        andConditions.push({ timestamp: timestampFilter });
      }
    }

    // Search across reference, product name, product SKU, and location codes/names
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { reference: { contains: q, mode: 'insensitive' } },
          { product: { name: { contains: q, mode: 'insensitive' } } },
          { product: { sku: { contains: q, mode: 'insensitive' } } },
          { fromLocation: { code: { contains: q, mode: 'insensitive' } } },
          { fromLocation: { name: { contains: q, mode: 'insensitive' } } },
          { toLocation: { code: { contains: q, mode: 'insensitive' } } },
          { toLocation: { name: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.StockMoveWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, moves] = await Promise.all([
      prisma.stockMove.count({ where }),
      prisma.stockMove.findMany({
        where,
        skip: parsedOffset,
        take: parsedLimit,
        orderBy: [{ timestamp: order }, { id: 'desc' }],
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
          fromLocation: {
            include: {
              warehouse: { select: { id: true, name: true, code: true } },
            },
          },
          toLocation: {
            include: {
              warehouse: { select: { id: true, name: true, code: true } },
            },
          },
          operation: {
            select: {
              id: true,
              reference: true,
              type: true,
              status: true,
              warehouseId: true,
              warehouse: { select: { id: true, name: true, code: true } },
              responsible: { select: { id: true, name: true, email: true, role: true } },
            },
          },
          performedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    const formatted = moves.map(MoveHistoryService.formatMove);

    return {
      total,
      limit: parsedLimit,
      offset: parsedOffset,
      items: formatted,
      moves: formatted,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
      },
    };
  }

  /**
   * Retrieves complete audit details for a single StockMove record by ID.
   */
  static async getMoveById(id: string) {
    const move = await prisma.stockMove.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
        fromLocation: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
        toLocation: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
          },
        },
        operation: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            responsible: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!move) {
      throw new AppError('Stock move not found', 404);
    }

    const baseFormatted = MoveHistoryService.formatMove(move);

    return {
      ...baseFormatted,
      operation: move.operation
        ? {
            id: move.operation.id,
            reference: move.operation.reference,
            type: move.operation.type,
            status: move.operation.status,
            partnerName: move.operation.partnerName,
            scheduledDate: move.operation.scheduledDate,
            completedDate: move.operation.completedDate,
            notes: move.operation.notes,
            warehouse: move.operation.warehouse,
            responsible: move.operation.responsible,
          }
        : null,
    };
  }
}
