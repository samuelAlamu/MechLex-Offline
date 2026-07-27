"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(process.argv[2] || process.cwd());
const url = process.argv[3] || "http://127.0.0.1:8766/index.html";
const reportPath = path.join(root, "qa", "evidence", "logs", "ux-edge-cases.json");
const screenshotDir = path.join(root, "qa", "evidence", "screenshots");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(screenshotDir, { recursive: true });

const results = [];
const record = (id, status, details = {}) => results.push({ id, status, at: new Date().toISOString(), ...details });

(async () => {
  const browser = await chromium.launch({ executablePath: fs.existsSync(edgePath) ? edgePath : undefined, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
    const page = await context.newPage();
    let dialogs = 0;
    page.on("dialog", async (dialog) => { dialogs += 1; await dialog.dismiss(); });
    await page.goto(url, { waitUntil: "networkidle" });

    await page.locator("#searchInput").fill("A | B");
    await page.waitForTimeout(200);
    const specialCount = await page.locator("[data-term-id]").count();
    const totalTerms = await page.evaluate(() => data.reduce((sum, domain) => sum + domain.items.length, 0));
    record("SRCH-005", specialCount < totalTerms ? "PASS" : "FAIL", {
      query: "A | B",
      results: specialCount,
      totalTerms,
      note: "A single-letter token matched nearly every English field.",
    });
    await page.locator("#searchInput").fill("");

    await page.locator("#adminBtn").click();
    await page.locator("#pinRoleSelect").selectOption("super");
    await page.locator("#pinInput").fill("9999");
    await page.locator("#pinForm").evaluate((form) => form.requestSubmit());
    await page.locator("#adminOverlay:not(.hidden)").waitFor();

    await page.locator('[data-admin-tab="domains"]').click();
    const tabState = await page.evaluate(() => [...document.querySelectorAll("[data-admin-tab]")].map((tab) => ({
      tab: tab.dataset.adminTab,
      active: tab.classList.contains("active"),
      ariaSelected: tab.getAttribute("aria-selected"),
    })));
    const activeDomainAria = tabState.find((item) => item.tab === "domains");
    const activeTermsAria = tabState.find((item) => item.tab === "terms");
    record("UX-009-ARIA-TABS", activeDomainAria?.ariaSelected === "true" && activeTermsAria?.ariaSelected === "false" ? "PASS" : "FAIL", { tabState });

    await page.locator('[data-admin-tab="terms"]').click();
    await page.locator("[data-edit-record]").first().click();
    const originalName = await page.locator("#editName").inputValue();
    await page.locator("#editName").fill(`${originalName} — UNSAVED QA`);
    const draftStatus = await page.locator("#adminDraftStatus").textContent();
    const beforeDialogs = dialogs;
    await page.locator("#closeAdminBtn").click();
    const closed = await page.locator("#adminOverlay").getAttribute("class");
    record("UX-005", dialogs > beforeDialogs ? "PASS" : "FAIL", {
      originalName,
      draftStatus,
      dialogsObserved: dialogs - beforeDialogs,
      overlayClassAfterClose: closed,
      note: "The modified form closed without an unsaved-change warning.",
    });
    await page.screenshot({ path: path.join(screenshotDir, "unsaved-change-closed.png"), fullPage: true });
    await context.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(url, { waitUntil: "networkidle" });
    await mobilePage.evaluate(() => {
      document.activeElement?.blur();
      document.body.setAttribute("tabindex", "-1");
      document.body.focus();
    });
    const focusSequence = [];
    for (let index = 0; index < 20; index += 1) {
      await mobilePage.keyboard.press("Tab");
      focusSequence.push(await mobilePage.evaluate((tabIndex) => {
        const element = document.activeElement;
        const box = element?.getBoundingClientRect();
        return {
          index: tabIndex,
          id: element?.id || "",
          text: (element?.textContent || "").trim().slice(0, 50),
          tag: element?.tagName || "",
          x: box?.x,
          right: box?.right,
          y: box?.y,
          outsideViewport: Boolean(box && (box.right <= 0 || box.x >= innerWidth || box.bottom <= 0 || box.y >= innerHeight)),
          insideSidebar: Boolean(element?.closest?.(".sidebar")),
        };
      }, index));
    }
    const offscreenSidebarFocus = focusSequence.filter((item) => item.insideSidebar && item.outsideViewport);
    record("UX-009-MOBILE-FOCUS", offscreenSidebarFocus.length === 0 ? "PASS" : "FAIL", {
      offscreenSidebarFocusCount: offscreenSidebarFocus.length,
      focusSequence,
    });
    await mobile.close();
  } catch (error) {
    record("UX-EDGE-HARNESS", "FAIL", { error: error.stack || String(error) });
  } finally {
    const report = {
      generatedAt: new Date().toISOString(),
      url,
      pass: results.filter((item) => item.status === "PASS").length,
      fail: results.filter((item) => item.status === "FAIL").length,
      results,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ reportPath, pass: report.pass, fail: report.fail }));
    await browser.close();
  }
})();
