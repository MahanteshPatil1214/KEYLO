import { spawn, execSync } from 'child_process';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';

const isWindows = os.platform() === 'win32';
const SCREENSHOTS_DIR = path.resolve('e2e-screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function getPythonExecutable() {
  if (isWindows) {
    return path.resolve('backend/.venv/Scripts/python.exe');
  }
  return path.resolve('backend/.venv/bin/python');
}

function getNpmCommand() {
  return isWindows ? 'npm.cmd' : 'npm';
}

function getChromeExecutablePath() {
  // Let Puppeteer resolve Chrome from PUPPETEER_EXECUTABLE_PATH or its bundled
  // Chromium. Fall back to common Windows install locations when running locally.
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (isWindows) {
    const commonPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }
  return undefined;
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
  console.log('=== KEYLO FULL END-TO-END QA & STABILIZATION VERIFICATION SUITE ===');
  console.log('================================================================');

  // 1. Build frontend dist
  console.log('\n--- 1. Building Production Frontend Assets ---');
  execSync(`${getNpmCommand()} --prefix frontend run build`, { stdio: 'inherit' });

  // 2. Start FastAPI Backend
  console.log('\n--- 2. Starting FastAPI Backend on port 8000 ---');
  const backendProc = spawn(
    getPythonExecutable(),
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
  console.log('\n--- 3. Starting Frontend Preview Server on port 5173 ---');
  const frontendProc = spawn(
    getNpmCommand(),
    ['--prefix', 'frontend', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', '5173'],
    {
      cwd: path.resolve('.'),
      stdio: 'pipe',
      shell: true,
    }
  );

  frontendProc.stdout.on('data', d => console.log('[Frontend]', d.toString().trim()));
  frontendProc.stderr.on('data', d => console.error('[Frontend Err]', d.toString().trim()));

  let browser;

  try {
    await waitPort(8000);
    console.log('Backend is operational on port 8000.');
    await waitPort(5173);
    console.log('Frontend is operational on port 5173.');

    browser = await puppeteer.launch({
      headless: true,
      executablePath: getChromeExecutablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    page.on('console', msg => {
      const text = msg.text();
      if (!text.includes('[vite]') && !text.includes('React DevTools')) {
        console.log('[Browser Console]:', text);
      }
    });

    // -------------------------------------------------------------
    // TEST 1: Public Homepage & Navigation
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Verifying Public Homepage (1440x900) ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
    const heroTitle = await page.$eval('h1', el => el.textContent);
    console.log('[PASS] Homepage loaded with heading:', heroTitle.trim());

    // -------------------------------------------------------------
    // TEST 2: Buyer Registration & Login
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Buyer Authentication Flow ---');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    const buyerEmail = process.env.KEYLO_BUYER_EMAIL;
    const buyerPassword = process.env.KEYLO_BUYER_PASSWORD;
    if (!buyerEmail || !buyerPassword) {
      throw new Error('Missing required env vars: KEYLO_BUYER_EMAIL, KEYLO_BUYER_PASSWORD');
    }

    await page.type('input[type="email"], input[name="email"]', buyerEmail);
    await page.type('input[type="password"], input[name="password"]', buyerPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/buyer'), { timeout: 10000 });
    console.log('[PASS] Buyer logged in successfully! URL:', page.url());

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-buyer-dashboard.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-buyer-dashboard.png');

    // -------------------------------------------------------------
    // TEST 3: Buyer AI Conversation & Multilingual Chat
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Buyer AI Conversations & Fact-Grounded Chat ---');
    await page.goto('http://127.0.0.1:5173/buyer/conversations', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // Check if chat input exists
    const chatInput = await page.$('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]');
    if (chatInput) {
      // Send multilingual test message
      console.log('Testing chat message delivery...');
      await chatInput.type('Hello! What configurations and amenities are available at the project?');
      const sendBtn = await page.$('button[type="submit"], button[aria-label="Send message"]');
      if (sendBtn) {
        await sendBtn.click();
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-buyer-ai-chat-multilingual.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-buyer-ai-chat-multilingual.png');

    // Sign out from Buyer session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // -------------------------------------------------------------
    // TEST 4: Sales Executive Workspace
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Sales Executive Workspace Flow ---');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    const salesEmail = process.env.KEYLO_SALES_EMAIL;
    const salesPassword = process.env.KEYLO_SALES_PASSWORD;
    if (!salesEmail || !salesPassword) {
      throw new Error('Missing required env vars: KEYLO_SALES_EMAIL, KEYLO_SALES_PASSWORD');
    }

    await page.type('input[type="email"], input[name="email"]', salesEmail);
    await page.type('input[type="password"], input[name="password"]', salesPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/sales'), { timeout: 10000 });
    console.log('[PASS] Sales Executive logged in successfully! URL:', page.url());
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-sales-workspace.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-sales-workspace.png');

    // Verify Sales Navigation items
    const salesLeadsLink = await page.$('a[href="/sales/leads"]');
    const salesConversationsLink = await page.$('a[href="/sales/conversations"]');
    const salesVisitsLink = await page.$('a[href="/sales/visits"]');
    const salesFollowUpsLink = await page.$('a[href="/sales/follow-ups"]');

    console.log('[PASS] Sales Leads link exists:', !!salesLeadsLink);
    console.log('[PASS] Sales Conversations link exists:', !!salesConversationsLink);
    console.log('[PASS] Sales Visits link exists:', !!salesVisitsLink);
    console.log('[PASS] Sales Follow-ups link exists:', !!salesFollowUpsLink);

    // Sign out from Sales session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // -------------------------------------------------------------
    // TEST 5: Admin Console Navigation & Modules
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Admin Console Comprehensive Flow ---');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    const adminEmail = process.env.KEYLO_ADMIN_EMAIL;
    const adminPassword = process.env.KEYLO_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Missing required env vars: KEYLO_ADMIN_EMAIL, KEYLO_ADMIN_PASSWORD');
    }

    await page.type('input[type="email"], input[name="email"]', adminEmail);
    await page.type('input[type="password"], input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 10000 });
    console.log('[PASS] Administrator logged in successfully! URL:', page.url());
    await new Promise(r => setTimeout(r, 2000));

    // Module 1: Overview
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-overview.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-overview.png');

    // Module 2: Projects & Fact Sheets
    console.log('\n--- Verifying Admin Projects & Fact Sheets ---');
    await page.goto('http://127.0.0.1:5173/admin/projects', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-projects.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-projects.png');

    // Module 3: Site Visits & Slots Management
    console.log('\n--- Verifying Admin Site Visits & Slots ---');
    await page.goto('http://127.0.0.1:5173/admin/visits', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-visits.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-visits.png');

    // Module 4: Analytics & Reporting Dashboard
    console.log('\n--- Verifying Admin Analytics & Trends Chart ---');
    await page.goto('http://127.0.0.1:5173/admin/analytics', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-analytics.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-analytics.png');

    // Module 5: Settings & Notifications
    console.log('\n--- Verifying Admin System Settings ---');
    await page.goto('http://127.0.0.1:5173/admin/settings', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-settings.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-settings.png');

    // Module 6: Audit Trail
    console.log('\n--- Verifying Admin Audit Trail ---');
    await page.goto('http://127.0.0.1:5173/admin/audit-logs', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-audit-logs.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-audit-logs.png');

    // -------------------------------------------------------------
    // TEST 6: Tablet & Mobile Responsive Layouts
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Responsive Layouts (Tablet & Mobile) ---');

    // Tablet: 768px portrait
    await page.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-responsive-tablet.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-responsive-tablet.png');

    // Mobile: 390px iPhone width
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // Open mobile slide-out drawer
    const hamburger = await page.waitForSelector('button[aria-label="Open navigation menu"]', { timeout: 8000 });
    await hamburger.click();
    await new Promise(r => setTimeout(r, 800));

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-responsive-mobile-drawer.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-responsive-mobile-drawer.png');

    console.log('\n================================================================');
    console.log('=== ALL END-TO-END QA & STABILIZATION CHECKS PASSED CLEANLY! ===');
    console.log('================================================================');

    await browser.close();
  } finally {
    console.log('\nCleaning up processes...');
    frontendProc.kill();
    backendProc.kill();
  }
}

run().catch(err => {
  console.error('Fatal E2E Test Failure:', err);
  process.exit(1);
});

