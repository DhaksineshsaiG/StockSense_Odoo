async function testAuthFullFlow() {
  const baseURL = 'http://localhost:5173/api';

  console.log('Testing OTP and Password Reset Flow via Frontend Proxy:');

  // 1. Forgot password
  const forgotRes = await fetch(`${baseURL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@stocksense.com' }),
  });
  const forgotData = await forgotRes.json();
  console.log('✅ Forgot password response:', forgotData.message, 'OTP received in dev:', forgotData.otp);

  const otp = forgotData.otp;
  if (!otp) {
    console.log('No OTP in response, skipping verify');
    return;
  }

  // 2. Verify OTP
  const verifyRes = await fetch(`${baseURL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@stocksense.com', otp }),
  });
  const verifyData = await verifyRes.json();
  console.log('✅ Verify OTP response:', verifyData.message, 'Reset token obtained:', !!verifyData.resetToken);

  // 3. Reset password back to Admin@123
  const resetRes = await fetch(`${baseURL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken: verifyData.resetToken,
      newPassword: 'Admin@123',
    }),
  });
  const resetData = await resetRes.json();
  console.log('✅ Reset password response:', resetData.message);

  // 4. Verify login with reset password
  const reLoginRes = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@stocksense.com',
      password: 'Admin@123',
    }),
  });
  const reLoginData = await reLoginRes.json();
  console.log('✅ Re-login with Admin@123 succeeded:', reLoginData.user.name);
}

testAuthFullFlow();
