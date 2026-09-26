import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/errors';
import { MoveHistoryService } from './moveHistoryService';

export interface DashboardFilters {
  warehouseId?: string;
  categoryId?: string;
  type?: string;
  status?: string;
}

export class DashboardService {
  /**
   * Generates real-time, read-only dashboard metrics and KPI aggregates directly from PostgreSQL.
   */
  static async getDashboardData(filters: DashboardFilters = {}) {
    const { warehouseId, categoryId, type, status } = filters;

    // 1. Validate filters if provided
    if (warehouseId) {
      const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
      if (!wh) {
        throw new AppError(`Warehouse with ID '${warehouseId}' not found`, 404);
      }
    }

    if (categoryId) {
      const cat = await prisma.productCategory.findUnique({ where: { id: categoryId } });
      if (!cat) {
        throw new AppError(`Product category with ID '${categoryId}' not found`, 404);
      }
    }

    const validTypes = ['RECEIPT', 'DELIVERY', 'INTERNAL_TRANSFER', 'ADJUSTMENT'];
    if (type && !validTypes.includes(type.toUpperCase())) {
      throw new AppError(
        `Invalid operation type '${type}'. Valid types are: ${validTypes.join(', ')}`,
        400
      );
    }

    const validStatuses = ['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED'];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      throw new AppError(
        `Invalid operation status '${status}'. Valid statuses are: ${validStatuses.join(', ')}`,
        400
      );
    }

    // 2. Build base StockQuant filter (warehouse via Location, category via Product)
    const quantWhere: Prisma.StockQuantWhereInput = {};
    if (warehouseId) {
      quantWhere.location = { warehouseId };
    }
    if (categoryId) {
      quantWhere.product = { categoryId };
    }

    // 3. KPI: Total Stock (Calculated as SUM(StockQuant.quantity))
    const totalStockAgg = await prisma.stockQuant.aggregate({
      where: quantWhere,
      _sum: { quantity: true },
    });
    const totalStock = totalStockAgg._sum.quantity || 0;

