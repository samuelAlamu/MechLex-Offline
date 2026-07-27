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
      .filter(el => {
         const isNode = el.classList.contains('mm-node') || el.classList.contains('mm-tree-branch') || el.classList.contains('mm-node-children') || el.classList.contains('mm-toggle-btn') || el.classList.contains('mm-badge') || el.classList.contains('mm-node-code');
         const isSvg = el.tagName.toLowerCase() === 'svg' || el.tagName.toLowerCase() === 'path';
         const isWrapper = el.id === 'mindMapCanvasWrapper' || el.id === 'mindMapNodes' || el.id === 'mindMapSvg';
         return !isNode && !isSvg && !isWrapper;
      })
      .map(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
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
  
  fs.writeFileSync('weird_elements.json', JSON.stringify(nodes, null, 2));
  console.log('Saved to weird_elements.json');
  await browser.close();
}

run().catch(console.error);
