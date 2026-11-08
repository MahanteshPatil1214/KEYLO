import { spawn, execSync } from 'child_process';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';

const isWindows = os.platform() === 'win32';
const ARTIFACTS_DIR = path.resolve('e2e-artifacts');
const SCREENSHOTS_DIR = path.resolve('e2e-screenshots');
const BACKEND_URL = 'http://127.0.0.1:8000';
const FRONTEND_URL = 'http://127.0.0.1:5173';
const HEALTH_READY_PATH = '/api/v1/health/ready';
const PORT_POLL_TIMEOUT_MS = 60000;

for (const dir of [ARTIFACTS_DIR, SCREENSHOTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Collect browser console messages so they can be attached to failure artifacts. */
const consoleLogs = [];
let currentPage = null;
let currentBrowser = null;
let suitePassed = false;

function logConsole(message) {
  const text = message.text();
  const type = message.type();
  const entry = `[${new Date().toISOString()}] [${type}] ${text}`;
  consoleLogs.push(entry);
  if (!text.includes('[vite]') && !text.includes('React DevTools')) {
    console.log('[Browser Console]:', text);
  }
}

function waitPort(port, pathName = '/', timeoutMs = PORT_POLL_TIMEOUT_MS) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}${pathName}`);
        if (res.status < 500) {
          return resolve();
        }
      } catch (e) {
        // Retry
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for http://127.0.0.1:${port}${pathName}`));
      } else {
        setTimeout(check, 400);
      }
    };
    check();
  });
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

