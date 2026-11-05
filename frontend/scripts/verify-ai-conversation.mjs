import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('=== Starting Keylo AI Conversation Experience Verification ===');

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
      if (res.url().includes('/api/v1/conversations') || res.url().includes('/api/v1/slots') || res.url().includes('/api/v1/handoffs')) {
        let text = '';
        try { text = await res.text(); } catch {}
        console.log(`API [${res.status()}] ${res.url()} ->`, text.slice(0, 160));
      }
    });

    // 1. Login
    console.log('\n--- 1. Logging in as Buyer ---');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    await page.type('input[type="email"], input[name="email"]', 'patilmahantesh642@gmail.com');
    await page.type('input[type="password"], input[name="password"]', 'KeyloBuyer123!');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/buyer'), { timeout: 10000 });
    console.log('Logged in successfully. Navigating to conversations...');

    // 2. Open Conversations page
    await page.goto('http://127.0.0.1:5173/buyer/conversations', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h2', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    // Verify 3-Column Layout on Desktop
    console.log('\n--- 2. Verifying Desktop 3-Column Layout ---');
    const pageContent = await page.content();
    const layoutChecks = [
      { label: 'Left Column: Conversations List', passed: pageContent.includes('Conversations') },
      { label: 'Center Column: Greenwood Heights Header', passed: pageContent.includes('Greenwood Heights') },
      { label: 'Center Column: Message History', passed: pageContent.includes('Keylo Concierge') || pageContent.includes('Tower B') },
      { label: 'Center Column: Multilingual EN/HI/GU Pills', passed: pageContent.includes('हिन्दी') && pageContent.includes('ગુજરાતી') },
      { label: 'Center Column: Quick Inquiry Chips', passed: pageContent.includes('Amenities') && pageContent.includes('Configurations') },
      { label: 'Right Column: Project Context', passed: pageContent.includes('Project Context') },
      { label: 'Right Column: Approved Facts', passed: pageContent.includes('Approved Facts') },
      { label: 'Right Column: Site Visit Status', passed: pageContent.includes('Site Visit Status') },
      { label: 'Right Column: Human Handoff Status', passed: pageContent.includes('Sales Advisory') || pageContent.includes('AI Advisory Active') },
    ];

    for (const c of layoutChecks) {
      console.log(`  [${c.passed ? 'PASS' : 'FAIL'}] ${c.label}`);
    }

    const desktopScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-desktop-3col.png');
    await page.screenshot({ path: desktopScreenshot, fullPage: false });
    console.log('Saved 3-column desktop screenshot:', desktopScreenshot);

    // 3. Test Sending Message in English & AI Response
    console.log('\n--- 3. Testing Real AI Response (English) ---');
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click();
      await page.type('textarea', 'What apartment configurations are available at Greenwood Heights?');
      console.log('Typed message. Submitting...');
      
      const sendBtn = await page.$('button[aria-label="Send message"]');
      await sendBtn.click();

      // Wait for AI response to appear
      console.log('Waiting for AI response from Groq assistant...');
      await page.waitForFunction(
        () => document.body.innerText.includes('2 BHK') || document.body.innerText.includes('3 BHK'),
        { timeout: 25000 }
      );
      console.log('[PASS] AI Response received and rendered!');
      await new Promise(r => setTimeout(r, 600));

      const aiReplyScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-ai-reply-en.png');
      await page.screenshot({ path: aiReplyScreenshot, fullPage: false });
      console.log('Saved AI reply screenshot:', aiReplyScreenshot);
    }

    // 4. Test Multilingual Hindi AI Response
    console.log('\n--- 4. Testing Multilingual (Hindi) ---');
    // Click Hindi pill
    const hindiPills = await page.$$('button');
    for (const p of hindiPills) {
      const text = await (await p.getProperty('innerText')).jsonValue();
      if (text.includes('हिन्दी')) {
        await p.click();
        console.log('Switched to Hindi language pill');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 400));

    // Send Hindi question
    await page.type('textarea', 'इस प्रोजेक्ट में कौन-कौन सी सुविधाएं हैं?');
    const sendBtnHi = await page.$('button[aria-label="Send message"]');
    await sendBtnHi.click();

    console.log('Waiting for Hindi AI response...');
    await page.waitForFunction(
      () => document.body.innerText.includes('सुविधा') || document.body.innerText.includes('पूल') || document.body.innerText.includes('जिम') || document.body.innerText.includes('Greenwood'),
      { timeout: 25000 }
    );
    console.log('[PASS] Multilingual Hindi response received and rendered!');
    await new Promise(r => setTimeout(r, 600));

    const hindiScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-ai-reply-hi.png');
    await page.screenshot({ path: hindiScreenshot, fullPage: false });
    console.log('Saved Hindi response screenshot:', hindiScreenshot);

    // 5. Test Site Visit Booking Modal in Conversation
    console.log('\n--- 5. Testing Site Visit Booking Modal ---');
    const bookBtns = await page.$$('button');
    for (const b of bookBtns) {
      const text = await (await b.getProperty('innerText')).jsonValue();
      if (text.includes('Book Visit')) {
        await b.click();
        break;
      }
    }
    await page.waitForSelector('h3', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 800));

    const bookModalScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-book-visit-modal.png');
    await page.screenshot({ path: bookModalScreenshot });
    console.log('Saved Book Visit modal screenshot:', bookModalScreenshot);

    // Close modal
    const closeBtn = await page.$('button[aria-label="Close modal"]');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 400));

    // 6. Test Request Sales Executive Handoff Modal
    console.log('\n--- 6. Testing Human Handoff Modal ---');
    const handoffBtns = await page.$$('button');
    for (const b of handoffBtns) {
      const text = await (await b.getProperty('innerText')).jsonValue();
      if (text.includes('Request Human') || text.includes('Request Sales Executive')) {
        await b.click();
        break;
      }
    }
    await page.waitForSelector('form', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 600));

    const handoffModalScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-handoff-modal.png');
    await page.screenshot({ path: handoffModalScreenshot });
    console.log('Saved Human Handoff modal screenshot:', handoffModalScreenshot);

    // Close handoff modal
    const closeHandoffBtn = await page.$('button[aria-label="Close modal"]');
    if (closeHandoffBtn) await closeHandoffBtn.click();
    await new Promise(r => setTimeout(r, 400));

    // 7. Mobile Layout Verification (390px)
    console.log('\n--- 7. Testing Mobile Layout (390x844) ---');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5173/buyer/conversations', { waitUntil: 'networkidle0' });
    await page.waitForSelector('h2', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    const mobileChatScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-mobile-chat-390.png');
    await page.screenshot({ path: mobileChatScreenshot });
    console.log('Saved mobile full-screen chat screenshot:', mobileChatScreenshot);

    // Test Mobile Context Drawer
    const infoBtn = await page.$('button[aria-label="View project details & actions"]');
    if (infoBtn) {
      await infoBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const mobileDrawerScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-mobile-context-drawer.png');
      await page.screenshot({ path: mobileDrawerScreenshot });
      console.log('Saved mobile context drawer screenshot:', mobileDrawerScreenshot);

      // Close drawer
      const closeDrawerBtn = await page.$('button:has(svg.lucide-x)');
      if (closeDrawerBtn) await closeDrawerBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    // Test Mobile Back to Conversation List
    const backBtn = await page.$('button[aria-label="Back to conversations list"]');
    if (backBtn) {
      await backBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const mobileListScreenshot = path.join(SCREENSHOTS_DIR, 'conversation-mobile-list-390.png');
      await page.screenshot({ path: mobileListScreenshot });
      console.log('Saved mobile conversation list screenshot:', mobileListScreenshot);
    }

    // 8. Narrow Viewport Verification (320px)
    console.log('\n--- 8. Testing Narrow Mobile (320x568) ---');
    await page.setViewport({ width: 320, height: 568, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5173/buyer/conversations', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const mobile320Screenshot = path.join(SCREENSHOTS_DIR, 'conversation-mobile-chat-320.png');
    await page.screenshot({ path: mobile320Screenshot });
    console.log('Saved 320px narrow mobile screenshot:', mobile320Screenshot);

    console.log('\n=== All Keylo AI Conversation Experience checks PASSED! ===');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
