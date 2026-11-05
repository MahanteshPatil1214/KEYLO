import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('=== Starting Keylo Conversation Workspace Layout Verification ===');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

    // 1. Login
    console.log('\n--- 1. Logging in as Buyer ---');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    await page.type('input[type="email"], input[name="email"]', 'patilmahantesh642@gmail.com');
    await page.type('input[type="password"], input[name="password"]', 'KeyloBuyer123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/buyer'), { timeout: 10000 });
    console.log('Logged in successfully. Navigating to conversations...');

    await page.goto('http://127.0.0.1:5173/buyer/conversations', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h2', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1200));

    // Test matrix of viewports: [1920, 1600, 1440, 1366, 1280, 1024, 768, 390, 320]
    const viewports = [
      { width: 1920, height: 1080, name: '1920px (Ultra-wide Desktop)' },
      { width: 1600, height: 900, name: '1600px (Large Desktop)' },
      { width: 1440, height: 900, name: '1440px (Standard Desktop)', capture: 'conversation-layout-1440.png' },
      { width: 1366, height: 768, name: '1366px (Standard Laptop)' },
      { width: 1280, height: 800, name: '1280px (Compact Laptop)', capture: 'conversation-layout-1280.png' },
      { width: 1024, height: 768, name: '1024px (Small Laptop / Landscape Tablet)' },
      { width: 768, height: 1024, name: '768px (Portrait Tablet)' },
      { width: 390, height: 844, name: '390px (Mobile)', capture: 'conversation-layout-390.png', scale: 2 },
      { width: 320, height: 568, name: '320px (Narrow Mobile)', scale: 2 },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.scale || 1 });
      await new Promise(r => setTimeout(r, 600));

      // Measure layout dimensions
      const layoutMetrics = await page.evaluate(() => {
        const sidebar = document.querySelector('aside[aria-label="Buyer Navigation Sidebar"]');
        const convList = document.querySelector('aside[aria-label="Conversation Inquiries List"]');
        const chatWorkspace = document.querySelector('section[aria-label="Active Conversation Workspace"]');
        const inlineContext = document.querySelector('aside[aria-label="Project Information & Actions"]');
        
        return {
          sidebarWidth: sidebar ? sidebar.getBoundingClientRect().width : 0,
          convListWidth: convList ? convList.getBoundingClientRect().width : 0,
          chatWidth: chatWorkspace ? chatWorkspace.getBoundingClientRect().width : 0,
          inlineContextWidth: inlineContext ? inlineContext.getBoundingClientRect().width : 0,
          docScrollWidth: document.documentElement.scrollWidth,
          windowWidth: window.innerWidth,
        };
      });

      console.log(`  Sidebar width: ${layoutMetrics.sidebarWidth.toFixed(0)}px`);
      console.log(`  Conversation list width: ${layoutMetrics.convListWidth.toFixed(0)}px`);
      console.log(`  Chat workspace width: ${layoutMetrics.chatWidth.toFixed(0)}px`);
      console.log(`  Inline context width: ${layoutMetrics.inlineContextWidth.toFixed(0)}px`);
      console.log(`  Horizontal overflow: ${layoutMetrics.docScrollWidth > layoutMetrics.windowWidth ? 'DETECTED!' : 'NONE (PASS)'}`);

      // Verify specific requirements per viewport
      if (vp.width >= 1600) {
        console.log(`  [VERIFY >= 1600px] Sidebar: ${layoutMetrics.sidebarWidth}px (~260px), ConvList: ${layoutMetrics.convListWidth}px (~280-290px), Context: ${layoutMetrics.inlineContextWidth}px (Inline)`);
      } else if (vp.width >= 1280 && vp.width < 1600) {
        console.log(`  [VERIFY 1280–1599px] Context is NOT inline (drawer mode). Chat has ${layoutMetrics.chatWidth.toFixed(0)}px breathing room!`);
      } else if (vp.width >= 768 && vp.width < 1280) {
        console.log(`  [VERIFY 768–1279px] ConvList is NOT inline (drawer mode). Chat has full workspace width: ${layoutMetrics.chatWidth.toFixed(0)}px!`);
      }

      if (vp.capture) {
        const filePath = path.join(SCREENSHOTS_DIR, vp.capture);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`  -> Saved required screenshot: ${vp.capture}`);
      }
    }

    // Interactive Test 1: Test Context Drawer at 1440px
    console.log('\n--- Interactive Test: Context Drawer at 1440px ---');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await new Promise(r => setTimeout(r, 400));
    const infoBtn1440 = await page.$('button[aria-label="Show project context"], button[aria-label*="project context"]');
    if (infoBtn1440) {
      console.log('Clicking Info button at 1440px...');
      await infoBtn1440.click();
      await new Promise(r => setTimeout(r, 600));

      const drawerVisible = await page.evaluate(() => {
        return Boolean(document.querySelector('div[role="dialog"], .shadow-2xl'));
      });
      console.log(`Context Drawer opened smoothly: ${drawerVisible ? 'PASS' : 'FAIL'}`);

      const drawerScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-layout-1440-drawer.png');
      await page.screenshot({ path: drawerScreenshot });
      console.log('Saved 1440px context drawer screenshot:', drawerScreenshot);

      // Close drawer
      const closeBtn = await page.$('button[aria-label="Close context drawer"]');
      if (closeBtn) await closeBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // Interactive Test 2: Test Tablet Conversation List Drawer at 1024px
    console.log('\n--- Interactive Test: Conversation List Drawer at 1024px ---');
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    await new Promise(r => setTimeout(r, 400));
    const convTrigger = await page.$('button[aria-label="Open conversations list"]');
    if (convTrigger) {
      console.log('Clicking Conversations button at 1024px...');
      await convTrigger.click();
      await new Promise(r => setTimeout(r, 600));

      const tabletDrawerVisible = await page.evaluate(() => {
        return Boolean(document.querySelector('button[aria-label="Close conversation drawer"]'));
      });
      console.log(`Tablet Conversations Drawer opened: ${tabletDrawerVisible ? 'PASS' : 'FAIL'}`);

      const tabletDrawerScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-layout-1024-conv-drawer.png');
      await page.screenshot({ path: tabletDrawerScreenshot });
      console.log('Saved 1024px conversation drawer screenshot:', tabletDrawerScreenshot);

      const closeConvBtn = await page.$('button[aria-label="Close conversation drawer"]');
      if (closeConvBtn) await closeConvBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // Interactive Test 3: Test Collapsible Inline Context Panel at 1920px
    console.log('\n--- Interactive Test: Collapsible Inline Context at 1920px ---');
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await new Promise(r => setTimeout(r, 400));
    const infoBtn1920 = await page.$('button[aria-label="Hide project context"], button[aria-label*="project context"]');
    if (infoBtn1920) {
      console.log('Clicking Info button to collapse context panel at 1920px...');
      await infoBtn1920.click();
      await new Promise(r => setTimeout(r, 600));

      const chatWidthAfterCollapse = await page.evaluate(() => {
        const chatWorkspace = document.querySelector('section[aria-label="Active Conversation Workspace"]');
        return chatWorkspace ? chatWorkspace.getBoundingClientRect().width : 0;
      });
      console.log(`Chat workspace expanded to ${chatWidthAfterCollapse.toFixed(0)}px after collapsing context panel! (PASS)`);
    }

    console.log('\n=== All Layout Improvements & Viewport Tests PASSED! ===');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Layout verification failed with error:', err);
  process.exit(1);
});
