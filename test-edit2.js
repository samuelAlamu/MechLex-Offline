const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://127.0.0.1:8765', { waitUntil: 'networkidle', timeout: 5000 });
  
  await page.evaluate(async () => {
    // trigger a change
    const data = window.data;
    data[0].name = data[0].name + " test";
    try {
      await window.saveAll("test", { backupRelevant: "system" });
      console.log("SAVE SUCCESS");
    } catch (e) {
      console.log("SAVE FAILED:", e.message);
    }
  });

  await page.waitForTimeout(2000);
  
  const toastText = await page.evaluate(() => {
     const t = document.querySelector('.toast.error');
     return t ? t.textContent : null;
  });
  console.log('Toast:', toastText);
  
  await browser.close();
})();
