const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://127.0.0.1:8765', { waitUntil: 'networkidle', timeout: 5000 });
  
  await page.evaluate(async () => {
    try {
      // Simulate inline edit
      const domain = data[0];
      console.log('Original name:', domain.name);
      domain.name = domain.name + ' edited';
      console.log('New name:', domain.name);
      
      await saveAll('test edit', { backupRelevant: 'system' });
      console.log('saveAll completed without throwing');
    } catch (e) {
      console.log('SAVE FAILED:', e.message);
    }
  });

  await page.waitForTimeout(2000);
  
  const toastText = await page.evaluate(() => {
     const t = document.querySelector('.toast.error');
     return t ? t.textContent : null;
  });
  console.log('Toast error:', toastText);
  
  await browser.close();
})();
