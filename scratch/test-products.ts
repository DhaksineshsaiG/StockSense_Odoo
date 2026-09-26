import http from 'http';
import app from '../server/src/app';
import prisma from '../server/src/config/db';

const PORT = 3102;
const BASE_URL = `http://localhost:${PORT}`;

async function request(path: string, options: { method?: string; body?: any; token?: string } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const status = res.status;
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  return { status, json };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting Products, Categories, Reorder Rules & Regression Tests on real Neon PostgreSQL...\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, () => resolve()));
  console.log(`📡 Test server listening on ${PORT}`);

  try {
    // 0. Authenticate seeded users
    console.log('\n--- 0. Authentication Setup ---');
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@stocksense.com', password: 'Admin@123' },
    });
    assert(adminLogin.status === 200, 'Admin login failed');
    const adminToken = adminLogin.json.token;
    console.log('✔ Admin token obtained (MANAGER)');

    const staffLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'staff@stocksense.com', password: 'Staff@123' },
    });
    assert(staffLogin.status === 200, 'Staff login failed');
    const staffToken = staffLogin.json.token;
    console.log('✔ Staff token obtained (STAFF)');

    // Fetch existing locations and categories for fixtures
    const whStockLoc = await prisma.location.findUnique({ where: { code: 'WH/Stock' } });
    const wh2StockLoc = await prisma.location.findUnique({ where: { code: 'WH2/Stock' } });
    const rawMaterialsCat = await prisma.productCategory.findUnique({ where: { name: 'Raw Materials' } });
    const componentsCat = await prisma.productCategory.findUnique({ where: { name: 'Components' } });

    assert(!!whStockLoc && !!wh2StockLoc, 'Seeded locations WH/Stock and WH2/Stock must exist');
    assert(!!rawMaterialsCat && !!componentsCat, 'Seeded categories must exist');

    // ==========================================
    // PRODUCTS TESTS
    // ==========================================
    console.log('\n--- 1. Product List ---');
    const listRes = await request('/api/products');
    assert(listRes.status === 200, 'Product list failed');
    assert(Array.isArray(listRes.json.data), 'Product list must return an array');
    assert(listRes.json.data.length === 5, `Expected 5 seeded products, got ${listRes.json.data.length}`);
    assert(listRes.json.pagination.total === 5, 'Expected pagination total 5');
    console.log(`✔ Product list returned ${listRes.json.data.length} products with pagination`);

    console.log('\n--- 2. Product Detail ---');
    const steelRod = listRes.json.data.find((p: any) => p.sku === 'RAW-STL-001');
    assert(!!steelRod, 'Steel Rod must be present in products');
    const detailRes = await request(`/api/products/${steelRod.id}`);
    assert(detailRes.status === 200, 'Product detail failed');
    assert(detailRes.json.data.name === 'Steel Rod', 'Product name mismatch');
    assert(detailRes.json.data.sku === 'RAW-STL-001', 'Product SKU mismatch');
    assert(detailRes.json.data.stock.totalOnHand === 202, `Expected totalOnHand 202 (150+50+2), got ${detailRes.json.data.stock.totalOnHand}`);
    assert(detailRes.json.data.stock.byLocation.length === 3, 'Expected 3 locations for Steel Rod');
    assert(detailRes.json.data.stock.byWarehouse.length === 2, 'Expected 2 warehouses for Steel Rod');
    console.log(`✔ Product detail verified for ${steelRod.name}: totalOnHand=${detailRes.json.data.stock.totalOnHand}, multi-warehouse breakdown verified`);

    console.log('\n--- 3. Create Product ---');
    const createRes = await request('/api/products', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Test Widget Alpha',
        sku: 'TEST-WGT-001',
        barcode: '999001001',
        categoryId: componentsCat!.id,
        uom: 'Units',
        costPrice: 42.5,
        salePrice: 65.0,
      },
    });
    assert(createRes.status === 201, `Expected 201 on create, got ${createRes.status}`);
    const createdProductId = createRes.json.data.id;
    assert(createRes.json.data.sku === 'TEST-WGT-001', 'SKU must be normalized and stored');
    console.log(`✔ Product created successfully: ID=${createdProductId}, SKU=${createRes.json.data.sku}`);

    console.log('\n--- 4. Duplicate SKU Rejection ---');
    const dupSkuRes = await request('/api/products', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Duplicate Widget',
        sku: 'TEST-WGT-001',
      },
    });
    assert([400, 409].includes(dupSkuRes.status), `Expected 400/409 for duplicate SKU, got ${dupSkuRes.status}`);
    console.log(`✔ Duplicate SKU correctly rejected with status ${dupSkuRes.status}`);

    console.log('\n--- 5. Invalid Category Rejection ---');
    const invalidCatRes = await request('/api/products', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Invalid Cat Widget',
        sku: 'TEST-INV-CAT',
        categoryId: '00000000-0000-0000-0000-000000000000',
      },
    });
    assert([400, 404].includes(invalidCatRes.status), `Expected 400/404 for invalid category, got ${invalidCatRes.status}`);
    console.log(`✔ Non-existent category correctly rejected with status ${invalidCatRes.status}`);

    console.log('\n--- 6. Invalid Price Rejection ---');
    const negPriceRes = await request('/api/products', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Negative Price Widget',
        sku: 'TEST-NEG-PRC',
        costPrice: -15,
      },
    });
    assert(negPriceRes.status === 400, `Expected 400 for negative costPrice, got ${negPriceRes.status}`);
    console.log(`✔ Negative cost price correctly rejected with status 400`);

    console.log('\n--- 7. Invalid Name / Empty Inputs Rejection ---');
    const emptyNameRes = await request('/api/products', {
      method: 'POST',
      token: adminToken,
      body: {
        name: '   ',
        sku: 'TEST-EMP-NAME',
      },
    });
    assert(emptyNameRes.status === 400, `Expected 400 for empty product name, got ${emptyNameRes.status}`);
    console.log(`✔ Whitespace-only name correctly rejected with status 400`);

    console.log('\n--- 8. Update Product ---');
    const updateRes = await request(`/api/products/${createdProductId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        name: 'Updated Widget Alpha Prime',
        salePrice: 79.99,
      },
    });
    assert(updateRes.status === 200, `Expected 200 on update, got ${updateRes.status}`);
    assert(updateRes.json.data.name === 'Updated Widget Alpha Prime', 'Name was not updated');
    assert(updateRes.json.data.salePrice === 79.99, 'Sale price was not updated');
    console.log(`✔ Product updated successfully: name='${updateRes.json.data.name}', salePrice=${updateRes.json.data.salePrice}`);

    console.log('\n--- 9. SKU Collision on Update ---');
    const collRes = await request(`/api/products/${createdProductId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        sku: 'RAW-STL-001', // Already belongs to Steel Rod
      },
    });
    assert([400, 409].includes(collRes.status), `Expected 400/409 on SKU collision, got ${collRes.status}`);
    console.log(`✔ SKU collision on update correctly rejected with status ${collRes.status}`);

    console.log('\n--- 10. Search by Product Name ---');
    const searchNameRes = await request('/api/products?search=Copper');
    assert(searchNameRes.status === 200, 'Search by name failed');
    assert(searchNameRes.json.data.length === 1 && searchNameRes.json.data[0].sku === 'RAW-CPR-002', 'Search by name did not return Copper Wire');
    console.log('✔ Search by product name successfully matched "Copper Wire"');

    console.log('\n--- 11. Search by SKU ---');
    const searchSkuRes = await request('/api/products?search=CMP-BRG');
    assert(searchSkuRes.status === 200, 'Search by SKU failed');
    assert(searchSkuRes.json.data.length === 1 && searchSkuRes.json.data[0].name === 'Bearing', 'Search by SKU did not return Bearing');
    console.log('✔ Search by SKU successfully matched "Bearing"');

    console.log('\n--- 12. Category Filtering ---');
    const filterCatRes = await request(`/api/products?categoryId=${rawMaterialsCat!.id}`);
    assert(filterCatRes.status === 200, 'Category filter failed');
    assert(filterCatRes.json.data.length === 3, `Expected 3 Raw Materials products, got ${filterCatRes.json.data.length}`);
    for (const p of filterCatRes.json.data) {
      assert(p.categoryId === rawMaterialsCat!.id, 'Filtered product category mismatch');
    }
    console.log(`✔ Filter by category ID returned exactly ${filterCatRes.json.data.length} matching products`);

    console.log('\n--- 13. Pagination ---');
    const pageRes = await request('/api/products?page=1&limit=2');
    assert(pageRes.status === 200, 'Pagination query failed');
    assert(pageRes.json.data.length === 2, `Expected 2 products per page, got ${pageRes.json.data.length}`);
    assert(pageRes.json.pagination.page === 1, 'Expected page=1');
    assert(pageRes.json.pagination.limit === 2, 'Expected limit=2');
    assert(pageRes.json.pagination.total >= 6, 'Expected total >= 6 with test product');
    console.log(`✔ Pagination verified: page=1, limit=2, total=${pageRes.json.pagination.total}, totalPages=${pageRes.json.pagination.totalPages}`);

    console.log('\n--- 14. Product Not Found ---');
    const notFoundRes = await request('/api/products/00000000-0000-0000-0000-000000000000');
    assert(notFoundRes.status === 404, `Expected 404 for unknown product, got ${notFoundRes.status}`);
    console.log(`✔ Non-existent product returned 404`);

    console.log('\n--- 15. Delete / Deactivate Behavior ---');
    // Seeded product with stock cannot be deleted
    const delSeededRes = await request(`/api/products/${steelRod.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert([400, 409].includes(delSeededRes.status), `Expected 400/409 when deleting product with stock, got ${delSeededRes.status}`);
    console.log(`✔ Product with active stock is protected from deletion (status ${delSeededRes.status})`);

    // Clean test product can be deleted
    const delTestRes = await request(`/api/products/${createdProductId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(delTestRes.status === 200, `Expected 200 when deleting unreferenced test product, got ${delTestRes.status}`);
    console.log('✔ Unreferenced product safely deleted');

    // ==========================================
    // CATEGORIES TESTS
    // ==========================================
    console.log('\n--- 16. Category List ---');
    const catListRes = await request('/api/categories');
    assert(catListRes.status === 200, 'Category list failed');
    assert(catListRes.json.data.length === 3, `Expected 3 seeded categories, got ${catListRes.json.data.length}`);
    const rawCat = catListRes.json.data.find((c: any) => c.name === 'Raw Materials');
    assert(rawCat.productsCount === 3, `Expected Raw Materials to have 3 products, got ${rawCat.productsCount}`);
    console.log(`✔ Category list returned ${catListRes.json.data.length} categories with correct product counts`);

    console.log('\n--- 17. Create Category ---');
    const createCatRes = await request('/api/categories', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Test Instruments',
        description: 'Testing instruments and gauges',
      },
    });
    assert(createCatRes.status === 201, `Expected 201 on category create, got ${createCatRes.status}`);
    const testCatId = createCatRes.json.data.id;
    console.log(`✔ Category created: ID=${testCatId}, name='${createCatRes.json.data.name}'`);

    console.log('\n--- 18. Duplicate Category Rejection ---');
    const dupCatRes = await request('/api/categories', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Test Instruments',
      },
    });
    assert([400, 409].includes(dupCatRes.status), `Expected 400/409 on duplicate category, got ${dupCatRes.status}`);
    console.log(`✔ Duplicate category name correctly rejected with status ${dupCatRes.status}`);

    console.log('\n--- 19. Update Category ---');
    const updateCatRes = await request(`/api/categories/${testCatId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        description: 'Updated description for test instruments',
      },
    });
    assert(updateCatRes.status === 200, `Expected 200 on category update, got ${updateCatRes.status}`);
    assert(updateCatRes.json.data.description === 'Updated description for test instruments', 'Description not updated');
    console.log('✔ Category updated successfully');

    console.log('\n--- 20. Search Category ---');
    const searchCatRes = await request('/api/categories?search=Instruments');
    assert(searchCatRes.status === 200, 'Search category failed');
    assert(searchCatRes.json.data.length === 1 && searchCatRes.json.data[0].name === 'Test Instruments', 'Search category mismatch');
    console.log('✔ Search category successfully matched "Test Instruments"');

    console.log('\n--- 21. Category Not Found ---');
    const notFoundCatRes = await request('/api/categories/00000000-0000-0000-0000-000000000000');
    assert(notFoundCatRes.status === 404, `Expected 404 for unknown category, got ${notFoundCatRes.status}`);
    console.log('✔ Non-existent category returned 404');

    console.log('\n--- 22. Safe Delete Category ---');
    // Cannot delete category with products
    const delRawCatRes = await request(`/api/categories/${rawMaterialsCat!.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert([400, 409].includes(delRawCatRes.status), `Expected 400/409 when deleting category with products, got ${delRawCatRes.status}`);
    console.log(`✔ Category containing products is protected from deletion (status ${delRawCatRes.status})`);

    // Empty category can be deleted
    const delTestCatRes = await request(`/api/categories/${testCatId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(delTestCatRes.status === 200, `Expected 200 when deleting empty category, got ${delTestCatRes.status}`);
    console.log('✔ Empty category safely deleted');

    // ==========================================
    // INITIAL STOCK TESTS
    // ==========================================
    console.log('\n--- 23. Create Product with Initial Stock ---');
    const prodWithStockRes = await request('/api/products', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Test Sensor Unit',
        sku: 'TEST-SNS-001',
        categoryId: componentsCat!.id,
        uom: 'Units',
        costPrice: 100,
        salePrice: 160,
        initialStock: [
          { locationId: whStockLoc!.id, quantity: 40 },
          { locationId: wh2StockLoc!.id, quantity: 25 },
        ],
      },
    });
    assert(prodWithStockRes.status === 201, `Expected 201, got ${prodWithStockRes.status}`);
    const stockProdId = prodWithStockRes.json.data.id;
    console.log(`✔ Product with initial stock created: ID=${stockProdId}`);

    console.log('\n--- 24. Verify StockQuant ---');
    assert(prodWithStockRes.json.data.stock.totalOnHand === 65, `Expected totalOnHand 65 (40+25), got ${prodWithStockRes.json.data.stock.totalOnHand}`);
    assert(prodWithStockRes.json.data.stock.totalFreeToUse === 65, 'totalFreeToUse mismatch');
    console.log(`✔ StockQuant verified: totalOnHand=65, totalFreeToUse=65`);

    console.log('\n--- 25. Verify Multi-Location Breakdown ---');
    const locWhStock = prodWithStockRes.json.data.stock.byLocation.find((l: any) => l.locationCode === 'WH/Stock');
    const locWh2Stock = prodWithStockRes.json.data.stock.byLocation.find((l: any) => l.locationCode === 'WH2/Stock');
    assert(!!locWhStock && locWhStock.quantity === 40, 'WH/Stock quant mismatch');
    assert(!!locWh2Stock && locWh2Stock.quantity === 25, 'WH2/Stock quant mismatch');
    assert(prodWithStockRes.json.data.stock.byWarehouse.length === 2, 'Expected 2 warehouses');
    console.log('✔ Multi-location and multi-warehouse breakdown verified (WH: 40, WH2: 25)');

    console.log('\n--- 26. Update Stock & Prevent Duplicate Quants ---');
    const updateStockRes = await request(`/api/products/${stockProdId}/stock`, {
      method: 'POST',
      token: adminToken,
      body: {
        locationId: whStockLoc!.id,
        quantity: 50, // update from 40 to 50
      },
    });
    assert(updateStockRes.status === 200, `Expected 200 on stock update, got ${updateStockRes.status}`);

    const verifyQuantCount = await prisma.stockQuant.count({
      where: { productId: stockProdId, locationId: whStockLoc!.id },
    });
    assert(verifyQuantCount === 1, `Expected exactly 1 quant record for product+location, got ${verifyQuantCount}`);

    const stockProdDetail = await request(`/api/products/${stockProdId}`);
    assert(stockProdDetail.json.data.stock.totalOnHand === 75, `Expected totalOnHand 75 (50+25), got ${stockProdDetail.json.data.stock.totalOnHand}`);
    console.log('✔ Stock quantity updated to 50; verified exactly 1 quant per location (no duplicate quants)');

    // ==========================================
    // REORDER RULES TESTS
    // ==========================================
    console.log('\n--- 27. Create Reorder Rule ---');
    const createRuleRes = await request(`/api/products/${stockProdId}/reorder-rules`, {
      method: 'POST',
      token: adminToken,
      body: {
        locationId: whStockLoc!.id,
        minQuantity: 15,
        maxQuantity: 100,
      },
    });
    assert(createRuleRes.status === 201, `Expected 201 on reorder rule create, got ${createRuleRes.status}`);
    const ruleId = createRuleRes.json.data.id;
    assert(createRuleRes.json.data.minQuantity === 15, 'minQuantity mismatch');
    assert(createRuleRes.json.data.maxQuantity === 100, 'maxQuantity mismatch');
    console.log(`✔ Reorder rule created: ID=${ruleId} (min: 15, max: 100)`);

    console.log('\n--- 28. Duplicate Product / Location Rule Rejected ---');
    const dupRuleRes = await request(`/api/products/${stockProdId}/reorder-rules`, {
      method: 'POST',
      token: adminToken,
      body: {
        locationId: whStockLoc!.id,
        minQuantity: 20,
        maxQuantity: 80,
      },
    });
    assert([400, 409].includes(dupRuleRes.status), `Expected 400/409 on duplicate reorder rule, got ${dupRuleRes.status}`);
    console.log(`✔ Duplicate product+location rule correctly rejected with status ${dupRuleRes.status}`);

    console.log('\n--- 29. Invalid Min / Max Quantities Rejected ---');
    const invMaxRes = await request(`/api/products/${stockProdId}/reorder-rules`, {
      method: 'POST',
      token: adminToken,
      body: {
        locationId: wh2StockLoc!.id,
        minQuantity: 50,
        maxQuantity: 20, // max < min!
      },
    });
    assert(invMaxRes.status === 400, `Expected 400 for maxQuantity < minQuantity, got ${invMaxRes.status}`);

    const negQtyRes = await request(`/api/products/${stockProdId}/reorder-rules`, {
      method: 'POST',
      token: adminToken,
      body: {
        locationId: wh2StockLoc!.id,
        minQuantity: -5,
        maxQuantity: 20,
      },
    });
    assert(negQtyRes.status === 400, `Expected 400 for negative minQuantity, got ${negQtyRes.status}`);
    console.log('✔ Invalid min/max bounds (max < min, negative values) rejected with 400');

    console.log('\n--- 30. Update Reorder Rule ---');
    const updateRuleRes = await request(`/api/reorder-rules/${ruleId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        maxQuantity: 120,
      },
    });
    assert(updateRuleRes.status === 200, `Expected 200 on rule update, got ${updateRuleRes.status}`);
    assert(updateRuleRes.json.data.maxQuantity === 120, 'maxQuantity not updated');
    console.log('✔ Reorder rule updated successfully (max: 120)');

    console.log('\n--- 31. Delete Reorder Rule ---');
    const delRuleRes = await request(`/api/reorder-rules/${ruleId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(delRuleRes.status === 200, `Expected 200 on rule delete, got ${delRuleRes.status}`);
    console.log('✔ Reorder rule deleted successfully');

    // ==========================================
    // AUTHORIZATION TESTS
    // ==========================================
    console.log('\n--- 32. Unauthenticated Mutation Rejected ---');
    const unauthRes = await request('/api/products', {
      method: 'POST',
      body: {
        name: 'Unauth Product',
        sku: 'TEST-UNAUTH',
      },
    });
    assert(unauthRes.status === 401, `Expected 401 for unauthenticated mutation, got ${unauthRes.status}`);
    console.log('✔ Unauthenticated mutation rejected with 401');

    console.log('\n--- 33. Authenticated Mutation Accepted (Staff) ---');
    const staffProdRes = await request('/api/products', {
      method: 'POST',
      token: staffToken,
      body: {
        name: 'Staff Created Assembly',
        sku: 'TEST-STF-001',
      },
    });
    assert(staffProdRes.status === 201, `Expected 201 for staff product creation, got ${staffProdRes.status}`);
    const staffProdId = staffProdRes.json.data.id;
    console.log(`✔ Authenticated mutation accepted for STAFF user: ID=${staffProdId}`);

    console.log('\n--- 34. Role Restrictions (Manager-Only Delete) ---');
    // Staff cannot delete product (requires MANAGER)
    const staffDelRes = await request(`/api/products/${staffProdId}`, {
      method: 'DELETE',
      token: staffToken,
    });
    assert(staffDelRes.status === 403, `Expected 403 for staff trying to delete product, got ${staffDelRes.status}`);
    console.log('✔ STAFF user prevented from deleting product (status 403 Forbidden)');

    // Manager can delete clean product
    const adminDelRes = await request(`/api/products/${staffProdId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(adminDelRes.status === 200, `Expected 200 for manager deleting product, got ${adminDelRes.status}`);
    console.log('✔ MANAGER successfully deleted clean product (status 200 OK)');

    // Clean up TEST-SNS-001 created in test 23
    await prisma.stockQuant.deleteMany({ where: { productId: stockProdId } });
    await prisma.reorderRule.deleteMany({ where: { productId: stockProdId } });
    await prisma.product.delete({ where: { id: stockProdId } });

    // ==========================================
    // SHARED MODULES REGRESSION TESTS
    // ==========================================
    console.log('\n--- 35. Dashboard Baseline Regression ---');
    const dashRes = await request('/api/dashboard');
    assert(dashRes.status === 200, 'Dashboard request failed');
    assert(dashRes.json.data.kpis.totalStock === 722, `Expected totalStock 722, got ${dashRes.json.data.kpis.totalStock}`);
    assert(dashRes.json.data.kpis.lowStock === 2, `Expected 2 low stock alerts, got ${dashRes.json.data.kpis.lowStock}`);
    assert(dashRes.json.data.kpis.outOfStock === 1, `Expected 1 out of stock item, got ${dashRes.json.data.kpis.outOfStock}`);
    console.log(`✔ Dashboard verified: totalStock=${dashRes.json.data.kpis.totalStock}, lowStock=${dashRes.json.data.kpis.lowStock}, outOfStock=${dashRes.json.data.kpis.outOfStock}`);

    console.log('\n--- 36. Stock Ledger Regression ---');
    const ledgerRes = await request('/api/ledger');
    assert(ledgerRes.status === 200, 'Ledger request failed');
    const ledgerItems = ledgerRes.json.items || ledgerRes.json.data || [];
    assert(ledgerItems.length === 0, `Expected 0 moves, got ${ledgerItems.length}`);
    console.log('✔ Stock Ledger verified (0 moves in pristine baseline)');

    console.log('\n--- 37. Receipts API Regression ---');
    const rcptRes = await request('/api/operations/receipts');
    assert(rcptRes.status === 200, 'Receipts list failed');
    const rcptItems = rcptRes.json.items || rcptRes.json.data || [];
    assert(rcptItems.length === 0, 'Receipts list should be empty');
    console.log('✔ Receipts API regression check passed');

    console.log('\n--- 38. Deliveries API Regression ---');
    const delivRes = await request('/api/operations/deliveries');
    assert(delivRes.status === 200, 'Deliveries list failed');
    const delivItems = delivRes.json.items || delivRes.json.data || [];
    assert(delivItems.length === 0, 'Deliveries list should be empty');
    console.log('✔ Deliveries API regression check passed');

    console.log('\n--- 39. Internal Transfers API Regression ---');
    const xferRes = await request('/api/operations/transfers');
    assert(xferRes.status === 200, 'Transfers list failed');
    const xferItems = xferRes.json.items || xferRes.json.data || [];
    assert(xferItems.length === 0, 'Transfers list should be empty');
    console.log('✔ Internal Transfers API regression check passed');

    console.log('\n--- 40. Inventory Adjustments API Regression ---');
    const adjRes = await request('/api/operations/adjustments');
    assert(adjRes.status === 200, 'Adjustments list failed');
    const adjItems = adjRes.json.items || adjRes.json.data || [];
    assert(adjItems.length === 0, 'Adjustments list should be empty');
    console.log('✔ Inventory Adjustments API regression check passed');

    console.log('\n--- 41. Authentication API Regression ---');
    const meRes = await request('/api/auth/me', { token: adminToken });
    assert(meRes.status === 200, '/me check failed');
    assert(meRes.json.user.email === 'admin@stocksense.com', 'Admin email mismatch');
    assert(!meRes.json.user.passwordHash, 'passwordHash must never be exposed');
    assert(!meRes.json.user.otpCode, 'otpCode must never be exposed');
    console.log('✔ Authentication regression check passed (/me returns sanitized profile)');

    console.log('\n🎉 ALL 41 PRODUCTS, CATEGORIES, REORDER RULES & REGRESSION TESTS PASSED 100%!');
  } finally {
    // Database Cleanup: Remove any leftover test products/categories
    console.log('\n🧹 Restoring database to pristine baseline...');
    const testProducts = await prisma.product.findMany({
      where: {
        OR: [
          { sku: { startsWith: 'TEST-' } },
          { name: { contains: 'Test' } },
        ],
      },
    });

    for (const prod of testProducts) {
      await prisma.stockQuant.deleteMany({ where: { productId: prod.id } });
      await prisma.reorderRule.deleteMany({ where: { productId: prod.id } });
      await prisma.product.delete({ where: { id: prod.id } });
    }

    await prisma.productCategory.deleteMany({
      where: {
        name: { startsWith: 'Test' },
      },
    });

    console.log('✔ Cleanup complete. Temporary test records removed.');

    server.close();
  }
}

runTests()
  .catch((err) => {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