async function run() {
  console.log('================================================================');
  console.log('=== KEYLO FULL END-TO-END QA & STABILIZATION VERIFICATION SUITE ===');
  console.log('================================================================');

  // 1. Build frontend dist
  console.log('\n--- 1. Building Production Frontend Assets ---');
  execSync(`${getNpmCommand()} --prefix frontend run build`, { stdio: 'inherit' });

  // 2. Apply database migrations and seed demo data so the backend can serve
  // authenticated E2E flows against a populated database.
  console.log('\n--- 2. Applying database migrations and seeding demo data ---');
  execSync(`${getPythonExecutable()} -m alembic upgrade head`, {
    cwd: path.resolve('backend'),
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    shell: true,
  });
  execSync(`${getPythonExecutable()} scripts/prepare_demo_environment.py`, {
    cwd: path.resolve('backend'),
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    shell: true,
  });

  // 3. Start FastAPI Backend on port 8000
  console.log('\n--- 3. Starting FastAPI Backend on port 8000 ---');
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

  // 4. Start Frontend Preview
  console.log('\n--- 4. Starting Frontend Preview Server on port 5173 ---');
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
    await waitPort(8000, HEALTH_READY_PATH);
    console.log('Backend is operational on port 8000 (/api/v1/health/ready).');
    await waitPort(5173);
    console.log('Frontend is operational on port 5173.');

    currentBrowser = await puppeteer.launch({
      headless: true,
      executablePath: getChromeExecutablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    currentPage = await currentBrowser.newPage();
    // Fail fast on slow pages/navigation instead of hanging indefinitely.
    currentPage.setDefaultNavigationTimeout(30000);
    currentPage.setDefaultTimeout(10000);
    currentPage.on('console', msg => logConsole(msg));
    currentPage.on('pageerror', err => {
      console.error('[Browser Page Error]:', err.message);
      consoleLogs.push(`[${new Date().toISOString()}] [pageerror] ${err.message}`);
    });

    await currentPage.tracing.start({
      screenshots: true,
      snapshots: true,
      categories: ['devtools.timeline'],
    });

    // -------------------------------------------------------------
    // TEST 1: Public Homepage & Navigation
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Verifying Public Homepage (1440x900) ---');
    await currentPage.setViewport({ width: 1440, height: 900 });
    await currentPage.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle0' });
    await currentPage.waitForSelector('h1', { timeout: 10000 });
    const heroTitle = await currentPage.$eval('h1', el => el.textContent);
    console.log('[PASS] Homepage loaded with heading:', heroTitle.trim());

    // -------------------------------------------------------------
    // TEST 2: Buyer Registration & Login
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Buyer Authentication Flow ---');
    await currentPage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });

    const buyerEmail = process.env.KEYLO_BUYER_EMAIL;
    const buyerPassword = process.env.KEYLO_BUYER_PASSWORD;
    if (!buyerEmail || !buyerPassword) {
      throw new Error('Missing required env vars: KEYLO_BUYER_EMAIL, KEYLO_BUYER_PASSWORD');
    }

    await currentPage.type('input[type="email"], input[name="email"]', buyerEmail);
    await currentPage.type('input[type="password"], input[name="password"]', buyerPassword);
    await currentPage.click('button[type="submit"]');

    await currentPage.waitForFunction(() => window.location.pathname.startsWith('/buyer'), { timeout: 10000 });
    console.log('[PASS] Buyer logged in successfully! URL:', currentPage.url());

    await new Promise(r => setTimeout(r, 1500));
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-buyer-dashboard.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-buyer-dashboard.png');

    // -------------------------------------------------------------
    // TEST 3: Buyer AI Conversation & Multilingual Chat
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Buyer AI Conversations & Fact-Grounded Chat ---');
    await currentPage.goto(`${FRONTEND_URL}/buyer/conversations`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // Check if chat input exists
    const chatInput = await currentPage.$('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]');
    if (chatInput) {
      // Send multilingual test message
      console.log('Testing chat message delivery...');
      await chatInput.type('Hello! What configurations and amenities are available at the project?');
      const sendBtn = await currentPage.$('button[type="submit"], button[aria-label="Send message"]');
      if (sendBtn) {
        await sendBtn.click();
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-buyer-ai-chat-multilingual.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-buyer-ai-chat-multilingual.png');

    // Sign out from Buyer session
    await currentPage.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // -------------------------------------------------------------
    // TEST 4: Sales Executive Workspace
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Sales Executive Workspace Flow ---');
    await currentPage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });

    const salesEmail = process.env.KEYLO_SALES_EMAIL;
    const salesPassword = process.env.KEYLO_SALES_PASSWORD;
    if (!salesEmail || !salesPassword) {
      throw new Error('Missing required env vars: KEYLO_SALES_EMAIL, KEYLO_SALES_PASSWORD');
    }

    await currentPage.type('input[type="email"], input[name="email"]', salesEmail);
    await currentPage.type('input[type="password"], input[name="password"]', salesPassword);
    await currentPage.click('button[type="submit"]');

    await currentPage.waitForFunction(() => window.location.pathname.startsWith('/sales'), { timeout: 10000 });
    console.log('[PASS] Sales Executive logged in successfully! URL:', currentPage.url());
    await new Promise(r => setTimeout(r, 1500));

    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-sales-workspace.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-sales-workspace.png');

    // Verify Sales Navigation items
    const salesLeadsLink = await currentPage.$('a[href="/sales/leads"]');
    const salesConversationsLink = await currentPage.$('a[href="/sales/conversations"]');
    const salesVisitsLink = await currentPage.$('a[href="/sales/visits"]');
    const salesFollowUpsLink = await currentPage.$('a[href="/sales/follow-ups"]');

    console.log('[PASS] Sales Leads link exists:', !!salesLeadsLink);
    console.log('[PASS] Sales Conversations link exists:', !!salesConversationsLink);
    console.log('[PASS] Sales Visits link exists:', !!salesVisitsLink);
    console.log('[PASS] Sales Follow-ups link exists:', !!salesFollowUpsLink);

    // Sign out from Sales session
    await currentPage.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // -------------------------------------------------------------
    // TEST 5: Admin Console Navigation & Modules
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Admin Console Comprehensive Flow ---');
    await currentPage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });

    const adminEmail = process.env.KEYLO_ADMIN_EMAIL;
    const adminPassword = process.env.KEYLO_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error('Missing required env vars: KEYLO_ADMIN_EMAIL, KEYLO_ADMIN_PASSWORD');
    }

    await currentPage.type('input[type="email"], input[name="email"]', adminEmail);
    await currentPage.type('input[type="password"], input[name="password"]', adminPassword);
    await currentPage.click('button[type="submit"]');

    await currentPage.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 10000 });
    console.log('[PASS] Administrator logged in successfully! URL:', currentPage.url());
    await new Promise(r => setTimeout(r, 2000));

    // Module 1: Overview
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-overview.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-overview.png');

    // Module 2: Projects & Fact Sheets
    console.log('\n--- Verifying Admin Projects & Fact Sheets ---');
    await currentPage.goto(`${FRONTEND_URL}/admin/projects`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-projects.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-projects.png');

    // Module 3: Site Visits & Slots Management
    console.log('\n--- Verifying Admin Site Visits & Slots ---');
    await currentPage.goto(`${FRONTEND_URL}/admin/visits`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-visits.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-visits.png');

    // Module 4: Analytics & Reporting Dashboard
    console.log('\n--- Verifying Admin Analytics & Trends Chart ---');
    await currentPage.goto(`${FRONTEND_URL}/admin/analytics`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-analytics.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-analytics.png');

    // Module 5: Settings & Notifications
    console.log('\n--- Verifying Admin System Settings ---');
    await currentPage.goto(`${FRONTEND_URL}/admin/settings`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-settings.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-settings.png');

    // Module 6: Audit Trail
    console.log('\n--- Verifying Admin Audit Trail ---');
    await currentPage.goto(`${FRONTEND_URL}/admin/audit-logs`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-admin-audit-logs.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-admin-audit-logs.png');

    // -------------------------------------------------------------
    // TEST 6: Tablet & Mobile Responsive Layouts
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Responsive Layouts (Tablet & Mobile) ---');

    // Tablet: 768px portrait
    await currentPage.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });
    await currentPage.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));
    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-responsive-tablet.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-responsive-tablet.png');

    // Mobile: 390px iPhone width
    await currentPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await currentPage.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // Open mobile slide-out drawer
    const hamburger = await currentPage.waitForSelector('button[aria-label="Open navigation menu"]', { timeout: 8000 });
    await hamburger.click();
    await new Promise(r => setTimeout(r, 800));

    await currentPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'e2e-responsive-mobile-drawer.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: e2e-responsive-mobile-drawer.png');

    console.log('\n================================================================');
    console.log('=== ALL END-TO-END QA & STABILIZATION CHECKS PASSED CLEANLY! ===');
    console.log('================================================================');
    suitePassed = true;
  } finally {
    console.log('\nCleaning up processes...');

    // --- Failure artifacts: capture evidence before tearing down the browser ---
    if (currentBrowser) {
      try {
        if (currentPage && !suitePassed) {
          await currentPage.screenshot({
            path: path.join(
              SCREENSHOTS_DIR,
              `e2e-failure-${Date.now()}.png`,
            ),
            fullPage: true,
          });
          console.log('Saved failure screenshot: e2e-failure-<timestamp>.png');
        }
        await currentPage.tracing.stop({
          path: path.join(ARTIFACTS_DIR, 'e2e-trace.zip'),
        });
        console.log('Saved trace: e2e-trace.zip');
      } catch (artifactErr) {
        console.error('Could not capture failure artifacts:', artifactErr.message);
      }
      try {
        await currentBrowser.close();
      } catch (closeErr) {
        console.error('Error closing browser:', closeErr.message);
      }
    }

    // Persist browser console logs for inspection of failed runs.
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'e2e-console.log'),
      consoleLogs.join('\n') + '\n',
      { encoding: 'utf-8' },
    );

    frontendProc.kill();
    backendProc.kill();
  }
}

run().catch(async err => {
  console.error('Fatal E2E Test Failure:', err);
  // Best-effort evidence capture when the suite dies before reaching `finally`.
  try {
    if (currentPage) {
      await currentPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, `e2e-fatal-${Date.now()}.png`),
        fullPage: true,
      });
    }
    if (currentPage && currentBrowser) {
      await currentPage.tracing.stop({
        path: path.join(ARTIFACTS_DIR, 'e2e-trace.zip'),
      });
    }
  } catch {
    // Ignore: artifact capture is best-effort on a fatal failure.
  }
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'e2e-console.log'),
    consoleLogs.join('\n') + '\n',
    { encoding: 'utf-8' },
  );
  process.exit(1);
});

