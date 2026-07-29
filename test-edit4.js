const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', resp => {
    if (resp.url().includes('/api/shared-state') && resp.request().method() === 'PUT') {
      console.log('PUT /api/shared-state ->', resp.status(), resp.statusText());
      resp.text().then(t => console.log('Response body:', t)).catch(() => {});
    }
  });

  await page.goto('http://127.0.0.1:8765', { waitUntil: 'networkidle', timeout: 5000 });
  
  await page.evaluate(async () => {
    try {
      // Find the first data node and modify it
      // we must use the global `data` variable. Because it's not a property of window,
      // we can't access it via window.data. But evaluate runs in global scope, so we can access `data`!
      const d = eval("data"); 
      d[0].name = d[0].name + " evaluated test";
      
      const saveFn = eval("saveAll");
      await saveFn("test", { backupRelevant: "system" });
      console.log("SAVE FIRED");
    } catch (e) {
      console.log('Error:', e.message);
    }
  });

  await page.waitForTimeout(2000);
  
  await browser.close();
})();
