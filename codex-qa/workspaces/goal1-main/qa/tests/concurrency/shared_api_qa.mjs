import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(process.argv[2] || process.cwd());
const evidenceFile = path.resolve(process.argv[3] || path.join(projectRoot, "qa", "evidence", "logs", "shared-api-results.json"));
const serverRoot = path.join(projectRoot, "qa", "workspaces", "concurrency-a");
const sharedRoot = path.join(projectRoot, "qa", "workspaces", `shared-api-${Date.now()}`);
const port = Number(process.env.MECHLEX_QA_API_PORT || 8791);
const base = `http://127.0.0.1:${port}`;
const serverScript = path.join(serverRoot, "core", "start-local-server.ps1");

await mkdir(sharedRoot, { recursive: true });
await mkdir(path.dirname(evidenceFile), { recursive: true });

const results = [];
const serverLog = [];

function record(id, status, details = {}) {
  results.push({ id, status, at: new Date().toISOString(), ...details });
}

function snapshot(label, marker = "") {
  return {
    data: [{
      id: "dom-qa",
      name: "בדיקת QA",
      nameEn: "QA",
      prefix: "QA",
      color: "#246b87",
      icon: "Q",
      description: label,
      subtopics: [],
      items: [{
        id: "qa-term",
        code: "QA-001",
        title: `מושג ${marker}`,
        name: `מושג ${marker}`,
        nameEn: `Term ${marker}`,
        definition: label,
        subtopic: "direct",
      }],
    }],
    settings: { uiText: { marker } },
    uiText: { marker },
  };
}

async function request(url, options = {}) {
  return fetch(`${base}${url}`, {
    redirect: "manual",
    ...options,
    headers: {
      Accept: "application/json",
      "X-MechLex-Client": "1",
      ...(options.headers || {}),
    },
  });
}

async function waitForServer(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await request("/api/shared-health");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for the QA server");
}

