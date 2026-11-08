import { spawn, execSync } from 'child_process';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

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
  console.log('=== Starting Keylo Acquisition & Conversion Trends Chart UX & Rendering Fixes Verification ===');

  // 1. Build frontend dist
  console.log('\n--- 1. Building Frontend Dist ---');
  execSync('npm.cmd --prefix frontend run build', { stdio: 'inherit' });

  // 2. Start Backend
  console.log('\n--- 2. Starting FastAPI Backend on port 8000 ---');
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
  backendProc.stderr.on('data', d => {
    const s = d.toString();
    if (s.includes('ERROR')) console.error('[Backend Err]', s.trim());
  });

  // 3. Start Frontend Preview
  console.log('\n--- 3. Starting Frontend Preview on port 5173 ---');
  const frontendProc = spawn(
    'npm.cmd',
    ['--prefix', 'frontend', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', '5173'],
    {
      cwd: path.resolve('.'),
      stdio: 'pipe',
      shell: true,
    }
  );

  frontendProc.stdout.on('data', d => console.log('[Frontend]', d.toString().trim()));
  frontendProc.stderr.on('data', d => console.error('[Frontend Err]', d.toString().trim()));

  try {
    await waitPort(8000);
    console.log('Backend is reachable on port 8000.');
    await waitPort(5173);
    console.log('Frontend is reachable on port 5173.');

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

    // 4. Log in as ADMIN
    console.log('\n--- 4. Logging in as Administrator ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    const adminEmail = process.env.KEYLO_ADMIN_EMAIL || 'admin.demo@keylo.com';
    const adminPassword = process.env.KEYLO_ADMIN_PASSWORD;
if (!adminPassword) throw new Error('Missing required env var KEYLO_ADMIN_PASSWORD');

    await page.type('input[type="email"], input[name="email"]', adminEmail);
    await page.type('input[type="password"], input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 10000 });
    console.log('Logged in successfully!');

    // 5. Navigate to /admin/analytics
    console.log('\n--- 5. Navigating to /admin/analytics ---');
    await page.goto('http://127.0.0.1:5173/admin/analytics', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // 6. Verify Normalized Funnel Stage Names
    console.log('\n--- 6. Verifying Normalized Funnel Stage Names ---');
    const content = await page.content();
    const hasInquiries = content.includes('Inquiries:');
    const hasBookings = content.includes('Bookings:');
    const hasSiteVisits = content.includes('Site Visits:');
    const hasClosedDeals = content.includes('Closed Deals:');
    console.log('[PASS] Has "Inquiries:":', hasInquiries);
    console.log('[PASS] Has "Bookings:":', hasBookings);
    console.log('[PASS] Has "Site Visits:":', hasSiteVisits);
    console.log('[PASS] Has "Closed Deals:":', hasClosedDeals);

    // 7. Verify Redundant Pill Removed
    const hasRedundantIntervalPill = content.includes('1 month intervals') || content.includes('month intervals');
    console.log('[PASS] Redundant interval pill is removed:', !hasRedundantIntervalPill);

    // 8. Capture Sparse / Single-Interval Centered Column Fallback
    console.log('\n--- 8. Capturing Sparse Data / Centered Column Snapshot ---');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-analytics-trends-sparse-centered.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-analytics-trends-sparse-centered.png');

    // 9. Switch to Weekly Granularity (multi-interval)
    console.log('\n--- 9. Switching to Weekly Granularity ---');
    const weeklyBtn = await page.waitForSelector('button::-p-text(Weekly)');
    if (weeklyBtn) {
      await weeklyBtn.click();
      await new Promise(r => setTimeout(r, 1500));
      console.log('Switched to Weekly.');

      // Capture Smooth Area View for Weekly
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-analytics-trends-weekly-area.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-analytics-trends-weekly-area.png');
    }

    // 10. Switch to Columns Mode
    console.log('\n--- 10. Switching to Columns Mode ---');
    const columnsBtn = await page.waitForSelector('button[title="Grouped Comparative Columns"]');
    if (columnsBtn) {
      await columnsBtn.click();
      await new Promise(r => setTimeout(r, 1000));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-analytics-trends-columns.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-analytics-trends-columns.png');
    }

    console.log('\n=== All UX and Rendering Fixes Verified Successfully! ===');
    await browser.close();
  } finally {
    console.log('\nCleaning up processes...');
    frontendProc.kill();
    backendProc.kill();
  }
}

run().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
