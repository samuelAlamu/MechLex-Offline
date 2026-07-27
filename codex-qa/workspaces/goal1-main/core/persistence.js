"use strict";

/* MechLex 10.1 persistence layer
   IndexedDB is the primary full-state store. LocalStorage remains a lightweight
   synchronous bootstrap mirror so older installations migrate without data loss. */
(function installMechLexPersistence() {
  const ML = window.MechLexCore = window.MechLexCore || {};
  const DB_NAME = "mechlex_offline_v95";
  const DB_VERSION = 1;
  const STATE_STORE = "state";
  const SNAPSHOT_STORE = "snapshots";
  const DRAFT_STORE = "drafts";
  const MAIN_STATE_ID = "main";
  const MAX_RESTORE_POINTS = 10;
  const FILE_OFFLINE_MODE = window.location.protocol === "file:";
  const LOCAL_RESTORE_KEY = "mechlex_v95_local_restore_points";
  const LOCAL_DRAFT_PREFIX = "mechlex_v95_draft_";

  let dbPromise = null;
  let database = null;
  let persistenceMode = "localStorage";
  let persistenceReady = false;
  let saveQueue = Promise.resolve();
  let estimateTimer = null;

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("פעולת האחסון נכשלה"));
    });
  }

  function openDatabase() {
    if (FILE_OFFLINE_MODE) return Promise.reject(new Error("IndexedDB מושבת במצב file:// לצורך תאימות ויציבות"));
    if (dbPromise) return dbPromise;
    if (!window.indexedDB) return Promise.reject(new Error("IndexedDB אינו זמין בדפדפן זה"));
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE, { keyPath: "type" });
      };
      request.onsuccess = () => {
        database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(request.error || new Error("פתיחת IndexedDB נכשלה"));
      request.onblocked = () => console.warn("MechLex IndexedDB upgrade is blocked by another open tab");
    });
    return dbPromise;
  }

  async function getRecord(storeName, key) {
    const db = await openDatabase();
    return requestPromise(db.transaction(storeName, "readonly").objectStore(storeName).get(key));
  }

  async function getAllRecords(storeName) {
    const db = await openDatabase();
    const store = db.transaction(storeName, "readonly").objectStore(storeName);
    if (typeof store.getAll === "function") return requestPromise(store.getAll());
    return new Promise((resolve, reject) => {
      const items = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve(items);
        items.push(cursor.value);
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error("קריאת האחסון נכשלה"));
    });
  }

  async function putRecord(storeName, value) {
    const db = await openDatabase();
    return requestPromise(db.transaction(storeName, "readwrite").objectStore(storeName).put(value));
  }

  async function deleteRecord(storeName, key) {
    const db = await openDatabase();
    return requestPromise(db.transaction(storeName, "readwrite").objectStore(storeName).delete(key));
  }

  function currentStateSnapshot() {
    return {
      id: MAIN_STATE_ID,
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      savedAt: new Date().toISOString(),
      data: clone(data),
      prefs: clone(prefs),
      settings: clone(settings),
      meta: clone(meta),
    };
  }

  function bootstrapCatalog() {
    return data.map((domain) => ({
      ...clone(domain),
      items: domain.items.map((term) => ({
        ...clone(term),
        imageData: "",
        embeddedImageStoredInIndexedDB: Boolean(term.imageData),
      })),
    }));
  }

  function writeBootstrapMirror() {
    try {
      window.localStorage.setItem(KEYS.data, JSON.stringify(persistenceMode === "indexedDB" ? bootstrapCatalog() : data));
      window.localStorage.setItem(KEYS.prefs, JSON.stringify(prefs));
      window.localStorage.setItem(KEYS.settings, JSON.stringify(settings));
      window.localStorage.setItem(KEYS.meta, JSON.stringify(meta));
      return true;
    } catch (error) {
      console.warn("MechLex bootstrap mirror could not be written", error);
      return false;
    }
  }

  function snapshotIsAtLeastAsNew(candidate) {
    if (!candidate || !Array.isArray(candidate.data)) return false;
    const candidateRevision = Number(candidate.meta?.dataRevision || 0);
    const localRevision = Number(meta.dataRevision || 0);
    if (candidateRevision !== localRevision) return candidateRevision > localRevision;
    const candidateTime = Date.parse(candidate.meta?.lastSavedAt || candidate.savedAt || 0) || 0;
    const localTime = Date.parse(meta.lastSavedAt || 0) || 0;
    return candidateTime >= localTime;
  }

  function hydrateState(snapshot) {
    data = normalizeData(snapshot.data || []);
    prefs = { ...clone(DEFAULT_PREFS), ...(snapshot.prefs || {}), progress: snapshot.prefs?.progress || {} };
    prefs.favorites = unique(prefs.favorites || []);
    prefs.recent = unique(prefs.recent || []).slice(0, 20);
    settings = {
      ...clone(DEFAULT_SETTINGS),
      ...(snapshot.settings || {}),
      appearance: { ...clone(DEFAULT_SETTINGS.appearance), ...(snapshot.settings?.appearance || snapshot.settings?.design || {}) },
      fields: { ...clone(DEFAULT_SETTINGS.fields), ...(snapshot.settings?.fields || {}) },
    };
    settings.contentPin = String(settings.contentPin || settings.pin || "1234");
    settings.superPin = String(settings.superPin || "9999");
    meta = { ...clone(DEFAULT_META), ...(snapshot.meta || {}), appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION };
  }

  async function persistFullState(reason = "save") {
    const snapshot = currentStateSnapshot();
    snapshot.reason = reason;
    await putRecord(STATE_STORE, snapshot);
    persistenceMode = "indexedDB";
    persistenceReady = true;
    storageIsPersistent = true;
    meta.storageMode = "indexedDB";
    meta.lastIndexedDbSaveAt = snapshot.savedAt;
    writeBootstrapMirror();
    return snapshot;
  }

  function queueFullStateSave(reason) {
    saveQueue = saveQueue
      .catch(() => undefined)
      .then(() => persistFullState(reason))
      .catch((error) => {
        console.error("MechLex IndexedDB save failed", error);
        persistenceReady = false;
        persistenceMode = "localStorage";
        meta.storageMode = "localStorage-fallback";
        updateStorageStatus();
        throw error;
      });
    return saveQueue;
  }

  function updateSaveMeta(options = {}) {
    const now = new Date().toISOString();
    meta.appVersion = APP_VERSION;
    meta.schemaVersion = SCHEMA_VERSION;
    meta.lastSavedAt = now;
    if (options.backupRelevant) {
      meta.dataRevision = Number(meta.dataRevision || 0) + 1;
      meta.lastContentChangeAt = now;
      meta.backupNeeded = true;
      if (options.backupRelevant === "system") meta.systemBackupNeeded = true;
      else {
        meta.contentBackupNeeded = true;
        meta.systemBackupNeeded = true;
      }
    }
    if (options.contentBackupCompleted) {
      meta.lastContentBackupAt = now;
      meta.lastContentExportRequestedAt = now;
      meta.contentBackupNeeded = false;
      meta.backupNeeded = Boolean(meta.systemBackupNeeded);
    }
    if (options.backupCompleted || options.fullBackupCompleted) {
      meta.lastBackupAt = now;
      meta.lastContentBackupAt = now;
      meta.lastSystemBackupAt = now;
      meta.lastFullExportRequestedAt = now;
      meta.backupNeeded = false;
      meta.contentBackupNeeded = false;
      meta.systemBackupNeeded = false;
    }
  }

  saveAll = function enhancedSaveAll(message = "נשמר אוטומטית במחשב זה", options = {}) {
    clearTimeout(saveTimer);
    repairCatalogIntegrity(data);
    updateSaveMeta(options);
    const saveState = $("saveState");
    if (saveState) {
      saveState.textContent = persistenceMode === "indexedDB" ? "שומר ב־IndexedDB…" : "שומר שינויים…";
      saveState.className = "save-state saving";
    }

    let mirrorOkay = writeBootstrapMirror();
    if (FILE_OFFLINE_MODE || !window.indexedDB) {
      try {
        window.localStorage.setItem(KEYS.data, JSON.stringify(data));
        mirrorOkay = true;
        storageIsPersistent = true;
      } catch (error) {
        storageIsPersistent = false;
        console.error("MechLex LocalStorage fallback failed", error);
        message = "האחסון המקומי מלא או חסום · הורד גיבוי מלא עכשיו";
      }
    } else {
      queueFullStateSave(options.backupRelevant ? "content-change" : "state-save").catch(() => {
        message = "שמירת IndexedDB נכשלה · הורד גיבוי מלא עכשיו";
      });
    }

    if (!mirrorOkay && persistenceMode !== "indexedDB") storageIsPersistent = false;
    updateBackupStatus();
    scheduleStorageStatusRefresh();
    saveTimer = setTimeout(() => {
      if (!saveState) return;
      const durable = persistenceMode === "indexedDB" ? "נשמר ב־IndexedDB" : message;
      saveState.textContent = storageIsPersistent ? durable : "השמירה הקבועה אינה זמינה · הורד גיבוי";
      saveState.className = `save-state ${storageIsPersistent ? "saved" : "storage-error"}`;
    }, 420);
    return storageIsPersistent;
  };

  async function initializePersistence() {
    if (FILE_OFFLINE_MODE) {
      persistenceMode = "localStorage";
      persistenceReady = true;
      storageIsPersistent = true;
      meta.storageMode = "file-localStorage";
      meta.persistentStorageGranted = false;
      writeBootstrapMirror();
      updateStorageStatus();
      await updateRestorePointStatus();
      if (typeof ML.maybeRestoreDrafts === "function") ML.maybeRestoreDrafts();
      return;
    }
    try {
      const existing = await getRecord(STATE_STORE, MAIN_STATE_ID);
      if (snapshotIsAtLeastAsNew(existing)) {
        hydrateState(existing);
        if (typeof ML.repairCatalogIntegrity === "function") ML.repairCatalogIntegrity({ silent: true });
        clearTermForm();
        clearDomainForm();
        renderAll();
        if (!$("adminOverlay")?.classList.contains("hidden")) renderAdmin();
      }
      persistenceMode = "indexedDB";
      persistenceReady = true;
      storageIsPersistent = true;
      meta.storageMode = "indexedDB";
      if (!meta.migratedToIndexedDBAt) meta.migratedToIndexedDBAt = new Date().toISOString();
      await persistFullState(existing ? "startup-sync" : "localStorage-migration");
      if (navigator.storage?.persisted) meta.persistentStorageGranted = await navigator.storage.persisted();
      updateStorageStatus();
      await updateRestorePointStatus();
      if (typeof ML.maybeRestoreDrafts === "function") ML.maybeRestoreDrafts();
    } catch (error) {
      console.error("MechLex IndexedDB initialization failed", error);
      persistenceMode = "localStorage";
      persistenceReady = false;
      meta.storageMode = "localStorage-fallback";
      updateStorageStatus(error);
      toast("IndexedDB אינו זמין; המערכת פועלת במצב LocalStorage מוגבל", "error");
    }
  }

  function byteLabel(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  }

  async function updateStorageStatus(error = null) {
    const status = $("storageStatus");
    const badge = $("storageModeBadge");
    const fill = $("storageMeterFill");
    if (!status || !badge || !fill) return;
    try {
      let usage = new Blob([JSON.stringify(currentStateSnapshot())]).size;
      let quota = persistenceMode === "indexedDB" ? 0 : 5 * 1024 * 1024;
      if (!FILE_OFFLINE_MODE && navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        usage = Number(estimate.usage || usage);
        quota = Number(estimate.quota || quota);
      }
      const percent = quota ? Math.min(100, (usage / quota) * 100) : 0;
      const persistent = Boolean(meta.persistentStorageGranted);
      const localFile = FILE_OFFLINE_MODE;
      badge.textContent = persistenceMode === "indexedDB" ? "IndexedDB פעיל" : (localFile ? "Offline מקומי פעיל" : "LocalStorage מוגבל");
      badge.className = `health-badge ${persistenceMode === "indexedDB" || localFile ? "good" : "warning"}`;
      status.innerHTML = `<strong>${persistenceMode === "indexedDB" ? "האחסון המלא פעיל וניתן להרחבה" : (localFile ? "מצב Offline מקומי פעיל — ללא קריאות רשת וללא IndexedDB" : "מצב אחסון מוגבל — מומלץ לגבות לעיתים קרובות")}</strong>
        <span>נפח משוער: ${esc(byteLabel(usage))}${quota ? ` מתוך ${esc(byteLabel(quota))} (${percent.toFixed(1)}%)` : ""}</span>
        <span>הגנה ממחיקה אוטומטית: ${persistent ? "אושרה בדפדפן" : "לא אושרה או אינה נתמכת"}${error ? ` · ${esc(error.message || String(error))}` : ""}</span>`;
      fill.style.width = `${Math.max(1, percent)}%`;
      fill.classList.toggle("warning", percent >= 75);
    } catch (statusError) {
      badge.textContent = "לא ניתן למדוד";
      badge.className = "health-badge warning";
      status.innerHTML = `<strong>לא ניתן לקבל נתוני נפח מהדפדפן</strong><span>${esc(statusError.message)}</span>`;
    }
  }

  function scheduleStorageStatusRefresh() {
    clearTimeout(estimateTimer);
    estimateTimer = setTimeout(() => updateStorageStatus(), 650);
  }

  async function requestPersistentStorage() {
    if (FILE_OFFLINE_MODE) return toast("בפתיחה מקובץ מקומי אין צורך בבקשת אחסון מתמשך. השתמש בגיבויי JSON כרגיל.", "success");
    if (!navigator.storage?.persist) return toast("הדפדפן אינו תומך בבקשת אחסון מתמשך", "error");
    try {
      meta.persistentStorageGranted = await navigator.storage.persist();
      saveAll(meta.persistentStorageGranted ? "הדפדפן אישר אחסון מתמשך" : "הדפדפן לא אישר אחסון מתמשך");
      updateStorageStatus();
      toast(meta.persistentStorageGranted ? "האחסון המקומי הוגן ככל שהדפדפן מאפשר" : "הבקשה לא אושרה; המשך להשתמש בגיבויי JSON", meta.persistentStorageGranted ? "success" : "error");
    } catch (error) {
      toast(`בקשת האחסון נכשלה: ${error.message}`, "error");
    }
  }

  function readLocalRestorePoints() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(LOCAL_RESTORE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function writeLocalRestorePoints(items) {
    window.localStorage.setItem(LOCAL_RESTORE_KEY, JSON.stringify(items.slice(0, MAX_RESTORE_POINTS)));
  }

  async function createRestorePoint(reason = "נקודת שחזור ידנית") {
    try {
      const now = new Date().toISOString();
      const restorePoint = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: now,
        reason,
        snapshot: currentStateSnapshot(),
      };
      if (FILE_OFFLINE_MODE) {
        const all = [restorePoint, ...readLocalRestorePoints()]
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .slice(0, MAX_RESTORE_POINTS);
        writeLocalRestorePoints(all);
      } else {
        await putRecord(SNAPSHOT_STORE, restorePoint);
        const all = (await getAllRecords(SNAPSHOT_STORE)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        await Promise.all(all.slice(MAX_RESTORE_POINTS).map((item) => deleteRecord(SNAPSHOT_STORE, item.id)));
      }
      meta.lastRestorePointAt = now;
      meta.lastRestorePointReason = reason;
      writeBootstrapMirror();
      updateRestorePointStatus();
      return restorePoint;
    } catch (error) {
      console.warn("Could not create restore point", error);
      try {
        window.localStorage.setItem("mechlex_v95_emergency_restore", JSON.stringify({ createdAt: new Date().toISOString(), reason, snapshot: currentStateSnapshot() }));
      } catch {}
      return null;
    }
  }

  async function latestRestorePoint() {
    if (FILE_OFFLINE_MODE) return readLocalRestorePoints().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
    const items = (await getAllRecords(SNAPSHOT_STORE)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return items[0] || null;
  }

  async function updateRestorePointStatus() {
    const target = $("restorePointStatus");
    if (!target) return;
    try {
      const latest = await latestRestorePoint();
      if (!latest) {
        target.innerHTML = "<span>טרם נוצרה נקודת שחזור מקומית.</span>";
        return;
      }
      target.innerHTML = `<strong>נקודת השחזור האחרונה</strong><span>${esc(formatDate(latest.createdAt))} · ${esc(latest.reason)}</span>`;
    } catch {
      target.innerHTML = "<span>לא ניתן לקרוא נקודות שחזור כרגע.</span>";
    }
  }

  async function restoreLatestSnapshot() {
    try {
      const restorePoint = await latestRestorePoint();
      if (!restorePoint) return toast("אין נקודת שחזור זמינה", "error");
      if (!confirm(`לשחזר את המצב שנשמר ב-${formatDate(restorePoint.createdAt)}?\nסיבה: ${restorePoint.reason}\nהמצב הנוכחי יישמר תחילה כנקודת שחזור נוספת.`)) return;
      await createRestorePoint("לפני שחזור נקודת שחזור קודמת");
      hydrateState(restorePoint.snapshot);
      if (typeof ML.repairCatalogIntegrity === "function") ML.repairCatalogIntegrity({ silent: true });
      saveAll("נקודת השחזור נטענה", { backupRelevant: true });
      if (typeof ML.markAllFormsClean === "function") ML.markAllFormsClean();
      clearTermForm();
      clearDomainForm();
      renderAdmin();
      renderAll();
      toast("נקודת השחזור נטענה בהצלחה", "success");
    } catch (error) {
      toast(`השחזור נכשל: ${error.message}`, "error");
    }
  }

  async function saveDraft(type, payload) {
    try {
      const record = { type, updatedAt: new Date().toISOString(), payload };
      if (FILE_OFFLINE_MODE) window.localStorage.setItem(`${LOCAL_DRAFT_PREFIX}${type}`, JSON.stringify(record));
      else await putRecord(DRAFT_STORE, record);
    } catch (error) { console.warn("Draft save failed", error); }
  }
  async function loadDraft(type) {
    try {
      if (FILE_OFFLINE_MODE) return JSON.parse(window.localStorage.getItem(`${LOCAL_DRAFT_PREFIX}${type}`) || "null");
      return await getRecord(DRAFT_STORE, type);
    } catch { return null; }
  }
  async function deleteDraft(type) {
    try {
      if (FILE_OFFLINE_MODE) window.localStorage.removeItem(`${LOCAL_DRAFT_PREFIX}${type}`);
      else await deleteRecord(DRAFT_STORE, type);
    } catch {}
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  function fallbackDigest(text) {
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      h1 ^= code; h1 = Math.imul(h1, 0x01000193);
      h2 ^= code + index; h2 = Math.imul(h2, 0x85ebca6b);
    }
    const hex = (value) => (value >>> 0).toString(16).padStart(8, "0");
    return `${hex(h1)}${hex(h2)}`;
  }

  async function computeDigest(text, preferred = "SHA-256") {
    if (preferred === "SHA-256" && window.crypto?.subtle && window.TextEncoder) {
      const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return { algorithm: "SHA-256", digest: [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("") };
    }
    return { algorithm: "FNV1A-64", digest: fallbackDigest(text) };
  }

  async function signPayload(payload) {
    const unsigned = clone(payload);
    delete unsigned.integrity;
    const result = await computeDigest(stableStringify(unsigned));
    return { ...payload, integrity: { ...result, scope: "stable-json-without-integrity", createdAt: new Date().toISOString() } };
  }

  async function verifyPayload(payload) {
    if (!payload.integrity?.digest) return { verified: false, legacy: true, message: "הגיבוי נוצר בגרסה קודמת ואינו כולל חתימת תקינות" };
    const unsigned = clone(payload);
    const expected = String(unsigned.integrity.digest);
    const algorithm = unsigned.integrity.algorithm || "SHA-256";
    delete unsigned.integrity;
    const actual = await computeDigest(stableStringify(unsigned), algorithm);
    return { verified: actual.digest === expected, legacy: false, expected, actual: actual.digest, algorithm };
  }

  contentBackupPayload = function enhancedContentBackupPayload() {
    return {
      format: CONTENT_BACKUP_FORMAT,
      version: 9,
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      catalogSummary: { domains: data.length, terms: allTerms().length, revision: Number(meta.dataRevision || 0) },
      data: clone(data),
      meta: { dataRevision: meta.dataRevision, lastContentChangeAt: meta.lastContentChangeAt, schemaVersion: SCHEMA_VERSION },
    };
  };

  fullBackupPayload = function enhancedFullBackupPayload() {
    return { ...contentBackupPayload(), format: FULL_BACKUP_FORMAT, prefs: clone(prefs), settings: settingsForBackup() };
  };

  exportContentJson = async function enhancedExportContentJson() {
    try {
      const payload = await signPayload(contentBackupPayload());
      downloadFile(`mechlex-content-backup-${localTimestamp()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
      saveAll("בקשת הורדת גיבוי התוכן נשלחה לדפדפן", { contentBackupCompleted: true });
      updateBackupStatus();
      toast("הורדת גיבוי התוכן הופעלה. יש לוודא שהקובץ הופיע בתיקיית ההורדות.", "success");
    } catch (error) { toast(`יצירת הגיבוי נכשלה: ${error.message}`, "error"); }
  };

  exportFullJson = async function enhancedExportFullJson() {
    try {
      const payload = await signPayload(fullBackupPayload());
      downloadFile(`mechlex-full-admin-backup-${localTimestamp()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
      saveAll("בקשת הורדת הגיבוי המלא נשלחה לדפדפן", { fullBackupCompleted: true });
      updateBackupStatus();
      toast("הורדת הגיבוי המלא הופעלה. יש לוודא שהקובץ הופיע בתיקיית ההורדות.", "success");
    } catch (error) { toast(`יצירת הגיבוי נכשלה: ${error.message}`, "error"); }
  };

  importJsonFile = async function enhancedImportJsonFile(file) {
    try {
      if (file.size > 250 * 1024 * 1024) throw new Error("קובץ הגיבוי גדול מ-250MB");
      const payload = JSON.parse(await file.text());
      if (!payload || !Array.isArray(payload.data)) throw new Error("קובץ הגיבוי אינו מכיל מערך תחומים תקין");
      const verification = await verifyPayload(payload);
      if (!verification.legacy && !verification.verified) throw new Error("חתימת התקינות של הגיבוי אינה תואמת. הקובץ נפגם או שונה לאחר הייצוא");
      const isFullBackup = payload.format === FULL_BACKUP_FORMAT || Boolean(payload.prefs || payload.settings);
      let importedData = normalizeData(payload.data);
      if (!importedData.length) throw new Error("קובץ הגיבוי ריק");
      let repairSummary = null;
      if (typeof ML.repairCatalogData === "function") {
        const repaired = ML.repairCatalogData(importedData);
        importedData = repaired.data;
        repairSummary = repaired.summary;
      }
      const legacyNote = verification.legacy ? "\nהקובץ אינו כולל checksum משום שנוצר בגרסה קודמת." : "\nחתימת התקינות אומתה בהצלחה.";
      const repairNote = repairSummary?.total ? `\nבמהלך הייבוא יתוקנו ${repairSummary.total} כשלים בטוחים.` : "";
      if (!confirm(`לשחזר ${isFullBackup ? "גיבוי מערכת מלא" : "גיבוי תוכן"} הכולל ${importedData.reduce((sum, domain) => sum + domain.items.length, 0)} מושגים?\nהקטלוג הנוכחי יישמר קודם כנקודת שחזור.${legacyNote}${repairNote}`)) return;
      await createRestorePoint(`לפני ייבוא הקובץ ${file.name}`);
      const localContentPin = settings.contentPin;
      const localSuperPin = settings.superPin;
      data = importedData;
      if (payload.prefs) prefs = { ...clone(DEFAULT_PREFS), ...payload.prefs, progress: payload.prefs.progress || {} };
      if (payload.settings) {
        settings = { ...settings, appearance: { ...clone(DEFAULT_SETTINGS.appearance), ...(payload.settings.appearance || payload.settings.design || {}) }, fields: { ...clone(DEFAULT_SETTINGS.fields), ...(payload.settings.fields || {}) } };
      }
      settings.contentPin = localContentPin;
      settings.pin = localContentPin;
      settings.superPin = localSuperPin;
      meta.dataRevision = Math.max(Number(meta.dataRevision || 0), Number(payload.meta?.dataRevision || 0)) + 1;
      meta.lastContentChangeAt = new Date().toISOString();
      meta.lastImportedAt = new Date().toISOString();
      meta.lastImportedFilename = file.name;
      meta.contentBackupNeeded = true;
      meta.systemBackupNeeded = true;
      meta.backupNeeded = true;
      saveAll(`${isFullBackup ? "גיבוי המערכת" : "גיבוי התוכן"} שוחזר ונשמר במחשב זה`, { backupRelevant: true });
      if (typeof ML.markAllFormsClean === "function") ML.markAllFormsClean();
      clearTermForm();
      clearDomainForm();
      renderAdmin();
      renderAll();
      toast(`${isFullBackup ? "גיבוי מערכת מלא" : "גיבוי תוכן"} שוחזר בהצלחה`, "success");
    } catch (error) {
      console.warn("MechLex backup import rejected", error.message);
      toast(`ייבוא נכשל: ${error.message}`, "error");
    } finally {
      if ($("importJsonFile")) $("importJsonFile").value = "";
    }
  };

  const baseRenderAdmin = renderAdmin;
  renderAdmin = function enhancedRenderAdmin() {
    baseRenderAdmin();
    updateStorageStatus();
    updateRestorePointStatus();
  };

  const baseBindEvents = bindEvents;
  bindEvents = function enhancedPersistenceEvents() {
    baseBindEvents();
    $("refreshStorageStatusBtn")?.addEventListener("click", () => updateStorageStatus());
    $("requestPersistentStorageBtn")?.addEventListener("click", requestPersistentStorage);
    $("restoreLatestSnapshotBtn")?.addEventListener("click", restoreLatestSnapshot);
  };

  const baseInit = init;
  init = function enhancedPersistenceInit() {
    baseInit();
    ML.persistenceInitPromise = initializePersistence();
    return ML.persistenceInitPromise;
  };

  ML.openDatabase = openDatabase;
  ML.getRecord = getRecord;
  ML.getAllRecords = getAllRecords;
  ML.putRecord = putRecord;
  ML.deleteRecord = deleteRecord;
  ML.persistFullState = persistFullState;
  ML.createRestorePoint = createRestorePoint;
  ML.updateRestorePointStatus = updateRestorePointStatus;
  ML.saveDraft = saveDraft;
  ML.loadDraft = loadDraft;
  ML.deleteDraft = deleteDraft;
  ML.updateStorageStatus = updateStorageStatus;
  ML.signPayload = signPayload;
  ML.verifyPayload = verifyPayload;
  ML.persistenceReady = () => persistenceReady;
  ML.persistenceMode = () => persistenceMode;
  ML.initializePersistence = initializePersistence;
})();
