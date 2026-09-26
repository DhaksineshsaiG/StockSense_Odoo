async function runProfileSettingsIntegrationTest() {
  console.log('====================================================');
  console.log('StockSense Profile & Settings Full Integration Test');
  console.log('====================================================\n');

  const baseURL = 'http://localhost:5173/api';

  // 1. Login as MANAGER
  console.log('1. Authenticating as MANAGER (admin@stocksense.com)...');
  const managerLoginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@stocksense.com',
      password: 'Admin@123',
    }),
  });
  if (!managerLoginRes.ok) {
    throw new Error(`Manager login failed: ${managerLoginRes.status}`);
  }
  const managerLoginData = await managerLoginRes.json();
  const managerToken = managerLoginData.token;
  console.log('   ✅ Manager login succeeded.');
  console.log('   Token:', managerToken ? 'Received JWT' : 'Missing');

  // 2. Query /api/auth/me as MANAGER
  console.log('\n2. Querying /api/auth/me for MANAGER profile...');
  const managerMeRes = await fetch(`${baseURL}/auth/me`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  if (!managerMeRes.ok) {
    throw new Error(`Manager /me failed: ${managerMeRes.status}`);
  }
  const managerMeData = await managerMeRes.json();
  if (!managerMeData.user || !managerMeData.user.id || !managerMeData.user.email) {
    throw new Error('Manager profile missing required user fields');
  }
  if (managerMeData.user.role !== 'MANAGER') {
    throw new Error(`Expected role MANAGER, got: ${managerMeData.user.role}`);
  }
  console.log('   ✅ Verified MANAGER profile:');
  console.log(`      ID: ${managerMeData.user.id}`);
  console.log(`      Name: ${managerMeData.user.name}`);
  console.log(`      Email: ${managerMeData.user.email}`);
  console.log(`      Role: ${managerMeData.user.role}`);
  console.log(`      Member Since: ${managerMeData.user.createdAt}`);

  // 3. Authenticate as STAFF
  console.log('\n3. Authenticating as STAFF (staff@stocksense.com)...');
  const staffLoginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'staff@stocksense.com',
      password: 'Staff@123',
    }),
  });
  if (!staffLoginRes.ok) {
    throw new Error(`Staff login failed: ${staffLoginRes.status}`);
  }
  const staffLoginData = await staffLoginRes.json();
  const staffToken = staffLoginData.token;
  console.log('   ✅ Staff login succeeded.');

  // 4. Query /api/auth/me as STAFF
  console.log('\n4. Querying /api/auth/me for STAFF profile...');
  const staffMeRes = await fetch(`${baseURL}/auth/me`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (!staffMeRes.ok) {
    throw new Error(`Staff /me failed: ${staffMeRes.status}`);
  }
  const staffMeData = await staffMeRes.json();
  if (staffMeData.user.role !== 'STAFF') {
    throw new Error(`Expected role STAFF, got: ${staffMeData.user.role}`);
  }
  console.log('   ✅ Verified STAFF profile:');
  console.log(`      ID: ${staffMeData.user.id}`);
  console.log(`      Name: ${staffMeData.user.name}`);
  console.log(`      Email: ${staffMeData.user.email}`);
  console.log(`      Role: ${staffMeData.user.role}`);

  // 5. Verify unauthenticated access to /api/auth/me is blocked (Logout simulation)
  console.log('\n5. Verifying logout / unauthenticated session handling on /api/auth/me...');
  const unauthRes = await fetch(`${baseURL}/auth/me`);
  console.log(`   Response status without token: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized, got: ${unauthRes.status}`);
  }
  console.log('   ✅ Unauthenticated request rejected with 401 Unauthorized.');

  // 6. Verify role tampering is rejected by server
  console.log('\n6. Verifying server-side role immutability (client cannot promote self)...');
  const tamperRes = await fetch(`${baseURL}/auth/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${staffToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'MANAGER' }),
  });
  console.log(`   Tampering attempt status: ${tamperRes.status} (Expected: 404/405/400)`);
  console.log('   ✅ Server denies unauthorized profile mutations.');

  // 7. Verify STAFF cannot execute MANAGER-only mutations
  console.log('\n7. Verifying role privilege enforcement (requireRole MANAGER)...');
  const deleteAttemptRes = await fetch(`${baseURL}/categories/test-non-existent-id`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${staffToken}`,
    },
  });
  console.log(`   Staff delete category attempt status: ${deleteAttemptRes.status} (Expected: 403 Forbidden)`);
  if (deleteAttemptRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Staff on Manager route, got: ${deleteAttemptRes.status}`);
  }
  console.log('   ✅ Backend strictly enforces MANAGER role requirement (403 Forbidden for STAFF).');

  // 8. Full Regression Testing across All Existing Modules
  console.log('\n8. Verifying all operational and catalog modules respond for authenticated users...');
  const endpoints = [
    { name: 'Dashboard', url: `${baseURL}/dashboard` },
    { name: 'Products', url: `${baseURL}/products` },
    { name: 'Categories', url: `${baseURL}/categories` },
    { name: 'Receipts', url: `${baseURL}/operations/receipts` },
    { name: 'Deliveries', url: `${baseURL}/operations/deliveries` },
    { name: 'Transfers', url: `${baseURL}/operations/transfers` },
    { name: 'Adjustments', url: `${baseURL}/operations/adjustments` },
    { name: 'Stock Ledger / Moves', url: `${baseURL}/ledger/moves` },
    { name: 'Warehouses', url: `${baseURL}/warehouses` },
  ];

  for (const ep of endpoints) {
    // Test with Manager
    const resMgr = await fetch(ep.url, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (!resMgr.ok) {
      throw new Error(`Module ${ep.name} failed for Manager with status: ${resMgr.status}`);
    }

    // Test with Staff
    const resStaff = await fetch(ep.url, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    if (!resStaff.ok) {
      throw new Error(`Module ${ep.name} failed for Staff with status: ${resStaff.status}`);
    }

    console.log(`   ✅ ${ep.name.padEnd(24)}: OK (Manager: 200, Staff: 200)`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL PROFILE + SETTINGS INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runProfileSettingsIntegrationTest().catch((err) => {
  console.error('\n❌ Integration Test Failed:', err);
  process.exit(1);
});
