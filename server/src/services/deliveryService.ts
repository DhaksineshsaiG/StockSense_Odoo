import prisma from '../config/db';
import { AppError } from '../utils/errors';
import { getNextOperationReference } from './sequenceService';
import { StockService } from './stockService';

export interface CreateDeliveryItemInput {
  productId: string;
  demandQty: number;
  uom?: string;
}

export interface CreateDeliveryInput {
  warehouseId: string;
  sourceLocationId: string;
  partnerName?: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  items: CreateDeliveryItemInput[];
}

export interface UpdateDeliveryInput {
  partnerName?: string;
  sourceLocationId?: string;
  scheduledDate?: string | Date;
  notes?: string;
  responsibleId?: string;
  status?: string;
  items?: CreateDeliveryItemInput[];
}

export interface DeliveryFilterOptions {
  status?: string;
  warehouseId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class DeliveryService {
  /**
   * Creates a new delivery in DRAFT status with an atomic Odoo-style reference (e.g. WH/OUT/00001).
   */
  static async createDelivery(data: CreateDeliveryInput, currentUserId?: string) {
    if (!data.warehouseId) {
      throw new AppError('Warehouse ID is required', 400);
    }
    if (!data.sourceLocationId) {
      throw new AppError('Source location ID is required', 400);
    }
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new AppError('At least one product line item is required for a delivery', 400);
    }

    // 1. Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new AppError(`Warehouse with ID '${data.warehouseId}' not found`, 404);
    }

