const fs = require("fs");
const path = require("path");
const { chromium } = require("../../../qa/automation/node_modules/playwright");

const projectRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = path.join(projectRoot, "codex-qa", "evidence", "preactivation");
const profile = path.join(projectRoot, "codex-qa", "workspaces", "browser-localhost-profile");
const port = Number(process.env.H0_HELPER_PORT);
const helperPid = Number(process.env.H0_HELPER_PID);
const marker = `H0_FAILED_HELPER_${Date.now()}`;

if (!port || !helperPid) throw new Error("H0_HELPER_PORT and H0_HELPER_PID are required");
fs.mkdirSync(profile, { recursive: true });

(async () => {
  const pageErrors = [];
  const consoleMessages = [];
  const context = await chromium.launchPersistentContext(profile, {
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = context.pages()[0] || await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 1000)));
  page.on("console", (message) => consoleMessages.push({
    type: message.type(),
    text: message.text().slice(0, 500),
  }));

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    await page.goto(`${baseUrl}/index.html`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(2500);

    await page.addScriptTag({ content: `
      window.__h0InitialPromise = (async () => {
      const canWrite = await fetch("/api/can-write").then((response) => response.json());
      const dbNames = indexedDB.databases
        ? (await indexedDB.databases()).map((db) => db.name).filter(Boolean).sort()
        : [];
      return {
        protocol: location.protocol,
        title: document.title,
        domainCount: data.length,
        termCount: data.reduce((sum, domain) => sum + (domain.items || []).length, 0),
        dataSource: meta.dataSource,
        localStorageKeys: Object.keys(localStorage).sort(),
        indexedDbNames: dbNames,
        serverCanWrite: canWrite.canWrite,
        serverRole: canWrite.role,
      };
      })();
    ` });
    const initial = await page.evaluate(() => window.__h0InitialPromise);

    await page.addScriptTag({ content: `
      window.__h0AuthorityPromise = (async () => {
      state.adminRole = "super";
      const originalSharedSync = window.MechLexCore && window.MechLexCore.sharedSync;
      if (window.MechLexCore) window.MechLexCore.sharedSync = null;
      await openAdmin("super", settings.superPin);
      if (window.MechLexCore) window.MechLexCore.sharedSync = originalSharedSync;
      const adminOverlayOpen =
        document.querySelector("#adminOverlay")?.getAttribute("aria-hidden") === "false";
      const recordResponse = await fetch("/api/shared-state");
      const record = await recordResponse.json();
      const putResponse = await fetch("/api/shared-state", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-MechLex-Client": "1",
        },
        body: JSON.stringify({
          schemaVersion: record.schemaVersion,
          expectedRevision: record.revision,
          shared: record.shared,
        }),
      });
      return {
        clientSuperAdminOpened: adminOverlayOpen,
        directPutStatus: putResponse.status,
        directPutRejected: putResponse.status === 403,
        note: "No PIN value or shared payload was recorded.",
      };
      })();
    ` });
    const authorityBoundary = await page.evaluate(() => window.__h0AuthorityPromise);

    process.kill(helperPid);
    await page.waitForTimeout(3500);
    await page.addScriptTag({ content: `
      window.__h0FailedHelperPromise = (async () => {
      let healthUnavailable = false;
      try {
        await fetch("/api/shared-health");
      } catch {
        healthUnavailable = true;
      }
      const value = ${JSON.stringify(marker)};
      const dictionary = data;
      const before = dictionary[0].name;
      dictionary[0].name = value;
      const saveResult = saveAll("H0 failed-helper probe", { backupRelevant: true });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const stored = JSON.parse(localStorage.getItem("mechlex_v6_data"));
      const indexedDbAfterSave = await new Promise((resolve) => {
        const open = indexedDB.open("mechlex_offline_v95", 1);
        open.onerror = () => resolve(null);
        open.onsuccess = () => {
          const request = open.result.transaction("state", "readonly").objectStore("state").get("main");
          request.onerror = () => resolve(null);
          request.onsuccess = () => resolve(request.result?.data?.[0]?.name || null);
        };
      });
      return {
        healthUnavailable,
        attemptedMarker: value,
        inMemoryAfterSave: dictionary[0].name,
        storedAfterSave: stored[0].name,
        indexedDbAfterSave,
        durableIndexedDbMarker: indexedDbAfterSave === value,
        rolledBack: dictionary[0].name === before && stored[0].name === before,
        saveReturnedPersistent: saveResult === true,
      };
      })();
    ` });
    const failedHelper = await page.evaluate(() => window.__h0FailedHelperPromise);

    const result = {
      timestampUtc: new Date().toISOString(),
      browser: `Microsoft Edge ${await context.browser().version()}`,
      target: `http://127.0.0.1:${port}/index.html`,
      isolation: "Disposable normal workspace and disposable browser profile",
      initial,
      authorityBoundary,
      failedHelper,
      pageErrors,
      consoleMessages,
      verdicts: {
        localhostFunctional: initial.protocol === "http:" && initial.domainCount > 0,
        clientSidePinAuthorityProven: authorityBoundary.clientSuperAdminOpened,
        clientAuthorityNotServerAuthority:
          authorityBoundary.clientSuperAdminOpened && authorityBoundary.directPutRejected,
        failedHelperLocalSaveFallbackProven: failedHelper.durableIndexedDbMarker,
        failedHelperFailClosedProven: failedHelper.healthUnavailable && failedHelper.rolledBack,
      },
      realSharedDataUsed: false,
    };
    fs.writeFileSync(
      path.join(evidenceRoot, "11_12_localhost_failed-helper_authority-probe.json"),
      JSON.stringify(result, null, 2),
      "utf8",
    );
    process.stdout.write(JSON.stringify(result.verdicts, null, 2));
  } finally {
    await context.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
