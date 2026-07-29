const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  page.on('response', resp => {
    if (resp.url().includes('/api/shared-state') && resp.request().method() === 'PUT') {
      console.log('PUT /api/shared-state ->', resp.status(), resp.statusText());
    }
  });

  await page.goto('http://127.0.0.1:8765', { waitUntil: 'networkidle', timeout: 5000 });
  
  await page.evaluate(async () => {
    try {
      const termsFn = eval("allTerms");
      const terms = termsFn();
      
      const beforeStr = eval("lastSharedSerialized");
      terms[0].name = terms[0].name + " edited";
      
      const snapFn = eval("sharedSnapshot");
      const afterStr = JSON.stringify(snapFn());
      console.log("Are they equal?", beforeStr === afterStr);
      
      const saveFn = eval("saveAll");
      await saveFn("test term", { backupRelevant: "system" });
    } catch (e) {
      console.log('Error:', e.message);
    }
  });

  await page.waitForTimeout(2000);
  await browser.close();
})();
