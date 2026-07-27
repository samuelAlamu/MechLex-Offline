import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.argv[2] || process.cwd());
const reportPath = path.join(root, "qa", "evidence", "logs", "static-audit.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const requiredRuntime = [
  "index.html",
  "app.js",
  "style.css",
  "START_MECHLEX.bat",
  "SHARED_DATA_PATH.txt",
  "core/boot.js",
  "core/integrity.js",
  "core/persistence.js",
  "core/shared-sync.js",
  "core/inline-editor.js",
  "core/start-local-server.ps1",
  "data/mechlex-data.js",
  "images/catalog.js",
  "backups/content-backup-initial.json",
  "backups/full-admin-backup-initial.json",
];
const missingRuntime = requiredRuntime.filter((file) => !fs.existsSync(path.join(root, file)));

const documentedQaAssets = ["package.json", "tests", "MANIFEST_SHA256.txt"];
const missingDocumentedQaAssets = documentedQaAssets.filter((file) => !fs.existsSync(path.join(root, file)));

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "data", "mechlex-data.js"), "utf8"), sandbox);
const catalog = sandbox.window.MECHLEX_SHARED_DATA;
const terms = catalog.flatMap((domain) => domain.items || []);
const duplicateValues = (values) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

const backups = ["content-backup-initial.json", "full-admin-backup-initial.json"].map((name) => {
  const file = path.join(root, "backups", name);
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  return {
    name,
    format: payload.format,
    appVersion: payload.appVersion,
    schemaVersion: payload.schemaVersion ?? null,
    domains: Array.isArray(payload.data) ? payload.data.length : null,
    terms: Array.isArray(payload.data) ? payload.data.reduce((sum, domain) => sum + (domain.items || []).length, 0) : null,
    hasIntegrity: Boolean(payload.integrity?.digest),
  };
});

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const expectedScriptOrder = [
  "data/mechlex-data.js",
  "images/catalog.js",
  "app.js",
  "core/integrity.js",
  "core/persistence.js",
  "core/shared-sync.js",
  "core/inline-editor.js",
  "core/boot.js",
];
const observedScriptOrder = [...index.matchAll(/<script\s+src="([^"?]+)(?:\?[^"]*)?"/g)].map((match) => match[1]);

const runtimeFiles = [
  "index.html", "app.js", "style.css",
  "core/boot.js", "core/integrity.js", "core/persistence.js", "core/shared-sync.js", "core/inline-editor.js", "core/start-local-server.ps1",
  "data/mechlex-data.js", "images/catalog.js",
];
const urls = [];
for (const relative of runtimeFiles) {
  const text = fs.readFileSync(path.join(root, relative), "utf8");
  for (const match of text.matchAll(/https?:\/\/[^\s"'`)<>]+/gi)) {
    urls.push({ file: relative, value: match[0] });
  }
}
const activeExternalCandidates = urls.filter((item) => !item.value.startsWith("http://127.0.0.1") && !item.value.startsWith("http://localhost") && !item.value.startsWith("http://www.w3.org/2000/svg"));

const versionText = fs.readFileSync(path.join(root, "VERSION.txt"), "utf8");
const version = versionText.match(/^Version:\s*(.+)$/m)?.[1]?.trim() || "";
const appVersion = fs.readFileSync(path.join(root, "app.js"), "utf8").match(/const APP_VERSION = "([^"]+)"/)?.[1] || "";
const indexVersion = index.match(/MechLex\s+(\d+\.\d+\.\d+)\s+·/)?.[1] || "";
const changelogVersion = fs.readFileSync(path.join(root, "CHANGELOG_HE.txt"), "utf8").match(/^(\d+\.\d+\.\d+)\s+—/m)?.[1] || "";
const installVersion = fs.readFileSync(path.join(root, "הוראות_התקנה.txt"), "utf8").match(/MechLex\s+(\d+\.\d+\.\d+)/)?.[1] || "";

const report = {
  generatedAt: new Date().toISOString(),
  runtimeFiles: { expected: requiredRuntime.length, missing: missingRuntime },
  missingDocumentedQaAssets,
  catalog: {
    domains: catalog.length,
    terms: terms.length,
    duplicateIds: duplicateValues(terms.map((term) => term.id)),
    duplicateCodes: duplicateValues(terms.map((term) => term.code)),
  },
  backups,
  scriptOrder: {
    expected: expectedScriptOrder,
    observed: observedScriptOrder,
    matches: JSON.stringify(expectedScriptOrder) === JSON.stringify(observedScriptOrder),
  },
  versions: { version, appVersion, indexVersion, changelogVersion, installVersion, consistent: new Set([version, appVersion, indexVersion, changelogVersion, installVersion]).size === 1 },
  urls,
  activeExternalCandidates,
  results: [
    { id: "STATIC-RUNTIME", status: missingRuntime.length ? "FAIL" : "PASS", missingRuntime },
    { id: "STATIC-QA-ASSETS", status: missingDocumentedQaAssets.length ? "FAIL" : "PASS", missingDocumentedQaAssets },
    { id: "CNT-INTEGRITY", status: terms.length && !duplicateValues(terms.map((term) => term.id)).length && !duplicateValues(terms.map((term) => term.code)).length ? "PASS" : "FAIL" },
    { id: "REC-BACKUP-BASELINE", status: backups.every((item) => item.hasIntegrity) ? "PASS" : "FAIL", backups },
    { id: "STATIC-SCRIPT-ORDER", status: JSON.stringify(expectedScriptOrder) === JSON.stringify(observedScriptOrder) ? "PASS" : "FAIL" },
    { id: "STATIC-VERSIONS", status: new Set([version, appVersion, indexVersion, changelogVersion, installVersion]).size === 1 ? "PASS" : "FAIL" },
    { id: "OFF-002-STATIC", status: activeExternalCandidates.length ? "FAIL" : "PASS", activeExternalCandidates },
  ],
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ reportPath, results: report.results }));
