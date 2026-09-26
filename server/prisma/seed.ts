import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * StockSense Development Seed Script
 * 
 * Foundational development/demo fixtures only.
 * Completely idempotent: uses upserts with unique keys so running repeatedly
 * produces identical state without duplicates or primary key conflicts.
 * 
 * Development Credentials:
 * - Admin/Manager: admin@stocksense.com / Admin@123 (Role: MANAGER)
 * - Warehouse Staff: staff@stocksense.com / Staff@123 (Role: STAFF)
 */

async function main() {
  console.log('🌱 Starting StockSense foundational database seed...');

  // ─── 1. Users ─────────────────────────────────────────────────────────────
  console.log('Creating development users...');
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin@123', saltRounds);
  const staffPasswordHash = await bcrypt.hash('Staff@123', saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@stocksense.com' },
    update: {
      name: 'Admin Manager',
      role: 'MANAGER',
      passwordHash: adminPasswordHash,
    },
    create: {
      email: 'admin@stocksense.com',
      name: 'Admin Manager',
      role: 'MANAGER',
      passwordHash: adminPasswordHash,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@stocksense.com' },
    update: {
      name: 'Staff Operator',
      role: 'STAFF',
      passwordHash: staffPasswordHash,
    },
    create: {
      email: 'staff@stocksense.com',
      name: 'Staff Operator',
      role: 'STAFF',
      passwordHash: staffPasswordHash,
    },
  });

  console.log(`  ✔ Users ready: ${adminUser.email} (MANAGER), ${staffUser.email} (STAFF)`);

  // ─── 2. Warehouses ────────────────────────────────────────────────────────
  console.log('Creating warehouses...');
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH' },
    update: {
      name: 'Main Warehouse',
      address: 'Plot 42, Industrial Area, Hyderabad, India',
    },
    create: {
      code: 'WH',
      name: 'Main Warehouse',
      address: 'Plot 42, Industrial Area, Hyderabad, India',
    },
  });

  const secondaryWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH2' },
    update: {
      name: 'Secondary Warehouse',
      address: 'Phase 2, Logistics Park, Hyderabad, India',
    },
    create: {
      code: 'WH2',
      name: 'Secondary Warehouse',
      address: 'Phase 2, Logistics Park, Hyderabad, India',
    },
  });

  console.log(`  ✔ Warehouses ready: ${mainWarehouse.code}, ${secondaryWarehouse.code}`);

  // ─── 3. Locations ─────────────────────────────────────────────────────────
  console.log('Creating warehouse locations...');
  const locationsData = [
    // Main Warehouse Locations
    {
      code: 'WH/Stock',
      name: 'Stock',
      type: 'INTERNAL',
      warehouseId: mainWarehouse.id,
    },
    {
      code: 'WH/Production',
      name: 'Production',
      type: 'INTERNAL',
      warehouseId: mainWarehouse.id,
    },
    {
      code: 'WH/Damaged',
      name: 'Damaged / Scrap',
      type: 'INVENTORY_LOSS',
      warehouseId: mainWarehouse.id,
    },
    // Secondary Warehouse Locations
    {
      code: 'WH2/Stock',
      name: 'Stock',
      type: 'INTERNAL',
      warehouseId: secondaryWarehouse.id,
    },
    {
      code: 'WH2/Production',
      name: 'Production',
      type: 'INTERNAL',
      warehouseId: secondaryWarehouse.id,
    },
  ];

  const locationsMap: Record<string, string> = {};
  for (const loc of locationsData) {
    const record = await prisma.location.upsert({
      where: { code: loc.code },
      update: {
        name: loc.name,
        type: loc.type,
        warehouseId: loc.warehouseId,
      },
      create: {
        code: loc.code,
        name: loc.name,
        type: loc.type,
        warehouseId: loc.warehouseId,
      },
    });
    locationsMap[loc.code] = record.id;
  }

  console.log(`  ✔ Locations ready: ${Object.keys(locationsMap).join(', ')}`);

  // ─── 4. Operation Sequences ───────────────────────────────────────────────
  console.log('Initializing operation sequences...');
  const sequenceTypes = ['IN', 'OUT', 'INT', 'ADJ'];
  for (const wh of [mainWarehouse, secondaryWarehouse]) {
    for (const type of sequenceTypes) {
      await prisma.operationSequence.upsert({
        where: {
          warehouseId_type: {
            warehouseId: wh.id,
            type,
          },
        },
        update: {},
        create: {
          warehouseId: wh.id,
          type,
          nextNumber: 1,
        },
      });
    }
  }
  console.log(`  ✔ Operation sequences ready for WH & WH2 (IN, OUT, INT, ADJ)`);

  // ─── 5. Product Categories ────────────────────────────────────────────────
  console.log('Creating product categories...');
  const categoriesData = [
    {
      name: 'Raw Materials',
      description: 'Base metals, raw inputs, and unprocessed stock',
    },
    {
      name: 'Components',
      description: 'Mechanical and electrical hardware and sub-assemblies',
    },
    {
      name: 'Finished Goods',
      description: 'Completed products ready for dispatch or sale',
    },
  ];

  const categoriesMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const record = await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: {
        description: cat.description,
      },
      create: {
        name: cat.name,
        description: cat.description,
      },
    });
    categoriesMap[cat.name] = record.id;
  }
  console.log(`  ✔ Categories ready: ${Object.keys(categoriesMap).join(', ')}`);

  // ─── 6. Products ──────────────────────────────────────────────────────────
  console.log('Creating inventory products...');
  const productsData = [
    {
      sku: 'RAW-STL-001',
      name: 'Steel Rod',
      barcode: '890100100001',
      categoryName: 'Raw Materials',
      uom: 'Units',
      costPrice: 45.0,
      salePrice: 65.0,
    },
    {
      sku: 'RAW-CPR-002',
      name: 'Copper Wire',
      barcode: '890100100002',
      categoryName: 'Raw Materials',
      uom: 'Meters',
      costPrice: 12.5,
      salePrice: 18.0,
    },
    {
      sku: 'RAW-ALM-003',
      name: 'Aluminium Sheet',
      barcode: '890100100003',
      categoryName: 'Raw Materials',
      uom: 'Units',
      costPrice: 80.0,
      salePrice: 115.0,
    },
    {
      sku: 'CMP-BRG-001',
      name: 'Bearing',
      barcode: '890100200001',
      categoryName: 'Components',
      uom: 'Units',
      costPrice: 15.0,
      salePrice: 25.0,
    },
    {
      sku: 'FNG-MTR-001',
      name: 'Motor Assembly',
      barcode: '890100300001',
      categoryName: 'Finished Goods',
      uom: 'Units',
      costPrice: 250.0,
      salePrice: 380.0,
    },
  ];

  const productsMap: Record<string, string> = {};
  for (const prod of productsData) {
    const record = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        name: prod.name,
        barcode: prod.barcode,
        categoryId: categoriesMap[prod.categoryName],
        uom: prod.uom,
        costPrice: prod.costPrice,
        salePrice: prod.salePrice,
      },
      create: {
        sku: prod.sku,
        name: prod.name,
        barcode: prod.barcode,
        categoryId: categoriesMap[prod.categoryName],
        uom: prod.uom,
        costPrice: prod.costPrice,
        salePrice: prod.salePrice,
      },
    });
    productsMap[prod.sku] = record.id;
  }
  console.log(`  ✔ Products ready: ${Object.keys(productsMap).join(', ')}`);

  // ─── 7. Reorder Rules ─────────────────────────────────────────────────────
  console.log('Creating reorder rules...');
  const reorderRulesData = [
    // Main Warehouse reorder rules
    {
      sku: 'RAW-STL-001',
      locationCode: 'WH/Stock',
      minQuantity: 20.0,
      maxQuantity: 200.0,
    },
    {
      sku: 'RAW-CPR-002',
      locationCode: 'WH/Stock',
      minQuantity: 50.0,
      maxQuantity: 600.0,
    },
    {
      sku: 'RAW-ALM-003',
      locationCode: 'WH/Stock',
      minQuantity: 25.0,
      maxQuantity: 100.0,
    },
    {
      sku: 'CMP-BRG-001',
      locationCode: 'WH/Stock',
      minQuantity: 20.0,
      maxQuantity: 100.0,
    },
    {
      sku: 'FNG-MTR-001',
      locationCode: 'WH/Stock',
      minQuantity: 5.0,
      maxQuantity: 30.0,
    },
    // Secondary Warehouse reorder rules
    {
      sku: 'RAW-STL-001',
      locationCode: 'WH2/Stock',
      minQuantity: 15.0,
      maxQuantity: 80.0,
    },
  ];

  for (const rule of reorderRulesData) {
    const productId = productsMap[rule.sku];
    const locationId = locationsMap[rule.locationCode];
    await prisma.reorderRule.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      update: {
        minQuantity: rule.minQuantity,
        maxQuantity: rule.maxQuantity,
      },
      create: {
        productId,
        locationId,
        minQuantity: rule.minQuantity,
        maxQuantity: rule.maxQuantity,
      },
    });
  }
  console.log(`  ✔ Reorder rules ready (${reorderRulesData.length} rules)`);

  // ─── 8. Initial Stock (StockQuants) ───────────────────────────────────────
  console.log('Seeding initial stock levels (StockQuants)...');
  const stockQuantsData = [
    // 1. Healthy Stock: Steel Rod in WH/Stock (150 > min 20)
    {
      sku: 'RAW-STL-001',
      locationCode: 'WH/Stock',
      quantity: 150.0,
      reservedQuantity: 0.0,
    },
    // 2. Healthy Stock: Steel Rod in WH2/Stock (50 > min 15)
    {
      sku: 'RAW-STL-001',
      locationCode: 'WH2/Stock',
      quantity: 50.0,
      reservedQuantity: 0.0,
    },
    // 3. Scrap/Damaged Stock: Steel Rod in WH/Damaged (loss tracking)
    {
      sku: 'RAW-STL-001',
      locationCode: 'WH/Damaged',
      quantity: 2.0,
      reservedQuantity: 0.0,
    },
    // 4. Healthy Stock: Copper Wire in WH/Stock (500 > min 50)
    {
      sku: 'RAW-CPR-002',
      locationCode: 'WH/Stock',
      quantity: 500.0,
      reservedQuantity: 0.0,
    },
    // 5. Low-stock: Aluminium Sheet in WH/Stock (12 < min 25)
    {
      sku: 'RAW-ALM-003',
      locationCode: 'WH/Stock',
      quantity: 12.0,
      reservedQuantity: 0.0,
    },
    // 6. Low-stock: Bearing in WH/Stock (8 < min 20)
    {
      sku: 'CMP-BRG-001',
      locationCode: 'WH/Stock',
      quantity: 8.0,
      reservedQuantity: 0.0,
    },
    // 7. Out-of-stock: Motor Assembly in WH/Stock (0.0 stock, min is 5)
    {
      sku: 'FNG-MTR-001',
      locationCode: 'WH/Stock',
      quantity: 0.0,
      reservedQuantity: 0.0,
    },
  ];

  for (const quant of stockQuantsData) {
    const productId = productsMap[quant.sku];
    const locationId = locationsMap[quant.locationCode];
    await prisma.stockQuant.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      update: {
        quantity: quant.quantity,
        reservedQuantity: quant.reservedQuantity,
      },
      create: {
        productId,
        locationId,
        quantity: quant.quantity,
        reservedQuantity: quant.reservedQuantity,
      },
    });
  }
  console.log(`  ✔ Stock levels (StockQuants) ready (${stockQuantsData.length} records across healthy, low-stock, and out-of-stock)`);

  console.log('✅ StockSense foundational database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
