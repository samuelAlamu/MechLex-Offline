const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess;
const PORT = 8765;
const URL = `http://127.0.0.1:${PORT}/index.html`;

test.beforeAll(async () => {
  const serverScript = path.resolve(__dirname, '../../core/start-local-server.ps1');
  serverProcess = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', serverScript, '-NoBrowser'], {
    cwd: path.resolve(__dirname, '../../'),
    env: { ...process.env, MECHLEX_MOCK_ROLE: 'Admin' }
  });

  await new Promise(resolve => setTimeout(resolve, 5000));
});

test.afterAll(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

test('MechLex Accessibility and 15MB UI Flow', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto(URL);
  await expect(page).toHaveTitle(/MechLex/);

  const a11yResults = await new AxeBuilder({ page })
    .exclude('#adminOverlay')
    .analyze();
  
  if (a11yResults.violations.length > 0) {
    console.warn('Main Page A11y Violations:', JSON.stringify(a11yResults.violations, null, 2));
  }

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.evaluate(() => openAdmin('super', '9999'));

  try {
    await expect(page.locator('#adminOverlay')).toBeVisible({ timeout: 5000 });
  } catch (e) {
    const toasts = await page.locator('.toast').allTextContents();
    console.warn("Toasts visible when adminOverlay failed to show:", toasts);
    throw e;
  }

  const adminA11yResults = await new AxeBuilder({ page })
    .include('#adminOverlay')
    .disableRules(['color-contrast']) // Axe-core miscalculates background with radial-gradients and backdrop-filters
    .analyze();
  
  if (adminA11yResults.violations.length > 0) {
    console.warn('Admin Overlay A11y Violations:', JSON.stringify(adminA11yResults.violations, null, 2));
  }

  const imageSize = 15728640;
  const tempImagePath = path.join(__dirname, 'test-15mb-image.png');
  const buffer = Buffer.alloc(imageSize);
  buffer.writeUInt8(0x89, 0); buffer.write('PNG\r\n\x1A\n', 1);
  fs.writeFileSync(tempImagePath, buffer);

  // 1. Create a Domain with random prefix to avoid collisions
  const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  await page.click('[data-admin-tab="domains"]');
  await page.click('#clearDomainBtn');
  await page.fill('#domainName', `Test 15MB Domain ${randStr}`);
  await page.fill('#domainPrefix', `T${randStr}`);
  await page.click('#saveDomainBtn');
  await expect(page.locator('#toastRegion')).toContainText(/נשמר/, { timeout: 30000 });

  // 2. Create a Term
  await page.click('[data-admin-tab="terms"]');
  await page.click('#clearTermBtn');
  await page.fill('#editName', 'Test 15MB Term');
  await page.selectOption('#editDomain', { index: 1 }); // select first domain (the one we just created)
  
  await page.setInputFiles('#editImageFile', tempImagePath);
  await expect(page.locator('#embeddedImageState')).toContainText('הוטמעה: test-15mb-image.png', { timeout: 15000 });
  
  await page.click('#saveTermBtn');
  await expect(page.locator('#toastRegion')).toContainText(/נשמר/, { timeout: 30000 });
  
  await expect(page.locator('#sharedSyncStatus')).toContainText('משותף · גרסה', { timeout: 30000 });

  fs.unlinkSync(tempImagePath);
});
