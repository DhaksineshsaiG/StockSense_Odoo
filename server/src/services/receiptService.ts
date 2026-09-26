import prisma from '../config/db';
import { AppError } from '../utils/errors';
import { getNextOperationReference } from './sequenceService';
import { StockService } from './stockService';

export interface CreateReceiptItemInput {
  productId: string;
  demandQty: number;
  uom?: string;
}

export interface CreateReceiptInput {
  warehouseId: string;
  destLocationId: string;
  partnerName?: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  items: CreateReceiptItemInput[];
}

export interface UpdateReceiptInput {
  partnerName?: string;
  destLocationId?: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  status?: string;
  items?: CreateReceiptItemInput[];
}

export interface ReceiptFilterOptions {
  status?: string;
  warehouseId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class ReceiptService {
  /**
   * Creates a new receipt in DRAFT status with an atomic Odoo-style reference number.
   */
  static async createReceipt(data: CreateReceiptInput, currentUserId?: string) {
    if (!data.warehouseId) {
      throw new AppError('Warehouse ID is required', 400);
    }
    if (!data.destLocationId) {
      throw new AppError('Destination location ID is required', 400);
    }
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new AppError('At least one product line item is required for a receipt', 400);
    }

    // 1. Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new AppError(`Warehouse with ID '${data.warehouseId}' not found`, 404);
    }

    // 2. Verify destination location exists and belongs to the selected warehouse
    const destLocation = await prisma.location.findUnique({
      where: { id: data.destLocationId },
    });
    if (!destLocation) {
      throw new AppError(`Destination location with ID '${data.destLocationId}' not found`, 404);
    }
    if (destLocation.warehouseId !== data.warehouseId) {
      throw new AppError('Destination location does not belong to the selected warehouse', 400);
    }

    // 3. Verify responsible user if provided, otherwise fallback to current user if exists
    let assignedResponsibleId: string | null = data.responsibleId || currentUserId || null;
    if (data.responsibleId) {
      const user = await prisma.user.findUnique({ where: { id: data.responsibleId } });
      if (!user) {
        throw new AppError(`Responsible user with ID '${data.responsibleId}' not found`, 404);
      }
      assignedResponsibleId = user.id;
    }

    // 4. Validate all items (product existence, quantity > 0)
    const validatedItems: Array<{ productId: string; demandQty: number; uom: string }> = [];
    for (const item of data.items) {
      if (typeof item.demandQty !== 'number' || item.demandQty <= 0) {
        throw new AppError('Product line quantity must be a number strictly greater than zero', 400);
      }

      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new AppError(`Product with ID '${item.productId}' not found`, 404);
      }

