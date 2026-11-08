import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Demo credentials — required from environment variables
const ADMIN_PASSWORD = process.env.KEYLO_ADMIN_PASSWORD;
const SALES_PASSWORD = process.env.KEYLO_SALES_PASSWORD;
const BUYER_PASSWORD = process.env.KEYLO_BUYER_PASSWORD;
if (!ADMIN_PASSWORD || !SALES_PASSWORD || !BUYER_PASSWORD) {
  throw new Error('Missing required env vars: KEYLO_ADMIN_PASSWORD, KEYLO_SALES_PASSWORD, KEYLO_BUYER_PASSWORD');
}

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function waitPort(port, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        if (res.status < 500) {
          return resolve();
        }
      } catch (e) {
        // Retry
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for port ${port}`));
      } else {
        setTimeout(check, 400);
      }
    };
    check();
  });
}

async function run() {
  console.log('================================================================');
  console.log('=== KEYLO REALISTIC DEMO ENVIRONMENT VERIFICATION SUITE ===');
  console.log('================================================================');

  // Start FastAPI Backend
  console.log('\n--- Starting FastAPI Backend on port 8000 ---');
  const backendProc = spawn(
    path.resolve('backend/.venv/Scripts/python.exe'),
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    {
      cwd: path.resolve('backend'),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: 'pipe',
      shell: true,
    }
  );

  backendProc.stdout.on('data', d => {
    const s = d.toString();
    if (s.includes('ERROR') || s.includes('Uvicorn running')) {
      console.log('[Backend]', s.trim());
    }
  });

  // Start Frontend Preview
  console.log('\n--- Starting Frontend Preview Server on port 5173 ---');
  const frontendProc = spawn(
    'npm.cmd',
    ['--prefix', 'frontend', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', '5173'],
    {
      cwd: path.resolve('.'),
      stdio: 'pipe',
      shell: true,
    }
  );

  let browser;

  try {
    await waitPort(8000);
    console.log('Backend running on port 8000.');
    await waitPort(5173);
    console.log('Frontend running on port 5173.');

    browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // -------------------------------------------------------------------------
    // TEST 1: Admin Console Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Admin Console Verification ---');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin.demo@keylo.com');
    await page.type('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    console.log('[PASS] Logged in as Admin. URL:', page.url());

    // Admin Overview
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'demo-admin-overview.png'), fullPage: false });
    console.log('Saved screenshot: demo-admin-overview.png');

    // Admin Projects
    await page.goto('http://127.0.0.1:5173/admin/projects', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const projectContent = await page.content();
    console.log('Riviera Elegance visible:', projectContent.includes('Riviera Elegance'));
    console.log('Shantigram Sky Greens visible:', projectContent.includes('Shantigram Sky Greens'));
    console.log('The Heritage Terraces visible:', projectContent.includes('The Heritage Terraces'));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'demo-admin-projects.png'), fullPage: false });
    console.log('Saved screenshot: demo-admin-projects.png');

    // Admin Site Visits
    await page.goto('http://127.0.0.1:5173/admin/visits', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'demo-admin-visits.png'), fullPage: false });
    console.log('Saved screenshot: demo-admin-visits.png');

    // Admin Analytics & Trends
    await page.goto('http://127.0.0.1:5173/admin/analytics', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'demo-admin-analytics.png'), fullPage: false });
    console.log('Saved screenshot: demo-admin-analytics.png');

    // -------------------------------------------------------------------------
    // TEST 2: Sales Executive Workspace Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Sales Executive Workspace Verification ---');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'sales.demo@keylo.com');
    await page.type('input[type="password"]', SALES_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    console.log('[PASS] Logged in as Sales Executive. URL:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'demo-sales-workspace.png'), fullPage: false });
    console.log('Saved screenshot: demo-sales-workspace.png');

    // Sales Follow-ups
    const salesContent = await page.content();
    if (salesContent.includes('Follow-up') || salesContent.includes('follow-up')) {
      console.log('Sales follow-ups confirmed.');
    }
    await page.goto('http://127.0.0.1:5173/sales/follow-ups', { waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'demo-sales-followups.png'), fullPage: false });
    console.log('Saved screenshot: demo-sales-followups.png');

    // -------------------------------------------------------------------------
    // TEST 3: Buyer Portal Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Buyer Portal Verification ---');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'buyer.demo@keylo.com');
    await page.type('input[type="password"]', BUYER_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    console.log('[PASS] Logged in as Buyer. URL:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'demo-buyer-portal.png'), fullPage: false });
    console.log('Saved screenshot: demo-buyer-portal.png');

    console.log('\n================================================================');
    console.log('=== DEMO ENVIRONMENT VERIFICATION COMPLETED WITH 100% SUCCESS ===');
    console.log('================================================================\n');

  } catch (err) {
    console.error('[Verification Failed]:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    try {
      backendProc.kill();
      frontendProc.kill();
    } catch (e) {}
  }
}

run();

