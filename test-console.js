const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating to http://127.0.0.1:8765');
  try {
    await page.goto('http://127.0.0.1:8765', { waitUntil: 'networkidle', timeout: 5000 });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }
  
  await browser.close();
})();
