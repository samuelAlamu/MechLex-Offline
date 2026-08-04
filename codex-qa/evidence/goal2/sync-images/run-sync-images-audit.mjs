import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  open,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

const projectRoot = path.resolve(process.argv[2] || process.cwd());
const evidenceRoot = path.join(projectRoot, "codex-qa", "evidence", "goal2", "sync-images");
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const workspaceRoot = path.join(projectRoot, "codex-qa", "workspaces", `sync-images-${runId}`);
const sharedRoot = path.join(workspaceRoot, "shared");
const stationA = path.join(workspaceRoot, "station-a");
const stationB = path.join(workspaceRoot, "station-b");
const fixtureRoot = path.join(workspaceRoot, "fixtures");
const reportPath = path.join(evidenceRoot, `sync-images-results-${runId}.json`);
const sourceServer = path.join(projectRoot, "core", "start-local-server.ps1");
const sourceSync = path.join(projectRoot, "core", "shared-sync.js");
const sourceRecovery = path.join(projectRoot, "core", "recovery-wizard.ps1");
const generator = path.join(evidenceRoot, "generate_exact_images.py");
const results = [];
const serverLogs = { stationA: [], stationB: [] };
const children = [];

function record(id, expected, observed, status, details = {}) {
  results.push({ id, expected, observed, status, at: new Date().toISOString(), ...details });
}

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || projectRoot,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk.toString()));
    child.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, stdout: stdout.join(""), stderr: stderr.join("") }));
    if (options.input) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

async function prepareStation(root) {
  await mkdir(path.join(root, "core"), { recursive: true });
  await copyFile(sourceServer, path.join(root, "core", "start-local-server.ps1"));
  await copyFile(sourceRecovery, path.join(root, "core", "recovery-wizard.ps1"));
  await writeFile(path.join(root, "index.html"), "<!doctype html><title>MechLex QA disposable station</title>", "utf8");
}

function startStation(root, port, logKey) {
  const child = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", path.join(root, "core", "start-local-server.ps1"),
      "-NoBrowser",
      "-Port", String(port),
      "-SharedDataPath", sharedRoot,
    ],
    { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout.on("data", (chunk) => serverLogs[logKey].push(chunk.toString()));
  child.stderr.on("data", (chunk) => serverLogs[logKey].push(chunk.toString()));
  children.push(child);
  return child;
}

