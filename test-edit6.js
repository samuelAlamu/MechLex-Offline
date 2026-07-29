const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  page.on('response', resp => {
    if (resp.url().includes('/api/shared-state') && resp.request().method() === 'PUT') {
      console.log('PUT /api/shared-state ->', resp.status(), resp.statusText());
      resp.text().then(t => console.log('Response body:', t)).catch(() => {});
    }
  });

  await page.goto('http://127.0.0.1:8765', { waitUntil: 'networkidle', timeout: 5000 });
  
  await page.evaluate(async () => {
    try {
      console.log('Starting evaluate');
      const termsFn = eval("allTerms");
      const terms = termsFn();
      console.log('Found terms:', terms.length);
      terms[0].name = terms[0].name + " edited";
      
      const saveFn = eval("saveAll");
      await saveFn("test term", { backupRelevant: "system" });
      console.log("SAVE FIRED");
    } catch (e) {
      console.log('Error:', e.message);
    }
  });

  await page.waitForTimeout(2000);
  await browser.close();
})();
