import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/errors';

export interface ProductListParams {
  search?: string;
  sku?: string;
  categoryId?: string;
  warehouseId?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  order?: string;
}

export interface InitialStockItem {
  locationId?: string;
  warehouseId?: string;
  quantity: number;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  barcode?: string | null;
  categoryId?: string | null;
  uom?: string;
  costPrice?: number;
  salePrice?: number;
  initialStock?: InitialStockItem | InitialStockItem[];
  locationId?: string;
  initialStockQuantity?: number;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  barcode?: string | null;
  categoryId?: string | null;
  uom?: string;
  costPrice?: number;
  salePrice?: number;
}

export class ProductService {
  /**
   * List products with DB-side filtering, search, sorting, and pagination.
   * Avoids N+1 queries by including relations and calculating aggregates.
   */
  static async listProducts(params: ProductListParams = {}) {
    const {
      search,
      sku,
      categoryId,
      warehouseId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc',
    } = params;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ProductWhereInput = {};

    // 1. Full-text / Partial search across name, SKU, and barcode
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 2. Specific SKU filter
    if (sku && sku.trim()) {
      where.sku = { contains: sku.trim(), mode: 'insensitive' };
    }

    // 3. Category filter
    if (categoryId && categoryId.trim()) {
      where.categoryId = categoryId.trim();
    }

    // 4. Warehouse filter: only products having stock in locations belonging to this warehouse
    if (warehouseId && warehouseId.trim()) {
      where.stockQuants = {
        some: {
          location: {
            warehouseId: warehouseId.trim(),
          },
        },
      };
    }

    // Allowed sort columns
    const allowedSortFields = ['name', 'sku', 'costPrice', 'salePrice', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder: Prisma.SortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          stockQuants: {
            include: {
              location: {
                include: {
                  warehouse: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limitNum,
      }),
    ]);

    const formattedData = products.map((prod) => {
      let totalOnHand = 0;
      let totalReserved = 0;

      for (const quant of prod.stockQuants) {
        totalOnHand += quant.quantity;
        totalReserved += quant.reservedQuantity;
      }

      return {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        categoryId: prod.categoryId,
        category: prod.category ? prod.category.name : null,
        uom: prod.uom,
        costPrice: prod.costPrice,
        salePrice: prod.salePrice,
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt,
        totalOnHand,
        totalReserved,
        freeToUse: totalOnHand - totalReserved,
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
   * Get product detail by ID including category, multi-warehouse stock breakdown, and reorder rules.
   */
  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockQuants: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
          orderBy: { location: { code: 'asc' } },
        },
        reorderRules: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
          orderBy: { location: { code: 'asc' } },
        },
      },
    });

    if (!product) {
      throw new AppError(`Product with ID '${id}' not found`, 404);
    }

    let totalOnHand = 0;
    let totalReserved = 0;

    const byLocation = product.stockQuants.map((quant) => {
      totalOnHand += quant.quantity;
      totalReserved += quant.reservedQuantity;

      return {
        locationId: quant.locationId,
        locationCode: quant.location.code,
        locationName: quant.location.name,
        locationType: quant.location.type,
        warehouseId: quant.location.warehouseId,
        warehouseCode: quant.location.warehouse.code,
        warehouseName: quant.location.warehouse.name,
        quantity: quant.quantity,
        reservedQuantity: quant.reservedQuantity,
        freeToUse: quant.quantity - quant.reservedQuantity,
      };
    });

    // Group stock breakdown by warehouse
    const warehouseMap: Record<
      string,
      {
        warehouseId: string;
        warehouseCode: string;
        warehouseName: string;
        onHand: number;
        reserved: number;
        freeToUse: number;
      }
    > = {};

    for (const item of byLocation) {
      if (!warehouseMap[item.warehouseId]) {
        warehouseMap[item.warehouseId] = {
          warehouseId: item.warehouseId,
          warehouseCode: item.warehouseCode,
          warehouseName: item.warehouseName,
          onHand: 0,
          reserved: 0,
          freeToUse: 0,
        };
      }
      warehouseMap[item.warehouseId].onHand += item.quantity;
      warehouseMap[item.warehouseId].reserved += item.reservedQuantity;
      warehouseMap[item.warehouseId].freeToUse += item.freeToUse;
    }

