const http = require('http');
const https = require('https');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load env credentials
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
if (!urlMatch || !keyMatch) {
  console.error('Missing Supabase keys in .env.local');
  process.exit(1);
}
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

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING PFC PATNA FRIED CHICKEN FULL TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Public Routes & Metadata
    // -------------------------------------------------------------
    console.log('--- 1. Testing Public Routes & Branding ---');
    const pfcPage = await request('GET', '/r/pfc');
    assert(pfcPage.status === 200, 'GET /r/pfc returned status 200');
    assert(pfcPage.data.includes('Patna Fried Chicken') || pfcPage.data.includes('PFC'), 'GET /r/pfc includes PFC branding');
    assert(pfcPage.data.includes('7091719475'), 'GET /r/pfc includes phone 7091719475');
    assert(pfcPage.data.includes('Ashiyana') || pfcPage.data.includes('Divya Appartment'), 'GET /r/pfc includes Ashiyana address');
    assert(pfcPage.data.includes('/pfc-logo.jpg'), 'GET /r/pfc references PFC logo image');

    const takeawayPage = await request('GET', '/r/patna-fried-chicken');
    assert(takeawayPage.status === 200, 'GET /r/patna-fried-chicken returned status 200');
    assert(takeawayPage.data.includes('7091719475'), 'Takeaway page includes phone 7091719475');

    const legacyPage = await request('GET', '/r/pm-zaika');
    assert(legacyPage.status === 200, 'GET /r/pm-zaika gracefully resolves to PFC');
    assert(legacyPage.data.includes('Patna Fried Chicken') || legacyPage.data.includes('PFC'), 'Legacy slug displays PFC');

    const loginPage = await request('GET', '/login');
    assert(loginPage.status === 200, 'GET /login returned status 200');
    assert(loginPage.data.includes('Patna Fried Chicken (PFC) Admin'), 'Login page displays PFC Admin header');
    assert(loginPage.data.includes('pfc'), 'Login page placeholder includes pfc alias');

    const manifestRes = await request('GET', '/manifest.webmanifest');
    assert(manifestRes.status === 200, 'GET /manifest.webmanifest returned status 200');
    assert(manifestRes.json?.name?.includes('Patna Fried Chicken'), 'Manifest name is PFC');
    assert(manifestRes.json?.short_name === 'PFC Patna', 'Manifest short_name is PFC Patna');

    // -------------------------------------------------------------
    // TEST 2: QR Code Generation
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing QR Code Generation Studio ---');
    const qrPng = await request('GET', '/api/business/qr?slug=pfc');
    assert(qrPng.status === 200, 'GET /api/business/qr?slug=pfc returns status 200');
    assert(qrPng.headers['content-type'] === 'image/png', 'QR content-type is image/png');
    assert(qrPng.data.length > 500, `QR PNG binary returned size (${qrPng.data.length} bytes)`);

    const qrSvg = await request('GET', '/api/business/qr?slug=pfc&format=svg');
    assert(qrSvg.status === 200, 'GET /api/business/qr?slug=pfc&format=svg returns status 200');
    assert(qrSvg.headers['content-type'].includes('svg'), 'QR SVG content-type is svg');
    assert(qrSvg.data.includes('<svg'), 'QR SVG output contains <svg> tag');

    // -------------------------------------------------------------
    // TEST 3: Customer Survey Flow (End-to-End Simulation)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Full Customer Feedback Flow ---');
    
    // Step 3A: Create Session
    const createSessionRes = await request('POST', '/api/public/sessions', { slug: 'pfc' });
    assert(createSessionRes.status === 200 || createSessionRes.status === 201, `Create session returned ${createSessionRes.status}`);
    const sessionId = createSessionRes.json?.session_id || createSessionRes.json?.sessionId;
    assert(Boolean(sessionId), `Session ID created: ${sessionId}`);
    const cookieHeader = parseCookie(createSessionRes.cookie);
    assert(Boolean(cookieHeader), 'Session cookie returned');

    // Step 3B: Start Quiz
    const startRes = await request('POST', `/api/public/sessions/${sessionId}/start`, {}, { Cookie: cookieHeader });
    assert(startRes.status === 200, `Start quiz returned status 200`);
    assert(startRes.json?.status === 'in_progress', `Session state transitioned to 'in_progress'`);


    // Step 3C: Answer Questions
    const a1 = await request('PUT', `/api/public/sessions/${sessionId}/answers/overall_rating`, { value: 5 }, { Cookie: cookieHeader });
    assert(a1.status === 200, 'Answered overall_rating = 5');

    const a2 = await request('PUT', `/api/public/sessions/${sessionId}/answers/food_rating`, { value: 5 }, { Cookie: cookieHeader });
    assert(a2.status === 200, 'Answered food_rating = 5');

    const a3 = await request('PUT', `/api/public/sessions/${sessionId}/answers/service_rating`, { value: 5 }, { Cookie: cookieHeader });
    assert(a3.status === 200, 'Answered service_rating = 5');

    const a4 = await request('PUT', `/api/public/sessions/${sessionId}/answers/liked`, { value: ['food', 'service'] }, { Cookie: cookieHeader });
    assert(a4.status === 200, 'Answered liked items');

    const { data: menuList } = await supabase.from('menu_items').select('id, name').limit(3);
    const orderedIds = menuList.map((m) => m.id);
    const a5 = await request('PUT', `/api/public/sessions/${sessionId}/answers/ordered`, { value: orderedIds }, { Cookie: cookieHeader });
    assert(a5.status === 200, 'Answered ordered PFC fried chicken items');

    const a6 = await request('PUT', `/api/public/sessions/${sessionId}/answers/customer_contact`, {
      name: 'Mohammad Aman',
      phone: '9876543210',
      opt_in: true,
    }, { Cookie: cookieHeader });
    assert(a6.status === 200, 'Answered customer_contact with WhatsApp opt-in');

    // Step 3D: Complete Session (Submit)
    const submitRes = await request('POST', `/api/public/sessions/${sessionId}/submit`, {
      answers: {
        overall_rating: 5,
        food_rating: 5,
        service_rating: 5,
        customer_contact: { name: 'Mohammad Aman', phone: '9876543210', opt_in: true },
      },
    }, { Cookie: cookieHeader });
    assert(submitRes.status === 200, `Submit session returned status 200`);
    assert(submitRes.json?.success === true, 'Session submission marked success');

    // Step 3E: Generate AI Review Draft
    const draftRes = await request('POST', `/api/public/sessions/${sessionId}/draft`, {}, { Cookie: cookieHeader });
    assert(draftRes.status === 200, `Draft generation returned status 200`);
    const draftText = draftRes.json?.final_text || draftRes.json?.original_text;
    assert(Boolean(draftText), `Draft text generated: "${draftText?.slice(0, 75)}..."`);
    assert(
      draftText.toLowerCase().includes('chicken') ||
      draftText.toLowerCase().includes('crispy') ||
      draftText.toLowerCase().includes('patna') ||
      draftText.toLowerCase().includes('burger') ||
      draftText.toLowerCase().includes('food') ||
      draftText.toLowerCase().includes('visit') ||
      draftText.toLowerCase().includes('flavors'),
      'Draft text contains relevant dining/chicken keywords'
    );

    // Step 3F: Submit Private Feedback
    const privateFbRes = await request('POST', `/api/public/sessions/${sessionId}/private-feedback`, {
      category: 'food',
      message: 'The crispy fried chicken was hot, crunchy, and absolutely delicious! Loved the spicy dip.',
      contact_name: 'Mohammad Aman',
      contact_value: '9876543210',
      contact_consent: true,
    }, { Cookie: cookieHeader });
    assert(privateFbRes.status === 200 || privateFbRes.status === 201, `Private feedback submission returned 200/201`);
    assert(privateFbRes.json?.success === true, 'Private feedback recorded');

    // Step 3G: Event tracking (Google handoff click)
    const eventRes = await request('POST', `/api/public/sessions/${sessionId}/events`, {
      event_type: 'GOOGLE_CLICKED',
      client_event_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      metadata: { target: 'google_review' },
    }, { Cookie: cookieHeader });
    assert(eventRes.status === 200 || eventRes.status === 201, 'Google review click event logged');

    // -------------------------------------------------------------
    // TEST 4: Database State & CRM Integrity
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Database State & Customer Directory ---');

    // Check Business in DB
    const { data: dbBiz } = await supabase.from('businesses').select('*').limit(1).single();
    assert(dbBiz.name === 'Patna Fried Chicken (PFC)', 'DB business name is "Patna Fried Chicken (PFC)"');
    assert(dbBiz.phone === '7091719475', 'DB phone is 7091719475');
    assert(dbBiz.location.includes('Ashiyana Digha Road'), 'DB location includes Ashiyana Digha Road');
    assert(dbBiz.logo_url === '/pfc-logo.jpg', 'DB logo_url is /pfc-logo.jpg');

    // Check Campaigns in DB
    const { data: dbCampaigns } = await supabase.from('campaigns').select('slug, active').eq('active', true);
    const slugs = dbCampaigns.map((c) => c.slug);
    assert(slugs.includes('pfc'), 'Active campaign "pfc" exists in DB');
    assert(slugs.includes('patna-fried-chicken'), 'Active campaign "patna-fried-chicken" exists in DB');

    // Check Menu Items in DB
    const { data: dbMenu } = await supabase.from('menu_items').select('name').order('position');
    assert(dbMenu.length === 9, `DB has ${dbMenu.length} menu items`);
    assert(
      dbMenu.some((m) => m.name.en.includes('Crispy Fried Chicken')),
      'DB has Crispy Fried Chicken item'
    );
    assert(
      dbMenu.some((m) => m.name.en.includes('Zinger Burger')),
      'DB has PFC Special Zinger Burger'
    );

    // Verify Session in DB
    const { data: dbSession } = await supabase.from('sessions').select('status').eq('id', sessionId).single();
    assert(dbSession.status === 'completed', 'DB session status is "completed"');

    // Verify Customer Contact in DB
    const { data: dbContactAnswer } = await supabase
      .from('answers')
      .select('value')
      .eq('session_id', sessionId)
      .eq('question_key', 'customer_contact')
      .single();
    assert(dbContactAnswer?.value?.phone === '9876543210', 'Customer phone 9876543210 saved in DB answers');

    // Verify Private Feedback in DB
    const { data: dbPrivateFb } = await supabase
      .from('private_feedback')
      .select('message, contact_value')
      .eq('session_id', sessionId)
      .single();
    assert(Boolean(dbPrivateFb), 'Private feedback recorded in DB');
    assert(dbPrivateFb?.contact_value === '9876543210', 'Private feedback has customer phone');

    // -------------------------------------------------------------
    // TEST 5: Auth Aliases Unit Verification
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Authentication Aliases ---');
    // Test alias login endpoint behavior with alias 'pfc'
    const aliasLoginRes = await request('POST', '/api/auth/login', {
      username: 'pfc',
      password: 'test-attempt-alias',
    });
    // Should attempt auth with resolved email and return 401 Invalid login credentials (not 400 or 500)
    assert(aliasLoginRes.status === 401, `Alias 'pfc' reached auth handler and returned 401 for test password`);
    assert(aliasLoginRes.json?.error?.toLowerCase().includes('invalid') || aliasLoginRes.json?.error?.toLowerCase().includes('credential'), 'Auth responded with standard credentials error');

    // Test alias 'patnafriedchicken'
    const aliasLoginRes2 = await request('POST', '/api/auth/login', {
      username: 'patnafriedchicken',
      password: 'test-attempt-alias',
    });
    assert(aliasLoginRes2.status === 401, `Alias 'patnafriedchicken' reached auth handler and returned 401`);

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
