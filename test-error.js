const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  page.on('response', resp => {
    if (resp.url().includes('/api/shared-state') && resp.request().method() === 'PUT') {
      console.log('PUT /api/shared-state ->', resp.status(), resp.statusText());
      resp.text().then(t => console.log('Response body:', t)).catch(() => {});
    }
  });

  await page.goto('http://127.0.0.1:8765', { waitUntil: 'networkidle', timeout: 5000 });
  
  await page.evaluate(async () => {
    try {
      const d = eval("data");
      // Intentionally introduce an error: make an image data invalid
      const term = d.find(t => t.items && t.items.length > 0).items[0];
      term.id = "image-test";
      term.data = "data:image/invalid;base64,123";
      
      const saveFn = eval("saveAll");
      await saveFn("test error", { backupRelevant: "system" });
    } catch (e) {
      console.log('Error:', e.message);
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
