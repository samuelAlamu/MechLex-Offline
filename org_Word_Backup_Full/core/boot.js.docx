"use strict";

/* MechLex 10.1.0 boot coordinator.
   Loaded last, after app.js and all extension layers have wrapped init(). */
(function bootMechLexOnce() {
  function start() {
    if (window.__MECHLEX_BOOTED__) return;
    window.__MECHLEX_BOOTED__ = true;

    if (typeof window.init !== "function") {
      window.__MECHLEX_BOOTED__ = false;
      console.error("MechLex failed to start: init() is unavailable. Check script order and file paths.");
      var saveState = document.getElementById("saveState");
      if (saveState) {
        saveState.textContent = "שגיאת אתחול · בדוק שקובצי core קיימים";
        saveState.className = "save-state storage-error";
      }
      return;
    }

    try {
      window.init();
    } catch (error) {
      window.__MECHLEX_BOOTED__ = false;
      console.error("MechLex startup failed", error);
      var target = document.getElementById("saveState");
      if (target) {
        target.textContent = "האתחול נכשל · פתח את כלי המפתחים לפרטים";
        target.className = "save-state storage-error";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    window.setTimeout(start, 0);
  }
}());
