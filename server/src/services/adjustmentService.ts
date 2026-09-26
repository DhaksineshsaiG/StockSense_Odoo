import prisma from '../config/db';
import { AppError } from '../utils/errors';
import { getNextOperationReference } from './sequenceService';
import { StockService } from './stockService';

export interface CreateAdjustmentItemInput {
  productId: string;
  physicalQuantity: number;
  recordedQuantity?: number;
  uom?: string;
}

export interface CreateAdjustmentInput {
  warehouseId: string;
  locationId: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  items: CreateAdjustmentItemInput[];
}

export interface UpdateAdjustmentInput {
  locationId?: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  status?: string;
  items?: CreateAdjustmentItemInput[];
}

export interface AdjustmentFilterOptions {
  status?: string;
  warehouseId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class AdjustmentService {
  /**
   * Helper to format adjustment items with explicit physicalQuantity, recordedQuantity, and difference.
   */
  private static formatAdjustment(adj: any) {
    const formattedItems = (adj.items || []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      product: item.product,
      physicalQuantity: item.demandQty,
      recordedQuantity: item.doneQty,
      difference: item.demandQty - item.doneQty,
      uom: item.uom,
    }));

    return {
      ...adj,
      location: adj.destLocation || adj.sourceLocation || null,
      items: formattedItems,
    };
  }

  /**
   * Creates a new inventory adjustment in DRAFT status with an atomic reference (e.g. WH/ADJ/00001).
   */
  static async createAdjustment(data: CreateAdjustmentInput, currentUserId?: string) {
    if (!data.warehouseId) {
      throw new AppError('Warehouse ID is required', 400);
    }
    if (!data.locationId) {
      throw new AppError('Location ID is required', 400);
    }
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new AppError('At least one product line item is required for an adjustment', 400);
    }

    // 1. Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new AppError(`Warehouse with ID '${data.warehouseId}' not found`, 404);
    }

    // 2. Verify location exists and belongs to the selected warehouse
    const location = await prisma.location.findUnique({
      where: { id: data.locationId },
    });
    if (!location) {
      throw new AppError(`Location with ID '${data.locationId}' not found`, 404);
    }
    if (location.warehouseId !== data.warehouseId) {
      throw new AppError('Location does not belong to the selected warehouse', 400);
    }

    // 3. Verify responsible user if provided
    let assignedResponsibleId: string | null = data.responsibleId || currentUserId || null;
    if (data.responsibleId) {
      const user = await prisma.user.findUnique({ where: { id: data.responsibleId } });
      if (!user) {
        throw new AppError(`Responsible user with ID '${data.responsibleId}' not found`, 404);
      }
      assignedResponsibleId = user.id;
    }

    // 4. Validate items (physical count >= 0, product existence, recorded baseline)
    const validatedItems: Array<{
      productId: string;
      physicalQuantity: number;
      recordedQuantity: number;
      uom: string;
    }> = [];

    for (const item of data.items) {
      if (typeof item.physicalQuantity !== 'number' || item.physicalQuantity < 0) {
        throw new AppError('Physical quantity must be a non-negative number (>= 0)', 400);
      }

      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new AppError(`Product with ID '${item.productId}' not found`, 404);
      }

      // If recordedQuantity is not explicitly supplied, fetch current DB stock
      let recorded = item.recordedQuantity;
      if (typeof recorded !== 'number') {
        const quant = await prisma.stockQuant.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: location.id,
            },
          },
        });
        recorded = quant ? quant.quantity : 0.0;
      }

      validatedItems.push({
        productId: product.id,
        physicalQuantity: item.physicalQuantity,
        recordedQuantity: recorded,
        uom: item.uom || product.uom,
      });
    }

    // 5. Execute atomic creation inside a Prisma transaction
    return prisma.$transaction(async (tx) => {
      // Concurrency-safe atomic reference generation (e.g. "WH/ADJ/00001")
      const reference = await getNextOperationReference(tx, warehouse.id, warehouse.code, 'ADJ');

      const adjustment = await tx.operation.create({
        data: {
          reference,
          type: 'ADJUSTMENT',
          status: 'DRAFT',
          warehouseId: warehouse.id,
          sourceLocationId: location.id,
          destLocationId: location.id,
          partnerName: null,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
          notes: data.notes?.trim() || null,
          responsibleId: assignedResponsibleId,
          items: {
            create: validatedItems.map((item) => ({
              productId: item.productId,
              demandQty: item.physicalQuantity, // Stores physical count
              doneQty: item.recordedQuantity,   // Stores recorded baseline
              uom: item.uom,
            })),
          },
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          destLocation: { select: { id: true, name: true, code: true, type: true } },
          responsible: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
        },
      });

      return AdjustmentService.formatAdjustment(adjustment);
    });
  }

  /**
   * Retrieves a paginated list of inventory adjustments with filtering.
   */
  static async getAdjustments(filters: AdjustmentFilterOptions = {}) {
    const { status, warehouseId, search, limit = 50, offset = 0 } = filters;

    const where: any = {
      type: 'ADJUSTMENT',
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.reference = { contains: q, mode: 'insensitive' };
    }

    const [total, adjustments] = await Promise.all([
      prisma.operation.count({ where }),
      prisma.operation.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          destLocation: { select: { id: true, name: true, code: true, type: true } },
          responsible: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    const formatted = adjustments.map(AdjustmentService.formatAdjustment);
    return { total, limit, offset, adjustments: formatted };
  }

  /**
   * Retrieves a single adjustment by ID with formatted lines and stock moves.
   */
  static async getAdjustmentById(id: string) {
    const adjustment = await prisma.operation.findFirst({
      where: {
        id,
        type: 'ADJUSTMENT',
      },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        destLocation: { select: { id: true, name: true, code: true, type: true } },
        responsible: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, uom: true, costPrice: true } },
          },
        },
        stockMoves: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            fromLocation: { select: { id: true, name: true, code: true } },
            toLocation: { select: { id: true, name: true, code: true } },
            performedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!adjustment) {
      throw new AppError('Inventory adjustment not found', 404);
    }

    return AdjustmentService.formatAdjustment(adjustment);
  }

  /**
   * Updates adjustment metadata, status, or items prior to validation.
   */
  static async updateAdjustment(id: string, data: UpdateAdjustmentInput) {
    const existing = await prisma.operation.findFirst({
      where: { id, type: 'ADJUSTMENT' },
      include: { items: true },
    });

    if (!existing) {
      throw new AppError('Inventory adjustment not found', 404);
    }

    if (existing.status === 'DONE') {
      throw new AppError('Completed adjustment cannot be modified', 400);
    }
    if (existing.status === 'CANCELED') {
      throw new AppError('Canceled adjustment cannot be modified', 400);
    }

    // Status transition validation
    if (data.status) {
      const targetStatus = data.status.toUpperCase();
      if (targetStatus === 'DONE') {
        throw new AppError('Adjustments cannot be directly set to DONE via update. Use the validate endpoint.', 400);
      }

      if (existing.status === 'DRAFT') {
        if (!['READY', 'CANCELED', 'DRAFT'].includes(targetStatus)) {
          throw new AppError(`Invalid status transition from DRAFT to ${targetStatus}`, 400);
        }
      } else if (existing.status === 'READY') {
        if (!['DRAFT', 'CANCELED', 'READY'].includes(targetStatus)) {
          throw new AppError(`Invalid status transition from READY to ${targetStatus}`, 400);
        }
      }
    }

    // Location validation if updating
    if (data.locationId && data.locationId !== existing.destLocationId) {
      const loc = await prisma.location.findUnique({ where: { id: data.locationId } });
      if (!loc) throw new AppError(`Location with ID '${data.locationId}' not found`, 404);
      if (loc.warehouseId !== existing.warehouseId) {
        throw new AppError('Location does not belong to the selected warehouse', 400);
      }
    }

    if (data.responsibleId) {
      const user = await prisma.user.findUnique({ where: { id: data.responsibleId } });
      if (!user) throw new AppError(`Responsible user with ID '${data.responsibleId}' not found`, 404);
    }

    return prisma.$transaction(async (tx) => {
      // If updating items
      if (data.items) {
        if (existing.status !== 'DRAFT') {
          throw new AppError('Adjustment line items can only be modified when in DRAFT status', 400);
        }
        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new AppError('At least one product line item is required', 400);
        }

        const targetLocationId = data.locationId || existing.destLocationId!;
        const newItems: Array<{
          productId: string;
          demandQty: number;
          doneQty: number;
          uom: string;
        }> = [];

        for (const item of data.items) {
          if (typeof item.physicalQuantity !== 'number' || item.physicalQuantity < 0) {
            throw new AppError('Physical quantity must be a non-negative number (>= 0)', 400);
          }
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new AppError(`Product with ID '${item.productId}' not found`, 404);

          let recorded = item.recordedQuantity;
          if (typeof recorded !== 'number') {
            const quant = await tx.stockQuant.findUnique({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: targetLocationId,
                },
              },
            });
            recorded = quant ? quant.quantity : 0.0;
          }

          newItems.push({
            productId: product.id,
            demandQty: item.physicalQuantity,
            doneQty: recorded,
            uom: item.uom || product.uom,
          });
        }

        await tx.operationItem.deleteMany({ where: { operationId: id } });
        await tx.operationItem.createMany({
          data: newItems.map((item) => ({
            operationId: id,
            productId: item.productId,
            demandQty: item.demandQty,
            doneQty: item.doneQty,
            uom: item.uom,
          })),
        });
      }

      const updated = await tx.operation.update({
        where: { id },
        data: {
          status: data.status ? data.status.toUpperCase() : undefined,
          sourceLocationId: data.locationId,
          destLocationId: data.locationId,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
          notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
          responsibleId: data.responsibleId,
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          destLocation: { select: { id: true, name: true, code: true, type: true } },
          responsible: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
        },
      });

      return AdjustmentService.formatAdjustment(updated);
    });
  }

  /**
   * Validates an inventory adjustment in ONE atomic transaction:
   * 1. Locks the Operation row with FOR UPDATE.
   * 2. For each line, locks the StockQuant row and re-reads the actual database on-hand quantity.
   * 3. Enforces reserved stock protection (physicalQuantity >= reservedQuantity).
   * 4. Updates StockQuant.quantity = physicalQuantity.
   * 5. If difference !== 0, creates an immutable StockMove with quantity = |difference|.
   * 6. Marks Operation as DONE.
   */
  static async validateAdjustment(id: string, currentUserId?: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock adjustment row
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string; type: string }>>`
        SELECT id, status, type FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new AppError('Inventory adjustment not found', 404);
      }

      const adjMeta = lockedRows[0];

      if (adjMeta.type !== 'ADJUSTMENT') {
        throw new AppError('Operation is not an inventory adjustment', 400);
      }

      if (adjMeta.status === 'DONE') {
        throw new AppError('Inventory adjustment has already been validated and completed', 400);
      }

      if (adjMeta.status === 'CANCELED') {
        throw new AppError('Cannot validate a canceled inventory adjustment', 400);
      }

      if (!['DRAFT', 'READY'].includes(adjMeta.status)) {
        throw new AppError(`Adjustment cannot be validated in its current status: ${adjMeta.status}`, 400);
      }

      // 2. Fetch full adjustment details
      const adjustment = await tx.operation.findUnique({
        where: { id },
        include: {
          items: {
            include: { product: true },
          },
          destLocation: true,
          sourceLocation: true,
          warehouse: true,
        },
      });

      const locationId = adjustment?.destLocationId || adjustment?.sourceLocationId;
      if (!adjustment || !locationId) {
        throw new AppError('Adjustment missing location', 400);
      }

      if (!adjustment.items || adjustment.items.length === 0) {
        throw new AppError('Cannot validate adjustment with no product lines', 400);
      }

      const performedById = currentUserId || adjustment.responsibleId || null;

      // 3. Process every product line atomically
      for (const item of adjustment.items) {
        const physicalQuantity = item.demandQty;

        // Perform adjustment via StockService (locks StockQuant, checks reserved stock, records delta)
        const result = await StockService.recordAdjustment(tx, {
          productId: item.productId,
          locationId,
          physicalQuantity,
          uom: item.uom || item.product.uom,
          operationId: adjustment.id,
          reference: adjustment.reference,
          performedById,
        });

        // Permanently record the actual recorded quantity at time of validation
        await tx.operationItem.update({
          where: { id: item.id },
          data: { doneQty: result.currentRecorded },
        });
      }

      // 4. Mark adjustment as DONE
      const completedAdjustment = await tx.operation.update({
        where: { id },
        data: {
          status: 'DONE',
          completedDate: new Date(),
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          destLocation: { select: { id: true, name: true, code: true, type: true } },
          responsible: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
          stockMoves: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              fromLocation: { select: { id: true, name: true, code: true } },
              toLocation: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });

      return AdjustmentService.formatAdjustment(completedAdjustment);
    });
  }

  /**
   * Cancels an adjustment in DRAFT or READY status without modifying stock.
   */
  static async cancelAdjustment(id: string) {
    return prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string; type: string }>>`
        SELECT id, status, type FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new AppError('Inventory adjustment not found', 404);
      }

      const existing = lockedRows[0];

      if (existing.type !== 'ADJUSTMENT') {
        throw new AppError('Operation is not an inventory adjustment', 400);
      }
      if (existing.status === 'DONE') {
        throw new AppError('Cannot cancel a completed inventory adjustment', 400);
      }
      if (existing.status === 'CANCELED') {
        throw new AppError('Inventory adjustment is already canceled', 400);
      }

      const updated = await tx.operation.update({
        where: { id },
        data: {
          status: 'CANCELED',
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          destLocation: { select: { id: true, name: true, code: true, type: true } },
          responsible: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
        },
      });

      return AdjustmentService.formatAdjustment(updated);
    });
  }
}