      validatedItems.push({
        productId: product.id,
        demandQty: item.demandQty,
        uom: item.uom || product.uom,
      });
    }

    // 5. Execute atomic creation inside a Prisma transaction
    return prisma.$transaction(async (tx) => {
      // Concurrency-safe atomic reference generation (e.g. "WH/IN/00001")
      const reference = await getNextOperationReference(tx, warehouse.id, warehouse.code, 'IN');

      const receipt = await tx.operation.create({
        data: {
          reference,
          type: 'RECEIPT',
          status: 'DRAFT',
          warehouseId: warehouse.id,
          destLocationId: destLocation.id,
          partnerName: data.partnerName?.trim() || null,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
          notes: data.notes?.trim() || null,
          responsibleId: assignedResponsibleId,
          items: {
            create: validatedItems.map((item) => ({
              productId: item.productId,
              demandQty: item.demandQty,
              doneQty: 0.0,
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

      return receipt;
    });
  }

  /**
   * Retrieves a paginated list of receipts with filtering.
   */
  static async getReceipts(filters: ReceiptFilterOptions = {}) {
    const { status, warehouseId, search, limit = 50, offset = 0 } = filters;

    const where: any = {
      type: 'RECEIPT',
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { reference: { contains: q, mode: 'insensitive' } },
        { partnerName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, receipts] = await Promise.all([
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

    return { total, limit, offset, receipts };
  }

  /**
   * Retrieves a single receipt by ID with all relations.
   */
  static async getReceiptById(id: string) {
    const receipt = await prisma.operation.findFirst({
      where: {
        id,
        type: 'RECEIPT',
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
            toLocation: { select: { id: true, name: true, code: true } },
            performedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!receipt) {
      throw new AppError('Receipt not found', 404);
    }

    return receipt;
  }

  /**
   * Updates receipt metadata, status, or items prior to validation.
   */
  static async updateReceipt(id: string, data: UpdateReceiptInput) {
    const existing = await prisma.operation.findFirst({
      where: { id, type: 'RECEIPT' },
      include: { items: true },
    });

    if (!existing) {
      throw new AppError('Receipt not found', 404);
    }

    // Immutable checks
    if (existing.status === 'DONE') {
      throw new AppError('Completed receipt cannot be modified', 400);
    }
    if (existing.status === 'CANCELED') {
      throw new AppError('Canceled receipt cannot be modified', 400);
    }

    // Status transition validation
    if (data.status) {
      const targetStatus = data.status.toUpperCase();
      if (targetStatus === 'DONE') {
        throw new AppError('Receipts cannot be directly set to DONE via update. Use the validate endpoint.', 400);
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

    // Verify destination location if updating
    if (data.destLocationId && data.destLocationId !== existing.destLocationId) {
      const loc = await prisma.location.findUnique({ where: { id: data.destLocationId } });
      if (!loc) {
        throw new AppError(`Destination location with ID '${data.destLocationId}' not found`, 404);
      }
      if (loc.warehouseId !== existing.warehouseId) {
        throw new AppError('Destination location does not belong to the selected warehouse', 400);
      }
    }

    // Verify responsible user if updating
    if (data.responsibleId) {
      const user = await prisma.user.findUnique({ where: { id: data.responsibleId } });
      if (!user) {
        throw new AppError(`Responsible user with ID '${data.responsibleId}' not found`, 404);
      }
    }

    // Update inside transaction (especially if items are modified)
    return prisma.$transaction(async (tx) => {
      // If updating items
      if (data.items) {
        if (existing.status !== 'DRAFT') {
          throw new AppError('Product line items can only be modified when receipt is in DRAFT status', 400);
        }
        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new AppError('At least one product line item is required', 400);
        }

        // Validate all new items
        const newItems: Array<{ productId: string; demandQty: number; uom: string }> = [];
        for (const item of data.items) {
          if (typeof item.demandQty !== 'number' || item.demandQty <= 0) {
            throw new AppError('Product line quantity must be strictly greater than zero', 400);
          }
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) {
            throw new AppError(`Product with ID '${item.productId}' not found`, 404);
          }
          newItems.push({
            productId: product.id,
            demandQty: item.demandQty,
            uom: item.uom || product.uom,
          });
        }

        // Replace existing items
        await tx.operationItem.deleteMany({ where: { operationId: id } });
        await tx.operationItem.createMany({
          data: newItems.map((item) => ({
            operationId: id,
            productId: item.productId,
            demandQty: item.demandQty,
            doneQty: 0.0,
            uom: item.uom,
          })),
        });
      }

      // Update operation fields
      const updated = await tx.operation.update({
        where: { id },
        data: {
          status: data.status ? data.status.toUpperCase() : undefined,
          partnerName: data.partnerName !== undefined ? data.partnerName.trim() || null : undefined,
          destLocationId: data.destLocationId,
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

      return updated;
    });
  }

  /**
   * Validates a receipt in READY status, atomically updating StockQuants,
   * creating immutable StockMove ledger records, and transitioning status to DONE.
   */
  static async validateReceipt(id: string, currentUserId?: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock receipt row with FOR UPDATE to prevent race conditions or double validation
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string; type: string }>>`
        SELECT id, status, type FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new AppError('Receipt not found', 404);
      }

      const receiptMeta = lockedRows[0];

      if (receiptMeta.type !== 'RECEIPT') {
        throw new AppError('Operation is not a receipt', 400);
      }

      if (receiptMeta.status === 'DONE') {
        throw new AppError('Receipt has already been validated and completed', 400);
      }

      if (receiptMeta.status === 'CANCELED') {
        throw new AppError('Cannot validate a canceled receipt', 400);
      }

      if (receiptMeta.status !== 'READY') {
        throw new AppError(`Receipt must be in READY state before validation (current status: ${receiptMeta.status})`, 400);
      }

      // 2. Fetch full receipt details within transaction
      const receipt = await tx.operation.findUnique({
        where: { id },
        include: {
          items: {
            include: { product: true },
          },
          destLocation: true,
          warehouse: true,
        },
      });

      if (!receipt || !receipt.destLocationId) {
        throw new AppError('Receipt missing valid destination location', 400);
      }

      if (!receipt.items || receipt.items.length === 0) {
        throw new AppError('Cannot validate receipt with no product items', 400);
      }

      const destLocationId = receipt.destLocationId;
      const performedById = currentUserId || receipt.responsibleId || null;

      // 3. Process every product line item
      for (const item of receipt.items) {
        if (item.demandQty <= 0) {
          throw new AppError(`Invalid demand quantity for product '${item.product.name}'`, 400);
        }

        // Record incoming stock: updates/creates StockQuant and creates StockMove
        await StockService.recordIncomingStock(tx, {
          productId: item.productId,
          destLocationId,
          quantity: item.demandQty,
          uom: item.uom || item.product.uom,
          operationId: receipt.id,
          reference: receipt.reference,
          performedById,
        });

        // Set doneQty = demandQty
        await tx.operationItem.update({
          where: { id: item.id },
          data: { doneQty: item.demandQty },
        });
      }

      // 4. Mark receipt status as DONE with completedDate timestamp
      const completedReceipt = await tx.operation.update({
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
              toLocation: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });

      return completedReceipt;
    });
  }

  /**
   * Cancels a receipt in DRAFT or READY status without modifying stock.
   */
  static async cancelReceipt(id: string) {
    const existing = await prisma.operation.findFirst({
      where: { id, type: 'RECEIPT' },
    });

    if (!existing) {
      throw new AppError('Receipt not found', 404);
    }

    if (existing.status === 'DONE') {
      throw new AppError('Cannot cancel a completed receipt', 400);
    }

    if (existing.status === 'CANCELED') {
      throw new AppError('Receipt is already canceled', 400);
    }

    const updated = await prisma.operation.update({
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

    return updated;
  }
}
