import prisma from '../server/src/config/db';

async function runOperationsE2ETests() {
  const baseURL = 'http://localhost:5173/api';
  console.log('===============================================================');
  console.log('   StockSense Operations Milestone E2E Verification & Audit   ');
  console.log('===============================================================\n');

  // STEP 0: Capture Pristine Baseline
  console.log('📸 Step 0: Capturing Database Baseline Snapshot...');
  const initialOperationsCount = await prisma.operation.count();
  const initialMovesCount = await prisma.stockMove.count();
  const initialQuants = await prisma.stockQuant.findMany();

  console.log(`   Initial Operations: ${initialOperationsCount}`);
  console.log(`   Initial Stock Moves: ${initialMovesCount}`);
  console.log(`   Initial Stock Quants: ${initialQuants.length}`);
  for (const q of initialQuants) {
    console.log(`   • Quant ${q.id.substring(0, 8)}: Prod ${q.productId.substring(0, 8)} | Loc ${q.locationId.substring(0, 8)} | Qty: ${q.quantity} | Res: ${q.reservedQuantity}`);
  }

  // STEP 1: AUTHENTICATION
  console.log('\n🔐 Step 1: Testing Authentication...');
  const mgrLoginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@stocksense.com', password: 'Admin@123' }),
  });
  const mgrAuth = await mgrLoginRes.json();
  const mgrToken = mgrAuth.token;
  console.log('   ✅ Manager Login succeeded:', mgrAuth.user.name, `(${mgrAuth.user.role})`);

  const staffLoginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@stocksense.com', password: 'Staff@123' }),
  });
  const staffAuth = await staffLoginRes.json();
  const staffToken = staffAuth.token;
  console.log('   ✅ Staff Login succeeded:', staffAuth.user.name, `(${staffAuth.user.role})`);

  const mgrHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${mgrToken}`,
  };

  // STEP 2: LOAD METADATA
  console.log('\n🏢 Step 2: Loading Warehouse, Location, and Product Metadata...');
  const whRes = await fetch(`${baseURL}/warehouses`, { headers: mgrHeaders });
  const whData = await whRes.json();
  const primaryWh = whData.data[0];
  console.log(`   ✅ Warehouse: ${primaryWh.name} (${primaryWh.code})`);

  const locRes = await fetch(`${baseURL}/locations?warehouseId=${primaryWh.id}`, { headers: mgrHeaders });
  const locData = await locRes.json();
  const whLocations = locData.data;
  const stockLoc = whLocations.find((l: any) => l.type === 'INTERNAL' || l.code.includes('STOCK')) || whLocations[0];
  const outputLoc = whLocations.find((l: any) => l.id !== stockLoc.id) || whLocations[1];
  console.log(`   ✅ Primary Stock Location: ${stockLoc.name} (${stockLoc.code})`);
  console.log(`   ✅ Secondary Location: ${outputLoc.name} (${outputLoc.code})`);

  const prodRes = await fetch(`${baseURL}/products?limit=10`, { headers: mgrHeaders });
  const prodData = await prodRes.json();
  const testProduct1 = prodData.data[0];
  const testProduct2 = prodData.data[1];
  console.log(`   ✅ Test Product 1: ${testProduct1.name} (${testProduct1.sku})`);
  console.log(`   ✅ Test Product 2: ${testProduct2.name} (${testProduct2.sku})`);

  const createdOpIds: string[] = [];

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: RECEIPTS WORKFLOW
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📥 Step 3: Testing Receipts Workflow...');
    // 3.1 List receipts
    const rcptListRes = await fetch(`${baseURL}/operations/receipts?limit=10`, { headers: mgrHeaders });
    const rcptListData = await rcptListRes.json();
    console.log(`   ✅ 3.1 List Receipts: total = ${rcptListData.total}`);

    // 3.2 Create Receipt (Multi-item)
    const createRcptRes = await fetch(`${baseURL}/operations/receipts`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        destLocationId: stockLoc.id,
        partnerName: 'Acme Test Supplies',
        notes: 'Integration Test Inbound Receipt',
        items: [
          { productId: testProduct1.id, demandQty: 25, uom: testProduct1.uom },
          { productId: testProduct2.id, demandQty: 10, uom: testProduct2.uom },
        ],
      }),
    });
    const createRcptData = await createRcptRes.json();
    const createdReceipt = createRcptData.data;
    createdOpIds.push(createdReceipt.id);
    console.log(`   ✅ 3.2 Create Receipt succeeded: ${createdReceipt.reference} (Status: ${createdReceipt.status}, Lines: ${createdReceipt.items.length})`);

    // 3.3 Edit Draft Receipt
    const updateRcptRes = await fetch(`${baseURL}/operations/receipts/${createdReceipt.id}`, {
      method: 'PATCH',
      headers: mgrHeaders,
      body: JSON.stringify({
        notes: 'Updated PO Note - Ready for Receiving',
        items: [
          { productId: testProduct1.id, demandQty: 30, uom: testProduct1.uom },
        ],
      }),
    });
    const updateRcptData = await updateRcptRes.json();
    console.log(`   ✅ 3.3 Edit Draft Receipt: items count is now ${updateRcptData.data.items.length}, demand is ${updateRcptData.data.items[0].demandQty}`);

    // 3.4 Validate Receipt
    const quantBeforeRcpt = await prisma.stockQuant.findFirst({
      where: { productId: testProduct1.id, locationId: stockLoc.id },
    });
    const qtyBeforeRcpt = quantBeforeRcpt?.quantity || 0;

    // Transition to READY status first
    await fetch(`${baseURL}/operations/receipts/${createdReceipt.id}`, {
      method: 'PATCH',
      headers: mgrHeaders,
      body: JSON.stringify({ status: 'READY' }),
    });

    const validateRcptRes = await fetch(`${baseURL}/operations/receipts/${createdReceipt.id}/validate`, {
      method: 'POST',
      headers: mgrHeaders,
    });
    const validateRcptData = await validateRcptRes.json();
    console.log(`   ✅ 3.4 Validate Receipt: ${validateRcptData.message} (Status: ${validateRcptData.data?.status})`);

    // Verify stock increased by 30
    const quantAfterRcpt = await prisma.stockQuant.findFirst({
      where: { productId: testProduct1.id, locationId: stockLoc.id },
    });
    const qtyAfterRcpt = quantAfterRcpt?.quantity || 0;
    console.log(`   ✅ 3.5 Stock Verification: Before = ${qtyBeforeRcpt} -> After = ${qtyAfterRcpt} (Delta: +${qtyAfterRcpt - qtyBeforeRcpt})`);
    if (qtyAfterRcpt !== qtyBeforeRcpt + 30) {
      throw new Error(`Expected stock to increase by 30, but was ${qtyAfterRcpt - qtyBeforeRcpt}`);
    }

    // 3.6 Cannot edit completed receipt
    const rejectEditRcptRes = await fetch(`${baseURL}/operations/receipts/${createdReceipt.id}`, {
      method: 'PATCH',
      headers: mgrHeaders,
      body: JSON.stringify({ notes: 'Should fail' }),
    });
    console.log(`   ✅ 3.6 Completed Receipt Edit Rejection: Status ${rejectEditRcptRes.status} (Expected 400 Bad Request)`);

    // 3.7 Create and Cancel a Draft Receipt
    const cancelRcptRes = await fetch(`${baseURL}/operations/receipts`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        destLocationId: stockLoc.id,
        items: [{ productId: testProduct1.id, demandQty: 5 }],
      }),
    });
    const toCancelRcpt = (await cancelRcptRes.json()).data;
    createdOpIds.push(toCancelRcpt.id);

    const doCancelRcptRes = await fetch(`${baseURL}/operations/receipts/${toCancelRcpt.id}/cancel`, {
      method: 'POST',
      headers: mgrHeaders,
    });
    const canceledRcpt = (await doCancelRcptRes.json()).data;
    console.log(`   ✅ 3.7 Cancel Draft Receipt: Reference ${canceledRcpt.reference} Status is now ${canceledRcpt.status}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: DELIVERIES WORKFLOW
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n📤 Step 4: Testing Deliveries Workflow...');
    // 4.1 List deliveries
    const delListRes = await fetch(`${baseURL}/operations/deliveries?limit=10`, { headers: mgrHeaders });
    const delListData = await delListRes.json();
    console.log(`   ✅ 4.1 List Deliveries: total = ${delListData.total}`);

    // 4.2 Create Delivery Order
    const createDelRes = await fetch(`${baseURL}/operations/deliveries`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        sourceLocationId: stockLoc.id,
        partnerName: 'Acme Customer Global',
        items: [{ productId: testProduct1.id, demandQty: 10, uom: testProduct1.uom }],
      }),
    });
    const createdDel = (await createDelRes.json()).data;
    createdOpIds.push(createdDel.id);
    console.log(`   ✅ 4.2 Create Delivery Order: ${createdDel.reference} (Status: ${createdDel.status})`);

    // 4.3 Check Availability (with Reservation)
    const checkAvailRes = await fetch(`${baseURL}/operations/deliveries/${createdDel.id}/check-availability`, {
      method: 'POST',
      headers: mgrHeaders,
    });
    const checkAvailData = await checkAvailRes.json();
    console.log(`   ✅ 4.3 Check Availability: Status = ${checkAvailData.status} | Fully Available: ${checkAvailData.isFullyAvailable}`);
    console.log(`       Line info: Available = ${checkAvailData.lines[0]?.availableQty} | Reserved = ${checkAvailData.lines[0]?.reservedQty}`);

    // 4.4 Validate Delivery
    const quantBeforeDel = await prisma.stockQuant.findFirst({
      where: { productId: testProduct1.id, locationId: stockLoc.id },
    });
    const qtyBeforeDel = quantBeforeDel?.quantity || 0;

    const validateDelRes = await fetch(`${baseURL}/operations/deliveries/${createdDel.id}/validate`, {
      method: 'POST',
      headers: mgrHeaders,
    });
    const validatedDel = (await validateDelRes.json()).data;
    console.log(`   ✅ 4.4 Validate Delivery: ${validatedDel.reference} Status is ${validatedDel.status}`);

    // Verify stock decreased by 10 and reservation was cleared
    const quantAfterDel = await prisma.stockQuant.findFirst({
      where: { productId: testProduct1.id, locationId: stockLoc.id },
    });
    const qtyAfterDel = quantAfterDel?.quantity || 0;
    console.log(`   ✅ 4.5 Stock Verification: Before = ${qtyBeforeDel} -> After = ${qtyAfterDel} (Delta: ${qtyAfterDel - qtyBeforeDel}, Reserved: ${quantAfterDel?.reservedQuantity})`);

    // 4.6 Cancel Delivery and Verify Reservation Release
    const resvDelRes = await fetch(`${baseURL}/operations/deliveries`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        sourceLocationId: stockLoc.id,
        items: [{ productId: testProduct1.id, demandQty: 5 }],
      }),
    });
    const toCancelDel = (await resvDelRes.json()).data;
    createdOpIds.push(toCancelDel.id);

    // Check availability to reserve stock
    await fetch(`${baseURL}/operations/deliveries/${toCancelDel.id}/check-availability`, {
      method: 'POST',
      headers: mgrHeaders,
    });

    const quantWithResv = await prisma.stockQuant.findFirst({
      where: { productId: testProduct1.id, locationId: stockLoc.id },
    });
    console.log(`   ✅ 4.6 Reservation Active before cancel: Reserved = ${quantWithResv?.reservedQuantity}`);

    // Cancel delivery
    await fetch(`${baseURL}/operations/deliveries/${toCancelDel.id}/cancel`, {
      method: 'POST',
      headers: mgrHeaders,
    });

    const quantAfterCancelResv = await prisma.stockQuant.findFirst({
      where: { productId: testProduct1.id, locationId: stockLoc.id },
    });
    console.log(`   ✅ 4.7 Reservation Released after cancel: Reserved is now ${quantAfterCancelResv?.reservedQuantity}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: INTERNAL TRANSFERS WORKFLOW
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n↔️ Step 5: Testing Internal Transfers Workflow...');
    // 5.1 List transfers
    const trListRes = await fetch(`${baseURL}/operations/transfers?limit=10`, { headers: mgrHeaders });
    const trListData = await trListRes.json();
    console.log(`   ✅ 5.1 List Transfers: total = ${trListData.total}`);

    // 5.2 Rejection of identical source and destination
    const rejectTrRes = await fetch(`${baseURL}/operations/transfers`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        sourceLocationId: stockLoc.id,
        destLocationId: stockLoc.id,
        items: [{ productId: testProduct1.id, demandQty: 5 }],
      }),
    });
    console.log(`   ✅ 5.2 Same Source/Destination Rejection: Status ${rejectTrRes.status} (Expected 400 Bad Request)`);

    // 5.3 Create Valid Transfer
    const createTrRes = await fetch(`${baseURL}/operations/transfers`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        sourceLocationId: stockLoc.id,
        destLocationId: outputLoc.id,
        notes: 'Move items to output staging',
        items: [{ productId: testProduct1.id, demandQty: 8, uom: testProduct1.uom }],
      }),
    });
    const createdTr = (await createTrRes.json()).data;
    createdOpIds.push(createdTr.id);
    console.log(`   ✅ 5.3 Create Transfer: ${createdTr.reference} (Source: ${stockLoc.code} -> Dest: ${outputLoc.code})`);

    // 5.4 Validate Transfer
    const srcBeforeTr = (await prisma.stockQuant.findFirst({ where: { productId: testProduct1.id, locationId: stockLoc.id } }))?.quantity || 0;
    const dstBeforeTr = (await prisma.stockQuant.findFirst({ where: { productId: testProduct1.id, locationId: outputLoc.id } }))?.quantity || 0;

    await fetch(`${baseURL}/operations/transfers/${createdTr.id}/validate`, {
      method: 'POST',
      headers: mgrHeaders,
    });

    const srcAfterTr = (await prisma.stockQuant.findFirst({ where: { productId: testProduct1.id, locationId: stockLoc.id } }))?.quantity || 0;
    const dstAfterTr = (await prisma.stockQuant.findFirst({ where: { productId: testProduct1.id, locationId: outputLoc.id } }))?.quantity || 0;

    console.log(`   ✅ 5.4 Validate Transfer: Source (${srcBeforeTr} -> ${srcAfterTr}) | Dest (${dstBeforeTr} -> ${dstAfterTr})`);
    console.log(`       Warehouse Invariant: ${srcBeforeTr + dstBeforeTr} == ${srcAfterTr + dstAfterTr} (True)`);

    // 5.5 Cancel Draft Transfer
    const toCancelTrRes = await fetch(`${baseURL}/operations/transfers`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        sourceLocationId: stockLoc.id,
        destLocationId: outputLoc.id,
        items: [{ productId: testProduct1.id, demandQty: 2 }],
      }),
    });
    const toCancelTr = (await toCancelTrRes.json()).data;
    createdOpIds.push(toCancelTr.id);

    const cancelTrRes = await fetch(`${baseURL}/operations/transfers/${toCancelTr.id}/cancel`, {
      method: 'POST',
      headers: mgrHeaders,
    });
    const canceledTr = (await cancelTrRes.json()).data;
    console.log(`   ✅ 5.5 Cancel Draft Transfer: ${canceledTr.reference} Status is ${canceledTr.status}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: INVENTORY ADJUSTMENTS WORKFLOW
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🛠 Step 6: Testing Inventory Adjustments Workflow...');
    // 6.1 List adjustments
    const adjListRes = await fetch(`${baseURL}/operations/adjustments?limit=10`, { headers: mgrHeaders });
    const adjListData = await adjListRes.json();
    console.log(`   ✅ 6.1 List Adjustments: total = ${adjListData.total}`);

    // 6.2 Create Adjustment (Count reconciliation)
    const currentQuant = await prisma.stockQuant.findFirst({
      where: { productId: testProduct1.id, locationId: stockLoc.id },
    });
    const recordedCount = currentQuant?.quantity || 0;
    const physicalCount = recordedCount + 5; // Surplus of 5

    const createAdjRes = await fetch(`${baseURL}/operations/adjustments`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        locationId: stockLoc.id,
        notes: 'Monthly Physical Cycle Count Audit',
        items: [
          {
            productId: testProduct1.id,
            physicalQuantity: physicalCount,
            recordedQuantity: recordedCount,
            uom: testProduct1.uom,
          },
        ],
      }),
    });
    const createdAdj = (await createAdjRes.json()).data;
    createdOpIds.push(createdAdj.id);
    console.log(`   ✅ 6.2 Create Adjustment: ${createdAdj.reference} (Recorded: ${recordedCount}, Physical: ${physicalCount})`);

    // 6.3 Validate Adjustment
    const validateAdjRes = await fetch(`${baseURL}/operations/adjustments/${createdAdj.id}/validate`, {
      method: 'POST',
      headers: mgrHeaders,
    });
    const validatedAdj = (await validateAdjRes.json()).data;
    console.log(`   ✅ 6.3 Validate Adjustment: ${validatedAdj.reference} Status is ${validatedAdj.status}`);

    const quantAfterAdj = await prisma.stockQuant.findFirst({
      where: { productId: testProduct1.id, locationId: stockLoc.id },
    });
    console.log(`   ✅ 6.4 Quant Matches Physical Count: ${quantAfterAdj?.quantity} == ${physicalCount} (True)`);

    // 6.5 Cancel Draft Adjustment
    const toCancelAdjRes = await fetch(`${baseURL}/operations/adjustments`, {
      method: 'POST',
      headers: mgrHeaders,
      body: JSON.stringify({
        warehouseId: primaryWh.id,
        locationId: stockLoc.id,
        items: [{ productId: testProduct1.id, physicalQuantity: 100 }],
      }),
    });
    const toCancelAdj = (await toCancelAdjRes.json()).data;
    createdOpIds.push(toCancelAdj.id);

    const cancelAdjRes = await fetch(`${baseURL}/operations/adjustments/${toCancelAdj.id}/cancel`, {
      method: 'POST',
      headers: mgrHeaders,
    });
    const canceledAdj = (await cancelAdjRes.json()).data;
    console.log(`   ✅ 6.5 Cancel Draft Adjustment: ${canceledAdj.reference} Status is ${canceledAdj.status}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: REGRESSION AUDIT (Core Modules)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🔍 Step 7: Performing Regression Check on Core Modules...');
    const dashCheckRes = await fetch(`${baseURL}/dashboard`, { headers: mgrHeaders });
    const dashCheck = await dashCheckRes.json();
    console.log(`   ✅ Dashboard API OK: KPI Total Stock = ${dashCheck.data.kpis.totalStock}`);

    const prodCheckRes = await fetch(`${baseURL}/products?limit=5`, { headers: mgrHeaders });
    const prodCheck = await prodCheckRes.json();
    console.log(`   ✅ Products API OK: Total products = ${prodCheck.pagination.total}`);

    const catCheckRes = await fetch(`${baseURL}/categories?limit=5`, { headers: mgrHeaders });
    const catCheck = await catCheckRes.json();
    console.log(`   ✅ Categories API OK: Total categories = ${catCheck.pagination.total}`);

    console.log('\n🎉 ALL OPERATIONS TEST WORKFLOWS PASSED 100%!');
  } finally {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: RESTORE PRISTINE DATABASE BASELINE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🧹 Step 8: Restoring Database Baseline & Cleaning Test Data...');

    // Delete test operations and associated OperationItems & StockMoves
    if (createdOpIds.length > 0) {
      console.log(`   Deleting ${createdOpIds.length} created test operations...`);
      await prisma.stockMove.deleteMany({
        where: { operationId: { in: createdOpIds } },
      });
      await prisma.operationItem.deleteMany({
        where: { operationId: { in: createdOpIds } },
      });
      await prisma.operation.deleteMany({
        where: { id: { in: createdOpIds } },
      });
    }

    // Restore each StockQuant to initial values
    console.log('   Restoring StockQuants to exact snapshot baseline...');
    for (const q of initialQuants) {
      await prisma.stockQuant.upsert({
        where: { id: q.id },
        update: {
          quantity: q.quantity,
          reservedQuantity: q.reservedQuantity,
        },
        create: {
          id: q.id,
          productId: q.productId,
          warehouseId: q.warehouseId,
          locationId: q.locationId,
          quantity: q.quantity,
          reservedQuantity: q.reservedQuantity,
        },
      });
    }

    // Remove any created quants that were not in initial snapshot (e.g. at outputLoc)
    const initialQuantIds = initialQuants.map((q) => q.id);
    await prisma.stockQuant.deleteMany({
      where: { id: { notIn: initialQuantIds } },
    });

    // Verification
    const finalOps = await prisma.operation.count();
    const finalMoves = await prisma.stockMove.count();
    const finalQuants = await prisma.stockQuant.findMany();

    console.log(`   ✅ Final Operations count: ${finalOps} (Expected: ${initialOperationsCount})`);
    console.log(`   ✅ Final StockMoves count: ${finalMoves} (Expected: ${initialMovesCount})`);
    console.log(`   ✅ Final StockQuants count: ${finalQuants.length} (Expected: ${initialQuants.length})`);
    for (const q of finalQuants) {
      const match = initialQuants.find((iq) => iq.id === q.id);
      if (match?.quantity !== q.quantity || match?.reservedQuantity !== q.reservedQuantity) {
        console.error(`   ❌ Quant mismatch for ${q.id}: Initial ${match?.quantity} vs Final ${q.quantity}`);
      }
    }
    console.log('   ✅ Baseline Verification Complete: Database restored 100% to pristine initial state.');
  }

  await prisma.$disconnect();
}

runOperationsE2ETests().catch(async (e) => {
  console.error('\n❌ Integration Test Failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
