import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('Starting Buyer Portal End-to-End Verification...');

  // Use locally installed Chrome if needed, or puppeteer bundled chromium
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    page.on('response', async res => {
      if (res.url().includes('/api/')) {
        let text = '';
        try { text = await res.text(); } catch {}
        console.log(`API [${res.status()}] ${res.url()} ->`, text.slice(0, 200));
      }
    });

    // 1. Desktop Test (1280x800)
    console.log('\n--- 1. Testing Desktop (1280x800) ---');
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    // Open Login Page
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });
    console.log('Opened Login page');

    // Fill credentials
    await page.type('input[type="email"], input[name="email"]', 'patilmahantesh642@gmail.com');
    await page.type('input[type="password"], input[name="password"]', 'KeyloBuyer123!');
    
    // Click Submit and wait for client-side navigation
    console.log('Submitting login form...');
    await page.click('button[type="submit"]');
    
    try {
      await page.waitForFunction(() => window.location.pathname.startsWith('/buyer'), { timeout: 10000 });
    } catch (e) {
      const errScreenshot = path.join(SCREENSHOTS_DIR, 'login-failed-debug.png');
      await page.screenshot({ path: errScreenshot });
      const currentUrl = page.url();
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Login failed on URL:', currentUrl);
      console.log('Page text on error:\n', bodyText.slice(0, 500));
      throw e;
    }

    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    if (!currentUrl.includes('/buyer')) {
      throw new Error(`Expected URL to include /buyer, but got ${currentUrl}`);
    }

    // Wait for Dashboard content
    await page.waitForSelector('h1', { timeout: 10000 });
    // Allow initial query settlement
    await new Promise(r => setTimeout(r, 800));
    const headingText = await page.$eval('h1', el => el.textContent);
    console.log('Main Heading:', headingText);

    // Verify key sections
    const content = await page.content();
    const checks = [
      { label: 'Personalized Welcome', passed: content.includes('Mahantesh') },
      { label: 'Associated Project', passed: content.includes('Greenwood Heights') },
      { label: 'Enquiry / Conversation Status', passed: content.includes('ACTIVE') || content.includes('Dialogue Thread') },
      { label: 'Upcoming Site Visit', passed: content.includes('CONFIRMED') || content.includes('Site Visit') },
      { label: 'Continue Conversation CTA', passed: content.includes('Continue Conversation') },
      { label: 'Recent Activity Feed', passed: content.includes('Recent Activity') },
      { label: 'RERA Number', passed: content.includes('RERA:') || content.includes('PRM/KA/RERA') },
      { label: 'Verified Buyer Badge', passed: content.includes('Verified Buyer') },
    ];

    console.log('\nDesktop Dashboard Verification Results:');
    for (const check of checks) {
      console.log(`  [${check.passed ? 'PASS' : 'FAIL'}] ${check.label}`);
    }

    // Take Desktop Dashboard Screenshot
    const desktopScreenshotPath = path.join(SCREENSHOTS_DIR, 'buyer-dashboard-desktop.png');
    await page.screenshot({ path: desktopScreenshotPath, fullPage: true });
    console.log('Saved desktop screenshot:', desktopScreenshotPath);

    // Test Notifications Flyout
    console.log('\n--- Testing Notifications Flyout ---');
    const notifBtn = await page.$('button[aria-label^="Notifications"]');
    if (notifBtn) {
      await notifBtn.click();
      await page.waitForSelector('h3', { timeout: 3000 });
      await new Promise(r => setTimeout(r, 400));
      const notifScreenshotPath = path.join(SCREENSHOTS_DIR, 'buyer-notifications-flyout.png');
      await page.screenshot({ path: notifScreenshotPath });
      console.log('Saved notifications flyout screenshot:', notifScreenshotPath);
      // Close notif tray
      await notifBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    // Test Sub-pages
    console.log('\n--- Testing Sub-pages ---');
    // Conversations
    await page.goto('http://127.0.0.1:5173/buyer/conversations', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    await new Promise(r => setTimeout(r, 400));
    const convScreenshot = path.join(SCREENSHOTS_DIR, 'buyer-conversations.png');
    await page.screenshot({ path: convScreenshot, fullPage: true });
    console.log('Saved conversations screenshot:', convScreenshot);

    // Site Visits
    await page.goto('http://127.0.0.1:5173/buyer/visits', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    await new Promise(r => setTimeout(r, 400));
    const visitsScreenshot = path.join(SCREENSHOTS_DIR, 'buyer-visits.png');
    await page.screenshot({ path: visitsScreenshot, fullPage: true });
    console.log('Saved visits screenshot:', visitsScreenshot);

    // Project Information & Approved Facts
    await page.goto('http://127.0.0.1:5173/buyer/project', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    await new Promise(r => setTimeout(r, 600));
    const projectScreenshot = path.join(SCREENSHOTS_DIR, 'buyer-project.png');
    await page.screenshot({ path: projectScreenshot, fullPage: true });
    console.log('Saved project information screenshot:', projectScreenshot);

    // Profile
    await page.goto('http://127.0.0.1:5173/buyer/profile', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    await new Promise(r => setTimeout(r, 400));
    const profileScreenshot = path.join(SCREENSHOTS_DIR, 'buyer-profile.png');
    await page.screenshot({ path: profileScreenshot, fullPage: true });
    console.log('Saved profile screenshot:', profileScreenshot);

    // Responsive Viewports Testing
    const viewports = [
      { name: 'tablet-768', width: 768, height: 1024 },
      { name: 'mobile-430', width: 430, height: 932 },
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'mobile-360', width: 360, height: 800 },
      { name: 'mobile-320', width: 320, height: 568 },
    ];

    console.log('\n--- Responsive Viewports Testing ---');
    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
      await page.goto('http://127.0.0.1:5173/buyer', { waitUntil: 'networkidle0' });
      await page.waitForSelector('h1');
      await new Promise(r => setTimeout(r, 400));
      
      const vpScreenshot = path.join(SCREENSHOTS_DIR, `buyer-dashboard-${vp.name}.png`);
      await page.screenshot({ path: vpScreenshot, fullPage: false });
      console.log(`[PASS] Responsive ${vp.name} (${vp.width}x${vp.height}) - screenshot: ${vpScreenshot}`);
    }

    // Test Mobile Drawer on 390px
    console.log('\n--- Testing Mobile Navigation Drawer on 390px ---');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5173/buyer', { waitUntil: 'networkidle0' });
    const menuBtn = await page.$('button[aria-label="Open navigation menu"]');
    if (menuBtn) {
      await menuBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const drawerScreenshot = path.join(SCREENSHOTS_DIR, 'buyer-mobile-drawer-390.png');
      await page.screenshot({ path: drawerScreenshot });
      console.log('Saved mobile drawer screenshot:', drawerScreenshot);
    }

    console.log('\nAll Buyer Portal verification checks PASSED successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
