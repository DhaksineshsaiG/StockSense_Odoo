import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/errors';

export interface IncomingStockParams {
  productId: string;
  destLocationId: string;
  quantity: number;
  uom: string;
  operationId: string;
  reference: string;
  performedById?: string | null;
}

export interface OutgoingStockParams {
  productId: string;
  sourceLocationId: string;
  quantity: number;
  uom: string;
  operationId: string;
  reference: string;
  wasReserved?: boolean;
  performedById?: string | null;
}

export interface TransferStockParams {
  productId: string;
  sourceLocationId: string;
  destLocationId: string;
  quantity: number;
  uom: string;
  operationId: string;
  reference: string;
  performedById?: string | null;
}

export interface AdjustmentStockParams {
  productId: string;
  locationId: string;
  physicalQuantity: number;
  uom: string;
  operationId: string;
  reference: string;
  performedById?: string | null;
}

/**
 * Isolated stock service handling inventory quants, reservations, and ledger (StockMove) mutations.
 * Designed to be reusable across Receipts, Deliveries, Transfers, and Adjustments.
 */
export class StockService {
  /**
   * Records an incoming stock mutation inside an existing transaction (Receipts).
   * - Upserts the StockQuant for (productId, destLocationId), atomically incrementing on-hand quantity.
   * - Keeps reservedQuantity untouched, preserving: freeToUse = quantity - reservedQuantity.
   * - Inserts an immutable StockMove ledger record.
   */
  static async recordIncomingStock(
    tx: Prisma.TransactionClient,
    params: IncomingStockParams
  ) {
    const { productId, destLocationId, quantity, uom, operationId, reference, performedById } = params;

    if (quantity <= 0) {
      throw new AppError('Incoming stock quantity must be strictly greater than zero', 400);
    }

    // 1. Atomically update or insert the StockQuant record in PostgreSQL
    const quant = await tx.stockQuant.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId: destLocationId,
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        productId,
        locationId: destLocationId,
        quantity,
        reservedQuantity: 0.0,
      },
    });

    // 2. Insert immutable StockMove ledger record
    const move = await tx.stockMove.create({
      data: {
        reference,
        operationId,
        productId,
        fromLocationId: null, // Incoming from vendor / external
        toLocationId: destLocationId,
        quantity,
        uom,
        type: 'RECEIPT',
        performedById: performedById || null,
        timestamp: new Date(),
      },
    });

    return { quant, move };
  }

  /**
   * Records an outgoing stock mutation inside an existing transaction (Deliveries).
   * - Acquires a row-level lock (FOR UPDATE) on the StockQuant.
   * - Verifies on-hand stock is sufficient (never allowing stock < 0).
   * - Decrements on-hand quantity and adjusts reservedQuantity if previously reserved.
   * - Inserts an immutable StockMove ledger record.
   */
  static async recordOutgoingStock(
    tx: Prisma.TransactionClient,
    params: OutgoingStockParams
  ) {
    const { productId, sourceLocationId, quantity, uom, operationId, reference, wasReserved, performedById } = params;

    if (quantity <= 0) {
      throw new AppError('Outgoing stock quantity must be strictly greater than zero', 400);
    }

    // 1. Lock the StockQuant row with FOR UPDATE in PostgreSQL
    const rows = await tx.$queryRaw<Array<{ id: string; quantity: number; reservedQuantity: number }>>`
      SELECT id, quantity, "reservedQuantity" FROM "StockQuant"
      WHERE "productId" = ${productId} AND "locationId" = ${sourceLocationId}
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      throw new AppError('No stock quant exists at source location for this product', 400);
    }

    const currentQuant = rows[0];

    // Strict non-negative check
    if (currentQuant.quantity < quantity) {
      throw new AppError(
        `Insufficient stock for product. Available on-hand: ${currentQuant.quantity}, requested: ${quantity}`,
        400
      );
    }

    const newQuantity = currentQuant.quantity - quantity;
    const newReserved = wasReserved
      ? Math.max(0, currentQuant.reservedQuantity - quantity)
      : Math.min(newQuantity, currentQuant.reservedQuantity);

    // 2. Update StockQuant
    const quant = await tx.stockQuant.update({
      where: {
        productId_locationId: {
          productId,
          locationId: sourceLocationId,
        },
      },
      data: {
        quantity: newQuantity,
        reservedQuantity: newReserved,
      },
    });

    // 3. Insert immutable StockMove ledger record
    const move = await tx.stockMove.create({
      data: {
        reference,
        operationId,
        productId,
        fromLocationId: sourceLocationId,
        toLocationId: null, // Outgoing to customer / external
        quantity,
        uom,
        type: 'DELIVERY',
        performedById: performedById || null,
        timestamp: new Date(),
      },
    });

    return { quant, move };
  }

  /**
   * Records an internal stock transfer mutation inside an existing transaction.
   * - Locks the source StockQuant with FOR UPDATE.
   * - Verifies free-to-use stock (onHand - reservedQuantity) is sufficient.
   * - Decrements source on-hand quantity (preserving reservedQuantity for pending deliveries).
   * - Atomically upserts destination StockQuant, incrementing on-hand quantity.
   * - Inserts an immutable StockMove ledger record with type INTERNAL_TRANSFER.
   * - Guaranteed total inventory invariant: net stock change is 0.
   */
  static async recordInternalTransfer(
    tx: Prisma.TransactionClient,
    params: TransferStockParams
  ) {
    const { productId, sourceLocationId, destLocationId, quantity, uom, operationId, reference, performedById } = params;

    if (quantity <= 0) {
      throw new AppError('Transfer stock quantity must be strictly greater than zero', 400);
    }
    if (sourceLocationId === destLocationId) {
      throw new AppError('Source and destination locations cannot be the same', 400);
    }

    // 1. Lock source StockQuant row
    const srcRows = await tx.$queryRaw<Array<{ id: string; quantity: number; reservedQuantity: number }>>`
      SELECT id, quantity, "reservedQuantity" FROM "StockQuant"
      WHERE "productId" = ${productId} AND "locationId" = ${sourceLocationId}
      FOR UPDATE
    `;

    if (!srcRows || srcRows.length === 0) {
      throw new AppError('No stock quant exists at source location for this product', 400);
    }

    const srcQuant = srcRows[0];
    const freeToUse = srcQuant.quantity - srcQuant.reservedQuantity;

    if (freeToUse < quantity) {
      throw new AppError(
        `Insufficient free-to-use stock at source location. Available: ${freeToUse}, requested: ${quantity}`,
        400
      );
    }

    // 2. Decrement source location stock (preserving existing reservedQuantity)
    const updatedSrcQuant = await tx.stockQuant.update({
      where: {
        productId_locationId: {
          productId,
          locationId: sourceLocationId,
        },
      },
      data: {
        quantity: srcQuant.quantity - quantity,
      },
    });

    // 3. Atomically increment or create destination location stock
    const updatedDestQuant = await tx.stockQuant.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId: destLocationId,
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
      create: {
        productId,
        locationId: destLocationId,
        quantity,
        reservedQuantity: 0.0,
      },
    });

    // 4. Create immutable StockMove ledger record
    const move = await tx.stockMove.create({
      data: {
        reference,
        operationId,
        productId,
        fromLocationId: sourceLocationId,
        toLocationId: destLocationId,
        quantity,
        uom,
        type: 'INTERNAL_TRANSFER',
        performedById: performedById || null,
        timestamp: new Date(),
      },
    });

    return { sourceQuant: updatedSrcQuant, destQuant: updatedDestQuant, move };
  }

  /**
   * Records an inventory adjustment reconciliation inside an existing transaction.
   * - Locks the StockQuant row with FOR UPDATE in PostgreSQL.
   * - Reads current on-hand quantity and reservedQuantity.
   * - Enforces reserved stock protection: physicalQuantity >= reservedQuantity.
   * - Sets StockQuant.quantity = physicalQuantity.
   * - If physical > current: creates incoming adjustment StockMove (qty = diff, toLocation = locationId).
   * - If physical < current: creates outgoing adjustment StockMove (qty = |diff|, fromLocation = locationId).
   * - If physical == current: no StockMove is created.
   * - Returns { quant, move, currentRecorded, difference }.
   */
  static async recordAdjustment(
    tx: Prisma.TransactionClient,
    params: AdjustmentStockParams
  ) {
    const { productId, locationId, physicalQuantity, uom, operationId, reference, performedById } = params;

    if (physicalQuantity < 0) {
      throw new AppError('Physical quantity cannot be negative', 400);
    }

    // 1. Lock StockQuant row in PostgreSQL
    const rows = await tx.$queryRaw<Array<{ id: string; quantity: number; reservedQuantity: number }>>`
      SELECT id, quantity, "reservedQuantity" FROM "StockQuant"
      WHERE "productId" = ${productId} AND "locationId" = ${locationId}
      FOR UPDATE
    `;

    const currentRecorded = rows.length > 0 ? rows[0].quantity : 0.0;
    const reservedQuantity = rows.length > 0 ? rows[0].reservedQuantity : 0.0;

    // 2. Strict reserved stock protection: cannot adjust on-hand below reserved stock
    if (physicalQuantity < reservedQuantity) {
      throw new AppError(
        `Cannot adjust stock below currently reserved quantity (${reservedQuantity}). Physical count is ${physicalQuantity}.`,
        400
      );
    }

    const difference = physicalQuantity - currentRecorded;

    // 3. Update or create StockQuant
    const quant = await tx.stockQuant.upsert({
      where: {
        productId_locationId: { productId, locationId },
      },
      update: {
        quantity: physicalQuantity,
      },
      create: {
        productId,
        locationId,
        quantity: physicalQuantity,
        reservedQuantity: 0.0,
      },
    });

    // 4. Create immutable StockMove only if quantity changed
    let move = null;
    if (difference > 0) {
      // Physical count > Recorded: incoming adjustment
      move = await tx.stockMove.create({
        data: {
          reference,
          operationId,
          productId,
          fromLocationId: null, // Adjustment source is outside standard locations
          toLocationId: locationId,
          quantity: difference,
          uom,
          type: 'ADJUSTMENT',
          performedById: performedById || null,
          timestamp: new Date(),
        },
      });
    } else if (difference < 0) {
      // Physical count < Recorded: outgoing adjustment (loss/shrinkage)
      move = await tx.stockMove.create({
        data: {
          reference,
          operationId,
          productId,
          fromLocationId: locationId,
          toLocationId: null, // Outgoing correction
          quantity: Math.abs(difference),
          uom,
          type: 'ADJUSTMENT',
          performedById: performedById || null,
          timestamp: new Date(),
        },
      });
    }

    return { quant, move, currentRecorded, difference };
  }

  /**
   * Safely reserves stock on a StockQuant inside a transaction.
   * Verifies free-to-use stock (onHand - reservedQuantity) is sufficient.
   */
  static async reserveStock(
    tx: Prisma.TransactionClient,
    productId: string,
    locationId: string,
    quantity: number
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string; quantity: number; reservedQuantity: number }>>`
      SELECT id, quantity, "reservedQuantity" FROM "StockQuant"
      WHERE "productId" = ${productId} AND "locationId" = ${locationId}
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      throw new AppError('Cannot reserve stock: no stock quant exists at specified location', 400);
    }

    const current = rows[0];
    const freeToUse = current.quantity - current.reservedQuantity;

    if (freeToUse < quantity) {
      throw new AppError(
        `Cannot reserve stock: only ${freeToUse} free-to-use units available, requested ${quantity}`,
        400
      );
    }

    return tx.stockQuant.update({
      where: {
        productId_locationId: { productId, locationId },
      },
      data: {
        reservedQuantity: current.reservedQuantity + quantity,
      },
    });
  }

  /**
   * Safely releases a stock reservation inside a transaction.
   */
  static async releaseReservation(
    tx: Prisma.TransactionClient,
    productId: string,
    locationId: string,
    quantity: number
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string; quantity: number; reservedQuantity: number }>>`
      SELECT id, quantity, "reservedQuantity" FROM "StockQuant"
      WHERE "productId" = ${productId} AND "locationId" = ${locationId}
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      return null;
    }

    const current = rows[0];
    const newReserved = Math.max(0, current.reservedQuantity - quantity);

    return tx.stockQuant.update({
      where: {
        productId_locationId: { productId, locationId },
      },
      data: {
        reservedQuantity: newReserved,
      },
    });
  }

  /**
   * Inspects free-to-use availability for a specific product and location.
   */
  static async checkLineAvailability(
    productId: string,
    locationId: string,
    requestedQty: number,
    alreadyReservedByThisOperation = 0
  ) {
    const quant = await prisma.stockQuant.findUnique({
      where: {
        productId_locationId: { productId, locationId },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
      },
    });

    const onHand = quant ? quant.quantity : 0.0;
    const currentReserved = quant ? quant.reservedQuantity : 0.0;
    // Effective reserved excluding what this operation might already hold
    const otherReserved = Math.max(0, currentReserved - alreadyReservedByThisOperation);
    const freeToUse = Math.max(0, onHand - otherReserved);
    const isAvailable = freeToUse >= requestedQty;
    const shortage = isAvailable ? 0 : requestedQty - freeToUse;

    return {
      productId,
      locationId,
      product: quant?.product || null,
      requestedQty,
      onHand,
      reservedQuantity: currentReserved,
      freeToUse,
      isAvailable,
      shortage,
    };
  }

  /**
   * Retrieves a specific StockQuant by product and location.
   */
  static async getQuant(productId: string, locationId: string) {
    return prisma.stockQuant.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      include: {
        product: true,
        location: true,
      },
    });
  }

  /**
   * Retrieves all stock quants across locations for a product.
   */
  static async getProductStock(productId: string) {
    return prisma.stockQuant.findMany({
      where: { productId },
      include: {
        location: true,
      },
    });
  }
}