    // 2. Verify source location exists and belongs to the selected warehouse
    const sourceLocation = await prisma.location.findUnique({
      where: { id: data.sourceLocationId },
    });
    if (!sourceLocation) {
      throw new AppError(`Source location with ID '${data.sourceLocationId}' not found`, 404);
    }
    if (sourceLocation.warehouseId !== data.warehouseId) {
      throw new AppError('Source location does not belong to the selected warehouse', 400);
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

    // 4. Validate all items
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
      // Concurrency-safe atomic reference generation (e.g. "WH/OUT/00001")
      const reference = await getNextOperationReference(tx, warehouse.id, warehouse.code, 'OUT');

      const delivery = await tx.operation.create({
        data: {
          reference,
          type: 'DELIVERY',
          status: 'DRAFT',
          warehouseId: warehouse.id,
          sourceLocationId: sourceLocation.id,
          destLocationId: null, // Outgoing to customer
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
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
          responsible: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
        },
      });

      return delivery;
    });
  }

  /**
   * Retrieves a paginated list of deliveries with filtering.
   */
  static async getDeliveries(filters: DeliveryFilterOptions = {}) {
    const { status, warehouseId, search, limit = 50, offset = 0 } = filters;

    const where: any = {
      type: 'DELIVERY',
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

    const [total, deliveries] = await Promise.all([
      prisma.operation.count({ where }),
      prisma.operation.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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

    return { total, limit, offset, deliveries };
  }

  /**
   * Retrieves a single delivery by ID with items, source location, and live stock analysis.
   */
  static async getDeliveryById(id: string) {
    const delivery = await prisma.operation.findFirst({
      where: {
        id,
        type: 'DELIVERY',
      },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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
            performedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!delivery) {
      throw new AppError('Delivery not found', 404);
    }

    // Attach live line-by-line stock availability report
    let linesAvailability: any[] = [];
    if (delivery.sourceLocationId && delivery.items.length > 0) {
      const isAlreadyReady = delivery.status === 'READY';
      linesAvailability = await Promise.all(
        delivery.items.map(async (item) => {
          const alreadyReserved = isAlreadyReady ? item.demandQty : 0;
          return StockService.checkLineAvailability(
            item.productId,
            delivery.sourceLocationId!,
            item.demandQty,
            alreadyReserved
          );
        })
      );
    }

    return {
      ...delivery,
      availability: {
        isFullyAvailable: linesAvailability.every((l) => l.isAvailable),
        lines: linesAvailability,
      },
    };
  }

  /**
   * Checks inventory availability for all lines of a delivery.
   * If all lines have sufficient free-to-use stock (onHand - reservedQuantity):
   *   - Reserves stock on the StockQuant records.
   *   - Transitions status to READY.
   * If any line is insufficient:
   *   - Releases any previously held reservation if it was previously READY.
   *   - Transitions status to WAITING.
   */
  static async checkAvailability(id: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock delivery row for update
      const rows = await tx.$queryRaw<Array<{ id: string; status: string; type: string; sourceLocationId: string | null }>>`
        SELECT id, status, type, "sourceLocationId" FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!rows || rows.length === 0) {
        throw new AppError('Delivery not found', 404);
      }

      const deliveryMeta = rows[0];

      if (deliveryMeta.type !== 'DELIVERY') {
        throw new AppError('Operation is not a delivery', 400);
      }

      if (deliveryMeta.status === 'DONE') {
        throw new AppError('Cannot check availability on a completed delivery', 400);
      }

      if (deliveryMeta.status === 'CANCELED') {
        throw new AppError('Cannot check availability on a canceled delivery', 400);
      }

      const delivery = await tx.operation.findUnique({
        where: { id },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!delivery || !delivery.sourceLocationId) {
        throw new AppError('Delivery missing source location', 400);
      }

      if (!delivery.items || delivery.items.length === 0) {
        throw new AppError('Delivery has no product line items', 400);
      }

      const sourceLocationId = delivery.sourceLocationId;
      const wasAlreadyReady = delivery.status === 'READY';

      // 2. Lock and evaluate each item's StockQuant
      const lineReports: Array<{
        productId: string;
        productName: string;
        sku: string;
        demandQty: number;
        onHand: number;
        reservedQuantity: number;
        freeToUse: number;
        isAvailable: boolean;
        shortage: number;
      }> = [];

      let allAvailable = true;

      for (const item of delivery.items) {
        // Lock the StockQuant row for this line
        const quantRows = await tx.$queryRaw<Array<{ id: string; quantity: number; reservedQuantity: number }>>`
          SELECT id, quantity, "reservedQuantity" FROM "StockQuant"
          WHERE "productId" = ${item.productId} AND "locationId" = ${sourceLocationId}
          FOR UPDATE
        `;

        const onHand = quantRows.length > 0 ? quantRows[0].quantity : 0.0;
        const currentReserved = quantRows.length > 0 ? quantRows[0].reservedQuantity : 0.0;

        // If this delivery was already READY, it currently holds item.demandQty in reservedQuantity.
        // We exclude its own reservation so checking again doesn't report a false shortage.
        const alreadyHeldByThisDelivery = wasAlreadyReady ? item.demandQty : 0.0;
        const otherReservations = Math.max(0, currentReserved - alreadyHeldByThisDelivery);
        const freeToUse = Math.max(0, onHand - otherReservations);

        const isAvailable = freeToUse >= item.demandQty;
        const shortage = isAvailable ? 0 : item.demandQty - freeToUse;

        if (!isAvailable) {
          allAvailable = false;
        }

        lineReports.push({
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          demandQty: item.demandQty,
          onHand,
          reservedQuantity: currentReserved,
          freeToUse,
          isAvailable,
          shortage,
        });
      }

      // 3. Apply reservations and state transition
      let newStatus: string;

      if (allAvailable) {
        newStatus = 'READY';

        // If it was NOT already READY, acquire reservation for each line
        if (!wasAlreadyReady) {
          for (const item of delivery.items) {
            await tx.stockQuant.update({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: sourceLocationId,
                },
              },
              data: {
                reservedQuantity: { increment: item.demandQty },
              },
            });
          }
        }
      } else {
        newStatus = 'WAITING';

        // If it WAS previously READY but is now insufficient, release prior reservation
        if (wasAlreadyReady) {
          for (const item of delivery.items) {
            const quant = await tx.stockQuant.findUnique({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: sourceLocationId,
                },
              },
            });
            if (quant && quant.reservedQuantity > 0) {
              const newReserved = Math.max(0, quant.reservedQuantity - item.demandQty);
              await tx.stockQuant.update({
                where: {
                  productId_locationId: {
                    productId: item.productId,
                    locationId: sourceLocationId,
                  },
                },
                data: { reservedQuantity: newReserved },
              });
            }
          }
        }
      }

      // 4. Update delivery status
      const updatedDelivery = await tx.operation.update({
        where: { id },
        data: { status: newStatus },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
          responsible: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, uom: true } },
            },
          },
        },
      });

      return {
        status: newStatus,
        isFullyAvailable: allAvailable,
        lines: lineReports,
        delivery: updatedDelivery,
      };
    });
  }

  /**
   * Updates delivery metadata, status, or items prior to validation.
   * If a READY delivery is edited, releases previous reservations safely.
   */
  static async updateDelivery(id: string, data: UpdateDeliveryInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock delivery row
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string; type: string; sourceLocationId: string | null }>>`
        SELECT id, status, type, "sourceLocationId" FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new AppError('Delivery not found', 404);
      }

      const existing = lockedRows[0];

      if (existing.type !== 'DELIVERY') {
        throw new AppError('Operation is not a delivery', 400);
      }
      if (existing.status === 'DONE') {
        throw new AppError('Completed delivery cannot be modified', 400);
      }
      if (existing.status === 'CANCELED') {
        throw new AppError('Canceled delivery cannot be modified', 400);
      }

      const fullExisting = await tx.operation.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!fullExisting) throw new AppError('Delivery not found', 404);

      const wasReady = fullExisting.status === 'READY';
      let shouldReleaseReservation = false;

      // Status transition validation
      if (data.status) {
        const targetStatus = data.status.toUpperCase();
        if (targetStatus === 'DONE') {
          throw new AppError('Deliveries cannot be directly set to DONE via update. Use the validate endpoint.', 400);
        }

        if (fullExisting.status === 'DRAFT') {
          if (!['WAITING', 'READY', 'CANCELED', 'DRAFT'].includes(targetStatus)) {
            throw new AppError(`Invalid status transition from DRAFT to ${targetStatus}`, 400);
          }
        } else if (fullExisting.status === 'WAITING') {
          if (!['DRAFT', 'READY', 'CANCELED', 'WAITING'].includes(targetStatus)) {
            throw new AppError(`Invalid status transition from WAITING to ${targetStatus}`, 400);
          }
        } else if (fullExisting.status === 'READY') {
          if (!['DRAFT', 'WAITING', 'CANCELED', 'READY'].includes(targetStatus)) {
            throw new AppError(`Invalid status transition from READY to ${targetStatus}`, 400);
          }
          if (targetStatus !== 'READY') {
            shouldReleaseReservation = true;
          }
        }
      }

      // If updating sourceLocationId or items, release reservation and revert to DRAFT
      if (data.sourceLocationId && data.sourceLocationId !== fullExisting.sourceLocationId) {
        const loc = await tx.location.findUnique({ where: { id: data.sourceLocationId } });
        if (!loc) throw new AppError(`Source location with ID '${data.sourceLocationId}' not found`, 404);
        if (loc.warehouseId !== fullExisting.warehouseId) {
          throw new AppError('Source location does not belong to the selected warehouse', 400);
        }
        if (wasReady) {
          shouldReleaseReservation = true;
          data.status = 'DRAFT';
        }
      }

      if (data.items) {
        if (fullExisting.status === 'READY') {
          shouldReleaseReservation = true;
          data.status = 'DRAFT';
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
          if (!product) throw new AppError(`Product with ID '${item.productId}' not found`, 404);
          newItems.push({
            productId: product.id,
            demandQty: item.demandQty,
            uom: item.uom || product.uom,
          });
        }

        // Replace items
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

      // Release reservation if required
      if (shouldReleaseReservation && fullExisting.sourceLocationId) {
        for (const item of fullExisting.items) {
          const quant = await tx.stockQuant.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: fullExisting.sourceLocationId,
              },
            },
          });
          if (quant && quant.reservedQuantity > 0) {
            const newReserved = Math.max(0, quant.reservedQuantity - item.demandQty);
            await tx.stockQuant.update({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: fullExisting.sourceLocationId,
                },
              },
              data: { reservedQuantity: newReserved },
            });
          }
        }
      }

      // Update operation fields
      const updated = await tx.operation.update({
        where: { id },
        data: {
          status: data.status ? data.status.toUpperCase() : undefined,
          partnerName: data.partnerName !== undefined ? data.partnerName.trim() || null : undefined,
          sourceLocationId: data.sourceLocationId,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
          notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
          responsibleId: data.responsibleId,
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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
   * Validates a delivery in READY status:
   * - Acquires row-level lock on Operation and StockQuants.
   * - Atomically deducts on-hand stock and releases the corresponding reservation.
   * - Inserts immutable StockMove audit records with type DELIVERY.
   * - Transitions status to DONE with completedDate.
   */
  static async validateDelivery(id: string, currentUserId?: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock delivery row with FOR UPDATE
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string; type: string }>>`
        SELECT id, status, type FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new AppError('Delivery not found', 404);
      }

      const deliveryMeta = lockedRows[0];

      if (deliveryMeta.type !== 'DELIVERY') {
        throw new AppError('Operation is not a delivery', 400);
      }

      if (deliveryMeta.status === 'DONE') {
        throw new AppError('Delivery has already been validated and completed', 400);
      }

      if (deliveryMeta.status === 'CANCELED') {
        throw new AppError('Cannot validate a canceled delivery', 400);
      }

      if (deliveryMeta.status !== 'READY') {
        throw new AppError(
          `Delivery must be in READY state before validation (current status: ${deliveryMeta.status}). Please check availability first.`,
          400
        );
      }

      // 2. Fetch full delivery details
      const delivery = await tx.operation.findUnique({
        where: { id },
        include: {
          items: {
            include: { product: true },
          },
          sourceLocation: true,
          warehouse: true,
        },
      });

      if (!delivery || !delivery.sourceLocationId) {
        throw new AppError('Delivery missing valid source location', 400);
      }

      if (!delivery.items || delivery.items.length === 0) {
        throw new AppError('Cannot validate delivery with no product items', 400);
      }

      const sourceLocationId = delivery.sourceLocationId;
      const performedById = currentUserId || delivery.responsibleId || null;

      // 3. Process every product line item atomically
      for (const item of delivery.items) {
        if (item.demandQty <= 0) {
          throw new AppError(`Invalid demand quantity for product '${item.product.name}'`, 400);
        }

        // Deduct stock and release reservation
        await StockService.recordOutgoingStock(tx, {
          productId: item.productId,
          sourceLocationId,
          quantity: item.demandQty,
          uom: item.uom || item.product.uom,
          operationId: delivery.id,
          reference: delivery.reference,
          wasReserved: true, // Delivery was in READY state, so stock was reserved
          performedById,
        });

        // Set doneQty = demandQty
        await tx.operationItem.update({
          where: { id: item.id },
          data: { doneQty: item.demandQty },
        });
      }

      // 4. Mark delivery as DONE
      const completedDelivery = await tx.operation.update({
        where: { id },
        data: {
          status: 'DONE',
          completedDate: new Date(),
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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
            },
          },
        },
      });

      return completedDelivery;
    });
  }

  /**
   * Cancels a delivery in DRAFT, WAITING, or READY status.
   * If it was in READY status, releases held reservations.
   * Never modifies on-hand stock.
   */
  static async cancelDelivery(id: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock delivery row
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string; type: string; sourceLocationId: string | null }>>`
        SELECT id, status, type, "sourceLocationId" FROM "Operation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new AppError('Delivery not found', 404);
      }

      const existing = lockedRows[0];

      if (existing.type !== 'DELIVERY') {
        throw new AppError('Operation is not a delivery', 400);
      }
      if (existing.status === 'DONE') {
        throw new AppError('Cannot cancel a completed delivery', 400);
      }
      if (existing.status === 'CANCELED') {
        throw new AppError('Delivery is already canceled', 400);
      }

      // If it was READY, release reservations
      if (existing.status === 'READY' && existing.sourceLocationId) {
        const items = await tx.operationItem.findMany({ where: { operationId: id } });
        for (const item of items) {
          const quant = await tx.stockQuant.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: existing.sourceLocationId,
              },
            },
          });
          if (quant && quant.reservedQuantity > 0) {
            const newReserved = Math.max(0, quant.reservedQuantity - item.demandQty);
            await tx.stockQuant.update({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: existing.sourceLocationId,
                },
              },
              data: { reservedQuantity: newReserved },
            });
          }
        }
      }

      const updated = await tx.operation.update({
        where: { id },
        data: {
          status: 'CANCELED',
        },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
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
