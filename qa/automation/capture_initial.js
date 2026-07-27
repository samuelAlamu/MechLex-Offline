const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  await page.goto(`http://127.0.0.1:8765/index.html`);
  await page.click('#mindMapViewBtn');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'screenshots/mindmap_initial.png' });
  await browser.close();
}

run().catch(console.error);
