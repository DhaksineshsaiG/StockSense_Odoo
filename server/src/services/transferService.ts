import prisma from '../config/db';
import { AppError } from '../utils/errors';
import { getNextOperationReference } from './sequenceService';
import { StockService } from './stockService';

export interface CreateTransferItemInput {
  productId: string;
  demandQty: number;
  uom?: string;
}

export interface CreateTransferInput {
  warehouseId: string;
  sourceLocationId: string;
  destLocationId: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  items: CreateTransferItemInput[];
}

export interface UpdateTransferInput {
  sourceLocationId?: string;
  destLocationId?: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  status?: string;
  items?: CreateTransferItemInput[];
}

export interface TransferFilterOptions {
  status?: string;
  warehouseId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class TransferService {
  /**
   * Creates a new internal transfer in DRAFT status with an atomic reference (e.g. WH/INT/00001).
   */
  static async createTransfer(data: CreateTransferInput, currentUserId?: string) {
    if (!data.warehouseId) {
      throw new AppError('Warehouse ID is required', 400);
    }
    if (!data.sourceLocationId) {
      throw new AppError('Source location ID is required', 400);
    }
    if (!data.destLocationId) {
      throw new AppError('Destination location ID is required', 400);
    }
    if (data.sourceLocationId === data.destLocationId) {
      throw new AppError('Source and destination locations cannot be the same', 400);
    }
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new AppError('At least one product line item is required for an internal transfer', 400);
    }

    // 1. Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new AppError(`Warehouse with ID '${data.warehouseId}' not found`, 404);
    }

    // 2. Verify source location exists and belongs to warehouse
    const sourceLocation = await prisma.location.findUnique({
      where: { id: data.sourceLocationId },
    });
    if (!sourceLocation) {
      throw new AppError(`Source location with ID '${data.sourceLocationId}' not found`, 404);
    }
    if (sourceLocation.warehouseId !== data.warehouseId) {
      throw new AppError('Source location does not belong to the selected warehouse', 400);
    }

    // 3. Verify destination location exists and belongs to warehouse
    const destLocation = await prisma.location.findUnique({
      where: { id: data.destLocationId },
    });
    if (!destLocation) {
      throw new AppError(`Destination location with ID '${data.destLocationId}' not found`, 404);
    }
    if (destLocation.warehouseId !== data.warehouseId) {
      throw new AppError('Destination location does not belong to the selected warehouse', 400);
    }

    // 4. Verify responsible user if provided
    let assignedResponsibleId: string | null = data.responsibleId || currentUserId || null;
    if (data.responsibleId) {
      const user = await prisma.user.findUnique({ where: { id: data.responsibleId } });
      if (!user) {
        throw new AppError(`Responsible user with ID '${data.responsibleId}' not found`, 404);
      }
      assignedResponsibleId = user.id;
    }

    // 5. Validate all items
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

