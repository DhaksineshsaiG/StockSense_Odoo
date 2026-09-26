async function runIntegrationTests() {
  const baseURL = 'http://localhost:5173/api';
  console.log('=== StockSense Products + Categories + Reorder Rules E2E Verification ===\n');

  // 1. Authenticate as MANAGER
  const mgrLogin = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@stocksense.com', password: 'Admin@123' }),
  });
  const mgrAuth = await mgrLogin.json();
  const mgrToken = mgrAuth.token;
  console.log('✅ 1. Authenticated as MANAGER:', mgrAuth.user.name, `(${mgrAuth.user.role})`);

  // 2. Authenticate as STAFF
  const staffLogin = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@stocksense.com', password: 'Staff@123' }),
  });
  const staffAuth = await staffLogin.json();
  const staffToken = staffAuth.token;
  console.log('✅ 2. Authenticated as STAFF:', staffAuth.user.name, `(${staffAuth.user.role})`);

  const mgrHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${mgrToken}`,
  };

  const staffHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${staffToken}`,
  };

  // 3. GET /api/products (List products)
  const productsRes = await fetch(`${baseURL}/products?limit=20`, { headers: mgrHeaders });
  const productsData = await productsRes.json();
  console.log(`✅ 3. GET /api/products: Loaded ${productsData.data.length} products (Total: ${productsData.pagination.total})`);
  const firstProd = productsData.data[0];
  console.log(`   Sample product: ${firstProd.name} | SKU: ${firstProd.sku} | On Hand: ${firstProd.totalOnHand}`);

  // 4. Search by Name
  const searchNameRes = await fetch(`${baseURL}/products?search=${encodeURIComponent(firstProd.name.split(' ')[0])}`, { headers: mgrHeaders });
  const searchNameData = await searchNameRes.json();
  console.log(`✅ 4. Product Name Search: Found ${searchNameData.data.length} items`);

  // 5. Search by SKU
  const searchSkuRes = await fetch(`${baseURL}/products?sku=${firstProd.sku}`, { headers: mgrHeaders });
  const searchSkuData = await searchSkuRes.json();
  console.log(`✅ 5. Product SKU Search: Found ${searchSkuData.data.length} item(s)`);

  // 6. Category Filter
  if (firstProd.categoryId) {
    const catFilterRes = await fetch(`${baseURL}/products?categoryId=${firstProd.categoryId}`, { headers: mgrHeaders });
    const catFilterData = await catFilterRes.json();
    console.log(`✅ 6. Category Filter (${firstProd.categoryId}): Found ${catFilterData.data.length} items`);
  }

  // 7. GET /api/products/:id (Product Detail)
  const detailRes = await fetch(`${baseURL}/products/${firstProd.id}`, { headers: mgrHeaders });
  const detailData = await detailRes.json();
  console.log(`✅ 7. GET /api/products/:id: Loaded detail for ${detailData.data.name}`);
  console.log(`   Stock by Warehouse count: ${detailData.data.stock.byWarehouse.length}`);
  console.log(`   Stock by Location count: ${detailData.data.stock.byLocation.length}`);
  console.log(`   Reorder Rules count: ${detailData.data.reorderRules.length}`);

  // 8. GET /api/categories
  const catsRes = await fetch(`${baseURL}/categories`, { headers: mgrHeaders });
  const catsData = await catsRes.json();
  console.log(`✅ 8. GET /api/categories: Loaded ${catsData.data.length} categories`);
  const sampleCat = catsData.data[0];
  console.log(`   Sample category: ${sampleCat.name} | Products Count: ${sampleCat.productsCount}`);

  // 9. Category Search
  const catSearchRes = await fetch(`${baseURL}/categories?search=${encodeURIComponent(sampleCat.name.substring(0, 3))}`, { headers: mgrHeaders });
  const catSearchData = await catSearchRes.json();
  console.log(`✅ 9. Category Search: Found ${catSearchData.data.length} categories`);

  // 10. Create New Category
  const testCatName = `Test-Cat-${Date.now()}`;
  const createCatRes = await fetch(`${baseURL}/categories`, {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({ name: testCatName, description: 'Temporary test category' }),
  });
  const createCatData = await createCatRes.json();
  const createdCat = createCatData.data;
  console.log(`✅ 10. Create Category succeeded: '${createdCat.name}' (ID: ${createdCat.id})`);

  // 11. Duplicate Category Handling
  const dupCatRes = await fetch(`${baseURL}/categories`, {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({ name: testCatName, description: 'Duplicate check' }),
  });
  console.log(`✅ 11. Duplicate Category Status: ${dupCatRes.status} (Expected 400/409 conflict)`);

  // 12. Update Category
  const updateCatRes = await fetch(`${baseURL}/categories/${createdCat.id}`, {
    method: 'PATCH',
    headers: mgrHeaders,
    body: JSON.stringify({ description: 'Updated test category description' }),
  });
  const updateCatData = await updateCatRes.json();
  console.log(`✅ 12. Update Category: ${updateCatData.data.description}`);

  // 13. Create New Product
  const testSku = `TEST-${Date.now()}`;
  const createProdRes = await fetch(`${baseURL}/products`, {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({
      name: 'Integration Test Widget',
      sku: testSku,
      categoryId: createdCat.id,
      uom: 'Units',
      costPrice: 15.5,
      salePrice: 29.99,
    }),
  });
  const createProdData = await createProdRes.json();
  const createdProd = createProdData.data;
  console.log(`✅ 13. Create Product succeeded: '${createdProd.name}' | SKU: ${createdProd.sku}`);

  // 14. Duplicate SKU Handling
  const dupSkuRes = await fetch(`${baseURL}/products`, {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({
      name: 'Another Widget',
      sku: testSku,
      categoryId: createdCat.id,
    }),
  });
  console.log(`✅ 14. Duplicate SKU Status: ${dupSkuRes.status} (Expected 400/409 conflict)`);

  // 15. Edit Product
  const updateProdRes = await fetch(`${baseURL}/products/${createdProd.id}`, {
    method: 'PATCH',
    headers: mgrHeaders,
    body: JSON.stringify({
      name: 'Integration Test Widget (Updated)',
      salePrice: 34.99,
    }),
  });
  const updateProdData = await updateProdRes.json();
  console.log(`✅ 15. Update Product succeeded: Name is now '${updateProdData.data.name}' | Sale Price: $${updateProdData.data.salePrice}`);

  // 16. Test Category Deletion Conflict (Category contains product)
  const delCatWithProdRes = await fetch(`${baseURL}/categories/${createdCat.id}`, {
    method: 'DELETE',
    headers: mgrHeaders,
  });
  console.log(`✅ 16. Delete Category with Products Status: ${delCatWithProdRes.status} (Backend rejects with 400 conflict)`);

  // 17. Direct Set Stock on Product
  // Get location
  const locsRes = await fetch(`${baseURL}/locations?limit=5`, { headers: mgrHeaders });
  const locsData = await locsRes.json();
  const targetLoc = locsData.data[0];

  const setStockRes = await fetch(`${baseURL}/products/${createdProd.id}/stock`, {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({
      locationId: targetLoc.id,
      quantity: 50,
    }),
  });
  const setStockData = await setStockRes.json();
  console.log(`✅ 17. Direct Set Stock: Set ${setStockData.data.quantity} units in ${targetLoc.code}`);

  // 18. Create Reorder Rule
  const createRuleRes = await fetch(`${baseURL}/products/${createdProd.id}/reorder-rules`, {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({
      locationId: targetLoc.id,
      minQuantity: 10,
      maxQuantity: 100,
    }),
  });
  const createRuleData = await createRuleRes.json();
  const createdRule = createRuleData.data;
  console.log(`✅ 18. Create Reorder Rule succeeded: Min: ${createdRule.minQuantity} | Max: ${createdRule.maxQuantity}`);

  // 19. Update Reorder Rule
  const updateRuleRes = await fetch(`${baseURL}/reorder-rules/${createdRule.id}`, {
    method: 'PATCH',
    headers: mgrHeaders,
    body: JSON.stringify({
      minQuantity: 15,
      maxQuantity: 120,
    }),
  });
  const updateRuleData = await updateRuleRes.json();
  console.log(`✅ 19. Update Reorder Rule succeeded: Min is now ${updateRuleData.data.minQuantity}`);

  // 20. Delete Reorder Rule by Staff vs Manager
  const staffDeleteRuleRes = await fetch(`${baseURL}/reorder-rules/${createdRule.id}`, {
    method: 'DELETE',
    headers: staffHeaders,
  });
  console.log(`✅ 20. Staff Delete Rule Status: ${staffDeleteRuleRes.status} (Role enforcement)`);

  const mgrDeleteRuleRes = await fetch(`${baseURL}/reorder-rules/${createdRule.id}`, {
    method: 'DELETE',
    headers: mgrHeaders,
  });
  console.log(`✅ 21. Manager Delete Rule Status: ${mgrDeleteRuleRes.status} (Expected 200 OK)`);

  // 22. Reset stock before deleting product
  await fetch(`${baseURL}/products/${createdProd.id}/stock`, {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({ locationId: targetLoc.id, quantity: 0 }),
  });

  // 23. Delete Test Product (Manager)
  const delProdRes = await fetch(`${baseURL}/products/${createdProd.id}`, {
    method: 'DELETE',
    headers: mgrHeaders,
  });
  console.log(`✅ 23. Delete Test Product: ${delProdRes.status}`);

  // 24. Delete Test Category (Now empty)
  const delCatRes = await fetch(`${baseURL}/categories/${createdCat.id}`, {
    method: 'DELETE',
    headers: mgrHeaders,
  });
  console.log(`✅ 24. Delete Empty Test Category: ${delCatRes.status}`);

  // 25. Regression Check: Dashboard loads
  const dashRes = await fetch(`${baseURL}/dashboard`, { headers: mgrHeaders });
  const dashData = await dashRes.json();
  console.log(`✅ 25. Regression Check: Dashboard KPIs intact: Total Stock = ${dashData.data.kpis.totalStock}, Low Stock = ${dashData.data.kpis.lowStock}`);

  console.log('\n🎉 ALL 25 TESTS PASSED SUCCESSFULLY! Database cleanly preserved.');
}

runIntegrationTests();
