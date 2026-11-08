import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const ADMIN_PASSWORD = process.env.KEYLO_ADMIN_PASSWORD || 'KeyloAdmin!2026#';

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
  console.log('=== Starting Keylo Admin Notifications & System Settings Verification ===');

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
    page.setDefaultTimeout(15000);

    // 3. Authenticate as Admin
    console.log('\n--- Logging in as Admin ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    const emailInput = await page.waitForSelector('input[type="email"]');
    await emailInput.type('admin.demo@keylo.com');
    const passwordInput = await page.waitForSelector('input[type="password"]');
    await passwordInput.type(ADMIN_PASSWORD);

    const submitBtn = await page.waitForSelector('button[type="submit"]');
    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Admin logged in. Current URL:', page.url());

    // 4. Navigate to Settings
    console.log('\n--- Navigating to Admin Settings ---');
    await page.goto('http://127.0.0.1:5173/admin/settings', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // Verify Title
    const titleText = await page.$eval('h1', el => el.textContent);
    console.log('Page Title:', titleText);
    if (!titleText.includes('Notifications & System Settings')) {
      throw new Error(`Unexpected page title: ${titleText}`);
    }

    // Screenshot 1: Reminders & Alerts (1440x900)
    console.log('\n--- Verifying Reminders & Alerts Tab ---');
    const ss1 = path.join(SCREENSHOTS_DIR, 'admin-settings-reminders-1440.png');
    await page.screenshot({ path: ss1, fullPage: false });
    console.log('Screenshot saved:', ss1);

    // Trigger Reminders Scan
    console.log('Triggering reminder scan...');
    const triggerScanBtn = await page.waitForSelector('#trigger-reminders-btn');
    await triggerScanBtn.click();
    await new Promise(r => setTimeout(r, 1500));
    console.log('Reminder scan triggered.');

    // 5. System Notifications Tab & Broadcast
    console.log('\n--- Testing System Notifications Tab ---');
    const notifsTabBtn = await page.waitForSelector('button::-p-text(System Notifications)');
    await notifsTabBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Open Broadcast Modal
    const broadcastModalBtn = await page.waitForSelector('#open-broadcast-modal-btn');
    await broadcastModalBtn.click();
    await new Promise(r => setTimeout(r, 600));

    await page.type('#broadcast-title-input', 'Scheduled Platform Maintenance');
    await page.type('#broadcast-message-input', 'Keylo cloud services will undergo security maintenance tonight at 11:30 PM UTC. Expected duration 15 minutes.');

    // Screenshot 2: Broadcast Modal
    const ss2 = path.join(SCREENSHOTS_DIR, 'admin-settings-broadcast-modal.png');
    await page.screenshot({ path: ss2, fullPage: false });
    console.log('Screenshot saved:', ss2);

    const submitBroadcastBtn = await page.waitForSelector('#submit-broadcast-btn');
    await submitBroadcastBtn.click();
    await new Promise(r => setTimeout(r, 1500));
    console.log('Broadcast dispatched.');

    // Screenshot 3: Notifications Table
    const ss3 = path.join(SCREENSHOTS_DIR, 'admin-settings-notifications-1440.png');
    await page.screenshot({ path: ss3, fullPage: false });
    console.log('Screenshot saved:', ss3);

    // 6. Notification Templates Tab
    console.log('\n--- Testing Notification Templates Tab ---');
    const templatesTabBtn = await page.waitForSelector('button::-p-text(Notification Templates)');
    await templatesTabBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 4: Templates Grid
    const ss4 = path.join(SCREENSHOTS_DIR, 'admin-settings-templates-1440.png');
    await page.screenshot({ path: ss4, fullPage: false });
    console.log('Screenshot saved:', ss4);

    // 7. AI & Languages Tab
    console.log('\n--- Testing AI & Languages Tab ---');
    const aiTabBtn = await page.waitForSelector('button::-p-text(AI & Languages)');
    await aiTabBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 5: AI & Languages Settings
    const ss5 = path.join(SCREENSHOTS_DIR, 'admin-settings-ai-languages-1440.png');
    await page.screenshot({ path: ss5, fullPage: false });
    console.log('Screenshot saved:', ss5);

    // 8. Lead Routing Tab
    console.log('\n--- Testing Lead Routing Tab ---');
    const routingTabBtn = await page.waitForSelector('button::-p-text(Lead Routing)');
    await routingTabBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 6: Lead Routing Rules
    const ss6 = path.join(SCREENSHOTS_DIR, 'admin-settings-lead-routing-1440.png');
    await page.screenshot({ path: ss6, fullPage: false });
    console.log('Screenshot saved:', ss6);

    // 9. Audit Trail Tab
    console.log('\n--- Testing Audit Trail Tab ---');
    const auditTabBtn = await page.waitForSelector('button::-p-text(Audit Trail)');
    await auditTabBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Inspect first audit log
    const inspectBtn = await page.waitForSelector('button::-p-text(Inspect)');
    await inspectBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Screenshot 7: Audit Log Details
    const ss7 = path.join(SCREENSHOTS_DIR, 'admin-settings-audit-logs-1440.png');
    await page.screenshot({ path: ss7, fullPage: false });
    console.log('Screenshot saved:', ss7);

    // Close modal
    const closeAuditBtn = await page.waitForSelector('button::-p-text(Close)');
    await closeAuditBtn.click();
    await new Promise(r => setTimeout(r, 400));

    // 10. Tablet Viewport (1024x768)
    console.log('\n--- Capturing Tablet Viewport (1024x768) ---');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 800));
    const ss8 = path.join(SCREENSHOTS_DIR, 'admin-settings-tablet-1024.png');
    await page.screenshot({ path: ss8, fullPage: false });
    console.log('Screenshot saved:', ss8);

    // 11. Mobile Viewport (390x844)
    console.log('\n--- Capturing Mobile Viewport (390x844) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 800));
    const ss9 = path.join(SCREENSHOTS_DIR, 'admin-settings-mobile-390.png');
    await page.screenshot({ path: ss9, fullPage: false });
    console.log('Screenshot saved:', ss9);

    console.log('\n=== All Notifications & System Settings E2E checks passed successfully! ===');
  } catch (err) {
    console.error('\nVerification failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    console.log('Stopping test servers...');
    try {
      backendProc.kill('SIGINT');
      frontendProc.kill('SIGINT');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProc.pid, '/f', '/t']);
        spawn('taskkill', ['/pid', frontendProc.pid, '/f', '/t']);
      }
    } catch (e) {
      // Ignore cleanup error
    }
  }
}

run();
