const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("../../../qa/automation/node_modules/playwright");

const projectRoot = path.resolve(__dirname, "../../..");
const workspace = path.join(projectRoot, "codex-qa", "workspaces", "normal");
const evidenceRoot = path.join(projectRoot, "codex-qa", "evidence", "preactivation");
const profile = path.join(projectRoot, "codex-qa", "workspaces", "browser-file-profile");
const url = pathToFileURL(path.join(workspace, "index.html")).href;
const marker = `H0_FILE_STORAGE_${Date.now()}`;

fs.mkdirSync(evidenceRoot, { recursive: true });
fs.mkdirSync(profile, { recursive: true });

(async () => {
  const consoleMessages = [];
  const pageErrors = [];
  const context = await chromium.launchPersistentContext(profile, {
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = context.pages()[0] || await context.newPage();
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
  });
  page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 1000)));

  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1200);

    const before = await page.evaluate(() => {
      const sensitiveSettingPaths = [];
      const visit = (value, prefix = "") => {
        if (!value || typeof value !== "object") return;
        Object.entries(value).forEach(([key, child]) => {
          const next = prefix ? `${prefix}.${key}` : key;
          if (/(^pin$|pin$|password|secret|credential)/i.test(key)) sensitiveSettingPaths.push(next);
          visit(child, next);
        });
      };
      visit(JSON.parse(localStorage.getItem("mechlex_v6_settings") || "{}"));
      return {
        protocol: location.protocol,
        title: document.title,
        mainVisible: Boolean(document.querySelector("#mainContent")) &&
          getComputedStyle(document.querySelector("#mainContent")).display !== "none",
        domainCount: eval("data").length,
        termCount: eval("data").reduce((sum, domain) => sum + (domain.items || []).length, 0),
        firstDomainName: eval("data")[0] && eval("data")[0].name,
        dataSource: eval("meta").dataSource,
        storagePersistentFlag: eval("storageIsPersistent"),
        localStorage: Object.keys(localStorage).sort().map((key) => ({
          key,
          byteLength: new Blob([localStorage.getItem(key) || ""]).size,
        })),
        sensitiveSettingPaths,
      };
    });

    const mutation = await page.evaluate((value) => {
      const dictionary = eval("data");
      const original = dictionary[0].name;
      dictionary[0].name = value;
      const saveReturned = eval("saveAll")("H0 disposable file storage probe", { backupRelevant: true });
      return { original, changedTo: dictionary[0].name, saveReturned };
    }, marker);

    await page.waitForTimeout(600);
    const saveAllEntry = await page.evaluate(() => {
      const raw = localStorage.getItem("mechlex_v6_data");
      const parsed = JSON.parse(raw);
      return {
        keyPresent: Boolean(raw),
        byteLength: new Blob([raw || ""]).size,
        firstDomainName: parsed[0] && parsed[0].name,
      };
    });

    const directBrowserStorageInjection = await page.evaluate((value) => {
      const key = "mechlex_v6_data";
      const parsed = JSON.parse(localStorage.getItem(key));
      const original = parsed[0].name;
      parsed[0].name = value;
      localStorage.setItem(key, JSON.stringify(parsed));
      return {
        key,
        original,
        changedTo: value,
        byteLength: new Blob([localStorage.getItem(key)]).size,
      };
    }, marker);

    await page.reload({ waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1200);
    const afterReload = await page.evaluate(() => ({
      protocol: location.protocol,
      domainCount: eval("data").length,
      firstDomainName: eval("data")[0] && eval("data")[0].name,
      dataSource: eval("meta").dataSource,
      markerRendered: document.body.innerText.includes(eval("data")[0].name),
      saveStateText: document.querySelector("#saveState")?.textContent || "",
    }));

    const dbNames = await page.evaluate(async () => {
      if (!indexedDB.databases) return { supported: false, names: [] };
      const databases = await indexedDB.databases();
      return { supported: true, names: databases.map((db) => db.name).filter(Boolean).sort() };
    });
    await page.screenshot({
      path: path.join(evidenceRoot, "11_file-storage-after-reload.png"),
      fullPage: true,
    });

    const provenAlternateAuthority =
      before.protocol === "file:" &&
      before.mainVisible &&
      before.domainCount > 0 &&
      saveAllEntry.keyPresent &&
      afterReload.firstDomainName === marker;

    const result = {
      timestampUtc: new Date().toISOString(),
      engine: "Installed Microsoft Edge via Playwright channel=msedge",
      browserVersion: await context.browser().version(),
      target: url,
      isolation: {
        disposableWorkspace: workspace,
        disposableProfile: profile,
        realSharedDataUsed: false,
      },
      before,
      mutation,
      saveAllEntry,
      directBrowserStorageInjection,
      afterReload,
      indexedDb: dbNames,
      consoleMessages,
      pageErrors,
      verdict: provenAlternateAuthority
        ? "MANDATORY RELEASE-GATE FINDING: functional file:// dictionary persisted authoritative content in browser storage"
        : "NOT PROVEN",
      provenAlternateAuthority,
    };
    fs.writeFileSync(
      path.join(evidenceRoot, "11_file-storage-runtime-probe.json"),
      JSON.stringify(result, null, 2),
      "utf8",
    );
    process.stdout.write(JSON.stringify({
      provenAlternateAuthority,
      browserVersion: result.browserVersion,
      domainCount: before.domainCount,
      termCount: before.termCount,
      persistedAfterReload: afterReload.firstDomainName === marker,
      localStorageKeys: before.localStorage.map((entry) => entry.key),
      indexedDb: dbNames,
      pageErrorCount: pageErrors.length,
    }, null, 2));
  } finally {
    await context.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
