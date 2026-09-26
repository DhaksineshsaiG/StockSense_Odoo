import http from 'http';
import app from '../server/src/app';
import prisma from '../server/src/config/db';

const PORT = 3103;
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

async function cleanupTestRecords() {
  const testLocations = await prisma.location.findMany({
    where: {
      OR: [
        { code: { startsWith: 'TEST-', mode: 'insensitive' } },
        { name: { contains: 'Test', mode: 'insensitive' } },
        { code: { contains: 'Cold', mode: 'insensitive' } },
        { name: { contains: 'Cold', mode: 'insensitive' } },
        { name: { contains: 'Storage Vault', mode: 'insensitive' } },
      ],
    },
  });

  for (const loc of testLocations) {
    await prisma.stockQuant.deleteMany({ where: { locationId: loc.id } });
    await prisma.reorderRule.deleteMany({ where: { locationId: loc.id } });
    await prisma.location.delete({ where: { id: loc.id } });
  }

  const testWarehouses = await prisma.warehouse.findMany({
    where: {
      OR: [
        { code: { startsWith: 'TEST-', mode: 'insensitive' } },
        { name: { contains: 'Test', mode: 'insensitive' } },
      ],
    },
  });

  for (const wh of testWarehouses) {
    await prisma.operationSequence.deleteMany({ where: { warehouseId: wh.id } });
    await prisma.warehouse.delete({ where: { id: wh.id } });
  }
}

