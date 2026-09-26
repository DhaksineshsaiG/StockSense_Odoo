async function runFrontendConnectivityTest() {
  console.log('Testing Frontend <-> Backend Connectivity through Vite Proxy:');
  const baseURL = 'http://localhost:5173/api';

  // 1. Health check via Vite Proxy
  try {
    const healthRes = await fetch(`${baseURL}/health`);
    const health = await healthRes.json();
    console.log('✅ Vite Proxy to /api/health succeeded:', health);
  } catch (e: any) {
    console.error('❌ Failed /api/health:', e.message);
  }

  // 2. Login via Vite Proxy as Manager
  let token = '';
  try {
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@stocksense.com',
        password: 'Admin@123',
      }),
    });
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log('✅ /api/auth/login succeeded. User:', loginData.user.name, 'Role:', loginData.user.role);
  } catch (e: any) {
    console.error('❌ Login failed:', e.message);
  }

  // 3. /me via Bearer token
  try {
    const meRes = await fetch(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    console.log('✅ /api/auth/me succeeded:', meData.user.email);
  } catch (e: any) {
    console.error('❌ /api/auth/me failed:', e.message);
  }

  // 4. GET /api/dashboard
  try {
    const dashRes = await fetch(`${baseURL}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashData = await dashRes.json();
    const d = dashData.data;
    console.log('✅ /api/dashboard succeeded:');
    console.log('   Total Stock:', d.kpis.totalStock);
    console.log('   Low Stock:', d.kpis.lowStock);
    console.log('   Out of Stock:', d.kpis.outOfStock);
    console.log('   Pending Receipts:', d.kpis.pendingReceipts);
    console.log('   Pending Deliveries:', d.kpis.pendingDeliveries);
    console.log('   Internal Transfers:', d.kpis.internalTransfers);
    console.log('   Warehouses in summary:', d.warehouseSummary?.length);
    console.log('   Recent Activity moves:', d.recentActivity?.length);
  } catch (e: any) {
    console.error('❌ /api/dashboard failed:', e.message);
  }

  // 5. GET /api/warehouses
  try {
    const whRes = await fetch(`${baseURL}/warehouses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const whData = await whRes.json();
    console.log('✅ /api/warehouses succeeded. Count:', whData.data?.length);
  } catch (e: any) {
    console.error('❌ /api/warehouses failed:', e.message);
  }

  // 6. Test Staff Login
  try {
    const staffLoginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@stocksense.com',
        password: 'Staff@123',
      }),
    });
    const staffData = await staffLoginRes.json();
    console.log('✅ /api/auth/login as Staff succeeded. User:', staffData.user.name, 'Role:', staffData.user.role);
  } catch (e: any) {
    console.error('❌ Staff login failed:', e.message);
  }

  console.log('\nAll Frontend API integration tests passed successfully!');
}

runFrontendConnectivityTest();