    // 6. Execute atomic creation inside a Prisma transaction
    return prisma.$transaction(async (tx) => {
      // Concurrency-safe atomic reference generation (e.g. "WH/INT/00001")
      const reference = await getNextOperationReference(tx, warehouse.id, warehouse.code, 'INT');

      const transfer = await tx.operation.create({
        data: {
          reference,
          type: 'INTERNAL_TRANSFER',
          status: 'DRAFT',
          warehouseId: warehouse.id,
          sourceLocationId: sourceLocation.id,
          destLocationId: destLocation.id,
          partnerName: null,
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
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
          destLocation: { select: { id: true, name: true, code: true, type: true } },
          responsible: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
        },
      });

      return transfer;
    });
  }

  /**
   * Retrieves a paginated list of internal transfers with filtering.
   */
  static async getTransfers(filters: TransferFilterOptions = {}) {
    const { status, warehouseId, search, limit = 50, offset = 0 } = filters;

    const where: any = {
      type: 'INTERNAL_TRANSFER',
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

    const [total, transfers] = await Promise.all([
      prisma.operation.count({ where }),
      prisma.operation.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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

    return { total, limit, offset, transfers };
  }

  /**
   * Retrieves a single internal transfer by ID with items, locations, and stock moves.
   */
  static async getTransferById(id: string) {
    const transfer = await prisma.operation.findFirst({
      where: {
        id,
        type: 'INTERNAL_TRANSFER',
      },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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

    if (!transfer) {
      throw new AppError('Internal transfer not found', 404);
    }

    return transfer;
  }

  /**
   * Updates transfer metadata, status, or items prior to validation.
   */
  static async updateTransfer(id: string, data: UpdateTransferInput) {
    const existing = await prisma.operation.findFirst({
      where: { id, type: 'INTERNAL_TRANSFER' },
      include: { items: true },
    });

    if (!existing) {
      throw new AppError('Internal transfer not found', 404);
    }

    if (existing.status === 'DONE') {
      throw new AppError('Completed transfer cannot be modified', 400);
    }
    if (existing.status === 'CANCELED') {
      throw new AppError('Canceled transfer cannot be modified', 400);
    }

    // Status transition validation
    if (data.status) {
      const targetStatus = data.status.toUpperCase();
      if (targetStatus === 'DONE') {
        throw new AppError('Transfers cannot be directly set to DONE via update. Use the validate endpoint.', 400);
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

    // Location validations
    const targetSourceLoc = data.sourceLocationId || existing.sourceLocationId;
    const targetDestLoc = data.destLocationId || existing.destLocationId;

    if (targetSourceLoc === targetDestLoc) {
      throw new AppError('Source and destination locations cannot be the same', 400);
    }

    if (data.sourceLocationId && data.sourceLocationId !== existing.sourceLocationId) {
      const loc = await prisma.location.findUnique({ where: { id: data.sourceLocationId } });
      if (!loc) throw new AppError(`Source location with ID '${data.sourceLocationId}' not found`, 404);
      if (loc.warehouseId !== existing.warehouseId) {
        throw new AppError('Source location does not belong to the selected warehouse', 400);
      }
    }

    if (data.destLocationId && data.destLocationId !== existing.destLocationId) {
      const loc = await prisma.location.findUnique({ where: { id: data.destLocationId } });
      if (!loc) throw new AppError(`Destination location with ID '${data.destLocationId}' not found`, 404);
      if (loc.warehouseId !== existing.warehouseId) {
        throw new AppError('Destination location does not belong to the selected warehouse', 400);
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
          throw new AppError('Product line items can only be modified when transfer is in DRAFT status', 400);
        }
        if (!Array.isArray(data.items) || data.items.length === 0) {
          throw new AppError('At least one product line item is required', 400);
        }

        const newItems: Array<{ productId: string; demandQty: number; uom: string }> = [];
        for (const item of data.items) {
          if (typeof item.demandQty !== 'number' || item.demandQty <= 0) {
            throw new AppError('Product line quantity must be strictly greater than zero', 400);
          }
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new AppError(`Product with ID '${item.productId}' not found`, 404);
          newItems.push({
            productId: product.id,
            demandQty: item.demandQty,
            uom: item.uom || product.uom,
          });
        }

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

      const updated = await tx.operation.update({
        where: { id },
        data: {
          status: data.status ? data.status.toUpperCase() : undefined,
          sourceLocationId: data.sourceLocationId,
          destLocationId: data.destLocationId,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
          notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
          responsibleId: data.responsibleId,
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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
   * Validates an internal transfer inside ONE atomic PostgreSQL transaction:
   * 1. Locks the Operation row with FOR UPDATE.
   * 2. Verifies state is valid (READY or DRAFT).
   * 3. For each line, locks source StockQuant and verifies freeToUse >= transfer quantity.
   * 4. Decrements source on-hand stock and increments destination on-hand stock (net stock change: 0).
   * 5. Creates immutable StockMove record with type INTERNAL_TRANSFER.
   * 6. Marks Operation as DONE.
   */
  static async validateTransfer(id: string, currentUserId?: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock transfer row with FOR UPDATE
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string; type: string }>>`
        SELECT id, status, type FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new AppError('Internal transfer not found', 404);
      }

      const transferMeta = lockedRows[0];

      if (transferMeta.type !== 'INTERNAL_TRANSFER') {
        throw new AppError('Operation is not an internal transfer', 400);
      }

      if (transferMeta.status === 'DONE') {
        throw new AppError('Internal transfer has already been validated and completed', 400);
      }

      if (transferMeta.status === 'CANCELED') {
        throw new AppError('Cannot validate a canceled internal transfer', 400);
      }

      if (!['DRAFT', 'READY'].includes(transferMeta.status)) {
        throw new AppError(`Transfer cannot be validated in its current status: ${transferMeta.status}`, 400);
      }

      // 2. Fetch full transfer details
      const transfer = await tx.operation.findUnique({
        where: { id },
        include: {
          items: {
            include: { product: true },
          },
          sourceLocation: true,
          destLocation: true,
          warehouse: true,
        },
      });

      if (!transfer || !transfer.sourceLocationId || !transfer.destLocationId) {
        throw new AppError('Transfer missing source or destination location', 400);
      }

      if (transfer.sourceLocationId === transfer.destLocationId) {
        throw new AppError('Source and destination locations cannot be the same', 400);
      }

      if (!transfer.items || transfer.items.length === 0) {
        throw new AppError('Cannot validate transfer with no product items', 400);
      }

      const sourceLocationId = transfer.sourceLocationId;
      const destLocationId = transfer.destLocationId;
      const performedById = currentUserId || transfer.responsibleId || null;

      // 3. Process every product line atomically
      for (const item of transfer.items) {
        if (item.demandQty <= 0) {
          throw new AppError(`Invalid demand quantity for product '${item.product.name}'`, 400);
        }

        // Record internal stock transfer (decrements source, increments dest, creates move)
        await StockService.recordInternalTransfer(tx, {
          productId: item.productId,
          sourceLocationId,
          destLocationId,
          quantity: item.demandQty,
          uom: item.uom || item.product.uom,
          operationId: transfer.id,
          reference: transfer.reference,
          performedById,
        });

        // Set doneQty = demandQty
        await tx.operationItem.update({
          where: { id: item.id },
          data: { doneQty: item.demandQty },
        });
      }

      // 4. Mark transfer as DONE
      const completedTransfer = await tx.operation.update({
        where: { id },
        data: {
          status: 'DONE',
          completedDate: new Date(),
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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

      return completedTransfer;
    });
  }

  /**
   * Cancels an internal transfer in DRAFT or READY status without modifying stock.
   */
  static async cancelTransfer(id: string) {
    return prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string; type: string }>>`
        SELECT id, status, type FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new AppError('Internal transfer not found', 404);
      }

      const existing = lockedRows[0];

      if (existing.type !== 'INTERNAL_TRANSFER') {
        throw new AppError('Operation is not an internal transfer', 400);
      }
      if (existing.status === 'DONE') {
        throw new AppError('Cannot cancel a completed internal transfer', 400);
      }
      if (existing.status === 'CANCELED') {
        throw new AppError('Internal transfer is already canceled', 400);
      }

      const updated = await tx.operation.update({
        where: { id },
        data: {
          status: 'CANCELED',
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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
}
