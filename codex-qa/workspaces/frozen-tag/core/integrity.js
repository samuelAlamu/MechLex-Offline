"use strict";

/* MechLex 9.6 catalog integrity layer
   Enforces stable IDs/codes, valid hierarchy and canonical related-term links. */
(function installMechLexIntegrity() {
  const ML = window.MechLexCore = window.MechLexCore || {};
  let lastReport = null;

  function flattenCatalog(source = data) {
    return source.flatMap((domain, domainIndex) => (domain.items || []).map((term, termIndex) => ({ term, domain, domainIndex, termIndex })));
  }

  function termTokens(term) {
    return unique([term.id, term.code, term.name, term.nameEn, ...(term.aliases || [])].map(normalizeText).filter(Boolean));
  }

  function makeReferenceLookup(source = data) {
    const lookup = new Map();
    flattenCatalog(source).forEach(({ term }) => {
      termTokens(term).forEach((token) => {
        if (!lookup.has(token)) lookup.set(token, term);
        else if (lookup.get(token)?.id !== term.id) lookup.set(token, null);
      });
    });
    return lookup;
  }

  function auditCatalog(source = data) {
    const issues = [];
    const domainIds = new Map();
    const prefixes = new Map();
    const termIds = new Map();
    const codes = new Map();

    source.forEach((domain, domainIndex) => {
      const domainPath = `תחום ${domainIndex + 1}`;
      if (!String(domain.name || "").trim()) issues.push({ type: "missing-domain-name", severity: "error", message: `${domainPath} חסר שם בעברית` });
      const idToken = String(domain.id || "");
      if (!idToken) issues.push({ type: "missing-domain-id", severity: "error", message: `${domain.name || domainPath} חסר מזהה` });
      else if (domainIds.has(idToken)) issues.push({ type: "duplicate-domain-id", severity: "error", message: `מזהה תחום כפול: ${idToken}` });
      else domainIds.set(idToken, domain);
      const prefixToken = normalizeText(domain.prefix);
      if (!prefixToken) issues.push({ type: "missing-prefix", severity: "error", message: `${domain.name || domainPath} חסר קידומת קוד` });
      else if (prefixes.has(prefixToken)) issues.push({ type: "duplicate-prefix", severity: "error", message: `קידומת תחום כפולה: ${domain.prefix}` });
      else prefixes.set(prefixToken, domain);

      const parents = new Map((domain.subtopics || []).map((parent) => [normalizeText(parent.name), parent]));
      (domain.items || []).forEach((term) => {
        if (!String(term.name || "").trim()) issues.push({ type: "missing-term-name", severity: "error", message: `מושג ${term.code || term.id || "ללא מזהה"} חסר שם` });
        if (!plainRichText(term.definitionHtml || term.definition || term.short)) issues.push({ type: "missing-definition", severity: "warning", message: `${term.name || term.code} חסר הגדרה מקצועית` });
        if (!term.id) issues.push({ type: "missing-term-id", severity: "error", message: `${term.name || term.code} חסר מזהה` });
        else if (termIds.has(term.id)) issues.push({ type: "duplicate-term-id", severity: "error", message: `מזהה מושג כפול: ${term.id}` });
        else termIds.set(term.id, term);
        const codeToken = normalizeText(term.code);
        if (!codeToken) issues.push({ type: "missing-code", severity: "error", message: `${term.name || term.id} חסר קוד` });
        else if (codes.has(codeToken)) issues.push({ type: "duplicate-code", severity: "error", message: `קוד מושג כפול: ${term.code}` });
        else codes.set(codeToken, term);
        if (!isDirectTermSubtopic(term.subtopic)) {
          const parent = parents.get(normalizeText(term.subtopic));
          if (!parent) issues.push({ type: "missing-parent", severity: "error", message: `${term.code}: תת־התחום “${term.subtopic}” אינו קיים` });
          if (term.subSubtopic && parent && !(parent.children || []).some((child) => normalizeText(child.name) === normalizeText(term.subSubtopic))) {
            issues.push({ type: "missing-child", severity: "error", message: `${term.code}: תת־תת־התחום “${term.subSubtopic}” אינו קיים` });
          }
        } else if (term.subSubtopic) {
          issues.push({ type: "orphan-child", severity: "error", message: `${term.code}: תת־תת־תחום הוגדר ללא תת־תחום אב` });
        }
      });
    });

    const lookup = makeReferenceLookup(source);
    flattenCatalog(source).forEach(({ term }) => {
      const seen = new Set();
      (term.related || []).forEach((reference) => {
        const token = normalizeText(reference);
        const target = lookup.get(token);
        if (!target) issues.push({ type: "broken-related", severity: "warning", message: `${term.code}: הקישור “${reference}” אינו חד־משמעי או אינו קיים` });
        else if (target.id === term.id) issues.push({ type: "self-related", severity: "warning", message: `${term.code}: קישור עצמי` });
        else if (seen.has(target.id)) issues.push({ type: "duplicate-related", severity: "warning", message: `${term.code}: קישור כפול ל-${target.code}` });
        else seen.add(target.id);
      });
    });

    const errors = issues.filter((item) => item.severity === "error").length;
    const warnings = issues.filter((item) => item.severity === "warning").length;
    return { issues, errors, warnings, total: issues.length, checkedAt: new Date().toISOString() };
  }

  function uniqueDomainPrefix(domain, usedPrefixes) {
    let base = String(domain.prefix || "DOM").trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, "") || "DOM";
    let candidate = base;
    let index = 2;
    while (usedPrefixes.has(normalizeText(candidate))) candidate = `${base}-${index++}`;
    usedPrefixes.add(normalizeText(candidate));
    return candidate;
  }

  function uniqueTermCode(domain, preferred, usedCodes) {
    const prefix = String(domain.prefix || "GEN").trim().toUpperCase() || "GEN";
    let candidate = String(preferred || "").trim().toUpperCase();
    if (candidate && !usedCodes.has(normalizeText(candidate))) {
      usedCodes.add(normalizeText(candidate));
      return candidate;
    }
    let next = 1;
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escapedPrefix}-(\\d+)$`, "i");
    usedCodes.forEach((code) => {
      const match = String(code).match(regex);
      if (match) next = Math.max(next, Number(match[1]) + 1);
    });
    candidate = `${prefix}-${String(next).padStart(3, "0")}`;
    while (usedCodes.has(normalizeText(candidate))) candidate = `${prefix}-${String(++next).padStart(3, "0")}`;
    usedCodes.add(normalizeText(candidate));
    return candidate;
  }

  function repairCatalogData(source) {
    const repaired = normalizeData(clone(source));
    const summary = { domainIds: 0, prefixes: 0, termIds: 0, codes: 0, hierarchy: 0, related: 0, required: 0, total: 0 };
    const usedDomainIds = new Set();
    const usedPrefixes = new Set();
    const usedTermIds = new Set();
    const usedCodes = new Set();

    repaired.forEach((domain, domainIndex) => {
      if (!domain.name.trim()) { domain.name = `תחום ${domainIndex + 1}`; summary.required += 1; }
      if (!domain.id || usedDomainIds.has(domain.id)) { domain.id = uid(); summary.domainIds += 1; }
      usedDomainIds.add(domain.id);
      const nextPrefix = uniqueDomainPrefix(domain, usedPrefixes);
      if (nextPrefix !== domain.prefix) summary.prefixes += 1;
      domain.prefix = nextPrefix;
      domain.subtopics = normalizeSubtopics(domain.subtopics || []);

      domain.items.forEach((term, termIndex) => {
        if (!term.name.trim()) { term.name = `מושג ${termIndex + 1}`; summary.required += 1; }
        if (!term.id || usedTermIds.has(term.id)) { term.id = uid(); summary.termIds += 1; }
        usedTermIds.add(term.id);
        const nextCode = uniqueTermCode(domain, term.code, usedCodes);
        if (nextCode !== term.code) summary.codes += 1;
        term.code = nextCode;
        if (isDirectTermSubtopic(term.subtopic)) {
          if (term.subSubtopic) { term.subSubtopic = ""; summary.hierarchy += 1; }
          term.subtopic = "כללי";
        } else {
          let parent = domain.subtopics.find((item) => normalizeText(item.name) === normalizeText(term.subtopic));
          if (!parent) {
            parent = { id: uid(), name: term.subtopic, description: "", color: "", children: [] };
            domain.subtopics.push(parent);
            summary.hierarchy += 1;
          }
          term.subtopic = parent.name;
          if (term.subSubtopic) {
            let child = (parent.children || []).find((item) => normalizeText(item.name) === normalizeText(term.subSubtopic));
            if (!child) {
              child = { id: uid(), name: term.subSubtopic, description: "", color: "" };
              parent.children = [...(parent.children || []), child];
              summary.hierarchy += 1;
            }
            term.subSubtopic = child.name;
          }
        }
      });
    });

    const lookup = makeReferenceLookup(repaired);
    flattenCatalog(repaired).forEach(({ term }) => {
      const nextRelated = [];
      const seen = new Set();
      (term.related || []).forEach((reference) => {
        const target = lookup.get(normalizeText(reference));
        if (!target || target.id === term.id || seen.has(target.id)) { summary.related += 1; return; }
        seen.add(target.id);
        nextRelated.push(target.code);
      });
      term.related = nextRelated;
    });
    summary.total = Object.entries(summary).filter(([key]) => key !== "total").reduce((sum, [, count]) => sum + count, 0);
    return { data: repaired, summary };
  }

  function cleanPersonalReferences() {
    const ids = new Set(flattenCatalog().map(({ term }) => term.id));
    const before = (prefs.favorites || []).length + (prefs.recent || []).length + Object.keys(prefs.progress || {}).length;
    prefs.favorites = unique((prefs.favorites || []).filter((id) => ids.has(id)));
    prefs.recent = unique((prefs.recent || []).filter((id) => ids.has(id))).slice(0, 20);
    Object.keys(prefs.progress || {}).forEach((id) => { if (!ids.has(id)) delete prefs.progress[id]; });
    const after = prefs.favorites.length + prefs.recent.length + Object.keys(prefs.progress || {}).length;
    return Math.max(0, before - after);
  }

  function repairCatalogIntegrity(options = {}) {
    const repaired = repairCatalogData(data);
    const personal = cleanPersonalReferences();
    if (repaired.summary.total || personal) {
      data = repaired.data;
      repaired.summary.personal = personal;
      repaired.summary.total += personal;
      meta.lastIntegrityRepairAt = new Date().toISOString();
      meta.lastIntegrityRepairCount = repaired.summary.total;
      if (!options.silent) saveAll(`תוקנו ${repaired.summary.total} כשלים בקטלוג`, { backupRelevant: true });
    }
    lastReport = auditCatalog(data);
    meta.lastIntegrityCheckAt = lastReport.checkedAt;
    meta.integrityIssues = lastReport.total;
    renderIntegrityStatus(lastReport, repaired.summary);
    return { report: lastReport, summary: repaired.summary };
  }

  function renderIntegrityStatus(report = lastReport || auditCatalog(), repairSummary = null) {
    const target = $("catalogIntegrityStatus");
    const badge = $("catalogHealthBadge");
    if (!target || !badge) return;
    const good = report.total === 0;
    badge.textContent = good ? "תקין" : `${report.total} ממצאים`;
    badge.className = `health-badge ${good ? "good" : report.errors ? "error" : "warning"}`;
    const repairText = repairSummary?.total ? `<span>בתיקון האחרון טופלו ${repairSummary.total} פריטים.</span>` : "";
    const examples = report.issues.slice(0, 4).map((item) => `<span>• ${esc(item.message)}</span>`).join("");
    target.innerHTML = `<strong>${good ? "לא נמצאו כשלים בשלמות הקטלוג" : `נמצאו ${report.errors} שגיאות ו-${report.warnings} אזהרות`}</strong>${repairText}${examples || `<span>מזהים, קודים, היררכיה וקישורים נבדקו.</span>`}`;
  }

  function clearValidation(scope) {
    $$(".validation-error", scope).forEach((element) => element.classList.remove("validation-error"));
    $$(".field-error-message", scope).forEach((element) => element.remove());
  }

  function invalidField(element, message) {
    element.classList.add("validation-error");
    const hint = document.createElement("small");
    hint.className = "field-error-message";
    hint.textContent = message;
    element.insertAdjacentElement("afterend", hint);
    element.focus();
    toast(message, "error");
    return false;
  }

  function canonicalRelatedValues(rawValue, currentId) {
    const lookup = makeReferenceLookup(data);
    const result = [];
    const unresolved = [];
    const seen = new Set();
    splitCsv(rawValue).forEach((reference) => {
      const target = lookup.get(normalizeText(reference));
      if (!target) { unresolved.push(reference); return; }
      if (target.id === currentId || seen.has(target.id)) return;
      seen.add(target.id);
      result.push(target.code);
    });
    return { result, unresolved };
  }

  function rewriteReferences(previousTerm, nextTerm) {
    const previousTokens = new Set(termTokens(previousTerm));
    flattenCatalog().forEach(({ term }) => {
      if (term.id === previousTerm.id) return;
      term.related = unique((term.related || []).map((reference) => previousTokens.has(normalizeText(reference)) ? nextTerm.code : reference));
    });
  }

  function removeReferencesToTerms(removedTerms) {
    const tokens = new Set(removedTerms.flatMap(termTokens));
    flattenCatalog().forEach(({ term }) => {
      term.related = (term.related || []).filter((reference) => !tokens.has(normalizeText(reference)));
    });
  }

  function nextCopyCode(source, domain) {
    const used = new Set(allTerms().map((term) => normalizeText(term.code)));
    const base = `${source.code}-COPY`;
    let candidate = base;
    let index = 2;
    while (used.has(normalizeText(candidate))) candidate = `${base}-${index++}`;
    return candidate || generateTermCode(domain);
  }

  cloneTerm = async function enhancedCloneTerm(termId) {
    const source = findTerm(termId);
    if (!source) return;
    const domain = data.find((item) => item.id === source.domainId);
    if (!domain) return;
    const copy = normalizeTerm({ ...clone(source), id: uid(), code: nextCopyCode(source, domain), name: `${source.name} — עותק`, related: (source.related || []).filter((reference) => normalizeText(reference) !== normalizeText(source.code)), createdAt: todayIso(), updatedAt: todayIso() }, domain.prefix);
    domain.items.push(copy);
    saveAll("המושג שוכפל בקוד ייחודי ונשמר", { backupRelevant: true });
    toast(`נוצר עותק עם הקוד ${copy.code}`, "success");
    renderAdmin();
    editTerm(copy.id);
  };

  deleteTerm = async function enhancedDeleteTerm(termId) {
    const term = findTerm(termId);
    if (!term || !confirm(`למחוק את המושג “${term.name}”?\nכל הקישורים אליו ינוקו אוטומטית, ותיווצר נקודת שחזור.`)) return;
    await ML.createRestorePoint?.(`לפני מחיקת המושג ${term.code} — ${term.name}`);
    removeReferencesToTerms([term]);
    data.forEach((domain) => { domain.items = domain.items.filter((item) => item.id !== termId); });
    prefs.favorites = prefs.favorites.filter((id) => id !== termId);
    prefs.recent = prefs.recent.filter((id) => id !== termId);
    delete prefs.progress[termId];
    if (state.currentTermId === termId) closeTerm();
    ML.markFormClean?.("term");
    await ML.deleteDraft?.("term");
    saveAll("המושג נמחק וכל ההפניות אליו נוקו", { backupRelevant: true });
    toast("המושג נמחק והקטלוג נשאר תקין", "success");
    clearTermForm(true);
    renderAdmin();
    renderAll();
    renderIntegrityStatus(auditCatalog());
  };

  deleteDomain = async function enhancedDeleteDomain(domainId) {
    const domain = data.find((item) => item.id === domainId);
    if (!domain) return;
    if (domain.items.length) return toast("לא ניתן למחוק תחום שמכיל מושגים. השתמש במחיקה המלאה או העבר אותם תחילה.", "error");
    if (!confirm(`למחוק את התחום “${domain.name}”? תיווצר נקודת שחזור לפני המחיקה.`)) return;
    await ML.createRestorePoint?.(`לפני מחיקת התחום הריק ${domain.name}`);
    data = data.filter((item) => item.id !== domainId);
    if (state.domainId === domainId) state.domainId = "all";
    ML.markFormClean?.("domain");
    await ML.deleteDraft?.("domain");
    saveAll("התחום נמחק והשינוי נשמר", { backupRelevant: true });
    clearDomainForm(true);
    renderAdmin();
    renderAll();
  };

  deleteDomainWithTerms = async function enhancedDeleteDomainWithTerms(domainId) {
    const domain = data.find((item) => item.id === domainId);
    if (!domain) return;
    const count = domain.items.length;
    if (!confirm(`מחיקה מלאה של “${domain.name}” תמחק ${count} מושגים ואת כל המבנה שמתחתיו.\nהפניות ממושגים אחרים ינוקו ותיווצר נקודת שחזור. להמשיך?`)) return;
    await ML.createRestorePoint?.(`לפני מחיקת התחום ${domain.name} וכל ${count} המושגים שבו`);
    const removedTerms = clone(domain.items);
    const removedIds = new Set(removedTerms.map((term) => term.id));
    data = data.filter((item) => item.id !== domainId);
    removeReferencesToTerms(removedTerms);
    prefs.favorites = prefs.favorites.filter((id) => !removedIds.has(id));
    prefs.recent = prefs.recent.filter((id) => !removedIds.has(id));
    Object.keys(prefs.progress).forEach((id) => { if (removedIds.has(id)) delete prefs.progress[id]; });
    if (state.domainId === domainId) { state.domainId = "all"; state.subtopic = "all"; state.subSubtopic = "all"; }
    if (removedIds.has(state.currentTermId)) closeTerm();
    ML.markFormClean?.("domain");
    await ML.deleteDraft?.("domain");
    saveAll("התחום וכל תוכנו נמחקו וההפניות נוקו", { backupRelevant: true });
    toast(`התחום ו־${count} המושגים שבו נמחקו בבטחה`, "success");
    clearDomainForm(true);
    renderAdmin();
    renderAll();
    renderIntegrityStatus(auditCatalog());
  };

  upsertTermFromForm = async function enhancedUpsertTerm(event) {
    event?.preventDefault?.();
    const scope = $("termForm");
    clearValidation(scope);
    const name = $("editName").value.trim();
    if (!name) return invalidField($("editName"), "יש להזין שם מושג בעברית");
    const domain = data.find((item) => item.id === $("editDomain").value);
    if (!domain) return invalidField($("editDomain"), "יש לבחור תחום קיים");
    const definitionHtml = cleanRichHtml($("editDefinition").innerHTML);
    if (plainRichText(definitionHtml).length < 5) return invalidField($("editDefinition"), "יש להזין הגדרה מקצועית משמעותית");
    const selectedLocation = decodeHierarchyLocation($("editSubtopic").value);
    if (selectedLocation?.subtopic) {
      const parent = domainSubtopicEntries(domain).find((item) => normalizeText(item.name) === normalizeText(selectedLocation.subtopic));
      if (!parent) return invalidField($("editSubtopic"), "המיקום שנבחר אינו קיים עוד בתחום");
      if (selectedLocation.subSubtopic && !(parent.children || []).some((child) => normalizeText(child.name) === normalizeText(selectedLocation.subSubtopic))) return invalidField($("editSubtopic"), "תת־תת־התחום שנבחר אינו קיים עוד");
    }

    const id = $("editTermId").value || uid();
    const existing = findTerm(id);
    let code = existing?.code || generateTermCode(domain);
    if (existing && existing.domainId !== domain.id) code = generateTermCode(domain);
    const duplicate = allTerms().find((term) => normalizeText(term.code) === normalizeText(code) && term.id !== id);
    if (duplicate) code = generateTermCode(domain);
    const related = canonicalRelatedValues($("editRelated").value, id);
    if (related.unresolved.length) return invalidField($("editRelated"), `לא נמצאו המושגים הקשורים: ${related.unresolved.join(", ")}`);

    if (existing) await ML.createRestorePoint?.(`לפני עריכת המושג ${existing.code} — ${existing.name}`);
    const term = normalizeTerm({
      id, code, name, nameEn: existing?.nameEn || $("editNameEn").value.trim(),
      subtopic: selectedLocation?.subtopic || "כללי", subSubtopic: selectedLocation?.subSubtopic || "",
      symbol: $("editSymbol").value.trim(), units: $("editUnits").value.trim(),
      short: $("editShort").value.trim() || plainRichText(definitionHtml).slice(0, 180), definition: plainRichText(definitionHtml), definitionHtml,
      why: $("editWhy").value.trim(), formula: $("editFormula").value.trim(), formulaNote: $("editFormulaNote").value.trim(),
      variables: parseVariablesInput($("editVariables").value), uses: splitLines($("editUses").value), cautions: splitLines($("editCautions").value),
      standards: splitCsv($("editStandards").value), tags: splitCsv($("editTags").value), related: related.result, aliases: splitCsv($("editAliases").value),
      manufacturing: $("editManufacturing").value.trim(), inspection: $("editInspection").value.trim(),
      example: { title: $("editExampleTitle").value.trim(), given: $("editExampleGiven").value.trim(), solution: $("editExampleSolution").value.trim(), result: $("editExampleResult").value.trim() },
      imageName: $("editImageName").value.trim(), imageData: state.embeddedImageData,
      visualTitle: $("editVisualTitle").value.trim() || name, visualDescription: $("editVisualDescription").value.trim(),
      createdAt: existing?.createdAt || todayIso(), updatedAt: todayIso(),
    }, domain.prefix);

    if (existing) rewriteReferences(existing, term);
    data.forEach((item) => { item.items = item.items.filter((candidate) => candidate.id !== id); });
    domain.items.push(term);
    ensureTermHierarchy(domain, term);
    ML.markFormClean?.("term");
    await ML.deleteDraft?.("term");
    saveAll("המושג נשמר, הקוד והקישורים אומתו", { backupRelevant: true });
    toast(existing && existing.code !== term.code ? `המושג נשמר וקודו עודכן ל-${term.code}` : "המושג נשמר בהצלחה", "success");
    clearTermForm(true);
    renderAdmin();
    renderAll();
    renderIntegrityStatus(auditCatalog());
  };

  upsertDomainFromForm = async function enhancedUpsertDomain(event) {
    event?.preventDefault?.();
    const scope = $("domainForm");
    clearValidation(scope);
    const name = $("domainName").value.trim();
    if (!name) return invalidField($("domainName"), "יש להזין שם תחום בעברית");
    const prefix = $("domainPrefix").value.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{1,11}$/.test(prefix)) return invalidField($("domainPrefix"), "הקידומת חייבת להכיל 2–12 אותיות לטיניות, ספרות, קו או מקף");
    const id = $("editDomainId").value || uid();
    const duplicate = data.find((domain) => normalizeText(domain.prefix) === normalizeText(prefix) && domain.id !== id);
    if (duplicate) return invalidField($("domainPrefix"), `הקידומת ${prefix} כבר בשימוש בתחום ${duplicate.name}`);
    const rawSubtopics = readSubtopicRows();
    const parentNames = rawSubtopics.map((item) => normalizeText(item.name));
    if (new Set(parentNames).size !== parentNames.length) return toast("יש תתי־תחומים בעלי שם כפול", "error");
    for (const parent of rawSubtopics) {
      const childNames = (parent.children || []).map((item) => normalizeText(item.name));
      if (new Set(childNames).size !== childNames.length) return toast(`בתת־התחום ${parent.name} יש שמות כפולים`, "error");
    }

    let domain = data.find((item) => item.id === id);
    const existing = Boolean(domain);
    if (existing) await ML.createRestorePoint?.(`לפני עריכת התחום ${domain.name}`);
    if (!domain) { domain = { id, items: [], subtopics: [] }; data.push(domain); }
    const oldPrefix = domain.prefix || prefix;
    const nextSubtopics = normalizeSubtopics(rawSubtopics);
    if (!reconcileDomainHierarchy(domain, nextSubtopics)) return;

    if (existing && normalizeText(oldPrefix) !== normalizeText(prefix) && domain.items.length) {
      if (!confirm(`שינוי הקידומת מ-${oldPrefix} ל-${prefix} יעדכן גם את קודי ${domain.items.length} המושגים ואת כל ההפניות אליהם. להמשיך?`)) return;
      const used = new Set(allTerms().filter((term) => term.domainId !== domain.id).map((term) => normalizeText(term.code)));
      domain.items.forEach((term, index) => {
        const previous = clone(term);
        const suffixMatch = String(term.code || "").match(/-(\d+)$/);
        let candidate = `${prefix}-${suffixMatch ? suffixMatch[1].padStart(3, "0") : String(index + 1).padStart(3, "0")}`;
        let next = Number(suffixMatch?.[1] || index + 1);
        while (used.has(normalizeText(candidate))) candidate = `${prefix}-${String(++next).padStart(3, "0")}`;
        used.add(normalizeText(candidate));
        term.code = candidate;
        rewriteReferences(previous, term);
      });
    }

    domain.name = name;
    domain.nameEn = $("domainNameEn").value.trim();
    domain.prefix = prefix;
    domain.icon = $("domainIcon").value;
    domain.color = $("domainColor").value;
    domain.description = $("domainDescription").value.trim();
    domain.subtopics = nextSubtopics;
    ML.markFormClean?.("domain");
    await ML.deleteDraft?.("domain");
    saveAll("התחום נשמר והמבנה ההיררכי אומת", { backupRelevant: true });
    toast("התחום נשמר בהצלחה", "success");
    clearDomainForm(true);
    renderAdmin();
    renderAll();
    renderIntegrityStatus(auditCatalog());
  };

  function runIntegrityCheck() {
    lastReport = auditCatalog();
    meta.lastIntegrityCheckAt = lastReport.checkedAt;
    meta.integrityIssues = lastReport.total;
    renderIntegrityStatus(lastReport);
    saveAll(lastReport.total ? `בדיקת תקינות הסתיימה עם ${lastReport.total} ממצאים` : "בדיקת התקינות הסתיימה ללא ממצאים");
    toast(lastReport.total ? `נמצאו ${lastReport.total} ממצאים. ניתן להפעיל תיקון בטוח.` : "הקטלוג תקין", lastReport.total ? "" : "success");
  }

  async function repairFromUi() {
    const report = auditCatalog();
    if (!report.total) return toast("הקטלוג כבר תקין", "success");
    if (!confirm(`נמצאו ${report.total} ממצאים. לתקן מזהים, קודים, היררכיה וקישורים שבורים באופן אוטומטי? תיווצר נקודת שחזור לפני התיקון.`)) return;
    await ML.createRestorePoint?.("לפני תיקון אוטומטי של שלמות הקטלוג");
    const result = repairCatalogIntegrity();
    renderAdmin();
    renderAll();
    toast(`תוקנו ${result.summary.total} פריטים. הקטלוג נבדק מחדש.`, "success");
  }

  const baseRenderAdmin = renderAdmin;
  renderAdmin = function integrityAwareRenderAdmin() {
    baseRenderAdmin();
    renderIntegrityStatus(lastReport || auditCatalog());
  };

  const baseBindEvents = bindEvents;
  bindEvents = function integrityEvents() {
    baseBindEvents();
    $("runIntegrityCheckBtn")?.addEventListener("click", runIntegrityCheck);
    $("repairCatalogBtn")?.addEventListener("click", repairFromUi);
  };

  const baseInit = init;
  init = function integrityInit() {
    const initialRepair = repairCatalogIntegrity({ silent: true });
    if (initialRepair.summary.total) meta.integrityAutoRepairAt = new Date().toISOString();
    baseInit();
    renderIntegrityStatus(initialRepair.report, initialRepair.summary);
  };

  ML.auditCatalog = auditCatalog;
  ML.repairCatalogData = repairCatalogData;
  ML.repairCatalogIntegrity = repairCatalogIntegrity;
  ML.renderIntegrityStatus = renderIntegrityStatus;
  ML.removeReferencesToTerms = removeReferencesToTerms;
})();
