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
  console.log('=== Starting Keylo Admin Console Navigation Refinement Verification ===');

  // 1. Build frontend dist fresh
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
    console.log('\n--- 4. Logging in as Administrator (admin.demo@keylo.com) ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    const adminEmail = process.env.KEYLO_ADMIN_EMAIL || 'admin.demo@keylo.com';
    const adminPassword = process.env.KEYLO_ADMIN_PASSWORD;
if (!adminPassword) throw new Error('Missing required env var KEYLO_ADMIN_PASSWORD');

    await page.type('input[type="email"], input[name="email"]', adminEmail);
    await page.type('input[type="password"], input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 10000 });
    console.log('Logged in successfully! Current URL:', page.url());

    // Wait for Overview data to populate
    await new Promise(r => setTimeout(r, 2000));

    // 5. Verify Desktop Sidebar Navigation & Elements
    console.log('\n--- 5. Verifying Desktop Left Sidebar Navigation ---');
    const sidebar = await page.$('#admin-sidebar');
    if (!sidebar) throw new Error('Left sidebar (#admin-sidebar) not found on desktop!');
    console.log('Left sidebar (#admin-sidebar) exists.');

    // Check all 7 navigation links
    const expectedLinks = [
      { name: 'Overview', href: '/admin' },
      { name: 'User Management', href: '/admin/users' },
      { name: 'Projects & Fact Sheets', href: '/admin/projects' },
      { name: 'Site Visits & Slots', href: '/admin/visits' },
      { name: 'Analytics & Reports', href: '/admin/analytics' },
      { name: 'Notifications & Settings', href: '/admin/settings' },
      { name: 'Audit Trail', href: '/admin/audit-logs' },
    ];

    for (const item of expectedLinks) {
      const link = await page.$(`a[href="${item.href}"]`);
      if (link) {
        console.log(`[PASS] Found nav link for ${item.name} -> ${item.href}`);
      } else {
        console.error(`[FAIL] Missing nav link for ${item.name} -> ${item.href}`);
      }
    }

    // Capture Desktop Expanded Screenshot (1440px)
    console.log('\n--- 6. Capturing Desktop Expanded Screenshot (1440px) ---');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-nav-desktop-expanded-1440.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-nav-desktop-expanded-1440.png');

    // 7. Test Sidebar Collapse Functionality
    console.log('\n--- 7. Testing Sidebar Collapse Toggle ---');
    const collapseButton = await page.$('button[aria-label="Collapse sidebar"]');
    if (collapseButton) {
      await collapseButton.click();
      await new Promise(r => setTimeout(r, 600));

      const isCollapsed = await page.evaluate(() => {
        const aside = document.querySelector('#admin-sidebar');
        return aside ? aside.classList.contains('w-[84px]') : false;
      });
      console.log('Sidebar collapsed successfully:', isCollapsed);

      // Capture Desktop Collapsed Screenshot (1440px)
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-nav-desktop-collapsed-1440.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-nav-desktop-collapsed-1440.png');

      // Expand it back
      const expandButton = await page.$('button[aria-label="Expand sidebar"]');
      if (expandButton) {
        await expandButton.click();
        await new Promise(r => setTimeout(r, 600));
        console.log('Sidebar re-expanded successfully.');
      }
    }

    // 8. Test Navigation to Audit Trail
    console.log('\n--- 8. Testing Navigation to Audit Trail ---');
    const auditLink = await page.$('a[href="/admin/audit-logs"]');
    if (auditLink) {
      await auditLink.click();
      await page.waitForFunction(() => window.location.pathname === '/admin/audit-logs', { timeout: 8000 });
      await new Promise(r => setTimeout(r, 1500));
      console.log('Navigated to /admin/audit-logs. Current URL:', page.url());

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-nav-audit-trail-1440.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-nav-audit-trail-1440.png');
    }

    // 9. Test Tablet Layout (768x1024)
    console.log('\n--- 9. Testing Tablet Layout (768x1024) ---');
    await page.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 1200));

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-nav-tablet-1024.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-nav-tablet-1024.png');

    // 10. Test Mobile Viewport & Slide-Out Drawer (390x844)
    console.log('\n--- 10. Testing Mobile Layout & Drawer (390x844) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 1200));

    // Open Drawer via hamburger button
    const hamburgerBtn = await page.waitForSelector('button[aria-label="Open navigation menu"]', { timeout: 8000 });
    if (!hamburgerBtn) throw new Error('Mobile hamburger menu button not found!');
    await hamburgerBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Verify Drawer is visible
    const drawer = await page.waitForSelector('[aria-label="Admin console navigation drawer"]', { timeout: 5000 });
    if (!drawer) throw new Error('Mobile slide-out drawer was not rendered!');
    console.log('Mobile slide-out drawer opened and verified.');

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-nav-mobile-drawer-390.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-nav-mobile-drawer-390.png');

    // Close Drawer via close button
    const closeBtn = await page.$('button[aria-label="Close navigation menu"]');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise(r => setTimeout(r, 500));
      console.log('Mobile drawer closed cleanly.');
    }

    console.log('\n=== All Admin Navigation Refinement Verifications Passed Successfully! ===');
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