async function runTests() {
  console.log('🚀 Starting Warehouse & Location API, Integration, and Regression Tests on real Neon PostgreSQL...\n');

  await cleanupTestRecords();

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

    // ==========================================
    // WAREHOUSE TESTS
    // ==========================================
    console.log('\n--- 1. Warehouse List ---');
    const whListRes = await request('/api/warehouses');
    assert(whListRes.status === 200, 'Warehouse list failed');
    assert(Array.isArray(whListRes.json.data), 'Expected array of warehouses');
    assert(whListRes.json.data.length === 2, `Expected 2 seeded warehouses, got ${whListRes.json.data.length}`);
    const mainWh = whListRes.json.data.find((w: any) => w.code === 'WH');
    const secWh = whListRes.json.data.find((w: any) => w.code === 'WH2');
    assert(!!mainWh && !!secWh, 'Seeded warehouses WH and WH2 must exist');
    assert(mainWh.locationsCount === 3, `Expected WH to have 3 locations, got ${mainWh.locationsCount}`);
    assert(secWh.locationsCount === 2, `Expected WH2 to have 2 locations, got ${secWh.locationsCount}`);
    console.log(`✔ Warehouse list returned 2 seeded warehouses with correct location counts (WH: 3, WH2: 2)`);

    console.log('\n--- 2. Warehouse Detail ---');
    const whDetailRes = await request(`/api/warehouses/${mainWh.id}`);
    assert(whDetailRes.status === 200, 'Warehouse detail failed');
    assert(whDetailRes.json.data.name === 'Main Warehouse', 'Warehouse name mismatch');
    assert(whDetailRes.json.data.code === 'WH', 'Warehouse code mismatch');
    assert(whDetailRes.json.data.locations.length === 3, 'Expected 3 locations in detail');
    // WH Stock: 150 (Steel) + 2 (Damaged) + 500 (Copper) + 12 (Alum) + 8 (Bearing) + 0 (Motor) = 672
    assert(whDetailRes.json.data.stockSummary.totalOnHand === 672, `Expected totalOnHand 672, got ${whDetailRes.json.data.stockSummary.totalOnHand}`);
    console.log(`✔ Warehouse detail verified for WH: totalOnHand=672 across 3 locations`);

    console.log('\n--- 3. Create Warehouse ---');
    const createWhRes = await request('/api/warehouses', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Test Regional Warehouse',
        code: 'TEST-RWH',
        address: 'Plot 99, North Logistics Hub',
      },
    });
    assert(createWhRes.status === 201, `Expected 201 on warehouse create, got ${createWhRes.status}`);
    const testWhId = createWhRes.json.data.id;
    assert(createWhRes.json.data.code === 'TEST-RWH', 'Warehouse code not normalized/stored');
    console.log(`✔ Warehouse created successfully: ID=${testWhId}, code='${createWhRes.json.data.code}'`);

    console.log('\n--- 4. Duplicate Code Rejection ---');
    const dupCodeRes = await request('/api/warehouses', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Duplicate Warehouse',
        code: 'TEST-RWH',
      },
    });
    assert([400, 409].includes(dupCodeRes.status), `Expected 400/409 on duplicate code, got ${dupCodeRes.status}`);
    console.log(`✔ Duplicate warehouse code rejected with status ${dupCodeRes.status}`);

    console.log('\n--- 5. Invalid Input Rejection ---');
    const emptyWhRes = await request('/api/warehouses', {
      method: 'POST',
      token: adminToken,
      body: {
        name: '   ',
        code: '',
      },
    });
    assert(emptyWhRes.status === 400, `Expected 400 on empty warehouse name/code, got ${emptyWhRes.status}`);
    console.log('✔ Empty warehouse inputs rejected with status 400');

    console.log('\n--- 6. Search Warehouse ---');
    const searchWhRes = await request('/api/warehouses?search=Secondary');
    assert(searchWhRes.status === 200, 'Search warehouse failed');
    assert(searchWhRes.json.data.length === 1 && searchWhRes.json.data[0].code === 'WH2', 'Search did not match Secondary Warehouse');
    console.log('✔ Search warehouse matched "Secondary Warehouse"');

    console.log('\n--- 7. Warehouse Pagination ---');
    const pagWhRes = await request('/api/warehouses?page=1&limit=2');
    assert(pagWhRes.status === 200, 'Warehouse pagination failed');
    assert(pagWhRes.json.data.length === 2, `Expected 2 warehouses, got ${pagWhRes.json.data.length}`);
    assert(pagWhRes.json.pagination.total >= 3, 'Expected total >= 3 with test warehouse');
    console.log(`✔ Pagination verified: page=1, limit=2, total=${pagWhRes.json.pagination.total}`);

    console.log('\n--- 8. Update Warehouse ---');
    const updateWhRes = await request(`/api/warehouses/${testWhId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        name: 'Updated Regional Logistics Center',
        address: 'Plot 100, Updated Avenue',
      },
    });
    assert(updateWhRes.status === 200, `Expected 200 on update, got ${updateWhRes.status}`);
    assert(updateWhRes.json.data.name === 'Updated Regional Logistics Center', 'Name not updated');
    console.log(`✔ Warehouse updated: name='${updateWhRes.json.data.name}'`);

    console.log('\n--- 9. Code Collision on Update ---');
    const collWhRes = await request(`/api/warehouses/${testWhId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        code: 'WH', // Already taken by Main Warehouse
      },
    });
    assert([400, 409].includes(collWhRes.status), `Expected 400/409 on code collision, got ${collWhRes.status}`);
    console.log(`✔ Code collision on update rejected with status ${collWhRes.status}`);

    console.log('\n--- 10. Non-existent Warehouse ---');
    const notFoundWhRes = await request('/api/warehouses/00000000-0000-0000-0000-000000000000');
    assert(notFoundWhRes.status === 404, `Expected 404, got ${notFoundWhRes.status}`);
    console.log('✔ Non-existent warehouse returned 404');

    console.log('\n--- 11. Safe Deletion Behavior (Warehouse) ---');
    // Cannot delete warehouse with locations (WH)
    const delSeededWhRes = await request(`/api/warehouses/${mainWh.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert([400, 409].includes(delSeededWhRes.status), `Expected 400/409 when deleting warehouse with locations, got ${delSeededWhRes.status}`);
    console.log(`✔ Warehouse with locations protected from deletion (status ${delSeededWhRes.status})`);

    // Clean unused warehouse can be deleted
    const delTestWhRes = await request(`/api/warehouses/${testWhId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(delTestWhRes.status === 200, `Expected 200 when deleting unused test warehouse, got ${delTestWhRes.status}`);
    console.log('✔ Unused test warehouse safely deleted');

    // ==========================================
    // LOCATION TESTS
    // ==========================================
    console.log('\n--- 12. Location List ---');
    const locListRes = await request(`/api/warehouses/${mainWh.id}/locations`);
    assert(locListRes.status === 200, 'Warehouse locations list failed');
    assert(locListRes.json.data.length === 3, `Expected 3 locations in WH, got ${locListRes.json.data.length}`);
    const whStockLocation = locListRes.json.data.find((l: any) => l.code === 'WH/Stock');
    assert(!!whStockLocation, 'WH/Stock location must exist');
    assert(whStockLocation.onHand === 670, `Expected WH/Stock onHand 670 (672-2 damaged), got ${whStockLocation.onHand}`);
    console.log(`✔ Location list for WH returned 3 locations (WH/Stock onHand=${whStockLocation.onHand})`);

    const allLocsRes = await request('/api/locations');
    assert(allLocsRes.status === 200, 'Global locations list failed');
    assert(allLocsRes.json.data.length === 5, `Expected 5 seeded locations, got ${allLocsRes.json.data.length}`);
    console.log(`✔ Global /api/locations endpoint returned all 5 seeded locations`);

    console.log('\n--- 13. Location Detail ---');
    const locDetailRes = await request(`/api/locations/${whStockLocation.id}`);
    assert(locDetailRes.status === 200, 'Location detail failed');
    assert(locDetailRes.json.data.code === 'WH/Stock', 'Location code mismatch');
    assert(locDetailRes.json.data.type === 'INTERNAL', 'Location type mismatch');
    assert(locDetailRes.json.data.stockSummary.totalOnHand === 670, 'Stock summary onHand mismatch');
    assert(locDetailRes.json.data.products.length === 5, `Expected 5 product stock quants in WH/Stock, got ${locDetailRes.json.data.products.length}`);
    assert(locDetailRes.json.data.reorderRules.length === 5, `Expected 5 reorder rules in WH/Stock, got ${locDetailRes.json.data.reorderRules.length}`);
    console.log(`✔ Location detail verified for WH/Stock: 5 products, 5 reorder rules, totalOnHand=670`);

    console.log('\n--- 14. Create Location ---');
    const createLocRes = await request(`/api/warehouses/${secWh.id}/locations`, {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Cold Storage Room',
        code: 'WH2/Cold',
        type: 'INTERNAL',
      },
    });
    assert(createLocRes.status === 201, `Expected 201 on location create, got ${createLocRes.status}`);
    const testLocId = createLocRes.json.data.id;
    assert(createLocRes.json.data.code === 'WH2/Cold', 'Location code mismatch');
    assert(createLocRes.json.data.type === 'INTERNAL', 'Location type mismatch');
    console.log(`✔ Location created: ID=${testLocId}, code='${createLocRes.json.data.code}', type='${createLocRes.json.data.type}'`);

    console.log('\n--- 15. Duplicate Location Rejection ---');
    const dupLocRes = await request(`/api/warehouses/${secWh.id}/locations`, {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Cold Storage Room',
        code: 'WH2/Cold',
      },
    });
    assert([400, 409].includes(dupLocRes.status), `Expected 400/409 on duplicate location, got ${dupLocRes.status}`);
    console.log(`✔ Duplicate location rejected with status ${dupLocRes.status}`);

    console.log('\n--- 16. Invalid Location Type Rejection ---');
    const invTypeLocRes = await request(`/api/warehouses/${secWh.id}/locations`, {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Invalid Type Room',
        type: 'FLYING_STORAGE',
      },
    });
    assert(invTypeLocRes.status === 400, `Expected 400 for invalid type, got ${invTypeLocRes.status}`);
    console.log('✔ Invalid location type rejected with status 400');

    console.log('\n--- 17. Search Location ---');
    const searchLocRes = await request(`/api/warehouses/${secWh.id}/locations?search=Cold`);
    assert(searchLocRes.status === 200, 'Search location failed');
    assert(searchLocRes.json.data.length === 1 && searchLocRes.json.data[0].code === 'WH2/Cold', 'Search location mismatch');
    console.log('✔ Search location matched "Cold Storage Room"');

    console.log('\n--- 18. Type Filtering ---');
    const typeLocRes = await request(`/api/warehouses/${mainWh.id}/locations?type=INVENTORY_LOSS`);
    assert(typeLocRes.status === 200, 'Type filter failed');
    assert(typeLocRes.json.data.length === 1 && typeLocRes.json.data[0].code === 'WH/Damaged', 'Expected WH/Damaged');
    console.log('✔ Location type filtering verified (INVENTORY_LOSS -> WH/Damaged)');

    console.log('\n--- 19. Location Pagination ---');
    const pagLocRes = await request(`/api/warehouses/${mainWh.id}/locations?page=1&limit=2`);
    assert(pagLocRes.status === 200, 'Location pagination failed');
    assert(pagLocRes.json.data.length === 2, `Expected 2 locations, got ${pagLocRes.json.data.length}`);
    assert(pagLocRes.json.pagination.total === 3, 'Expected total 3');
    console.log(`✔ Location pagination verified: page=1, limit=2, total=${pagLocRes.json.pagination.total}`);

    console.log('\n--- 20. Update Location ---');
    const updateLocRes = await request(`/api/locations/${testLocId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        name: 'Deep Freeze Storage Vault',
      },
    });
    assert(updateLocRes.status === 200, `Expected 200 on location update, got ${updateLocRes.status}`);
    assert(updateLocRes.json.data.name === 'Deep Freeze Storage Vault', 'Location name not updated');
    console.log(`✔ Location updated: name='${updateLocRes.json.data.name}'`);

    console.log('\n--- 21. Invalid Location Update Rejection ---');
    // Attempting to move location to another warehouse is forbidden
    const moveWhRes = await request(`/api/locations/${testLocId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        warehouseId: mainWh.id, // trying to reassign warehouse
      },
    });
    assert(moveWhRes.status === 400, `Expected 400 when attempting warehouse reassignment, got ${moveWhRes.status}`);

    // Attempting invalid type
    const badTypeRes = await request(`/api/locations/${testLocId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        type: 'INVALID_TYPE',
      },
    });
    assert(badTypeRes.status === 400, `Expected 400 for invalid type, got ${badTypeRes.status}`);
    console.log('✔ Immutable warehouseId check and invalid type check on update rejected with status 400');

    console.log('\n--- 22. Non-existent Location ---');
    const notFoundLocRes = await request('/api/locations/00000000-0000-0000-0000-000000000000');
    assert(notFoundLocRes.status === 404, `Expected 404, got ${notFoundLocRes.status}`);
    console.log('✔ Non-existent location returned 404');

    console.log('\n--- 23. Safe Deletion Behavior (Location) ---');
    // Cannot delete location with stock and reorder rules (WH/Stock)
    const delStockLocRes = await request(`/api/locations/${whStockLocation.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert([400, 409].includes(delStockLocRes.status), `Expected 400/409 when deleting location with stock, got ${delStockLocRes.status}`);
    console.log(`✔ Location with active stock is protected from deletion (status ${delStockLocRes.status})`);

    // Clean test location can be deleted
    const delTestLocRes = await request(`/api/locations/${testLocId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(delTestLocRes.status === 200, `Expected 200 when deleting unused location, got ${delTestLocRes.status}`);
    console.log('✔ Unused test location safely deleted');

    // ==========================================
    // AUTHORIZATION TESTS
    // ==========================================
    console.log('\n--- 24. Unauthenticated Warehouse Mutation Rejected ---');
    const unauthWhRes = await request('/api/warehouses', {
      method: 'POST',
      body: { name: 'Unauth WH', code: 'UNAUTH-WH' },
    });
    assert(unauthWhRes.status === 401, `Expected 401, got ${unauthWhRes.status}`);
    console.log('✔ Unauthenticated warehouse mutation rejected with 401');

    console.log('\n--- 25. Unauthenticated Location Mutation Rejected ---');
    const unauthLocRes = await request(`/api/warehouses/${mainWh.id}/locations`, {
      method: 'POST',
      body: { name: 'Unauth Loc', code: 'WH/Unauth' },
    });
    assert(unauthLocRes.status === 401, `Expected 401, got ${unauthLocRes.status}`);
    console.log('✔ Unauthenticated location mutation rejected with 401');

    console.log('\n--- 26. STAFF Authenticated Mutation Accepted ---');
    const staffWhRes = await request('/api/warehouses', {
      method: 'POST',
      token: staffToken,
      body: {
        name: 'Staff Staging Hub',
        code: 'TEST-STF-WH',
      },
    });
    assert(staffWhRes.status === 201, `Expected 201 for staff warehouse create, got ${staffWhRes.status}`);
    const staffWhId = staffWhRes.json.data.id;

    const staffLocRes = await request(`/api/warehouses/${staffWhId}/locations`, {
      method: 'POST',
      token: staffToken,
      body: {
        name: 'Staff Sorting Dock',
        code: 'TEST-STF-WH/Dock',
      },
    });
    assert(staffLocRes.status === 201, `Expected 201 for staff location create, got ${staffLocRes.status}`);
    const staffLocId = staffLocRes.json.data.id;
    console.log('✔ STAFF authenticated mutations accepted for creating warehouse and location');

    console.log('\n--- 27. STAFF Destructive Delete Rejected ---');
    const staffDelLocRes = await request(`/api/locations/${staffLocId}`, {
      method: 'DELETE',
      token: staffToken,
    });
    assert(staffDelLocRes.status === 403, `Expected 403 for staff delete location, got ${staffDelLocRes.status}`);

    const staffDelWhRes = await request(`/api/warehouses/${staffWhId}`, {
      method: 'DELETE',
      token: staffToken,
    });
    assert(staffDelWhRes.status === 403, `Expected 403 for staff delete warehouse, got ${staffDelWhRes.status}`);
    console.log('✔ STAFF user prevented from deleting locations and warehouses (403 Forbidden)');

    console.log('\n--- 28. MANAGER Destructive Delete Accepted When Safe ---');
    const adminDelLocRes = await request(`/api/locations/${staffLocId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(adminDelLocRes.status === 200, `Expected 200 for manager delete location, got ${adminDelLocRes.status}`);

    const adminDelWhRes = await request(`/api/warehouses/${staffWhId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(adminDelWhRes.status === 200, `Expected 200 for manager delete warehouse, got ${adminDelWhRes.status}`);
    console.log('✔ MANAGER successfully deleted clean location and warehouse');

    // ==========================================
    // INTEGRATION & COMPATIBILITY TESTS
    // ==========================================
    console.log('\n--- 29. Dashboard Warehouse Filter ---');
    const dashWhRes = await request(`/api/dashboard?warehouseId=${mainWh.id}`);
    assert(dashWhRes.status === 200, 'Dashboard warehouse filter failed');
    assert(dashWhRes.json.data.filters.warehouseId === mainWh.id, 'Filter warehouseId mismatch');
    assert(dashWhRes.json.data.kpis.totalStock === 672, `Expected totalStock 672 for WH, got ${dashWhRes.json.data.kpis.totalStock}`);
    console.log(`✔ Dashboard warehouse filter verified for WH: totalStock=${dashWhRes.json.data.kpis.totalStock}`);

    console.log('\n--- 30. Product Warehouse Filter ---');
    const prodWhRes = await request(`/api/products?warehouseId=${secWh.id}`);
    assert(prodWhRes.status === 200, 'Product warehouse filter failed');
    assert(prodWhRes.json.data.length === 1 && prodWhRes.json.data[0].sku === 'RAW-STL-001', 'Expected Steel Rod in WH2');
    console.log('✔ Product warehouse filter returned products with stock in WH2');

    console.log('\n--- 31. Product Multi-Warehouse Stock ---');
    const steelRod = await prisma.product.findUniqueOrThrow({ where: { sku: 'RAW-STL-001' } });
    const prodDetailRes = await request(`/api/products/${steelRod.id}`);
    assert(prodDetailRes.status === 200, 'Product detail failed');
    assert(prodDetailRes.json.data.stock.byWarehouse.length === 2, 'Expected 2 warehouses for Steel Rod');
    const whSummary = prodDetailRes.json.data.stock.byWarehouse.find((w: any) => w.warehouseCode === 'WH');
    const wh2Summary = prodDetailRes.json.data.stock.byWarehouse.find((w: any) => w.warehouseCode === 'WH2');
    assert(whSummary.onHand === 152, `Expected 152 in WH, got ${whSummary.onHand}`);
    assert(wh2Summary.onHand === 50, `Expected 50 in WH2, got ${wh2Summary.onHand}`);
    console.log('✔ Multi-warehouse stock verified on product detail (WH: 152, WH2: 50)');

    console.log('\n--- 32. Receipts Compatibility ---');
    const rcptRes = await request(`/api/operations/receipts?warehouseId=${mainWh.id}`);
    assert(rcptRes.status === 200, 'Receipts query failed');
    console.log('✔ Receipts API compatibility verified');

    console.log('\n--- 33. Deliveries Compatibility ---');
    const delivRes = await request(`/api/operations/deliveries?warehouseId=${mainWh.id}`);
    assert(delivRes.status === 200, 'Deliveries query failed');
    console.log('✔ Deliveries API compatibility verified');

    console.log('\n--- 34. Internal Transfers Compatibility ---');
    const xferRes = await request(`/api/operations/transfers?warehouseId=${mainWh.id}`);
    assert(xferRes.status === 200, 'Transfers query failed');
    console.log('✔ Internal Transfers API compatibility verified');

    console.log('\n--- 35. Inventory Adjustments Compatibility ---');
    const adjRes = await request(`/api/operations/adjustments?warehouseId=${mainWh.id}`);
    assert(adjRes.status === 200, 'Adjustments query failed');
    console.log('✔ Inventory Adjustments API compatibility verified');

    console.log('\n--- 36. Stock Ledger Compatibility ---');
    const ledgerRes = await request(`/api/ledger?warehouseId=${mainWh.id}`);
    assert(ledgerRes.status === 200, 'Ledger query failed');
    console.log('✔ Stock Ledger API compatibility verified');

    console.log('\n--- 37. Authentication Compatibility ---');
    const meRes = await request('/api/auth/me', { token: adminToken });
    assert(meRes.status === 200, '/me query failed');
    assert(meRes.json.user.email === 'admin@stocksense.com', 'User email mismatch');
    console.log('✔ Authentication API compatibility verified');

    // ==========================================
    // DATABASE INTEGRITY VERIFICATION
    // ==========================================
    console.log('\n--- 38-42. Database Integrity Verification ---');
    const whCount = await prisma.warehouse.count();
    assert(whCount === 2, `Expected 2 warehouses, got ${whCount}`);
    console.log('✔ 38. Warehouses count: 2');

    const locCount = await prisma.location.count();
    assert(locCount === 5, `Expected 5 locations, got ${locCount}`);
    console.log('✔ 39. Locations count: 5');

    const quantCount = await prisma.stockQuant.count();
    const quantSum = await prisma.stockQuant.aggregate({ _sum: { quantity: true } });
    assert(quantCount === 7, `Expected 7 quants, got ${quantCount}`);
    assert(quantSum._sum.quantity === 722, `Expected 722 total stock, got ${quantSum._sum.quantity}`);
    console.log(`✔ 40. StockQuants count: 7 (sum: 722)`);

    const ruleCount = await prisma.reorderRule.count();
    assert(ruleCount === 6, `Expected 6 reorder rules, got ${ruleCount}`);
    console.log('✔ 41. Reorder rules count: 6');

    const seqCount = await prisma.operationSequence.count();
    assert(seqCount === 8, `Expected 8 operation sequences, got ${seqCount}`);
    console.log('✔ 42. Operation sequences count: 8');

    console.log('\n🎉 ALL 42 WAREHOUSE, LOCATION, INTEGRATION & REGRESSION TESTS PASSED 100%!');
  } finally {
    // Database Cleanup: Remove any temporary test warehouses/locations
    console.log('\n🧹 Restoring database to pristine baseline...');
    await cleanupTestRecords();
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
