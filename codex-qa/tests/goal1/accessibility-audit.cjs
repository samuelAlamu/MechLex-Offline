const fs = require("fs");
const path = require("path");
const { chromium } = require("../../../qa/automation/node_modules/playwright");
const AxeBuilder = require("../../../qa/automation/node_modules/@axe-core/playwright").default;

const projectRoot = path.resolve(__dirname, "../../..");
const evidence = path.join(projectRoot, "codex-qa", "evidence", "goal1", "ux-accessibility");
const url = process.argv[2];
if (!url) throw new Error("URL required");
fs.mkdirSync(evidence, { recursive: true });

const simplify = (result) => ({
  url: result.url,
  passes: result.passes.length,
  incomplete: result.incomplete.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
  violations: result.violations.map((item) => ({
    id: item.id,
    impact: item.impact,
    help: item.help,
    nodes: item.nodes.length,
    targets: item.nodes.slice(0, 10).map((node) => node.target),
  })),
});

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "he-IL" });
    const page = await desktop.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const main = simplify(await new AxeBuilder({ page }).analyze());

    await page.addScriptTag({ content: `
      window.__g1OpenAdmin = (async () => {
        const original = window.MechLexCore && window.MechLexCore.sharedSync;
        if (window.MechLexCore) window.MechLexCore.sharedSync = null;
        await openAdmin("super", settings.superPin);
        if (window.MechLexCore) window.MechLexCore.sharedSync = original;
      })();
    ` });
    await page.evaluate(() => window.__g1OpenAdmin);
    const adminVisible = await page.locator("#adminOverlay").getAttribute("aria-hidden") === "false";
    const admin = simplify(await new AxeBuilder({ page }).include("#adminOverlay").analyze());
    await page.screenshot({ path: path.join(evidence, "accessibility-admin.png"), fullPage: true });
    await desktop.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const mobileResult = simplify(await new AxeBuilder({ page: mobilePage }).analyze());
    await mobilePage.screenshot({ path: path.join(evidence, "accessibility-mobile.png"), fullPage: true });
    await mobile.close();

    const report = {
      timestampUtc: new Date().toISOString(),
      browser: `Microsoft Edge ${await browser.version()}`,
      url,
      main,
      admin: { visible: adminVisible, ...admin },
      mobile: mobileResult,
      nvda: "NOT TESTED — not installed/authorized",
      realSharedDataUsed: false,
    };
    fs.writeFileSync(path.join(evidence, "axe-results.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      mainViolations: main.violations.length,
      adminViolations: admin.violations.length,
      mobileViolations: mobileResult.violations.length,
      adminVisible,
    }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
