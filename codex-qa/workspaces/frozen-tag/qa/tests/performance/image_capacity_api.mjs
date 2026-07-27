import { spawn } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

const root = path.resolve(process.argv[2] || process.cwd());
const serverRoot = path.join(root, "qa", "workspaces", "destructive");
const serverScript = path.join(serverRoot, "core", "start-local-server.ps1");
const sharedRoot = path.join(root, "qa", "workspaces", `image-api-${Date.now()}`);
const fixtureRoot = path.join(root, "qa", "tests", "fixtures");
const reportPath = path.join(root, "qa", "evidence", "performance", "image-capacity-api.json");
const port = 8792;
const base = `http://127.0.0.1:${port}`;

await mkdir(sharedRoot, { recursive: true });
await mkdir(path.dirname(reportPath), { recursive: true });

const serverLog = [];
const child = spawn(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", serverScript, "-NoBrowser", "-Port", String(port), "-SharedDataPath", sharedRoot],
  { cwd: serverRoot, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
child.stdout.on("data", (chunk) => serverLog.push(chunk.toString()));
child.stderr.on("data", (chunk) => serverLog.push(chunk.toString()));

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/shared-health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Image capacity server did not start");
}

const matrix = [];
let revision = 0;

try {
  await waitForServer();
  for (const sizeMb of [1, 3, 5, 8, 10, 15]) {
    const file = path.join(fixtureRoot, `mechlex-qa-${sizeMb}mb.png`);
    const raw = await readFile(file);
    const imageData = `data:image/png;base64,${raw.toString("base64")}`;
    const shared = {
      data: [{
        id: "dom-image",
        name: "תמונות",
        nameEn: "Images",
        prefix: "IMG",
        color: "#246b87",
        icon: "image",
        description: "QA",
        subtopics: [],
        items: [{
          id: "img-001",
          code: "IMG-001",
          name: "תמונת בדיקה",
          title: "תמונת בדיקה",
          nameEn: "Image Test",
          definition: "בדיקת קיבולת תמונה",
          definitionHtml: "<p>בדיקת קיבולת תמונה</p>",
          subtopic: "direct",
          imageData,
        }],
      }],
      settings: { uiText: {} },
      uiText: {},
    };
    const body = JSON.stringify({
      expectedRevision: revision,
      clientId: "qa-image-capacity",
      reason: `image-${sizeMb}mb`,
      appVersion: "10.1.0",
      schemaVersion: 2,
      shared,
    });
    const putStart = performance.now();
    const put = await fetch(`${base}/api/shared-state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8", "X-MechLex-Client": "1" },
      body,
    });
    const putMs = Math.round(performance.now() - putStart);
    const putJson = await put.json().catch(() => ({}));
    if (put.ok) revision = Number(putJson.revision);

    const getStart = performance.now();
    const get = await fetch(`${base}/api/shared-state`);
    const getText = await get.text();
    const getMs = Math.round(performance.now() - getStart);
    let returnedLength = 0;
    let valid = false;
    try {
      const parsed = JSON.parse(getText);
      returnedLength = parsed.shared.data[0].items[0].imageData.length;
      valid = returnedLength === imageData.length && Number(parsed.revision) === revision;
    } catch {}

    matrix.push({
      sizeMb,
      inputBytes: raw.length,
      base64Length: imageData.length,
      requestBytes: Buffer.byteLength(body),
      putStatus: put.status,
      putMs,
      getStatus: get.status,
      getMs,
      exceedsClientFiveSecondTimeout: putMs > 5000 || getMs > 5000,
      returnedLength,
      valid,
      stateFileBytes: (await stat(path.join(sharedRoot, "state.json"))).size,
    });
  }
} catch (error) {
  matrix.push({ harnessError: error.stack || String(error) });
} finally {
  child.kill();
  await new Promise((resolve) => {
    child.once("exit", resolve);
    setTimeout(resolve, 1500);
  });
  const report = {
    generatedAt: new Date().toISOString(),
    environment: { port, sharedRoot, node: process.version },
    clientTimeoutMs: 5000,
    matrix,
    allServerRoundTripsValid: matrix.length === 6 && matrix.every((item) => item.valid),
    allWithinClientTimeout: matrix.length === 6 && matrix.every((item) => !item.exceedsClientFiveSecondTimeout),
    serverLog,
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ reportPath, allServerRoundTripsValid: report.allServerRoundTripsValid, allWithinClientTimeout: report.allWithinClientTimeout, matrix }));
}
