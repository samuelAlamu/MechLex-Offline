const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating to http://127.0.0.1:8765');
  await page.goto('http://127.0.0.1:8765', { waitUntil: 'networkidle', timeout: 5000 });
  
  // Wait for the domain name to appear
  await page.waitForSelector('[data-domain-edit-id]');
  
  console.log('Activating visual mode...');
  // Enable visual mode programmatically or by clicking the admin mode button
  await page.evaluate(() => {
    // We need to bypass the PIN. Let's just set visualMode directly if possible, 
    // or set the PIN and click.
    document.getElementById('adminBtn').click();
  });
  
  // Wait for pin dialog
  await page.waitForSelector('#adminPin');
  await page.fill('#adminPin', '9999'); // super admin
  await page.click('#adminPinSubmit');
  
  await page.waitForTimeout(500); // wait for UI transition
  
  // Now click edit visual
  const visualBtn = await page.$('#inlineEditorToggle');
  if (visualBtn) {
     await visualBtn.click();
     console.log('Clicked inline editor toggle');
  }
  
  await page.waitForTimeout(500);

  // Edit a domain
  const domainNode = await page.$('[data-domain-edit-id]');
  if (domainNode) {
     console.log('Editing domain node...');
     await domainNode.click();
     // clear and type
     await domainNode.evaluate(node => node.textContent = 'Edited Domain Name');
     // trigger blur
     await domainNode.evaluate(node => node.blur());
  } else {
     console.log('Domain node not found');
  }

  await page.waitForTimeout(1000); // Wait for saves/toasts
  
  // Check for toasts
  const toastText = await page.evaluate(() => {
     const t = document.querySelector('.toast');
     return t ? t.textContent : null;
  });
  console.log('Toast:', toastText);
  
  await browser.close();
})();