    // 4. Fetch all StockQuants matching filters to evaluate Out of Stock and Low Stock
    const quants = await prisma.stockQuant.findMany({
      where: quantWhere,
      include: {
        product: {
          include: { category: { select: { id: true, name: true } } },
        },
        location: {
          include: { warehouse: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    // 5. Fetch ReorderRules matching warehouse/category filters
    const ruleWhere: Prisma.ReorderRuleWhereInput = {};
    if (warehouseId) {
      ruleWhere.location = { warehouseId };
    }
    if (categoryId) {
      ruleWhere.product = { categoryId };
    }

    const reorderRules = await prisma.reorderRule.findMany({
      where: ruleWhere,
      include: {
        product: {
          include: { category: { select: { id: true, name: true } } },
        },
        location: {
          include: { warehouse: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    const ruleMap = new Map<string, typeof reorderRules[0]>();
    for (const rule of reorderRules) {
      ruleMap.set(`${rule.productId}_${rule.locationId}`, rule);
    }

    const quantMap = new Map<string, typeof quants[0]>();
    for (const q of quants) {
      quantMap.set(`${q.productId}_${q.locationId}`, q);
    }

    // 6. KPI: Out of Stock (quantity <= 0)
    const outOfStockItems: any[] = [];
    for (const q of quants) {
      if (q.quantity <= 0) {
        const rule = ruleMap.get(`${q.productId}_${q.locationId}`);
        outOfStockItems.push({
          product: {
            id: q.product.id,
            name: q.product.name,
            sku: q.product.sku,
            uom: q.product.uom,
          },
          category: q.product.category,
          warehouse: q.location.warehouse,
          location: {
            id: q.location.id,
            name: q.location.name,
            code: q.location.code,
          },
          onHand: q.quantity,
          reservedQuantity: q.reservedQuantity,
          freeToUse: Math.max(0, q.quantity - q.reservedQuantity),
          reorderThreshold: rule ? rule.minQuantity : null,
        });
      }
    }

    // 7. KPI: Low Stock (Mutually Exclusive: quantity > 0 AND quantity <= minQuantity)
    const lowStockItems: any[] = [];
    for (const rule of reorderRules) {
      const q = quantMap.get(`${rule.productId}_${rule.locationId}`);
      const onHand = q ? q.quantity : 0;
      const reserved = q ? q.reservedQuantity : 0;

      if (onHand > 0 && onHand <= rule.minQuantity) {
        lowStockItems.push({
          product: {
            id: rule.product.id,
            name: rule.product.name,
            sku: rule.product.sku,
            uom: rule.product.uom,
          },
          category: rule.product.category,
          warehouse: rule.location.warehouse,
          location: {
            id: rule.location.id,
            name: rule.location.name,
            code: rule.location.code,
          },
          onHand,
          reservedQuantity: reserved,
          freeToUse: Math.max(0, onHand - reserved),
          reorderThreshold: rule.minQuantity,
          maxQuantity: rule.maxQuantity,
        });
      }
    }

    // 8. Pending Operations Filter Builder
    const targetStatusUpper = status ? status.toUpperCase() : undefined;
    const targetTypeUpper = type ? type.toUpperCase() : undefined;

    // Pending statuses are DRAFT, WAITING, READY
    const defaultPendingStatuses = ['DRAFT', 'WAITING', 'READY'];
    let effectiveStatuses: string[] = defaultPendingStatuses;

    if (targetStatusUpper) {
      if (defaultPendingStatuses.includes(targetStatusUpper)) {
        effectiveStatuses = [targetStatusUpper];
      } else {
        // If filtering by DONE or CANCELED, pending operations matching will be 0
        effectiveStatuses = [];
      }
    }

    const baseOpWhere: Prisma.OperationWhereInput = {
      status: { in: effectiveStatuses },
    };

    if (warehouseId) {
      baseOpWhere.warehouseId = warehouseId;
    }
    if (categoryId) {
      baseOpWhere.items = {
        some: { product: { categoryId } },
      };
    }

    // 9. Fetch Pending Receipts, Deliveries, and Internal Transfers
    const fetchReceipts = !targetTypeUpper || targetTypeUpper === 'RECEIPT';
    const fetchDeliveries = !targetTypeUpper || targetTypeUpper === 'DELIVERY';
    const fetchTransfers = !targetTypeUpper || targetTypeUpper === 'INTERNAL_TRANSFER';

    const [pendingReceipts, pendingDeliveries, pendingTransfers, totalTransfersCount] = await Promise.all([
      fetchReceipts && effectiveStatuses.length > 0
        ? prisma.operation.findMany({
            where: { ...baseOpWhere, type: 'RECEIPT' },
            orderBy: { createdAt: 'desc' },
            include: {
              warehouse: { select: { id: true, name: true, code: true } },
              responsible: { select: { id: true, name: true, email: true } },
              items: {
                include: { product: { select: { id: true, sku: true, name: true } } },
              },
            },
          })
        : Promise.resolve([]),

      fetchDeliveries && effectiveStatuses.length > 0
        ? prisma.operation.findMany({
            where: { ...baseOpWhere, type: 'DELIVERY' },
            orderBy: { createdAt: 'desc' },
            include: {
              warehouse: { select: { id: true, name: true, code: true } },
              responsible: { select: { id: true, name: true, email: true } },
              items: {
                include: { product: { select: { id: true, sku: true, name: true } } },
              },
            },
          })
        : Promise.resolve([]),

      fetchTransfers && effectiveStatuses.length > 0
        ? prisma.operation.findMany({
            where: { ...baseOpWhere, type: 'INTERNAL_TRANSFER' },
            orderBy: { createdAt: 'desc' },
            include: {
              warehouse: { select: { id: true, name: true, code: true } },
              responsible: { select: { id: true, name: true, email: true } },
              items: {
                include: { product: { select: { id: true, sku: true, name: true } } },
              },
            },
          })
        : Promise.resolve([]),

      fetchTransfers
        ? prisma.operation.count({
            where: {
              type: 'INTERNAL_TRANSFER',
              warehouseId: warehouseId || undefined,
              status: targetStatusUpper || undefined,
              items: categoryId ? { some: { product: { categoryId } } } : undefined,
            },
          })
        : Promise.resolve(0),
    ]);

    const formatOp = (op: any) => ({
      id: op.id,
      reference: op.reference,
      type: op.type,
      status: op.status,
      warehouse: op.warehouse,
      partnerName: op.partnerName,
      scheduledDate: op.scheduledDate,
      createdAt: op.createdAt,
      responsible: op.responsible,
      itemCount: op.items ? op.items.length : 0,
      totalDemandQty: (op.items || []).reduce(
        (acc: number, it: any) => acc + (it.demandQty || 0),
        0
      ),
    });

    // 10. Warehouse Summary (multi-warehouse breakdown)
    const targetWarehouses = warehouseId
      ? await prisma.warehouse.findMany({ where: { id: warehouseId } })
      : await prisma.warehouse.findMany({ orderBy: { code: 'asc' } });

    const warehouseSummary = await Promise.all(
      targetWarehouses.map(async (wh) => {
        const whSum = await prisma.stockQuant.aggregate({
          where: {
            location: { warehouseId: wh.id },
            product: categoryId ? { categoryId } : undefined,
          },
          _sum: { quantity: true },
        });

        const whLowStock = lowStockItems.filter((it) => it.warehouse.id === wh.id).length;
        const whOutOfStock = outOfStockItems.filter((it) => it.warehouse.id === wh.id).length;

        return {
          warehouse: { id: wh.id, name: wh.name, code: wh.code },
          totalStock: whSum._sum.quantity || 0,
          lowStockCount: whLowStock,
          outOfStockCount: whOutOfStock,
        };
      })
    );

    // 11. Recent Activity (reuses MoveHistoryService, limit = 10)
    let recentActivity: any[] = [];
    try {
      const recentMoves = await MoveHistoryService.getMoveHistory({
        warehouseId,
        categoryId,
        type,
        status,
        limit: 10,
        sortOrder: 'desc',
      });
      recentActivity = recentMoves.items;
    } catch {
      recentActivity = [];
    }

    return {
      filters: {
        warehouseId: warehouseId || null,
        categoryId: categoryId || null,
        type: targetTypeUpper || null,
        status: targetStatusUpper || null,
      },
      kpis: {
        totalStock,
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
        pendingReceipts: pendingReceipts.length,
        pendingDeliveries: pendingDeliveries.length,
        internalTransfers: pendingTransfers.length,
      },
      lowStock: {
        count: lowStockItems.length,
        items: lowStockItems,
      },
      outOfStock: {
        count: outOfStockItems.length,
        items: outOfStockItems,
      },
      pendingReceipts: {
        count: pendingReceipts.length,
        items: pendingReceipts.map(formatOp),
      },
      pendingDeliveries: {
        count: pendingDeliveries.length,
        items: pendingDeliveries.map(formatOp),
      },
      internalTransfers: {
        count: pendingTransfers.length,
        pendingCount: pendingTransfers.length,
        totalCount: totalTransfersCount,
        items: pendingTransfers.map(formatOp),
      },
      warehouseSummary,
      recentActivity,
    };
  }
}
