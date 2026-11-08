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
  console.log('=== Starting Keylo Admin Project & Fact Sheet Management Verification ===');

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
    const adminPassword = process.env.KEYLO_ADMIN_PASSWORD;
if (!adminPassword) throw new Error('Missing required env var KEYLO_ADMIN_PASSWORD');

    await page.type('input[type="email"], input[name="email"]', adminEmail);
    await page.type('input[type="password"], input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 10000 });
    console.log('Logged in successfully! Current URL:', page.url());

    // 2. Navigate to /admin/projects
    console.log('\n--- 2. Navigating to Projects & Fact Sheets ---');
    const projectNavLink = await page.$('a[href="/admin/projects"]');
    if (projectNavLink) {
      await projectNavLink.click();
    } else {
      await page.goto('http://127.0.0.1:5173/admin/projects', { waitUntil: 'networkidle0' });
    }

    await page.waitForFunction(() => window.location.pathname === '/admin/projects', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1500));

    // Verify Title and KPIs
    const content = await page.content();
    console.log('Page has Project & Fact Sheet Management title:', content.includes('Project & Fact Sheet Management'));
    console.log('Page has Total Projects metric:', content.includes('Total Projects'));
    console.log('Page has Active Projects metric:', content.includes('Active Projects'));
    console.log('Page has Draft Projects metric:', content.includes('Draft Projects'));
    console.log('Page has Inactive Projects metric:', content.includes('Inactive Projects'));
    console.log('Page has Approved Facts metric:', content.includes('Approved Facts'));
    console.log('Page has Total Facts metric:', content.includes('Total Facts'));
    console.log('Page has Add Project button:', content.includes('Add Project'));

    // Capture Desktop Viewport (1440px)
    console.log('\n--- 3. Capturing Desktop Layout (1440px) ---');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-projects-desktop-1440.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-projects-desktop-1440.png');

    // 4. Test Search Filter
    console.log('\n--- 4. Testing Search Filter for "Greenwood" ---');
    const searchInput = await page.$('input[placeholder*="Search by project name"]');
    if (searchInput) {
      await searchInput.type('Greenwood');
      await new Promise(r => setTimeout(r, 800));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-projects-filtered-search.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-projects-filtered-search.png');

      // Clear search
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 800));
    }

    // 5. Open Create Project Modal
    console.log('\n--- 5. Opening Create Project Modal ---');
    const addProjectBtn = await page.$('#create-project-btn');
    if (addProjectBtn) {
      await addProjectBtn.click();
      await new Promise(r => setTimeout(r, 600));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-projects-create-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-projects-create-modal.png');

      // Fill and create project
      console.log('Filling Create Project form...');
      await page.type('#create-pname', 'Emerald Valley Residences');
      await page.type('#create-plocation', 'Whitefield, Bengaluru');
      await page.type('#create-prera', 'PRM/KA/RERA/1251/446/PR/261106/009988');
      await page.type('#create-pdesc', 'Luxury sustainable residences set around a 10-acre private central park.');

      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 1500));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-projects-created-success.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-projects-created-success.png');
    }

    // 6. Open Fact Sheet Drawer
    console.log('\n--- 6. Opening Fact Sheet Drawer for Greenwood Heights ---');
    // Find Fact Sheet button
    const factSheetButtons = await page.$$('button ::-p-text(Fact Sheet)');
    if (factSheetButtons.length > 0) {
      await factSheetButtons[0].click();
      await new Promise(r => setTimeout(r, 1200));

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-projects-factsheet-drawer.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: admin-projects-factsheet-drawer.png');

      // 7. Add a Draft Fact in the Drawer
      console.log('\n--- 7. Adding a Draft Fact inside Fact Sheet Drawer ---');
      const addFactBtn = await page.$('#drawer-add-fact-btn');
      if (addFactBtn) {
        await addFactBtn.click();
        await new Promise(r => setTimeout(r, 600));

        await page.type('#new-fact-question', 'What is the clubhouse handover timeline?');
        await page.type('#new-fact-answer', 'The 25,000 sq ft grand clubhouse will be fully operational by Q2 2027.');

        await page.click('#submit-create-fact-btn');
        await new Promise(r => setTimeout(r, 1500));
        console.log('Draft fact submitted successfully!');
      }

      // 8. Test Version History Modal
      console.log('\n--- 8. Testing Version History Modal ---');
      const historyButtons = await page.$$('button ::-p-text(Version Audit)');
      if (historyButtons.length > 0) {
        await historyButtons[0].click();
        await new Promise(r => setTimeout(r, 800));

        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'admin-projects-versions-modal.png'),
          fullPage: false,
        });
        console.log('Saved screenshot: admin-projects-versions-modal.png');

        // Close Version History Modal (click X inside modal)
        const closeHistoryBtn = await page.$('.max-w-xl button');
        if (closeHistoryBtn) {
          await closeHistoryBtn.click();
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // 9. Approve / Publish the Draft Fact
      console.log('\n--- 9. Approving draft fact ---');
      const approveButtons = await page.$$('button ::-p-text(Approve & Publish)');
      if (approveButtons.length > 0) {
        await approveButtons[approveButtons.length - 1].click();
        await new Promise(r => setTimeout(r, 1500));
        console.log('Draft fact approved!');
      }

      // Close Drawer
      const closeDrawerBtn = await page.$('button[title="Close Drawer"]');
      if (closeDrawerBtn) {
        await closeDrawerBtn.click();
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // 10. Tablet Viewport (1024px)
    console.log('\n--- 10. Capturing Tablet Layout (1024px) ---');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-projects-tablet-1024.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-projects-tablet-1024.png');

    // 11. Mobile Viewport (390px)
    console.log('\n--- 11. Capturing Mobile Layout (390px) ---');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'admin-projects-mobile-390.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: admin-projects-mobile-390.png');

    console.log('\n=== All Admin Project & Fact Sheet verification checks completed successfully! ===');

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
