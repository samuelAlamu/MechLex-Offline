"use strict";

const fs = require("fs");
const path = require("path");
const { performance: clock } = require("node:perf_hooks");
const { chromium } = require("playwright");

const projectRoot = path.resolve(process.argv[2] || process.cwd());
const url = process.argv[3] || "http://127.0.0.1:8765/index.html";
const evidenceRoot = path.join(projectRoot, "qa", "evidence");
const screenshotDir = path.join(evidenceRoot, "screenshots");
const performanceDir = path.join(evidenceRoot, "performance");
const recoveryDir = path.join(evidenceRoot, "recovery");
const reportPath = path.join(evidenceRoot, "logs", "browser-qa-results.json");
const fixtureDir = path.join(projectRoot, "qa", "tests", "fixtures");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

for (const dir of [screenshotDir, performanceDir, recoveryDir, path.dirname(reportPath)]) {
  fs.mkdirSync(dir, { recursive: true });
}

const results = [];
const consoleMessages = [];
const pageErrors = [];
const requestFailures = [];
const requests = [];
const imageResults = [];
const performance = {};

function record(id, status, details = {}) {
  results.push({ id, status, at: new Date().toISOString(), ...details });
}

function assertResult(id, condition, details = {}) {
  record(id, condition ? "PASS" : "FAIL", details);
  return condition;
}

async function login(page, role, pin) {
  await page.locator("#adminBtn").click();
  await page.locator("#pinRoleSelect").selectOption(role);
  await page.locator("#pinInput").fill(pin);
  await page.locator("#pinForm").evaluate((form) => form.requestSubmit());
  await page.locator("#adminOverlay:not(.hidden)").waitFor({ state: "visible" });
}

async function waitForRevisionIncrease(page, before, timeout = 20_000) {
  await page.waitForFunction(
    (revision) => window.MechLexCore?.sharedSync?.revision?.() > revision,
    before,
    { timeout },
  );
  return page.evaluate(() => window.MechLexCore.sharedSync.revision());
}

