"use strict";

/* Offline shared-folder synchronization.
   The browser talks only to its own loopback server. The server owns all
   reads/writes to the configured shared folder and enforces revisions. */
(function installMechLexSharedSync() {
  const ML = window.MechLexCore = window.MechLexCore || {};
  const API_STATE = "/api/shared-state";
  const API_HEALTH = "/api/shared-health";
  const POLL_INTERVAL_MS = 1500;
  const CLIENT_ID_KEY = "mechlex_shared_client_id";
  let sharedRevision = 0;
  let syncReady = false;
  let applyingRemote = false;
  let publishQueue = Promise.resolve();
  let conflictActive = false;
  let lastSharedSerialized = "";
  let lastCommittedSnapshot = null;
  let suppressNextSuccessToast = false;

  function clientId() {
    let value = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!value) {
      value = `pc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(CLIENT_ID_KEY, value);
    }
    return value;
  }

  function sharedSnapshot() {
    return {
      data: clone(data),
      settings: clone(settings),
      uiText: clone(settings.uiText || {}),
    };
  }

  function setSyncStatus(kind, text) {
    let badge = document.getElementById("sharedSyncStatus");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "sharedSyncStatus";
      badge.className = "shared-sync-status";
      badge.setAttribute("role", "status");
      badge.setAttribute("aria-live", "polite");
      document.getElementById("saveState")?.insertAdjacentElement("afterend", badge);
    }
    badge.className = `shared-sync-status ${kind}`;
    badge.textContent = text;
    document.documentElement.dataset.sharedSync = kind;
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000); // 30 seconds for 15MB+ payloads
    try {
      return await fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        ...options,
        headers: {
          "Accept": "application/json",
          "X-MechLex-Client": "1",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function applyRemoteRecord(record, reason = "remote-update") {
    if (!record?.shared || !Array.isArray(record.shared.data)) return false;
    applyingRemote = true;
    try {
      data = normalizeData(record.shared.data);
      settings = {
        ...clone(DEFAULT_SETTINGS),
        ...(record.shared.settings || {}),
        appearance: {
          ...clone(DEFAULT_SETTINGS.appearance),
          ...(record.shared.settings?.appearance || {}),
        },
        fields: {
          ...clone(DEFAULT_SETTINGS.fields),
          ...(record.shared.settings?.fields || {}),
        },
        uiText: { ...(record.shared.uiText || record.shared.settings?.uiText || {}) },
      };
      settings.contentPin = String(settings.contentPin || settings.pin || "1234");
      settings.superPin = String(settings.superPin || "9999");
      sharedRevision = Number(record.revision || 0);
      meta.sharedRevision = sharedRevision;
      meta.sharedUpdatedAt = record.updatedAt || "";
      meta.sharedChecksum = record.checksum || "";
      meta.dataSource = "shared-folder";
      repairCatalogIntegrity(data);
      lastCommittedSnapshot = sharedSnapshot();
      lastSharedSerialized = JSON.stringify(lastCommittedSnapshot);
      renderAll();
      if (!document.getElementById("adminOverlay")?.classList.contains("hidden")) renderAdmin();
      ML.persistFullState?.(reason).catch((error) => console.warn("Local mirror update failed", error));
      setSyncStatus("synced", `משותף · גרסה ${sharedRevision}`);
      conflictActive = false;
      return true;
    } finally {
      applyingRemote = false;
    }
  }

  function restoreCommittedSnapshot(reason) {
    if (!lastCommittedSnapshot) return;
    applyingRemote = true;
    try {
      data = normalizeData(lastCommittedSnapshot.data);
      settings = {
        ...clone(DEFAULT_SETTINGS),
        ...clone(lastCommittedSnapshot.settings || {}),
        appearance: {
          ...clone(DEFAULT_SETTINGS.appearance),
          ...clone(lastCommittedSnapshot.settings?.appearance || {}),
        },
        fields: {
          ...clone(DEFAULT_SETTINGS.fields),
          ...clone(lastCommittedSnapshot.settings?.fields || {}),
        },
        uiText: { ...(lastCommittedSnapshot.uiText || {}) },
      };
      repairCatalogIntegrity(data);
      renderAll();
      if (!document.getElementById("adminOverlay")?.classList.contains("hidden")) renderAdmin();
      ML.persistFullState?.(reason).catch((error) => console.warn("Rollback mirror update failed", error));
    } finally {
      applyingRemote = false;
    }
  }

  async function loadLatest({ initializeIfMissing = false } = {}) {
    const response = await request(API_STATE);
    if (response.status === 404 && initializeIfMissing) {
      return publishSharedChange("initial-catalog", 0);
    }
    if (!response.ok) throw new Error(`Shared state read failed (${response.status})`);
    const record = await response.json();
    if (Number(record.revision || 0) > sharedRevision || !syncReady) applyRemoteRecord(record, "shared-startup");
    syncReady = true;
    return record;
  }

  async function publishSharedChange(reason = "content-change", expectedRevision = sharedRevision, snapshot = sharedSnapshot()) {
    setSyncStatus("syncing", "מסנכרן לתיקייה המשותפת…");
    const response = await request(API_STATE, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        expectedRevision,
        clientId: clientId(),
        reason,
        appVersion: APP_VERSION,
        schemaVersion: SCHEMA_VERSION,
        shared: snapshot,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 409) {
      conflictActive = true;
      setSyncStatus("conflict", `התנגשות · קיימת גרסה ${result.currentRevision ?? "חדשה"}`);
      toast("השינוי לא פורסם: מחשב אחר שמר קודם. רענן את הדף, בדוק את השינוי ונסה שוב.", "error");
      throw new Error("Shared revision conflict");
    }
    if (!response.ok) throw new Error(result.message || `Shared state write failed (${response.status})`);
    sharedRevision = Number(result.revision || expectedRevision + 1);
    meta.sharedRevision = sharedRevision;
    meta.sharedUpdatedAt = result.updatedAt || new Date().toISOString();
    meta.sharedChecksum = result.checksum || "";
    syncReady = true;
    conflictActive = false;
    lastCommittedSnapshot = clone(snapshot);
    lastSharedSerialized = JSON.stringify(lastCommittedSnapshot);
    setSyncStatus("synced", `משותף · גרסה ${sharedRevision}`);
    return result;
  }

  function queuePublish(reason, snapshot) {
    publishQueue = publishQueue
      .catch(() => undefined)
      .then(() => publishSharedChange(reason, sharedRevision, snapshot))
      .catch((error) => {
        if (JSON.stringify(sharedSnapshot()) === JSON.stringify(snapshot)) {
          restoreCommittedSnapshot(error.message === "Shared revision conflict" ? "shared-conflict-rollback" : "shared-failure-rollback");
        }
        if (error.message !== "Shared revision conflict") {
          syncReady = false;
          setSyncStatus("offline", "התיקייה המשותפת אינה זמינה · קריאה בלבד");
          toast("השמירה המשותפת נכשלה ולכן שינוי התוכן בוטל. המערכת עברה למצב קריאה בלבד.", "error");
        }
        return null;
      });
    return publishQueue;
  }

  async function pollSharedState() {
    if (conflictActive || applyingRemote) return;
    try {
      const response = await request(`${API_STATE}?knownRevision=${sharedRevision}`);
      if (response.status === 304) {
        syncReady = true;
        setSyncStatus("synced", `משותף · גרסה ${sharedRevision}`);
        return;
      }
      if (!response.ok) throw new Error(`Polling failed (${response.status})`);
      const record = await response.json();
      if (Number(record.revision || 0) > sharedRevision) {
        applyRemoteRecord(record, "shared-poll");
        toast("שינויים ממחשב אחר נטענו", "success");
      }
    } catch {
      syncReady = false;
      setSyncStatus("offline", "התיקייה המשותפת אינה זמינה · קריאה בלבד");
    }
  }

  async function initializeSharedSync() {
    if (window.location.protocol === "file:") {
      setSyncStatus("offline", "סנכרון משותף דורש הפעלה דרך START_MECHLEX");
      return;
    }
    setSyncStatus("syncing", "מתחבר לתיקייה המשותפת…");
    try {
      await ML.persistenceInitPromise;
      const health = await request(API_HEALTH);
      if (!health.ok) throw new Error("Shared service is unavailable");
      const healthInfo = await health.json();
      if (healthInfo.stateExists) await loadLatest();
      else await publishSharedChange("initial-catalog", 0);
      lastSharedSerialized = JSON.stringify(sharedSnapshot());
      window.setInterval(pollSharedState, POLL_INTERVAL_MS);
    } catch (error) {
      console.warn("MechLex shared sync initialization unavailable", error);
      setSyncStatus("offline", "התיקייה המשותפת אינה זמינה · קריאה בלבד");
      toast("לא ניתן להתחבר למקור המידע המשותף. לא ניתן לפרסם שינויי תוכן עד שהחיבור יחזור.", "error");
    }
  }

  const baseSaveAll = saveAll;
  saveAll = function sharedAwareSaveAll(message, options = {}) {
    const snapshot = sharedSnapshot();
    const serialized = JSON.stringify(snapshot);
    const sharedChanged = serialized !== lastSharedSerialized;
    if (!syncReady && !lastCommittedSnapshot && !applyingRemote) {
      // Disconnected before first sync - fail closed
      toast("התיקייה המשותפת אינה זמינה, לא ניתן לשמור שינויים.", "error");
      return;
    }
    if (sharedChanged && (!syncReady || conflictActive) && !applyingRemote) {
      restoreCommittedSnapshot("shared-read-only-rollback");
      suppressNextSuccessToast = true;
      toast("מקור המידע המשותף אינו זמין כרגע ולכן שינוי התוכן בוטל.", "error");
      return baseSaveAll("מצב קריאה בלבד · השינוי לא נשמר", options);
    }
    const result = baseSaveAll(message, options);
    if (sharedChanged && !applyingRemote) {
      queuePublish(options.sharedReason || "admin-change", snapshot);
    }
    return result;
  };

  const baseToast = toast;
  toast = function sharedAwareToast(message, type = "") {
    if (suppressNextSuccessToast && type === "success") {
      suppressNextSuccessToast = false;
      return;
    }
    return baseToast(message, type);
  };

  const baseInit = init;
  init = function sharedAwareInit() {
    baseInit();
    initializeSharedSync();
  };

  ML.sharedSync = {
    loadLatest,
    publishSharedChange,
    pollSharedState,
    revision: () => sharedRevision,
    ready: () => syncReady,
    conflict: () => conflictActive,
  };
}());