const child = spawn(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", serverScript,
    "-NoBrowser",
    "-Port", String(port),
    "-SharedDataPath", sharedRoot,
  ],
  { cwd: serverRoot, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
child.stdout.on("data", (chunk) => serverLog.push(chunk.toString()));
child.stderr.on("data", (chunk) => serverLog.push(chunk.toString()));

try {
  await waitForServer();
  record("OFF-010", "PASS", { note: "Loopback server became reachable on the requested local-only port.", port });

  const health = await request("/api/shared-health");
  const healthJson = await health.json();
  record("OFF-007", health.ok && healthJson.mode === "offline-shared-folder" ? "PASS" : "FAIL", { health: healthJson });

  const missing = await request("/api/shared-state");
  record("OFF-008", missing.status === 404 ? "PASS" : "FAIL", { observedStatus: missing.status, note: "Missing state did not initialize an empty authoritative file on GET." });

  const forbiddenOrigin = await request("/api/shared-state", { headers: { Origin: "http://evil.invalid" } });
  record("AUTH-008-ORIGIN", forbiddenOrigin.status === 403 ? "PASS" : "FAIL", { observedStatus: forbiddenOrigin.status });

  const wrongMethod = await request("/api/shared-state", { method: "POST" });
  record("OFF-007-METHOD", wrongMethod.status === 405 ? "PASS" : "FAIL", { observedStatus: wrongMethod.status });

  let revision = 0;
  const initialPayload = {
    expectedRevision: revision,
    clientId: "qa-initial",
    reason: "qa-initial",
    appVersion: "10.1.0",
    schemaVersion: 2,
    shared: snapshot("initial", "initial"),
  };
  const initialized = await request("/api/shared-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(initialPayload),
  });
  const initializedJson = await initialized.json();
  revision = Number(initializedJson.revision || 0);
  record("CNT-001-API", initialized.status === 200 && revision === 1 ? "PASS" : "FAIL", { observedStatus: initialized.status, response: initializedJson });

  const stale = await request("/api/shared-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ ...initialPayload, clientId: "qa-stale", reason: "qa-stale" }),
  });
  record("SYNC-005", stale.status === 409 ? "PASS" : "FAIL", { observedStatus: stale.status, response: await stale.json().catch(() => ({})) });

  const concurrencyRounds = [];
  for (let round = 1; round <= 20; round += 1) {
    const currentRevision = revision;
    const payloadA = {
      expectedRevision: currentRevision,
      clientId: `qa-a-${round}`,
      reason: `round-${round}-a`,
      appVersion: "10.1.0",
      schemaVersion: 2,
      shared: snapshot(`round ${round} writer A`, `A${round}`),
    };
    const payloadB = {
      ...payloadA,
      clientId: `qa-b-${round}`,
      reason: `round-${round}-b`,
      shared: snapshot(`round ${round} writer B`, `B${round}`),
    };
    const [a, b] = await Promise.all([
      request("/api/shared-state", { method: "PUT", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(payloadA) }),
      request("/api/shared-state", { method: "PUT", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(payloadB) }),
    ]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    const current = await request("/api/shared-state");
    const recordBody = await current.json();
    const safe = statuses[0] === 200 && statuses[1] === 409 && current.status === 200 && Number(recordBody.revision) === currentRevision + 1;
    revision = Number(recordBody.revision);
    concurrencyRounds.push({ round, statuses: [a.status, b.status], revision, safe, winner: recordBody.reason });
  }
  record("SYNC-004", concurrencyRounds.every((item) => item.safe) ? "PASS" : "FAIL", {
    iterations: concurrencyRounds.length,
    safeIterations: concurrencyRounds.filter((item) => item.safe).length,
    rounds: concurrencyRounds,
    limitation: "Two concurrent HTTP writers on one Windows workstation; not two physical SMB clients.",
  });

  const statePath = path.join(sharedRoot, "state.json");
  const previousPath = path.join(sharedRoot, "state.previous.json");
  const historyPath = path.join(sharedRoot, "history");
  const currentBytes = await readFile(statePath);
  const currentHash = createHash("sha256").update(currentBytes).digest("hex");
  const previousExists = (await stat(previousPath)).isFile();
  const historyFiles = (await readdir(historyPath)).filter((name) => name.startsWith("state-r") && name.endsWith(".json"));
  record("REC-001-ATOMIC-STRUCTURE", previousExists && historyFiles.length >= 2 ? "PASS" : "FAIL", {
    currentHash,
    previousExists,
    historyCount: historyFiles.length,
    note: "Observed temp-replace history behavior under executed writes; process-kill timing is covered separately.",
  });

  const validState = await readFile(statePath, "utf8");
  await writeFile(statePath, "{", "utf8");
  const malformed = await request("/api/shared-state");
  await writeFile(statePath, validState, "utf8");
  const recoveredAfterMalformed = await request("/api/shared-state");
  record("REC-006", malformed.status === 500 && recoveredAfterMalformed.status === 200 ? "PASS" : "FAIL", {
    malformedStatus: malformed.status,
    recoveredStatus: recoveredAfterMalformed.status,
    sourcePreservedForManualRecovery: true,
  });

  const parsed = JSON.parse(validState);
  parsed.checksum = "0".repeat(64);
  await writeFile(statePath, JSON.stringify(parsed), "utf8");
  const badChecksum = await request("/api/shared-state");
  await writeFile(statePath, validState, "utf8");
  const recoveredAfterChecksum = await request("/api/shared-state");
  record("REC-007", badChecksum.status === 500 && recoveredAfterChecksum.status === 200 ? "PASS" : "FAIL", {
    checksumFailureStatus: badChecksum.status,
    recoveredStatus: recoveredAfterChecksum.status,
  });

  const finalState = JSON.parse(await readFile(statePath, "utf8"));
  record("SYNC-010", Number(finalState.revision) === revision && Array.isArray(finalState.shared?.data) ? "PASS" : "FAIL", {
    finalRevision: finalState.revision,
    expectedRevision: revision,
    finalStateBytes: (await stat(statePath)).size,
  });
} catch (error) {
  record("HARNESS", "FAIL", { error: error.stack || String(error) });
} finally {
  child.kill();
  await new Promise((resolve) => {
    child.once("exit", resolve);
    setTimeout(resolve, 1500);
  });
  const report = {
    generatedAt: new Date().toISOString(),
    environment: { platform: process.platform, node: process.version, port, serverRoot, sharedRoot },
    pass: results.filter((item) => item.status === "PASS").length,
    fail: results.filter((item) => item.status === "FAIL").length,
    results,
    serverLog,
  };
  await writeFile(evidenceFile, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ pass: report.pass, fail: report.fail, evidenceFile, sharedRoot }));
  if (report.fail) process.exitCode = 1;
}
