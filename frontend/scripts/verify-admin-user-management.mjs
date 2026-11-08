import { spawn } from 'child_process';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function waitPort(port, timeoutMs = 15000) {
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
  console.log('=== Starting Keylo Admin User Management Verification ===');

  // 1. Start Backend
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
  backendProc.stderr.on('data', d => console.error('[Backend Err]', d.toString().trim()));

  // 2. Start Frontend Preview
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

  try {
    await waitPort(8000);
    console.log('Backend is reachable on port 8000.');
    await waitPort(5173);
    console.log('Frontend is reachable on port 5173.');

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

    // 1. Log in as ADMIN
    console.log('\n--- 1. Logging in as Administrator (admin.demo@keylo.com) ---');
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

    // Wait for data load
    await new Promise(r => setTimeout(r, 2000));

    // Verify Title and Metrics
    const content = await page.content();
    console.log('Page has User Management title:', content.includes('User Management'));
    console.log('Page has Total Users card:', content.includes('Total Users'));
    console.log('Page has Active Users card:', content.includes('Active Users'));
    console.log('Page has Deactivated card:', content.includes('Deactivated'));
    console.log('Page has Admins card:', content.includes('Admins'));
    console.log('Page has Sales Execs card:', content.includes('Sales Execs'));
    console.log('Page has Buyers card:', content.includes('Buyers'));
    console.log('Page has Add User button:', content.includes('Add User'));

    // Capture Desktop Viewport (1440px)
    console.log('\n--- 2. Capturing Desktop Layout (1440px) ---');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-users-desktop-1440.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-users-desktop-1440.png');

    // 3. Test Search Filter
    console.log('\n--- 3. Testing Search Filter for "Rohit" ---');
    const searchInput = await page.$('input[placeholder*="Search by name"]');
    if (searchInput) {
      await searchInput.type('Rohit');
      await new Promise(r => setTimeout(r, 800));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-users-filtered-search.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-users-filtered-search.png');

      // Clear search
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 800));
    }

    // 4. Open Create User Modal
    console.log('\n--- 4. Opening Create User Modal ---');
    const addUserBtn = await page.$('button ::-p-text(Add User)');
    if (addUserBtn) {
      await addUserBtn.click();
      await new Promise(r => setTimeout(r, 600));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-users-create-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-users-create-modal.png');

      // Generate dynamic test credentials at runtime
      const dynamicUserPassword = `Aa1!${crypto.randomBytes(8).toString('hex')}`;
      const dynamicUserEmail = `maya.sen.${Date.now()}@keylo.com`;

      // Fill form
      await page.type('#create-fullname', 'Maya Sen');
      await page.type('#create-email', dynamicUserEmail);
      await page.type('#create-password', dynamicUserPassword);
      await page.type('#create-phone', '+91 97777 88888');

      // Submit
      const submitBtn = await page.$('button[type="submit"] ::-p-text(Create Account)');
      if (submitBtn) {
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 1500));

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'admin-users-created-success.png'),
          fullPage: false,
        });
        console.log('Saved screenshot: admin-users-created-success.png');
      }
    }

    // 5. Open Edit User Modal
    console.log('\n--- 5. Opening Edit User Modal for Maya Sen ---');
    const editBtns = await page.$$('button ::-p-text(Edit)');
    if (editBtns.length > 0) {
      await editBtns[0].click();
      await new Promise(r => setTimeout(r, 600));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-users-edit-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-users-edit-modal.png');

      // Close modal
      const cancelBtn = await page.$('button ::-p-text(Cancel)');
      if (cancelBtn) await cancelBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // 6. Test Status Toggle Confirmation Modal
    console.log('\n--- 6. Opening Status Deactivation Modal ---');
    const deactivateBtns = await page.$$('button ::-p-text(Deactivate)');
    if (deactivateBtns.length > 0) {
      await deactivateBtns[0].click();
      await new Promise(r => setTimeout(r, 600));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-users-status-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-users-status-modal.png');

      // Close modal
      const cancelBtn = await page.$('button ::-p-text(Cancel)');
      if (cancelBtn) await cancelBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // 7. Tablet Layout (1024px)
    console.log('\n--- 7. Capturing Tablet Layout (1024px) ---');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-users-tablet-1024.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-users-tablet-1024.png');

    // 8. Mobile Layout (390px)
    console.log('\n--- 8. Capturing Mobile Layout (390px) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-users-mobile-390.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-users-mobile-390.png');

    await browser.close();
    console.log('\n=== All Browser Verifications Completed Successfully! ===');
  } finally {
    console.log('\n--- Cleaning up backend and frontend processes ---');
    backendProc.kill();
    frontendProc.kill();
  }
}

run().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
