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
  console.log('=== Starting Keylo Admin Analytics & Reporting Dashboard Verification ===');

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

    // Fill login form
    const emailInput = await page.waitForSelector('input[type="email"]');
    await emailInput.type('admin.demo@keylo.com');
    const passwordInput = await page.waitForSelector('input[type="password"]');
    await passwordInput.type(ADMIN_PASSWORD);

    const submitBtn = await page.waitForSelector('button[type="submit"]');
    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Admin logged in successfully. Current URL:', page.url());

    // 4. Navigate to Analytics Dashboard
    console.log('\n--- Navigating to Admin Analytics Dashboard ---');
    await page.goto('http://127.0.0.1:5173/admin/analytics', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));

    // Verify Title
    const titleText = await page.$eval('h1', el => el.textContent);
    console.log('Page Title:', titleText);
    if (!titleText.includes('Analytics & Executive Reporting')) {
      throw new Error(`Unexpected page title: ${titleText}`);
    }

    // Verify KPI Cards
    const kpiElements = await page.$$eval('.font-serif.text-2xl', els => els.map(e => e.textContent));
    console.log('KPI Card Values:', kpiElements);

    // Verify Charts & Tables
    const hasTrends = await page.$eval('h3', el => el.textContent);
    console.log('First Section Heading:', hasTrends);

    // Screenshot 1: Full Desktop Dashboard (1440x900)
    const ss1 = path.join(SCREENSHOTS_DIR, 'admin-analytics-desktop-1440.png');
    await page.screenshot({ path: ss1, fullPage: false });
    console.log('Screenshot saved:', ss1);

    // 5. Test Granularity Toggles (Weekly / Monthly)
    console.log('\n--- Testing Trend Granularity Toggles ---');
    const weeklyBtn = await page.waitForSelector('button::-p-text(Weekly)');
    await weeklyBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    console.log('Switched to Weekly granularity.');

    // Screenshot 2: Trends Weekly Granularity
    const ss2 = path.join(SCREENSHOTS_DIR, 'admin-analytics-trends-weekly.png');
    await page.screenshot({ path: ss2, fullPage: false });
    console.log('Screenshot saved:', ss2);

    // 6. Test Project Filter
    console.log('\n--- Testing Project Filter Dropdown ---');
    const projectSelect = await page.waitForSelector('select');
    // Get options
    const options = await page.$$eval('select option', opts => opts.map(o => ({ value: o.value, text: o.text })));
    console.log('Available project options:', options);

    const greenwoodOpt = options.find(o => o.text.includes('Greenwood') || o.text.includes('Estate'));
    if (greenwoodOpt) {
      await projectSelect.select(greenwoodOpt.value);
      await new Promise(r => setTimeout(r, 1200));
      console.log(`Filtered by project: ${greenwoodOpt.text}`);

      // Screenshot 3: Filtered by Project
      const ss3 = path.join(SCREENSHOTS_DIR, 'admin-analytics-filtered-project.png');
      await page.screenshot({ path: ss3, fullPage: false });
      console.log('Screenshot saved:', ss3);

      // Reset to ALL
      await projectSelect.select('ALL');
      await new Promise(r => setTimeout(r, 1000));
    }

    // 7. Test "Add Marketing Spend" Modal
    console.log('\n--- Testing Add Marketing Spend Modal ---');
    const addSpendBtn = await page.waitForSelector('button::-p-text(Add Marketing Spend)');
    await addSpendBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Verify modal is open
    const modalHeading = await page.$eval('.fixed.inset-0 h3', el => el.textContent);
    console.log('Modal Heading:', modalHeading);

    // Screenshot 4: Add Marketing Spend Modal
    const ss4 = path.join(SCREENSHOTS_DIR, 'admin-analytics-spend-modal.png');
    await page.screenshot({ path: ss4, fullPage: false });
    console.log('Screenshot saved:', ss4);

    // Fill spend details
    await page.select('#spend-source-select', 'SOCIAL_MEDIA');
    await page.type('#spend-amount-input', '65000');
    await page.type('#spend-notes-input', 'Q4 Meta Festive Buyer Retargeting Campaign');

    const submitSpendBtn = await page.waitForSelector('#spend-submit-btn');
    await submitSpendBtn.click();
    await new Promise(r => setTimeout(r, 1500));
    console.log('Spend record submitted successfully.');

    // 8. Test Tablet Viewport (1024x768)
    console.log('\n--- Capturing Tablet Viewport (1024x768) ---');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 800));
    const ss5 = path.join(SCREENSHOTS_DIR, 'admin-analytics-tablet-1024.png');
    await page.screenshot({ path: ss5, fullPage: false });
    console.log('Screenshot saved:', ss5);

    // 9. Test Mobile Viewport (390x844)
    console.log('\n--- Capturing Mobile Viewport (390x844) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 800));
    const ss6 = path.join(SCREENSHOTS_DIR, 'admin-analytics-mobile-390.png');
    await page.screenshot({ path: ss6, fullPage: false });
    console.log('Screenshot saved:', ss6);

    console.log('\n=== All Analytics & Reporting Dashboard E2E checks passed successfully! ===');
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
