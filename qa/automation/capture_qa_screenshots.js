const { chromium } = require('playwright');
const path = require('path');

const PORT = process.env.PORT || 8765;
const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await delay(1000);
  
  // Navigate to mind map view
  await page.click('#mindMapViewBtn');
  await delay(1000);
  
  // Expand domain
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.mm-node-domain .mm-toggle-btn');
    if (btns.length > 0) btns[0].click();
  });
  await delay(1000);

  // Expand all subtopics
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.mm-node-subtopic .mm-toggle-btn');
    btns.forEach(btn => btn.click());
  });
  await delay(1000);

  // Zoom out slightly to see more of the tree
  for(let i = 0; i < 4; i++) {
    await page.click('#mindMapZoomOut');
    await delay(100);
  }
  
  await page.screenshot({ path: path.resolve(__dirname, 'screenshots', 'mindmap_clean_hierarchy.png') });
  console.log('Captured mindmap_clean_hierarchy.png');
  
  await browser.close();
}

run().catch(console.error);
