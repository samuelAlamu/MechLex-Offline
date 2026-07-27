const { chromium } = require('playwright');
const path = require('path');
const PORT = 8765;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(`http://localhost:${PORT}`);
  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));
  await page.evaluate(() => openAdmin('super', '9999'));
  await page.waitForTimeout(1000);

  await page.click('nav.admin-tabs button[data-admin-tab="domains"]');
  await page.waitForTimeout(500);

  await page.click('#clearDomainBtn');
  await page.waitForTimeout(300);
  await page.fill('#domainName', "הנדסת מכונות");
  await page.fill('#domainNameEn', "Mechanical Engineering");
  await page.fill('#domainPrefix', "ME");
  
  await page.screenshot({ path: 'after-fill.png' });
  console.log("Value after fill:", await page.$eval('#domainName', el => el.value));
  
  await page.click('#saveDomainBtn');
  await page.waitForTimeout(1000);
  
  await page.click('nav.admin-tabs button[data-admin-tab="terms"]');
  await page.waitForTimeout(500);
  
  const html = await page.$eval('#editDomain', el => el.innerHTML);
  console.log("Dropdown HTML:", html);
  
  await page.screenshot({ path: 'terms-tab.png' });

  await browser.close();
}

run().catch(console.error);