async function waitForServer(base, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/shared-health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${base}`);
}

async function api(base, url, options = {}) {
  return fetch(`${base}${url}`, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      "X-MechLex-Client": "1",
      ...(options.headers || {}),
    },
  });
}

function snapshot(marker, imageData = "") {
  return {
    data: [{
      id: "dom-qa",
      name: "QA Domain",
      nameEn: "QA Domain",
      prefix: "QA",
      color: "#296a86",
      icon: "Q",
      description: `Domain ${marker}`,
      subtopics: [{
        id: "sub-qa",
        name: "QA Subtopic",
        description: "Nested hierarchy",
        children: [{
          id: "subsub-qa",
          name: "QA Child",
          description: "Deep nested hierarchy",
          imageData: "",
        }],
      }],
      items: [{
        id: "term-qa",
        code: "QA-001",
        title: `Term ${marker}`,
        name: `Term ${marker}`,
        nameEn: `Term ${marker}`,
        definition: `Definition ${marker}`,
        definitionHtml: `<p>Definition ${marker}</p>`,
        subtopic: "QA Subtopic",
        subSubtopic: "QA Child",
        imageData,
      }],
    }],
    settings: { uiText: { marker } },
    uiText: { marker },
  };
}

function payload(revision, clientId, reason, shared) {
  return {
    expectedRevision: revision,
    clientId,
    reason,
    appVersion: "10.1.0",
    schemaVersion: 2,
    shared,
  };
}

async function put(base, body) {
  return api(base, "/api/shared-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
}

async function runFalseSuccessHarness() {
  const syncSource = await readFile(sourceSync, "utf8");
  const toastEvents = [];
  const localStorage = new Map();
  const committed = snapshot("committed");
  let putCount = 0;
  const saveState = { className: "", textContent: "" };
  const adminOverlay = { classList: { contains: () => true } };
  const response = (status, value) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  });
  const sandbox = {
    AbortController,
    APP_VERSION: "10.1.0",
    SCHEMA_VERSION: 2,
    DEFAULT_SETTINGS: { appearance: {}, fields: {}, uiText: {} },
    data: [],
    settings: { appearance: {}, fields: {}, uiText: {} },
    meta: {},
    clone: (value) => JSON.parse(JSON.stringify(value)),
    normalizeData: (value) => JSON.parse(JSON.stringify(value)),
    repairCatalogIntegrity: () => {},
    renderAll: () => {},
    renderAdmin: () => {},
    saveAll: () => true,
    toast: (message, type = "") => toastEvents.push({ message, type, at: Date.now() }),
    init: () => {},
    console: { warn: () => {} },
    document: {
      documentElement: { dataset: {} },
      getElementById: (id) => (id === "saveState" ? saveState : id === "adminOverlay" ? adminOverlay : null),
    },
    fetch: async (url, options = {}) => {
      if (options.method === "PUT") {
        putCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 120));
        return response(500, { message: "Deterministic QA write failure" });
      }
      return response(200, {
        revision: 1,
        updatedAt: new Date().toISOString(),
        checksum: "qa",
        shared: committed,
      });
    },
    location: { protocol: "http:" },
    localStorage: {
      getItem: (key) => localStorage.get(key) ?? null,
      setItem: (key, value) => localStorage.set(key, String(value)),
    },
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(syncSource, sandbox, { filename: "core/shared-sync.js" });
  await sandbox.MechLexCore.sharedSync.loadLatest();
  sandbox.data[0].items[0].definition = "Unsaved local change";
  sandbox.saveAll("save");
  sandbox.toast("The term was saved successfully", "success");
  await new Promise((resolve) => setTimeout(resolve, 250));
  const successIndex = toastEvents.findIndex((event) => event.type === "success");
  const failureIndex = toastEvents.findIndex((event) => event.type === "error");
  return {
    putCount,
    toastEvents,
    successShownBeforeFailure: successIndex >= 0 && failureIndex > successIndex,
    rolledBack: sandbox.data[0].items[0].definition === committed.data[0].items[0].definition,
  };
}

await mkdir(evidenceRoot, { recursive: true });
await mkdir(sharedRoot, { recursive: true });
await mkdir(fixtureRoot, { recursive: true });
await prepareStation(stationA);
await prepareStation(stationB);

const sourceHashes = {
  server: hashBytes(await readFile(sourceServer)),
  sharedSync: hashBytes(await readFile(sourceSync)),
  recovery: hashBytes(await readFile(sourceRecovery)),
};
const portA = await freePort();
const portB = await freePort();
const baseA = `http://127.0.0.1:${portA}`;
const baseB = `http://127.0.0.1:${portB}`;

try {
  startStation(stationA, portA, "stationA");
  startStation(stationB, portB, "stationB");
  await Promise.all([waitForServer(baseA), waitForServer(baseB)]);

  const healthA = await api(baseA, "/api/shared-health");
  const healthB = await api(baseB, "/api/shared-health");
  record(
    "SYNC-STATIONS-HEALTH",
    "Two independent loopback helpers point to the same disposable shared folder",
    { stationA: await healthA.json(), stationB: await healthB.json() },
    healthA.ok && healthB.ok ? "PASS" : "FAIL",
  );

  let revision = 0;
  const initial = await put(baseA, payload(0, "station-a", "add-term", snapshot("added-on-a")));
  const initialJson = await initial.json().catch(() => ({}));
  revision = Number(initialJson.revision || 0);
  const visibleOnB = await api(baseB, "/api/shared-state");
  const visibleRecord = await visibleOnB.json().catch(() => ({}));
  const bTerm = visibleRecord.shared?.data?.[0]?.items?.[0];
  record(
    "SYNC-TERM-AVAILABLE-ALL-STATIONS",
    "A term saved through station A is readable through independent station B",
    { putStatus: initial.status, getStatus: visibleOnB.status, revision, term: bTerm?.name },
    initial.status === 200 && visibleOnB.status === 200 && bTerm?.name === "Term added-on-a" ? "PASS" : "FAIL",
    { limitation: "Executed with two helper processes on one Windows host sharing one folder; real SMB/multi-PC propagation remains NOT TESTED." },
  );

  const unchanged = await api(baseB, `/api/shared-state?knownRevision=${revision}`);
  const unchangedText = await unchanged.text();
  record(
    "SYNC-POLL-304",
    "HTTP 304 Not Modified for a known current revision",
    { status: unchanged.status, body: unchangedText },
    unchanged.status === 304 ? "PASS" : "FAIL",
  );

  const beforeStale = await readFile(path.join(sharedRoot, "state.json"));
  const stale = await put(baseB, payload(0, "station-b-stale", "stale-write", snapshot("stale")));
  const staleJson = await stale.json().catch(() => ({}));
  const afterStale = await readFile(path.join(sharedRoot, "state.json"));
  record(
    "SYNC-REVISION-409",
    "A stale expectedRevision is rejected with 409 and state bytes do not change",
    {
      status: stale.status,
      response: staleJson,
      beforeSha256: hashBytes(beforeStale),
      afterSha256: hashBytes(afterStale),
    },
    stale.status === 409 && hashBytes(beforeStale) === hashBytes(afterStale) ? "PASS" : "FAIL",
  );

  const sameRevision = revision;
  const [concurrentA, concurrentB] = await Promise.all([
    put(baseA, payload(sameRevision, "station-a-race", "race-a", snapshot("race-a"))),
    put(baseB, payload(sameRevision, "station-b-race", "race-b", snapshot("race-b"))),
  ]);
  const statuses = [concurrentA.status, concurrentB.status].sort((a, b) => a - b);
  const afterRace = await api(baseA, "/api/shared-state");
  const afterRaceJson = await afterRace.json();
  revision = Number(afterRaceJson.revision);
  record(
    "SYNC-CROSS-HELPER-RACE",
    "Exactly one writer commits and one receives 409",
    { statuses: [concurrentA.status, concurrentB.status], finalRevision: revision, finalReason: afterRaceJson.reason },
    statuses[0] === 200 && statuses[1] === 409 && revision === sameRevision + 1 ? "PASS" : "FAIL",
    { limitation: "Same-host two-process test, not physical SMB contention." },
  );

  const historyFiles = (await readdir(path.join(sharedRoot, "history"))).filter((name) => /^state-r.*\.json$/i.test(name));
  const tempFiles = (await readdir(sharedRoot)).filter((name) => /\.tmp$/i.test(name));
  const previousExists = await stat(path.join(sharedRoot, "state.previous.json")).then((value) => value.isFile()).catch(() => false);
  record(
    "SYNC-ATOMIC-STRUCTURE",
    "File.Replace lineage exists, previous/history exist, and no temp file remains after successful writes",
    { previousExists, historyCount: historyFiles.length, tempFiles },
    previousExists && historyFiles.length >= 2 && tempFiles.length === 0 ? "PASS" : "FAIL",
    { limitation: "Power-loss and real SMB atomicity were not tested." },
  );

  const invalidNested = snapshot("invalid-nested");
  invalidNested.data[0].items = [{
    id: "",
    code: "",
    name: "",
    definition: "",
    imageData: "data:image/png;base64,%%%",
  }];
  const invalidResponse = await put(baseA, payload(revision, "semantic-invalid", "semantic-invalid", invalidNested));
  const invalidJson = await invalidResponse.json().catch(() => ({}));
  if (invalidResponse.ok) revision = Number(invalidJson.revision || revision);
  record(
    "SYNC-RECURSIVE-SEMANTIC-VALIDATION",
    "HTTP 422 rejects a nested term missing id/code/name/definition and containing invalid base64",
    { status: invalidResponse.status, response: invalidJson },
    invalidResponse.status === 422 ? "PASS" : "FAIL",
  );

  const generated = await runProcess("py", [generator, fixtureRoot], { cwd: projectRoot });
  if (generated.code !== 0) throw new Error(`Exact image generation failed: ${generated.stderr || generated.stdout}`);
  const fixtures = JSON.parse(generated.stdout);
  for (const fixture of fixtures) {
    const bytes = await readFile(fixture.path);
    const mime = fixture.format === "JPEG" ? "jpeg" : fixture.format.toLowerCase();
    const imageData = `data:image/${mime};base64,${bytes.toString("base64")}`;
    const requestBody = payload(revision, `image-${mime}`, `image-${mime}-15mib`, snapshot(`image-${mime}`, imageData));
    const requestBytes = Buffer.byteLength(JSON.stringify(requestBody));
    const started = Date.now();
    const imagePut = await put(baseA, requestBody);
    const putMs = Date.now() - started;
    const imageJson = await imagePut.json().catch(() => ({}));
    if (imagePut.ok) revision = Number(imageJson.revision || revision);
    const returned = await api(baseB, "/api/shared-state");
    const returnStarted = Date.now();
    const returnedRecord = await returned.json().catch(() => ({}));
    const getParseMs = Date.now() - returnStarted;
    const returnedData = returnedRecord.shared?.data?.[0]?.items?.[0]?.imageData || "";
    record(
      `IMAGE-EXACT-15MIB-${fixture.format}`,
      "A valid exact 15,728,640-byte image is accepted, persisted, and returned byte-for-byte through the second helper",
      {
        fixture,
        requestBytes,
        base64Characters: imageData.length,
        putStatus: imagePut.status,
        putMs,
        getStatus: returned.status,
        getParseMs,
        returnedCharacters: returnedData.length,
        returnedSha256: hashBytes(Buffer.from(returnedData.split(",")[1] || "", "base64")),
        sourceSha256: hashBytes(bytes),
      },
      imagePut.status === 200
        && returned.status === 200
        && returnedData === imageData
        && fixture.bytes === 15_728_640
        ? "PASS"
        : "FAIL",
    );
  }

  const pngFixture = fixtures.find((fixture) => fixture.format === "PNG");
  const pngBytes = await readFile(pngFixture.path);
  const pngData = `data:image/png;base64,${pngBytes.toString("base64")}`;
  const twoImageSnapshot = snapshot("two-valid-max-images", pngData);
  twoImageSnapshot.data[0].items.push({
    ...twoImageSnapshot.data[0].items[0],
    id: "term-qa-2",
    code: "QA-002",
    title: "Second exact 15 MiB image",
    name: "Second exact 15 MiB image",
    imageData: pngData,
  });
  const twoImagePayload = payload(revision, "image-two-max", "two-valid-15mib-images", twoImageSnapshot);
  const twoImageRequestBytes = Buffer.byteLength(JSON.stringify(twoImagePayload));
  let twoImageStatus = 0;
  let twoImageResponse = {};
  try {
    const twoImagePut = await put(baseA, twoImagePayload);
    twoImageStatus = twoImagePut.status;
    twoImageResponse = await twoImagePut.json().catch(() => ({}));
    if (twoImagePut.ok) revision = Number(twoImageResponse.revision || revision);
  } catch (error) {
    twoImageResponse = { transportError: error.message };
  }
  record(
    "IMAGE-TWO-VALID-15MIB",
    "Two individually valid exact 15 MiB images can coexist and the whole authoritative state remains savable",
    {
      requestBytes: twoImageRequestBytes,
      serverMaxBodyBytesFromSource: 35 * 1024 * 1024,
      status: twoImageStatus,
      response: twoImageResponse,
    },
    twoImageStatus === 200 ? "PASS" : "FAIL",
  );

  const lockHolder = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "$p=$env:MECHLEX_QA_LOCK_PATH;$fs=[IO.FileStream]::new($p,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None);[Console]::Out.WriteLine('READY');[Console]::Out.Flush();Start-Sleep -Seconds 60;$fs.Dispose()",
    ],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, MECHLEX_QA_LOCK_PATH: path.join(sharedRoot, ".mechlex-state.lock") },
    },
  );
  children.push(lockHolder);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Lock holder did not become ready")), 5000);
    lockHolder.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("READY")) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  const beforeRecovery = JSON.parse(await readFile(path.join(sharedRoot, "state.json"), "utf8"));
  const recoveryRun = await runProcess(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", path.join(stationA, "core", "recovery-wizard.ps1"),
      "-SharedDataPath", sharedRoot,
    ],
    { cwd: stationA, input: "1\r\ny\r\n" },
  );
  const afterRecovery = JSON.parse(await readFile(path.join(sharedRoot, "state.json"), "utf8"));
  record(
    "RECOVERY-RESPECTS-ACTIVE-LOCK",
    "Recovery refuses to replace state.json while .mechlex-state.lock is exclusively held",
    {
      exitCode: recoveryRun.code,
      beforeRevision: beforeRecovery.revision,
      afterRevision: afterRecovery.revision,
      stdoutTail: recoveryRun.stdout.slice(-2000),
      stderrTail: recoveryRun.stderr.slice(-2000),
    },
    beforeRecovery.revision === afterRecovery.revision ? "PASS" : "FAIL",
  );
  lockHolder.kill();

  const falseSuccess = await runFalseSuccessHarness();
  record(
    "SYNC-NO-FALSE-SUCCESS",
    "No success toast is shown before the shared PUT is durably acknowledged",
    falseSuccess,
    falseSuccess.successShownBeforeFailure ? "FAIL" : "PASS",
  );
} catch (error) {
  record("HARNESS", "Audit harness completes", error.stack || String(error), "FAIL");
} finally {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  const report = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    workspaceRoot,
    evidenceRoot,
    environment: {
      platform: process.platform,
      node: process.version,
      powershell: "Windows PowerShell invoked with -NoProfile",
      stationA: { port: portA, root: stationA },
      stationB: { port: portB, root: stationB },
      sharedRoot,
    },
    sourceHashes,
    summary: {
      pass: results.filter((item) => item.status === "PASS").length,
      fail: results.filter((item) => item.status === "FAIL").length,
      notTested: [
        "Real SMB share with two physical workstations",
        "Power-loss during File.Replace/Flush",
        "Actual Edge 95 runtime and 15 MiB image rendering",
      ],
    },
    results,
    serverLogs,
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ reportPath, workspaceRoot, summary: report.summary }, null, 2));
}
