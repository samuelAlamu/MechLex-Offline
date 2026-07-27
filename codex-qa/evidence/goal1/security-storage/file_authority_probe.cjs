const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("../../../../qa/automation/node_modules/playwright");
const root = path.resolve(__dirname, "../../../..");
const workspace = path.join(root, "codex-qa", "workspaces", "normal");
const out = __dirname;
const profile = path.join(out, "profile-file");
const marker = `G1_FILE_${Date.now()}`;
fs.mkdirSync(profile, { recursive: true });
(async () => {
  const context = await chromium.launchPersistentContext(profile, { channel: "msedge", headless: true });
  const page = context.pages()[0] || await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(pathToFileURL(path.join(workspace, "index.html")).href, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const before = await page.evaluate(() => ({
    protocol: location.protocol, domains: data.length,
    terms: data.reduce((n,d)=>n+(d.items||[]).length,0),
    source: meta.dataSource, first: data[0]?.name,
    keys: Object.keys(localStorage).sort()
  }));
  const injection = await page.evaluate(value => {
    const d = JSON.parse(localStorage.getItem("mechlex_v6_data"));
    const original = d[0].name; d[0].name = value;
    localStorage.setItem("mechlex_v6_data", JSON.stringify(d));
    return { original, injected: value };
  }, marker);
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
  const reload1 = await page.evaluate(() => ({ first: data[0]?.name, source: meta.dataSource, rendered: document.body.innerText.includes(data[0]?.name) }));
  await context.close();
  const context2 = await chromium.launchPersistentContext(profile, { channel: "msedge", headless: true });
  const page2 = context2.pages()[0] || await context2.newPage();
  await page2.goto(pathToFileURL(path.join(workspace, "index.html")).href, { waitUntil: "load" }); await page2.waitForTimeout(1200);
  const restart = await page2.evaluate(() => ({ first: data[0]?.name, source: meta.dataSource }));
  await context2.close();
  const result = {
    timestampUtc:new Date().toISOString(), browser:`Microsoft Edge ${context2.browser()?.version?.()||"closed"}`,
    target:"disposable frozen workspace via file://", before, injection, reload1, restart, errors,
    persistence:{persistedFile:"none",browserMemory:"marker loaded",browserStorage:"localStorage mechlex_v6_data",survivesBrowserRestart:restart.first===marker,otherProfileObservable:false},
    proven:before.protocol==="file:"&&before.domains>0&&reload1.first===marker&&reload1.source==="local"&&restart.first===marker
  };
  fs.writeFileSync(path.join(out,"G1-SEC-01-file-localstorage.json"),JSON.stringify(result,null,2));
})().catch(e=>{process.stderr.write(String(e.stack||e));process.exit(1)});
