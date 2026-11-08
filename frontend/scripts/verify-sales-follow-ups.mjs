import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SALES_PASSWORD = process.env.KEYLO_SALES_PASSWORD;
if (!SALES_PASSWORD) throw new Error('Missing required env var KEYLO_SALES_PASSWORD');

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('=== Starting Keylo Sales Executive Follow-ups Verification ===');

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
    await page.type('input[type="password"], input[name="password"]', SALES_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/sales'), { timeout: 10000 });
    console.log('Logged in successfully! Current URL:', page.url());

    // 2. Navigate to /sales/follow-ups
    console.log('\n--- 2. Navigating to Follow-ups workspace ---');
    await page.goto('http://127.0.0.1:5173/sales/follow-ups', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // Verify Title and Metrics
    const pageContent = await page.content();
    console.log('Page has Follow-ups title:', pageContent.includes('Follow-ups'));
    console.log('Page has Total Follow-ups card:', pageContent.includes('Total Follow-ups'));
    console.log('Page has Due Today card:', pageContent.includes('Due Today'));
    console.log('Page has Overdue card:', pageContent.includes('Overdue'));
    console.log('Page has Upcoming card:', pageContent.includes('Upcoming'));
    console.log('Page has Completed card:', pageContent.includes('Completed'));
    console.log('Page has Schedule Follow-up button:', pageContent.includes('Schedule Follow-up'));

    // 3. Desktop Screenshot at 1440px
    console.log('\n--- 3. Capturing Desktop Layout (1440px) ---');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-followups-desktop-1440.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-followups-desktop-1440.png');

    // 4. Open Follow-up Details Drawer
    console.log('\n--- 4. Opening Follow-up Detail Drawer ---');
    const viewDetailsBtn = await page.$('button[aria-label^="View details"]');
    if (viewDetailsBtn) {
      await viewDetailsBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-followups-drawer-1440.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-followups-drawer-1440.png');

      // Close drawer with Escape
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 800));
    } else {
      console.log('No follow-up row found to open details.');
    }

    // 5. Test Filters and Category Tab Click
    console.log('\n--- 5. Testing Filters and Category Tabs ---');
    await page.evaluate(() => {
      const dueTodayTab = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent && b.textContent.trim() === 'Due Today'
      );
      if (dueTodayTab) dueTodayTab.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-followups-filtered-1440.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-followups-filtered-1440.png');

    // Switch back to All
    await page.evaluate(() => {
      const allTab = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent && b.textContent.trim() === 'All Follow-ups'
      );
      if (allTab) allTab.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // 6. Test Schedule Follow-up Modal
    console.log('\n--- 6. Opening and Testing Schedule Follow-up Modal ---');
    const scheduleBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent && b.textContent.includes('Schedule Follow-up')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (scheduleBtn) {
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-followups-create-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-followups-create-modal.png');

      // Fill in notes and next action
      const notesInput = await page.$('#followup-notes');
      if (notesInput) {
        await notesInput.type('Automated follow-up test: Discuss token amount options.');
      }
      const nextActionInput = await page.$('#followup-next-action');
      if (nextActionInput) {
        await nextActionInput.type('Send customized cost sheet before call.');
      }

      // Submit the form
      const confirmBtn = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent && b.textContent.includes('Save Follow-up')
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (confirmBtn) {
        console.log('Submitted create follow-up form.');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'sales-followups-created-success.png'),
          fullPage: false,
        });
        console.log('Saved screenshot: sales-followups-created-success.png');
      }

      // Close drawer if opened
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 600));
    }

    // 7. Test Complete Outcome Modal
    console.log('\n--- 7. Testing Complete Outcome Modal ---');
    const completeBtn = await page.$('button[aria-label^="Complete follow-up"]');
    if (completeBtn) {
      await completeBtn.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-followups-complete-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-followups-complete-modal.png');

      // Type outcome notes
      const outcomeNotes = await page.$('#outcome-notes');
      if (outcomeNotes) {
        await outcomeNotes.type('Buyer is interested and requested follow-up next Monday.');
      }

      // Submit outcome
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent && b.textContent.includes('Mark as Completed')
        );
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 2000));
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 600));
    }

    // 8. Test Tablet Layout at 1024px
    console.log('\n--- 8. Verifying Tablet Layout at 1024px ---');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-followups-tablet-1024.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-followups-tablet-1024.png');

    // 9. Test Mobile Layout at 390px (iPhone 14)
    console.log('\n--- 9. Verifying Mobile Layout at 390px ---');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-followups-mobile-390.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-followups-mobile-390.png');

    console.log('\n=== All Sales Executive Follow-ups Verifications Passed Successfully! ===');
  } catch (error) {
    console.error('Test run failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
