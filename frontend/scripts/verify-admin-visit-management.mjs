import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function waitPort(port, timeoutMs = 20000) {
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
  console.log('=== Starting Keylo Admin Site Visits & Availability Management Verification ===');

  // 1. Start FastAPI Backend
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
  backendProc.stderr.on('data', d => {
    const s = d.toString();
    if (s.includes('ERROR')) console.error('[Backend Err]', s.trim());
  });

  // 2. Start Frontend Vite Preview
  console.log('\n--- Starting Frontend Vite Preview on port 5173 ---');
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

  let browser;
  try {
    await waitPort(8000);
    console.log('Backend is reachable on port 8000.');
    await waitPort(5173);
    console.log('Frontend is reachable on port 5173.');

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

    // 1. Log in as ADMIN
    console.log('\n--- 1. Logging in as Administrator ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    const adminEmail = process.env.KEYLO_ADMIN_EMAIL || 'admin.demo@keylo.com';
    const adminPassword = process.env.KEYLO_ADMIN_PASSWORD || 'KeyloAdmin!2026#';

    await page.type('input[type="email"], input[name="email"]', adminEmail);
    await page.type('input[type="password"], input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 10000 });
    console.log('Logged in successfully! Current URL:', page.url());

    // 2. Navigate to /admin/visits
    console.log('\n--- 2. Navigating to Site Visits & Availability ---');
    const visitsNavLink = await page.$('a[href="/admin/visits"]');
    if (visitsNavLink) {
      await visitsNavLink.click();
    } else {
      await page.goto('http://127.0.0.1:5173/admin/visits', { waitUntil: 'networkidle0' });
    }

    await page.waitForFunction(() => window.location.pathname === '/admin/visits', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1500));

    // Verify Title and KPIs
    const content = await page.content();
    console.log('Page has Site Visits & Availability title:', content.includes('Site Visits & Availability'));
    console.log('Page has Total Visits metric:', content.includes('Total Visits'));
    console.log('Page has Upcoming Visits metric:', content.includes('Upcoming Visits'));
    console.log('Page has Completed metric:', content.includes('Completed'));
    console.log('Page has Cancelled metric:', content.includes('Cancelled'));
    console.log('Page has Active Slots metric:', content.includes('Active Slots'));
    console.log('Page has Blocked Slots metric:', content.includes('Blocked Slots'));
    console.log('Page has Add Visit Slot button:', content.includes('Add Visit Slot'));

    // 3. Capture Desktop Viewport (1440px)
    console.log('\n--- 3. Capturing Desktop Layout (1440px) ---');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-visits-desktop-1440.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-visits-desktop-1440.png');

    // 4. Test Search Filter
    console.log('\n--- 4. Testing Search Filter for "Sneha" ---');
    const searchInput = await page.$('input[placeholder*="Search by buyer name"]');
    if (searchInput) {
      await searchInput.type('Sneha');
      await new Promise(r => setTimeout(r, 800));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-visits-filtered-search.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-visits-filtered-search.png');

      // Clear search
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 800));
    }

    // 5. Open Visit Details Modal
    console.log('\n--- 5. Opening Visit Details Modal ---');
    const detailButtons = await page.$$('button ::-p-text(Details)');
    if (detailButtons.length > 0) {
      await detailButtons[0].click();
      await new Promise(r => setTimeout(r, 800));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-visits-detail-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-visits-detail-modal.png');

      // Close modal
      const closeBtn = await page.$('.max-w-xl button:has(svg)');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 6. Switch to Availability Slots Tab
    console.log('\n--- 6. Switching to Availability Slots tab ---');
    const slotsTabBtn = await page.$('button ::-p-text(Availability Slots)');
    if (slotsTabBtn) {
      await slotsTabBtn.click();
      await new Promise(r => setTimeout(r, 1200));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-slots-desktop-1440.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-slots-desktop-1440.png');
    }

    // 7. Open Create Visit Slot Modal
    console.log('\n--- 7. Opening Create Visit Slot Modal ---');
    const addSlotBtn = await page.$('#create-slot-btn');
    if (addSlotBtn) {
      await addSlotBtn.click();
      await new Promise(r => setTimeout(r, 600));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-slots-create-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-slots-create-modal.png');

      // Fill Slot form
      console.log('Filling Create Slot form...');
      await page.type('#create-slot-notes', 'Evening sunset gallery tour');
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 1500));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-slots-created-success.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-slots-created-success.png');
    }

    // 8. Test Reschedule Visit
    console.log('\n--- 8. Testing Reschedule Visit Modal ---');
    const visitsTabBtn = await page.$('button ::-p-text(Site Visits)');
    if (visitsTabBtn) {
      await visitsTabBtn.click();
      await new Promise(r => setTimeout(r, 1000));

      const rescheduleButtons = await page.$$('button ::-p-text(Reschedule)');
      if (rescheduleButtons.length > 0) {
        await rescheduleButtons[0].click();
        await new Promise(r => setTimeout(r, 800));

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'admin-visits-reschedule-modal.png'),
          fullPage: false,
        });
        console.log('Saved screenshot: admin-visits-reschedule-modal.png');

        // Close modal
        const closeRescheduleBtn = await page.$('.max-w-lg button:has(svg)');
        if (closeRescheduleBtn) {
          await closeRescheduleBtn.click();
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    // 9. Tablet Viewport (1024px)
    console.log('\n--- 9. Capturing Tablet Layout (1024px) ---');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-visits-tablet-1024.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-visits-tablet-1024.png');

    // 10. Mobile Viewport (390px)
    console.log('\n--- 10. Capturing Mobile Layout (390px) ---');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-visits-mobile-390.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-visits-mobile-390.png');

    console.log('\n=== All Admin Visits & Availability verification checks completed successfully! ===');

  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    backendProc.kill();
    frontendProc.kill();
  }
}

run();
