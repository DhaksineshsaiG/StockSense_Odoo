import { Prisma } from '@prisma/client';

/**
 * Concurrency-safe, atomic sequence number generator using PostgreSQL row-level locking (FOR UPDATE).
 * Generates formatted reference numbers adhering to the Odoo standard: e.g. "WH/IN/00001".
 *
 * @param tx - Prisma TransactionClient to ensure atomicity with operation creation
 * @param warehouseId - ID of the warehouse
 * @param warehouseCode - Code of the warehouse (e.g. "WH", "WH2")
 * @param type - Operation type sequence identifier (e.g. "IN", "OUT", "INT", "ADJ")
 */
export async function getNextOperationReference(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  warehouseCode: string,
  type: string
): Promise<string> {
  // Lock the sequence row for update within this transaction
  const rows = await tx.$queryRaw<Array<{ nextNumber: number }>>`
    SELECT "nextNumber" FROM "OperationSequence"
    WHERE "warehouseId" = ${warehouseId} AND "type" = ${type}
    FOR UPDATE
  `;

  let currentNumber = 1;

  if (rows && rows.length > 0) {
    currentNumber = rows[0].nextNumber;
    await tx.operationSequence.update({
      where: {
        warehouseId_type: {
          warehouseId,
          type,
        },
      },
      data: {
        nextNumber: currentNumber + 1,
      },
    });
  } else {
    // If sequence row doesn't exist yet, create starting with nextNumber = 2
    await tx.operationSequence.create({
      data: {
        warehouseId,
        type,
        nextNumber: 2,
      },
    });
    currentNumber = 1;
  }

  const paddedNumber = String(currentNumber).padStart(5, '0');
  return `${warehouseCode}/${type}/${paddedNumber}`;
}
