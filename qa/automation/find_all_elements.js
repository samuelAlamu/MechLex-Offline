const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  await page.goto(`http://127.0.0.1:8765/index.html`);
  await page.click('#mindMapViewBtn');
  await page.waitForTimeout(1000);
  
  const nodes = await page.evaluate(() => {
    const root = document.querySelector('#mindMapViewport');
    const elements = Array.from(root.querySelectorAll('*'));
    return elements
      .filter(el => el.tagName.toLowerCase() !== 'path' && el.tagName.toLowerCase() !== 'svg')
      .map(el => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        id: el.id,
        className: el.className,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y
      };
    });
  });
  
  fs.writeFileSync('all_elements.json', JSON.stringify(nodes, null, 2));
  console.log('Saved to all_elements.json');
  await browser.close();
}

run().catch(console.error);
