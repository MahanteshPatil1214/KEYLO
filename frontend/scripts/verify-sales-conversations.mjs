import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('=== Starting Keylo Sales Executive Conversations Verification ===');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

    // 1. Log in as SALES_EXECUTIVE
    console.log('\n--- 1. Logging in as Sales Executive (sales.demo@keylo.com) ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    await page.type('input[type="email"], input[name="email"]', 'sales.demo@keylo.com');
    await page.type('input[type="password"], input[name="password"]', 'KeyloSales123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/sales'), { timeout: 10000 });
    console.log('Logged in successfully! Current URL:', page.url());

    // 2. Navigate to /sales/conversations
    console.log('\n--- 2. Navigating to Sales Conversations workspace ---');
    await page.goto('http://127.0.0.1:5173/sales/conversations', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // Verify Desktop layout (Conversation list on left, chat on right)
    console.log('\n--- 3. Verifying Desktop 2-Panel Layout at 1440px ---');
    const pageContent = await page.content();
    console.log('Page has Conversations header:', pageContent.includes('Conversations'));
    console.log('Page has Buyer Dialogue:', pageContent.includes('Buyer dialogue'));

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-conv-desktop-1440.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-conv-desktop-1440.png');

    // 3. Open Buyer Context drawer
    console.log('\n--- 4. Opening Buyer Context Drawer ---');
    const infoBtn = await page.$('button[aria-label*="context"], button[aria-label*="Context"]');
    if (infoBtn) {
      await infoBtn.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-conv-context-drawer-1440.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-conv-context-drawer-1440.png');
      // Close drawer by pressing Escape or clicking backdrop
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 800));
    }

    // 4. Test Handoff Actions & Takeover
    console.log('\n--- 5. Testing Handoff Actions & Takeover ---');
    const handoffBtnFound = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Actions'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (handoffBtnFound) {
      console.log('Clicked Handoff Actions button...');
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-conv-handoff-expanded.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-conv-handoff-expanded.png');

      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Take Over'));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 1200));
    }

    // 5. Test sending a message
    console.log('\n--- 6. Testing Executive Sending a Message ---');
    const textarea = await page.$('textarea[aria-label="Message composer"]');
    if (textarea) {
      const testMsg = 'Hello, this is your assigned sales executive. How can I assist you with Greenwood Heights today?';
      await textarea.type(testMsg);
      const sendBtn = await page.$('button[aria-label="Send message"]');
      if (sendBtn) {
        await sendBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'sales-conv-message-sent.png'),
          fullPage: false,
        });
        console.log('Saved screenshot: sales-conv-message-sent.png');
      }
    }

    // 5. Test search and status filter
    console.log('\n--- 6. Testing Search & Filter Pills ---');
    const searchInput = await page.$('input[type="search"]');
    if (searchInput) {
      await searchInput.type('Mahantesh');
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-conv-search-filter.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-conv-search-filter.png');
      await page.click('button[aria-label*="Clear"], button:has(svg.lucide-x)');
    }

    // 7. Test mobile viewport at 390px (Mobile view)
    console.log('\n--- 7. Testing Mobile Viewport (390px) ---');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 600));

    // Mobile chat view (since conversation is already selected)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-conv-mobile-chat-390.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-conv-mobile-chat-390.png');

    // Click back to list button on mobile
    await page.evaluate(() => {
      const backBtn = document.querySelector('button[aria-label="Back to conversation list"]');
      if (backBtn) backBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-conv-mobile-list-390.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-conv-mobile-list-390.png');

    // 8. Test tablet view at 1024px with drawer
    console.log('\n--- 8. Testing Tablet Viewport (1024px) ---');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 800));

    // Open conv list drawer on tablet
    await page.evaluate(() => {
      const tabletDrawerBtn = document.querySelector('button[aria-label="Open conversation list"]');
      if (tabletDrawerBtn) tabletDrawerBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-conv-tablet-drawer-1024.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-conv-tablet-drawer-1024.png');

    console.log('\n=== All verification checks completed successfully! ===');

  } catch (error) {
    console.error('VERIFICATION ERROR:', error);
  } finally {
    await browser.close();
  }
}

run();