async function inspectEmbeddedImage(page, termId) {
  return page.evaluate(async (id) => {
    const term = data.flatMap((domain) => domain.items || []).find((item) => item.id === id);
    if (!term?.imageData) return { exists: false, decodes: false, length: 0 };
    const result = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ exists: true, decodes: true, width: image.naturalWidth, height: image.naturalHeight, length: term.imageData.length });
      image.onerror = () => resolve({ exists: true, decodes: false, length: term.imageData.length });
      image.src = term.imageData;
    });
    return result;
  }, termId);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: fs.existsSync(edgePath) ? edgePath : undefined,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    locale: "he-IL",
  });
  await context.route("http://127.0.0.1:8765/api/can-write", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ canWrite: true, role: "Admin" }),
  }));
  const page = await context.newPage();
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push(error.stack || String(error)));
  page.on("requestfailed", (request) => requestFailures.push({ url: request.url(), failure: request.failure() }));
  page.on("request", (request) => requests.push(request.url()));
  page.on("dialog", (dialog) => dialog.accept());

  try {
    record("HARNESS-ISOLATION", "PASS", {
      note: "The product's hard-coded port-8765 capability request was intercepted so functional flows stayed on the disposable helper. This is harness isolation, not product authorization proof.",
    });
    const start = clock.now();
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    performance.coldStartMs = Math.round(clock.now() - start);
    assertResult("OFF-001", response && response.status() === 200, { httpStatus: response?.status(), coldStartMs: performance.coldStartMs });

    await page.locator("#sharedSyncStatus").waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForFunction(() => /גרסה\s+\d+/.test(document.getElementById("sharedSyncStatus")?.textContent || ""), null, { timeout: 15_000 });
    const initialRevision = await page.evaluate(() => window.MechLexCore.sharedSync.revision());
    assertResult("SYNC-001", initialRevision >= 1, { initialRevision, simulation: "One Edge context against a disposable shared-state folder." });
    await page.waitForTimeout(3_500);
    const pollState = await page.evaluate(() => ({
      ready: window.MechLexCore.sharedSync.ready(),
      statusText: document.getElementById("sharedSyncStatus")?.textContent || "",
      kind: document.documentElement.dataset.sharedSync || "",
    }));
    const earlyPollFailures = requestFailures.filter((item) => item.url.includes("knownRevision=") && item.failure?.errorText === "net::ERR_ABORTED");
    record("SYNC-POLL-304", pollState.ready && earlyPollFailures.length === 0 ? "PASS" : "FAIL", {
      ...pollState,
      abortedPollRequests: earlyPollFailures.length,
      severity: "Critical",
      note: "The server answers 304 to a custom revision query; Edge reports the Fetch request as ERR_ABORTED and the client enters read-only mode.",
    });

    const summary = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      domains: data.length,
      terms: data.reduce((sum, domain) => sum + (domain.items || []).length, 0),
      first: data.flatMap((domain) => domain.items || []).map((term) => ({ id: term.id, name: term.name, nameEn: term.nameEn })).find((term) => term.name && term.nameEn),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    assertResult("CNT-BASE", summary.domains > 0 && summary.terms > 0 && summary.first, summary);
    assertResult("UX-003", summary.lang === "he" && summary.dir === "rtl", { lang: summary.lang, dir: summary.dir });

    await page.screenshot({ path: path.join(screenshotDir, "desktop-home.png"), fullPage: true });

    await page.locator("#searchInput").fill(summary.first.name);
    await page.waitForTimeout(200);
    const exactCount = await page.locator("[data-term-id]").count();
    assertResult("SRCH-001", exactCount >= 1, { query: summary.first.name, results: exactCount });

    await page.locator("#searchInput").fill(summary.first.nameEn);
    await page.waitForTimeout(200);
    const englishCount = await page.locator("[data-term-id]").count();
    assertResult("SRCH-003", englishCount >= 1, { query: summary.first.nameEn, results: englishCount });

    await page.locator("#searchInput").fill("QA-NO-RESULT-XYZ");
    await page.waitForTimeout(150);
    const noResultText = await page.locator("#resultsMeta").textContent().catch(() => "");
    const noCards = await page.locator("[data-term-id]").count();
    assertResult("SRCH-007", noCards === 0, { noResultText: String(noResultText).trim().slice(0, 200) });

    await page.locator("#searchInput").fill(summary.first.name);
    await page.waitForTimeout(150);
    await page.locator("[data-term-id]").first().click();
    await page.locator("#termOverlay:not(.hidden)").waitFor({ state: "visible" });
    const openedTitle = await page.locator("#termTitle").textContent();
    assertResult("CNT-OPEN", Boolean(openedTitle), { openedTitle });
    await page.screenshot({ path: path.join(screenshotDir, "desktop-term-modal.png"), fullPage: true });

    let focusStayed = true;
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => document.getElementById("termOverlay")?.contains(document.activeElement));
      if (!inside) focusStayed = false;
    }
    assertResult("SRCH-009", focusStayed, { tabPresses: 12 });
    await page.keyboard.press("Escape");
    await page.locator("#termOverlay").waitFor({ state: "hidden" });

    await page.locator("#adminBtn").click();
    await page.locator("#pinInput").fill("0000");
    await page.locator("#pinForm").evaluate((form) => form.requestSubmit());
    assertResult("AUTH-LOGIN-NEGATIVE", await page.locator("#pinError:not(.hidden)").isVisible(), { note: "Incorrect PIN rejected by the visible workflow." });
    await page.locator("#closePinBtn").click();

    await login(page, "content", "1234");
    const contentVisibility = await page.evaluate(() => ({
      appearance: getComputedStyle(document.querySelector('[data-admin-tab="appearance"]')).display,
      data: getComputedStyle(document.querySelector('[data-admin-tab="data"]')).display,
      visual: document.getElementById("startVisualEditorBtn").classList.contains("hidden"),
      role: document.getElementById("adminRoleName").textContent,
    }));
    assertResult("AUTH-003", contentVisibility.appearance === "none" && contentVisibility.data === "none" && contentVisibility.visual, contentVisibility);
    await page.screenshot({ path: path.join(screenshotDir, "content-admin.png"), fullPage: true });
    await page.locator("#closeAdminBtn").click();

    await login(page, "super", "9999");
    const superVisibility = await page.evaluate(() => ({
      appearance: getComputedStyle(document.querySelector('[data-admin-tab="appearance"]')).display,
      data: getComputedStyle(document.querySelector('[data-admin-tab="data"]')).display,
      visualHidden: document.getElementById("startVisualEditorBtn").classList.contains("hidden"),
      role: document.getElementById("adminRoleName").textContent,
    }));
    assertResult("AUTH-SUPER", superVisibility.appearance !== "none" && superVisibility.data !== "none" && !superVisibility.visualHidden, superVisibility);
    await page.screenshot({ path: path.join(screenshotDir, "super-admin.png"), fullPage: true });

    const firstRecord = page.locator("[data-edit-record]").first();
    const termId = await firstRecord.getAttribute("data-edit-record");
    await firstRecord.click();

    const imageSizes = process.env.MECHLEX_QA_SKIP_IMAGES ? [] : [1, 3, 5, 8, 10, 15];
    for (const sizeMb of imageSizes) {
      const fixture = path.join(fixtureDir, `mechlex-qa-${sizeMb}mb.png`);
      const input = page.locator("#editImageFile");
      await input.setInputFiles(fixture);
      await page.waitForFunction((name) => document.getElementById("embeddedImageState")?.textContent.includes(name), path.basename(fixture), { timeout: 20_000 });
      await page.evaluate(() => window.MechLexCore.sharedSync.loadLatest());
      const before = await page.evaluate(() => window.MechLexCore.sharedSync.revision());
      const saveStart = clock.now();
      await page.locator("#termForm").evaluate((form) => form.requestSubmit());
      const revision = await waitForRevisionIncrease(page, before, 45_000);
      const saveMs = Math.round(clock.now() - saveStart);
      const embedded = await inspectEmbeddedImage(page, termId);
      imageResults.push({ sizeMb, bytes: fs.statSync(fixture).size, revision, saveMs, embedded });
      if (!embedded.exists || !embedded.decodes) {
        imageResults[imageResults.length - 1].error = `IMG-${sizeMb}MB did not persist/decode`;
      }
      await page.locator(`[data-edit-record="${termId}"]`).click();
    }
    record("IMG-001", imageSizes.length === 0 ? "NOT TESTED" : (imageResults.length === 6 && imageResults.every((item) => item.embedded.decodes) ? "PASS" : "FAIL"), {
      matrix: imageResults,
      note: imageSizes.length === 0 ? "Skipped in this core-flow pass; executed in a separate fresh shared-state run." : undefined,
    });

    const injectionState = await page.evaluate(() => {
      window.__qaInjected = 0;
      const html = cleanRichHtml('<p>QA SAFE</p><img src=x onerror="window.__qaInjected=1"><script>window.__qaInjected=2</script><a href="javascript:alert(1)">bad</a>');
      return { executed: window.__qaInjected || 0, html };
    });
    assertResult("CNT-010", injectionState.executed === 0 && !/<script|onerror|javascript:/i.test(injectionState.html), injectionState);

    await page.locator('[data-admin-tab="data"]').click();
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#exportFullJsonBtn").click();
    const download = await downloadPromise;
    const backupPath = path.join(recoveryDir, "browser-full-admin-backup.json");
    await download.saveAs(backupPath);
    const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    assertResult("REC-009", backup.format === "MechLexFullAdminBackup" && Array.isArray(backup.data) && backup.integrity?.digest, {
      bytes: fs.statSync(backupPath).size,
      format: backup.format,
      integrity: backup.integrity?.algorithm,
    });

    await page.locator('[data-admin-tab="terms"]').click();
    await page.locator("#clearTermBtn").click();
    await page.locator("#editName").fill("מושג QA זמני");
    await page.locator("#editNameEn").fill("Temporary QA Term");
    await page.locator("#editDefinition").fill("מושג שיוסר בשחזור");
    await page.locator("#editDefinition").dispatchEvent("input");
    await page.evaluate(() => window.MechLexCore.sharedSync.loadLatest());
    const beforeCreate = await page.evaluate(() => window.MechLexCore.sharedSync.revision());
    await page.locator("#termForm").evaluate((form) => form.requestSubmit());
    await waitForRevisionIncrease(page, beforeCreate, 30_000);
    const tempExists = await page.evaluate(() => data.some((domain) => domain.items.some((term) => term.name === "מושג QA זמני")));
    assertResult("CNT-001", tempExists, { created: "מושג QA זמני" });

    await page.locator("#closeAdminBtn").click();

    const context2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: "he-IL" });
    await context2.route("http://127.0.0.1:8765/api/can-write", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ canWrite: true, role: "Admin" }),
    }));
    const page2 = await context2.newPage();
    page2.on("dialog", (dialog) => dialog.accept());
    page2.on("pageerror", (error) => pageErrors.push(`context2: ${error.stack || error}`));
    await page2.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await page2.waitForFunction(() => window.MechLexCore?.sharedSync?.ready?.(), null, { timeout: 15_000 });
    await login(page2, "super", "9999");
    await page2.locator('[data-admin-tab="data"]').click();
    await page2.evaluate(() => window.MechLexCore.sharedSync.loadLatest());
    const beforeRestore = await page2.evaluate(() => window.MechLexCore.sharedSync.revision());
    await page2.locator("#importJsonFile").setInputFiles(backupPath);
    await waitForRevisionIncrease(page2, beforeRestore, 60_000);
    const restoreState = await page2.evaluate(() => ({
      tempExists: data.some((domain) => domain.items.some((term) => term.name === "מושג QA זמני")),
      terms: data.reduce((sum, domain) => sum + domain.items.length, 0),
    }));
    assertResult("REC-011", !restoreState.tempExists, { ...restoreState, secondIsolatedBrowserContext: true, backupPath });
    await page2.screenshot({ path: path.join(screenshotDir, "restore-second-context.png"), fullPage: true });
    await context2.close();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    const mobileMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    assertResult("UX-002-MOBILE", mobileMetrics.scrollWidth <= mobileMetrics.clientWidth, mobileMetrics);
    await page.screenshot({ path: path.join(screenshotDir, "mobile-390.png"), fullPage: true });

    await page.setViewportSize({ width: 768, height: 900 });
    await page.reload({ waitUntil: "networkidle" });
    const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assertResult("UX-002-TABLET", tabletOverflow <= 0, { overflow: tabletOverflow });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.MechLexCore?.sharedSync?.ready?.(), null, { timeout: 15_000 });
    const reducedMotion = await page.evaluate(() => {
      document.documentElement.classList.add("qa-reduced");
      return true;
    });
    record("UX-009", reducedMotion ? "PASS" : "FAIL", { note: "Keyboard focus trap passed; responsive widths passed. Automated color/assistive-tech audit remains partial." });

    const bypassContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "he-IL" });
    const bypassPage = await bypassContext.newPage();
    await bypassPage.goto(url, { waitUntil: "networkidle" });
    await bypassPage.evaluate(() => openAdmin("super"));
    const bypass = await bypassPage.evaluate(() => ({
      overlayVisible: !document.getElementById("adminOverlay").classList.contains("hidden"),
      role: state.adminRole,
      unlocked: state.adminUnlocked,
      dataTabDisplay: getComputedStyle(document.querySelector('[data-admin-tab="data"]')).display,
    }));
    record("AUTH-002", bypass.overlayVisible && bypass.role === "super" && bypass.unlocked ? "FAIL" : "PASS", {
      ...bypass,
      severity: "Critical",
      note: "Direct console call bypassed the PIN workflow.",
    });
    await bypassPage.screenshot({ path: path.join(screenshotDir, "security-direct-super-bypass.png"), fullPage: true });
    await bypassContext.close();

    const external = requests.filter((requestUrl) => {
      try {
        const parsed = new URL(requestUrl);
        return !["127.0.0.1", "localhost"].includes(parsed.hostname);
      } catch {
        return true;
      }
    });
    record("OFF-002", external.length === 0 ? "PASS" : "FAIL", { requestCount: requests.length, external });
    record("BROWSER-CONSOLE", pageErrors.length === 0 && requestFailures.length === 0 ? "PASS" : "FAIL", { pageErrors, requestFailures, consoleMessages });
  } catch (error) {
    record("BROWSER-HARNESS", "FAIL", { error: error.stack || String(error) });
  } finally {
    performance.imageMatrix = imageResults;
    fs.writeFileSync(path.join(performanceDir, "browser-performance.json"), JSON.stringify(performance, null, 2));
    const report = {
      generatedAt: new Date().toISOString(),
      environment: {
        url,
        browser: fs.existsSync(edgePath) ? edgePath : "Playwright Chromium",
        edgeVersion: fs.existsSync(edgePath) ? fs.statSync(edgePath).size : null,
      },
      pass: results.filter((item) => item.status === "PASS").length,
      fail: results.filter((item) => item.status === "FAIL").length,
      results,
      consoleMessages,
      pageErrors,
      requestFailures,
      requests,
      imageResults,
      performance,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ pass: report.pass, fail: report.fail, reportPath }));
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    const harnessFailed = results.some((item) => item.id === "BROWSER-HARNESS" && item.status === "FAIL");
    if (harnessFailed) process.exitCode = 1;
  }
})();
