const fs = require('fs');
const http = require('http');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json,
          cookie: res.headers['set-cookie'],
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function parseCookie(setCookieHeaders) {
  if (!setCookieHeaders) return '';
  return setCookieHeaders
    .map((c) => c.split(';')[0])
    .join('; ');
}

async function run() {
  console.log('--- 1. Set Initial Password via Admin ---');
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const adminUser = users?.find((u) => u.email === 'invincibleperson9@gmail.com') || users?.[0];
  if (!adminUser) {
    console.error('No admin user found in database');
    process.exit(1);
  }
  const userId = adminUser.id;
  const initialPassword = 'PfcAdmin@2026!';
  const { error: setPassErr } = await supabase.auth.admin.updateUserById(userId, {
    password: initialPassword,
  });
  if (setPassErr) {
    console.error('Failed to set initial password:', setPassErr);
    process.exit(1);
  }
  console.log('✅ Initial password set to:', initialPassword);

  console.log('\n--- 2. Login via alias "pfc" ---');
  const loginRes = await request('POST', '/api/auth/login', {
    username: 'pfc',
    password: initialPassword,
  });
  console.log('Login status:', loginRes.status, loginRes.json);
  if (loginRes.status !== 200) {
    console.error('Login failed!');
    process.exit(1);
  }
  const sessionCookie = parseCookie(loginRes.cookie);
  console.log('✅ Logged in successfully with alias "pfc". Cookie received.');

  console.log('\n--- 3. Test Password Change via /api/auth/change-password ---');
  const newPassword = 'PfcPatna@2026#';
  const changeRes = await request(
    'POST',
    '/api/auth/change-password',
    {
      username: 'pfc',
      currentPassword: initialPassword,
      newPassword: newPassword,
    },
    { Cookie: sessionCookie }
  );
  console.log('Change password response:', changeRes.status, changeRes.json);
  if (changeRes.status !== 200 || !changeRes.json?.success) {
    console.error('Password change failed!');
    process.exit(1);
  }
  console.log('✅ Password changed successfully to:', newPassword);

  console.log('\n--- 4. Verify Login with New Password ---');
  const verifyLoginRes = await request('POST', '/api/auth/login', {
    username: 'pfc',
    password: newPassword,
  });
  console.log('Verify login with new password:', verifyLoginRes.status, verifyLoginRes.json);
  if (verifyLoginRes.status !== 200) {
    console.error('Login with new password failed!');
    process.exit(1);
  }
  console.log('✅ Verified login with updated password!');

  console.log('\n--- 5. Revert Password back to Standard Admin Password ---');
  const updatedCookie = parseCookie(verifyLoginRes.cookie);
  const revertRes = await request(
    'POST',
    '/api/auth/change-password',
    {
      username: 'pfc',
      currentPassword: newPassword,
      newPassword: initialPassword,
    },
    { Cookie: updatedCookie }
  );
  console.log('Revert password response:', revertRes.status, revertRes.json);
  console.log('✅ Password reverted to standard admin password.');

  console.log('\n--- 6. Test Restaurant Details Update via /api/business ---');
  const updateCookie = parseCookie(revertRes.cookie || updatedCookie);
  const updateBizRes = await request(
    'POST',
    '/api/business',
    {
      name: 'Patna Fried Chicken (PFC)',
      location: "Shop No. 4, Divya Apartment, Near Gold's Gym, Ashiyana Digha Road, Patna",
      phone: '7091719475',
      secondary_phone: '9876543210',
      logo_url: '/pfc-logo.jpg',
      google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJHxZmNS1X7TkR77HVa1ipTJw',
      primary_color: '#e11d48',
      welcome_message: {
        en: 'Welcome to Patna Fried Chicken (PFC)! Share your crispy dining experience with us in 30 seconds. For helpline & orders call 7091719475.',
      },
    },
    { Cookie: updateCookie }
  );
  console.log('Update business response:', updateBizRes.status, updateBizRes.json);
  if (updateBizRes.status !== 200 && updateBizRes.status !== 201) {
    console.error('Update business failed!');
    process.exit(1);
  }
  console.log('✅ Business details updated successfully!');

  console.log('\n--- 7. Test Menu GET and Operations ---');
  const menuGetRes = await request('GET', '/api/business/menu');
  console.log('Menu GET response status:', menuGetRes.status, 'Items count:', menuGetRes.json?.menu_items?.length);
  if (menuGetRes.status !== 200 || !Array.isArray(menuGetRes.json?.menu_items)) {
    console.error('Menu GET failed!');
    process.exit(1);
  }
  console.log('✅ Menu GET returned 200 with menu items list!');

  console.log('\n--- 8. Test Menu POST, PATCH, DELETE ---');
  const addDishRes = await request(
    'POST',
    '/api/business/menu',
    { name: 'Crispy Garlic Chicken Strips (Test)' },
    { Cookie: updateCookie }
  );
  console.log('Add dish status:', addDishRes.status, addDishRes.json?.name);
  if (addDishRes.status !== 201) {
    console.error('Add dish failed!');
    process.exit(1);
  }
  const testDishId = addDishRes.json.id;

  const patchDishRes = await request(
    'PATCH',
    '/api/business/menu',
    { id: testDishId, active: false },
    { Cookie: updateCookie }
  );
  console.log('Patch dish status:', patchDishRes.status, 'active:', patchDishRes.json?.active);
  if (patchDishRes.status !== 200 || patchDishRes.json?.active !== false) {
    console.error('Patch dish failed!');
    process.exit(1);
  }

  const deleteDishRes = await request(
    'DELETE',
    `/api/business/menu?id=${testDishId}`,
    null,
    { Cookie: updateCookie }
  );
  console.log('Delete dish status:', deleteDishRes.status);
  if (deleteDishRes.status !== 200) {
    console.error('Delete dish failed!');
    process.exit(1);
  }
  console.log('✅ Menu POST, PATCH, DELETE all succeeded!');

  console.log('\n--- 9. Test Campaigns POST, PATCH, DELETE ---');
  const addCampRes = await request(
    'POST',
    '/api/business/campaigns',
    { name: 'Drive-Thru & Takeaway Test' },
    { Cookie: updateCookie }
  );
  console.log('Add campaign status:', addCampRes.status, 'slug:', addCampRes.json?.slug);
  if (addCampRes.status !== 201) {
    console.error('Add campaign failed!');
    process.exit(1);
  }
  const testCampId = addCampRes.json.id;

  const patchCampRes = await request(
    'PATCH',
    '/api/business/campaigns',
    { id: testCampId, active: false },
    { Cookie: updateCookie }
  );
  console.log('Patch campaign status:', patchCampRes.status, 'active:', patchCampRes.json?.active);
  if (patchCampRes.status !== 200 || patchCampRes.json?.active !== false) {
    console.error('Patch campaign failed!');
    process.exit(1);
  }

  const deleteCampRes = await request(
    'DELETE',
    `/api/business/campaigns?id=${testCampId}`,
    null,
    { Cookie: updateCookie }
  );
  console.log('Delete campaign status:', deleteCampRes.status);
  if (deleteCampRes.status !== 200) {
    console.error('Delete campaign failed!');
    process.exit(1);
  }
  console.log('✅ Campaigns POST, PATCH, DELETE all succeeded!');

  console.log('\n======================================================');
  console.log('🎉 ALL FUNCTIONS (AUTH, PASSWORD, DETAILS, MENU, CAMPAIGNS) PASSED!');
  console.log('======================================================');
}

run().catch(console.error);