    const reorderRules = product.reorderRules.map((rule) => ({
      id: rule.id,
      locationId: rule.locationId,
      locationCode: rule.location.code,
      locationName: rule.location.name,
      warehouseId: rule.location.warehouseId,
      warehouseCode: rule.location.warehouse.code,
      warehouseName: rule.location.warehouse.name,
      minQuantity: rule.minQuantity,
      maxQuantity: rule.maxQuantity,
      createdAt: rule.createdAt,
    }));

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      category: product.category,
      uom: product.uom,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      stock: {
        totalOnHand,
        totalReserved,
        totalFreeToUse: totalOnHand - totalReserved,
        byLocation,
        byWarehouse: Object.values(warehouseMap),
      },
      reorderRules,
    };
  }

  /**
   * Create a new product with optional initial stock seeding in a clean transaction.
   */
  static async createProduct(data: CreateProductInput) {
    if (!data.name || !data.name.trim()) {
      throw new AppError('Product name is required', 400);
    }
    if (!data.sku || !data.sku.trim()) {
      throw new AppError('SKU is required', 400);
    }

    const trimmedName = data.name.trim();
    const normalizedSku = data.sku.trim().toUpperCase();

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: normalizedSku },
    });
    if (existingSku) {
      throw new AppError(`Product with SKU '${normalizedSku}' already exists`, 400);
    }

    // Validate category if provided
    let categoryId: string | null = null;
    if (data.categoryId && data.categoryId.trim()) {
      const cat = await prisma.productCategory.findUnique({
        where: { id: data.categoryId.trim() },
      });
      if (!cat) {
        throw new AppError(`Category with ID '${data.categoryId}' not found`, 404);
      }
      categoryId = cat.id;
    }

    // Validate prices
    const costPrice = data.costPrice !== undefined ? Number(data.costPrice) : 0.0;
    const salePrice = data.salePrice !== undefined ? Number(data.salePrice) : 0.0;

    if (isNaN(costPrice) || costPrice < 0) {
      throw new AppError('costPrice must be a non-negative number', 400);
    }
    if (isNaN(salePrice) || salePrice < 0) {
      throw new AppError('salePrice must be a non-negative number', 400);
    }

    const uom = data.uom && data.uom.trim() ? data.uom.trim() : 'Units';
    const barcode = data.barcode ? data.barcode.trim() : null;

    // Normalize initial stock requests
    const initialStockItems: Array<{ locationId: string; quantity: number }> = [];

    // Format A: { locationId, initialStockQuantity }
    if (data.locationId && data.initialStockQuantity !== undefined) {
      const qty = Number(data.initialStockQuantity);
      if (isNaN(qty) || qty < 0) {
        throw new AppError('Initial stock quantity must be a non-negative number', 400);
      }
      initialStockItems.push({ locationId: data.locationId, quantity: qty });
    }

    // Format B: { initialStock: object | array }
    if (data.initialStock) {
      const rawItems = Array.isArray(data.initialStock) ? data.initialStock : [data.initialStock];
      for (const item of rawItems) {
        const qty = Number(item.quantity);
        if (isNaN(qty) || qty < 0) {
          throw new AppError('Initial stock quantity must be a non-negative number', 400);
        }

        let locId = item.locationId;
        if (!locId && item.warehouseId) {
          const defaultLoc = await prisma.location.findFirst({
            where: { warehouseId: item.warehouseId, type: 'INTERNAL' },
            orderBy: { code: 'asc' },
          });
          if (!defaultLoc) {
            throw new AppError(`No internal stock location found for warehouse '${item.warehouseId}'`, 404);
          }
          locId = defaultLoc.id;
        }

        if (!locId) {
          throw new AppError('locationId or warehouseId is required for initial stock', 400);
        }

        initialStockItems.push({ locationId: locId, quantity: qty });
      }
    }

    // Verify all specified locations exist before writing
    for (const item of initialStockItems) {
      const loc = await prisma.location.findUnique({ where: { id: item.locationId } });
      if (!loc) {
        throw new AppError(`Location with ID '${item.locationId}' not found`, 404);
      }
    }

    // Execute atomic creation
    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: trimmedName,
          sku: normalizedSku,
          barcode,
          categoryId,
          uom,
          costPrice,
          salePrice,
        },
      });

      // Upsert initial stock quants without creating arbitrary stock moves
      for (const item of initialStockItems) {
        await tx.stockQuant.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: item.locationId,
            },
          },
          update: {
            quantity: item.quantity,
          },
          create: {
            productId: product.id,
            locationId: item.locationId,
            quantity: item.quantity,
            reservedQuantity: 0.0,
          },
        });
      }

      return product;
    });

    return this.getProductById(createdProduct.id);
  }

  /**
   * Set or update stock quantity directly for a product at a specific location/warehouse.
   * Preserves reservedQuantity and avoids creating duplicate quants.
   */
  static async setProductStock(
    productId: string,
    data: { locationId?: string; warehouseId?: string; quantity: number }
  ) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(`Product with ID '${productId}' not found`, 404);
    }

    const qty = Number(data.quantity);
    if (isNaN(qty) || qty < 0) {
      throw new AppError('Stock quantity must be a non-negative number', 400);
    }

    let targetLocationId = data.locationId;
    if (!targetLocationId && data.warehouseId) {
      const defaultLoc = await prisma.location.findFirst({
        where: { warehouseId: data.warehouseId, type: 'INTERNAL' },
        orderBy: { code: 'asc' },
      });
      if (!defaultLoc) {
        throw new AppError(`No internal stock location found for warehouse '${data.warehouseId}'`, 404);
      }
      targetLocationId = defaultLoc.id;
    }

    if (!targetLocationId) {
      throw new AppError('locationId or warehouseId is required to set stock', 400);
    }

    const location = await prisma.location.findUnique({
      where: { id: targetLocationId },
      include: { warehouse: true },
    });
    if (!location) {
      throw new AppError(`Location with ID '${targetLocationId}' not found`, 404);
    }

    const quant = await prisma.stockQuant.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId: targetLocationId,
        },
      },
      update: {
        quantity: qty,
      },
      create: {
        productId,
        locationId: targetLocationId,
        quantity: qty,
        reservedQuantity: 0.0,
      },
      include: {
        location: {
          include: { warehouse: true },
        },
      },
    });

    return {
      productId,
      locationId: quant.locationId,
      locationCode: quant.location.code,
      warehouseCode: quant.location.warehouse.code,
      quantity: quant.quantity,
      reservedQuantity: quant.reservedQuantity,
      freeToUse: quant.quantity - quant.reservedQuantity,
      updatedAt: quant.updatedAt,
    };
  }

  /**
   * Update mutable fields of an existing product.
   */
  static async updateProduct(id: string, data: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(`Product with ID '${id}' not found`, 404);
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) {
        throw new AppError('Product name cannot be empty', 400);
      }
      updateData.name = trimmed;
    }

    if (data.sku !== undefined) {
      const normalizedSku = data.sku.trim().toUpperCase();
      if (!normalizedSku) {
        throw new AppError('SKU cannot be empty', 400);
      }
      if (normalizedSku !== existing.sku) {
        const collision = await prisma.product.findFirst({
          where: { sku: normalizedSku, id: { not: id } },
        });
        if (collision) {
          throw new AppError(`Product with SKU '${normalizedSku}' already exists`, 400);
        }
        updateData.sku = normalizedSku;
      }
    }

    if (data.barcode !== undefined) {
      updateData.barcode = data.barcode ? data.barcode.trim() : null;
    }

    if (data.categoryId !== undefined) {
      if (data.categoryId === null || data.categoryId.trim() === '') {
        updateData.category = { disconnect: true };
      } else {
        const cat = await prisma.productCategory.findUnique({
          where: { id: data.categoryId.trim() },
        });
        if (!cat) {
          throw new AppError(`Category with ID '${data.categoryId}' not found`, 404);
        }
        updateData.category = { connect: { id: cat.id } };
      }
    }

    if (data.uom !== undefined) {
      const trimmedUom = data.uom.trim();
      if (!trimmedUom) {
        throw new AppError('UoM cannot be empty', 400);
      }
      updateData.uom = trimmedUom;
    }

    if (data.costPrice !== undefined) {
      const cost = Number(data.costPrice);
      if (isNaN(cost) || cost < 0) {
        throw new AppError('costPrice must be a non-negative number', 400);
      }
      updateData.costPrice = cost;
    }

    if (data.salePrice !== undefined) {
      const sale = Number(data.salePrice);
      if (isNaN(sale) || sale < 0) {
        throw new AppError('salePrice must be a non-negative number', 400);
      }
      updateData.salePrice = sale;
    }

    await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return this.getProductById(id);
  }

  /**
   * Safely delete product if no operational/stock move audit records exist and stock is zero.
   */
  static async deleteProduct(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new AppError(`Product with ID '${id}' not found`, 404);
    }

    // 1. Check for historical stock moves or operations
    const [moveCount, opItemCount] = await Promise.all([
      prisma.stockMove.count({ where: { productId: id } }),
      prisma.operationItem.count({ where: { productId: id } }),
    ]);

    if (moveCount > 0 || opItemCount > 0) {
      throw new AppError(
        `Cannot delete product '${product.name}' (${product.sku}) because it has existing stock moves (${moveCount}) or operation items (${opItemCount}). Product data is required for inventory audit integrity.`,
        400
      );
    }

    // 2. Check for active on-hand or reserved stock
    const activeStock = await prisma.stockQuant.findFirst({
      where: {
        productId: id,
        OR: [{ quantity: { gt: 0 } }, { reservedQuantity: { gt: 0 } }],
      },
    });

    if (activeStock) {
      throw new AppError(
        `Cannot delete product '${product.name}' (${product.sku}) because it has on-hand or reserved stock. Adjust stock to zero first.`,
        400
      );
    }

    // 3. Safe cleanup of empty quants, rules, and product
    await prisma.$transaction(async (tx) => {
      await tx.stockQuant.deleteMany({ where: { productId: id } });
      await tx.reorderRule.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    return {
      message: 'Product deleted successfully',
      id,
    };
  }
}
