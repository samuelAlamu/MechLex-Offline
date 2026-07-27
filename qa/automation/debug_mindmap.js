const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  await page.goto(`http://127.0.0.1:8765/index.html`);
  await page.click('#mindMapViewBtn');
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    const root = document.querySelector('#mindMapViewport');
    const elements = Array.from(root.querySelectorAll('*'));
    elements.forEach(el => {
      if (el.tagName !== 'path' && el.tagName !== 'svg') {
         el.style.outline = '1px solid red';
         // add a label
         const label = document.createElement('div');
         label.textContent = el.tagName + (el.id ? '#'+el.id : '') + (el.className ? '.'+el.className.replace(/ /g, '.') : '');
         label.style.position = 'absolute';
         label.style.fontSize = '8px';
         label.style.color = 'red';
         label.style.zIndex = '9999';
         label.style.top = '0';
         label.style.left = '0';
         if (el.style.position !== 'absolute' && el.style.position !== 'relative') {
           el.style.position = 'relative';
         }
         el.appendChild(label);
      }
    });
  });
  
  await page.screenshot({ path: 'screenshots/mindmap_debug.png' });
  await browser.close();
}

run().catch(console.error);
