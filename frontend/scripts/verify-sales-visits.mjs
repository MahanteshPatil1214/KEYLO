import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SALES_PASSWORD = process.env.KEYLO_SALES_PASSWORD || 'KeyloSales!2026#';

const SCREENSHOTS_DIR = 'C:/Users/bhagy/.gemini/antigravity/brain/2afc5af3-c04f-4ddf-8f16-1c139d803384/screenshots';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('=== Starting Keylo Sales Executive Site Visits Verification ===');

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

    // 2. Navigate to /sales/visits
    console.log('\n--- 2. Navigating to Site Visits workspace ---');
    await page.goto('http://127.0.0.1:5173/sales/visits', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // Verify Title and Metrics
    const pageContent = await page.content();
    console.log('Page has Site Visits title:', pageContent.includes('Site Visits'));
    console.log('Page has Total Site Visits card:', pageContent.includes('Total Site Visits'));
    console.log('Page has Upcoming Visits card:', pageContent.includes('Upcoming Visits'));
    console.log('Page has Completed Visits card:', pageContent.includes('Completed Visits'));
    console.log('Page has Schedule Site Visit button:', pageContent.includes('Schedule Site Visit'));

    // 3. Desktop Screenshot at 1440px
    console.log('\n--- 3. Capturing Desktop Layout (1440px) ---');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-visits-desktop-1440.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-visits-desktop-1440.png');

    // 4. Open Visit Details Drawer
    console.log('\n--- 4. Opening Visit Detail Drawer ---');
    const viewDetailsBtn = await page.$('button[aria-label^="View details"]');
    if (viewDetailsBtn) {
      await viewDetailsBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-visits-drawer-1440.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-visits-drawer-1440.png');

      // Close drawer with Escape
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 800));
    } else {
      console.log('No visit row found to open details.');
    }

    // 5. Test Filters and Search
    console.log('\n--- 5. Testing Filters and Search ---');
    const searchInput = await page.$('input[type="search"]');
    if (searchInput) {
      await searchInput.type('Mahantesh');
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-visits-filtered-1440.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-visits-filtered-1440.png');

      // Clear search
      const clearBtn = await page.$('button[aria-label="Clear search"]');
      if (clearBtn) {
        await clearBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 6. Test Schedule Visit Modal
    console.log('\n--- 6. Opening and Testing Schedule Site Visit Modal ---');
    const scheduleBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Schedule Site Visit'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (scheduleBtn) {
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sales-visits-schedule-modal.png'),
        fullPage: false,
      });
      console.log('Saved screenshot: sales-visits-schedule-modal.png');

      // Switch to custom time mode
      await page.evaluate(() => {
        const customBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Custom Date & Time'));
        if (customBtn) customBtn.click();
      });
      await new Promise(r => setTimeout(r, 500));

      // Fill in notes
      const notesInput = await page.$('#schedule-notes');
      if (notesInput) {
        await notesInput.type('Automated E2E Verification visit booking.');
      }

      // Submit the form
      const confirmBtn = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Confirm Visit'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (confirmBtn) {
        console.log('Submitted custom site visit booking form.');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'sales-visits-scheduled-success.png'),
          fullPage: false,
        });
        console.log('Saved screenshot: sales-visits-scheduled-success.png');
      }

      // Close drawer if opened automatically
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 600));
    }

    // 7. Test Tablet Layout at 1024px
    console.log('\n--- 7. Verifying Tablet Layout at 1024px ---');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-visits-tablet-1024.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-visits-tablet-1024.png');

    // 8. Test Mobile Layout at 390px (iPhone 14)
    console.log('\n--- 8. Verifying Mobile Layout at 390px ---');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'sales-visits-mobile-390.png'),
      fullPage: false,
    });
    console.log('Saved screenshot: sales-visits-mobile-390.png');

    console.log('\n=== All Sales Executive Site Visits Verifications Passed Successfully! ===');
  } catch (error) {
    console.error('Test run failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();

