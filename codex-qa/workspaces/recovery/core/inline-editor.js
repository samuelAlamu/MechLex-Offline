"use strict";

/* Super-admin visual editor. It edits the real dictionary view and reuses the
   proven term/domain forms for structured content. */
(function installVisualAdminEditor() {
  const ML = window.MechLexCore = window.MechLexCore || {};
  const textTargets = [
    ["brandName", "#brandName"],
    ["brandSubtitle", "#brandSubtitle"],
    ["heroEyebrow", "#heroEyebrow"],
    ["pageTitle", "#pageTitle"],
    ["heroDescription", "#heroDescription"],
    ["metricTermsLabel", "#metricTermsLabel"],
    ["metricTermsNote", "#metricTermsNote"],
    ["metricDomainsLabel", "#metricDomainsLabel"],
    ["metricDomainsNote", "#metricDomainsNote"],
    ["metricFavoritesLabel", "#metricFavoritesLabel"],
    ["metricFavoritesNote", "#metricFavoritesNote"],
    ["metricMasteredLabel", "#metricMasteredLabel"],
    ["metricMasteredNote", "#metricMasteredNote"],
    ["taxonomyTitle", "#taxonomyTitle"],
    ["taxonomyPath", "#taxonomyPath"],
    ["introTitle", "#introTitle"],
    ["introDescription", "#introDescription"],
    ["resultsTitle", "#resultsTitle"],
    ["contextLabel", "#contextLabel"],
    ["resultsMeta", "#resultsMeta"],
    ["progressText", "#progressText"],
    ["navAllLabel", ".nav-item[data-collection='all'] span:nth-child(2)"],
    ["navFavLabel", ".nav-item[data-collection='favorites'] span:nth-child(2)"],
    ["navLearningLabel", ".nav-item[data-collection='learning'] span:nth-child(2)"],
    ["navMasteredLabel", ".nav-item[data-collection='mastered'] span:nth-child(2)"],
    ["navRecentLabel", ".nav-item[data-collection='recent'] span:nth-child(2)"],
    ["sidebarDomainsHead", ".sidebar-heading span"],
    ["taxonomySectionKicker", "#taxonomyExplorer .section-kicker"],
    ["activeContextPrefix", "#activeContext span"],
    ["resetFiltersBtn", "#resetFiltersBtn"],
    ["subtopicFilterLabel", ".filters label:nth-child(1) span"],
    ["sortSelectLabel", ".filters label:nth-child(2) span"],
    ["mindMapViewBtn", "#mindMapViewBtn span:last-child"],
    ["emptyStateTitle", "#emptyState h2"],
    ["emptyStateDesc", "#emptyState p"],
    ["emptyResetBtn", "#emptyResetBtn"],
    ["mindMapInfoTitle", ".mind-map-info strong"],
    ["adminBtn", "#adminBtn"],
    ["saveState", "#saveState"],
  ];
  let visualMode = false;
  let toolbar = null;

  function ensureUiText() {
    settings.uiText = settings.uiText || {};
    for (const [key, selector] of textTargets) {
      const element = document.querySelector(selector);
      if (element && !settings.uiText[key]) settings.uiText[key] = element.textContent.trim();
    }
  }

  function applyUiText() {
    ensureUiText();
    for (const [key, selector] of textTargets) {
      const element = document.querySelector(selector);
      if (element && settings.uiText[key] && document.activeElement !== element) {
        element.textContent = settings.uiText[key];
      }
    }
    document.title = `${settings.uiText.pageTitle || "MechLex"} · MechLex Offline`;
  }

  function saveInlineText(element) {
    const key = element.dataset.inlineKey;
    const next = element.textContent.replace(/\s+/g, " ").trim();
    if (!key || !next) {
      applyUiText();
      toast("הטקסט אינו יכול להיות ריק", "error");
      return;
    }
    if (settings.uiText[key] === next) return;
    settings.uiText[key] = next;
    saveAll(`הטקסט “${next.slice(0, 35)}” נשמר במקור המשותף`, { backupRelevant: "system", sharedReason: `inline-text:${key}` });
    applyUiText();
  }

  function decorateTextTargets() {
    for (const [key, selector] of textTargets) {
      const element = document.querySelector(selector);
      if (!element) continue;
      element.dataset.inlineKey = key;
      element.contentEditable = visualMode ? "true" : "false";
      element.classList.toggle("visual-inline-target", visualMode);
      element.setAttribute("spellcheck", "true");
      if (!element.dataset.visualBound) {
        element.dataset.visualBound = "true";
        element.addEventListener("focus", () => { element.dataset.beforeEdit = element.textContent; });
        element.addEventListener("blur", () => saveInlineText(element));
        element.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            element.textContent = element.dataset.beforeEdit || settings.uiText[key] || "";
            element.blur();
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            element.blur();
          }
        });
      }
    }
    document.querySelectorAll(".taxonomy-node-title, .taxonomy-node-desc, .taxonomy-subtopic-card h4, .taxonomy-subtopic-card small, .taxonomy-child-node strong, .taxonomy-child-node small").forEach((node, idx) => {
      const key = `dynHead_${idx}_${node.textContent.trim().slice(0, 15)}`;
      node.dataset.inlineKey = key;
      node.contentEditable = visualMode ? "true" : "false";
      node.classList.toggle("visual-inline-target", visualMode);
      if (!node.dataset.visualBound) {
        node.dataset.visualBound = "true";
        node.addEventListener("blur", () => saveInlineText(node));
      }
    });
  }

  function openStructuredEditor(kind, id = "") {
    exitVisualMode({ keepAdminUnlocked: true });
    openAdmin("super");
    if (kind === "term") {
      setAdminTab("terms");
      if (id) editTerm(id);
      else clearTermForm();
    } else {
      setAdminTab("domains");
      if (id) editDomainRecord(id);
      else clearDomainForm();
    }
  }

  function decorateContentCards() {
    document.querySelectorAll(".visual-card-edit").forEach((button) => button.remove());
    if (!visualMode) return;
    document.querySelectorAll("[data-explorer-domain]").forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "visual-card-edit domain-edit";
      button.textContent = "✎ עריכת התחום";
      button.setAttribute("aria-label", `עריכת התחום ${card.textContent.trim().slice(0, 80)}`);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openStructuredEditor("domain", card.dataset.explorerDomain);
      });
      card.appendChild(button);
    });
    document.querySelectorAll(".term-card[data-term-id]").forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "visual-card-edit term-edit";
      button.textContent = "✎ עריכת המושג";
      button.setAttribute("aria-label", `עריכת המושג ${card.textContent.trim().slice(0, 80)}`);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openStructuredEditor("term", card.dataset.termId);
      });
      card.appendChild(button);
    });
  }

  function syncToolbarValues() {
    if (!toolbar) return;
    toolbar.querySelector("#visualPrimary").value = settings.appearance.primary;
    toolbar.querySelector("#visualBackground").value = settings.appearance.background;
    toolbar.querySelector("#visualSurface").value = settings.appearance.surface;
    toolbar.querySelector("#visualFontSize").value = settings.appearance.fontSize;
    toolbar.querySelector("#visualRadius").value = settings.appearance.radius;
    toolbar.querySelector("#visualDensity").value = settings.appearance.density;
  }

  function saveVisualAppearance() {
    settings.appearance.primary = toolbar.querySelector("#visualPrimary").value;
    settings.appearance.background = toolbar.querySelector("#visualBackground").value;
    settings.appearance.surface = toolbar.querySelector("#visualSurface").value;
    settings.appearance.fontSize = Number(toolbar.querySelector("#visualFontSize").value);
    settings.appearance.radius = Number(toolbar.querySelector("#visualRadius").value);
    settings.appearance.density = toolbar.querySelector("#visualDensity").value;
    saveAll("העיצוב החזותי נשמר במקור המשותף", { backupRelevant: "system", sharedReason: "visual-appearance" });
    renderAll();
  }

  function buildToolbar() {
    if (toolbar) return toolbar;
    toolbar = document.createElement("aside");
    toolbar.id = "visualEditorToolbar";
    toolbar.className = "visual-editor-toolbar";
    toolbar.setAttribute("aria-label", "כלי עריכה חזותית לאדמין ראשי");
    toolbar.innerHTML = `
      <div class="visual-toolbar-head">
        <div><span>SUPER ADMIN</span><strong>עריכה חזותית פעילה</strong></div>
        <button id="visualExitBtn" type="button" class="icon-btn" aria-label="סיום עריכה חזותית">×</button>
      </div>
      <p>לחצו על טקסט מסומן כדי לערוך אותו ישירות. השינויים נשמרים אוטומטית או בלחיצה על שמירה.</p>
      <button id="visualSaveAll" type="button" class="btn success visual-save-btn" style="width: 100%; margin-block: 6px 12px; padding: 10px; background: linear-gradient(135deg, #059669, #10b981); color: #fff; font-weight: 800; border: 0; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">💾 שמור שינויים</button>
      <div class="visual-toolbar-actions">
        <button id="visualAddTerm" type="button" class="btn primary">+ מושג</button>
        <button id="visualAddDomain" type="button" class="btn ghost">+ תחום</button>
      </div>
      <fieldset>
        <legend>עיצוב חי</legend>
        <label>צבע ראשי <input id="visualPrimary" type="color"></label>
        <label>רקע <input id="visualBackground" type="color"></label>
        <label>משטחים <input id="visualSurface" type="color"></label>
        <label>גודל טקסט <input id="visualFontSize" type="range" min="14" max="22" step="1"></label>
        <label>עיגול פינות <input id="visualRadius" type="range" min="4" max="28" step="1"></label>
        <label>צפיפות
          <select id="visualDensity"><option value="comfortable">נוחה</option><option value="compact">קומפקטית</option></select>
        </label>
      </fieldset>
      <div class="visual-toolbar-status" role="status">כל שינוי מפורסם לכל המחשבים דרך התיקייה המשותפת.</div>`;
    document.body.appendChild(toolbar);
    toolbar.querySelector("#visualExitBtn").addEventListener("click", () => exitVisualMode());
    toolbar.querySelector("#visualAddTerm").addEventListener("click", () => openStructuredEditor("term"));
    toolbar.querySelector("#visualAddDomain").addEventListener("click", () => openStructuredEditor("domain"));
    toolbar.querySelector("#visualSaveAll").addEventListener("click", () => {
      if (document.activeElement && document.activeElement.dataset?.inlineKey) {
        saveInlineText(document.activeElement);
      }
      for (const [key, selector] of textTargets) {
        const el = document.querySelector(selector);
        if (el && el.contentEditable === "true") {
          saveInlineText(el);
        }
      }
      saveVisualAppearance();
      toast("כל השינויים נשמרו בהצלחה!", "success");
    });
    toolbar.querySelectorAll("input, select").forEach((control) => control.addEventListener("change", saveVisualAppearance));
    return toolbar;
  }

  function enterVisualMode() {
    if (state.adminRole !== "super" || !state.adminUnlocked) {
      toast("עריכה חזותית זמינה לאדמין ראשי בלבד", "error");
      return;
    }
    visualMode = true;
    buildToolbar();
    toolbar.classList.add("active");
    document.body.classList.add("visual-edit-mode");
    toolbar.querySelector("#visualExitBtn").focus();
    setModalVisibility(document.getElementById("adminOverlay"), false);
    syncToolbarValues();
    applyUiText();
    decorateTextTargets();
    decorateContentCards();
    toast("מצב עריכה חזותית הופעל", "success");
  }

  function exitVisualMode({ keepAdminUnlocked = false } = {}) {
    visualMode = false;
    document.body.classList.remove("visual-edit-mode");
    toolbar?.classList.remove("active");
    decorateTextTargets();
    decorateContentCards();
    if (!keepAdminUnlocked) {
      state.adminUnlocked = false;
      document.getElementById("adminBtn")?.focus();
    }
  }

  const baseRenderAll = renderAll;
  renderAll = function visualAwareRenderAll() {
    baseRenderAll();
    applyUiText();
    if (visualMode) {
      decorateTextTargets();
      decorateContentCards();
    }
  };

  const baseRenderAdmin = renderAdmin;
  renderAdmin = function visualAwareRenderAdmin() {
    baseRenderAdmin();
    const launch = document.getElementById("startVisualEditorBtn");
    launch?.classList.toggle("hidden", state.adminRole !== "super");
  };

  const baseBindEvents = bindEvents;
  bindEvents = function visualAwareBindEvents() {
    baseBindEvents();
    document.getElementById("startVisualEditorBtn")?.addEventListener("click", enterVisualMode);
  };

  ML.visualEditor = {
    enter: enterVisualMode,
    exit: exitVisualMode,
    active: () => visualMode,
    applyUiText,
  };
}());
