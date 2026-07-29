"use strict";

/* Edge 95 / legacy Chromium compatibility layer.
   The application itself remains modern, but these small polyfills prevent an
   early runtime failure when the files are opened in older managed browsers. */
(function installLegacyCompatibility() {
  if (!String.prototype.replaceAll) {
    Object.defineProperty(String.prototype, "replaceAll", {
      configurable: true,
      writable: true,
      value: function replaceAll(search, replacement) {
        if (search instanceof RegExp) {
          if (!search.global) throw new TypeError("replaceAll requires a global RegExp");
          return this.replace(search, replacement);
        }
        return this.split(String(search)).join(String(replacement));
      },
    });
  }

  if (!Array.prototype.flatMap) {
    Object.defineProperty(Array.prototype, "flatMap", {
      configurable: true,
      writable: true,
      value: function flatMap(callback, thisArg) {
        return Array.prototype.concat.apply([], this.map(callback, thisArg));
      },
    });
  }

  if (!Object.fromEntries) {
    Object.fromEntries = function fromEntries(entries) {
      const result = {};
      Array.from(entries).forEach((entry) => { result[entry[0]] = entry[1]; });
      return result;
    };
  }

  const supportsColorMix = Boolean(
    window.CSS &&
    typeof window.CSS.supports === "function" &&
    window.CSS.supports("color", "color-mix(in srgb, #000 50%, #fff)")
  );
  document.documentElement.classList.toggle("legacy-edge95", !supportsColorMix);
  document.documentElement.setAttribute("data-color-mix", supportsColorMix ? "supported" : "fallback");
})();
const KEYS = {
  data: "mechlex_v6_data",
  prefs: "mechlex_v6_prefs",
  settings: "mechlex_v6_settings",
  meta: "mechlex_v8_meta",
  recovery: "mechlex_v9_recovery",
  legacyData: "mechlex_v5_data",
  legacyPrefs: "mechlex_v5_prefs",
  legacySettings: "mechlex_v5_settings",
};
const APP_VERSION = "10.1.0";
const SCHEMA_VERSION = 2;
const RECOVERY_LIMIT = 8;
const CONTENT_BACKUP_FORMAT = "MechLexContentBackup";
const FULL_BACKUP_FORMAT = "MechLexFullAdminBackup";
const PERSONAL_PROGRESS_FORMAT = "MechLexPersonalProgress";
let IMAGE_CATALOG = new Set();
async function fetchImageCatalog() {
  try {
    const res = await fetch("/api/image-catalog", { headers: { "X-MechLex-Client": "1" } });
    if (res.ok) {
      const items = await res.json();
      IMAGE_CATALOG = new Set(items.map(i => i.name.trim()));
      renderAll(); // Re-render to resolve missing images once catalog is known
    }
  } catch(e) { console.warn("Failed to fetch image catalog", e); }
}
const EMBEDDED_IMAGES = window.MECHLEX_EMBEDDED_IMAGES || {};

let storageIsPersistent = true;
const memoryStorage = {
  values: {},
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null; },
  setItem(key, value) { this.values[key] = String(value); },
  removeItem(key) { delete this.values[key]; },
  clear() { this.values = {}; },
};
let storage = (() => {
  try {
    const testKey = "__mechlex_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    storageIsPersistent = false;
    return memoryStorage;
  }
})();

const $ = (id) => document.getElementById(id);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => (window.crypto && typeof window.crypto.randomUUID === "function")
  ? window.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const esc = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const normalizeText = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0591-\u05C7]/g, "")
  .replace(/[‐‑‒–—−]/g, "-")
  .replace(/[^\p{L}\p{N}%+./°µμσϵεΔΦφØ⌀-]+/gu, " ")
  .trim()
  .toLowerCase();
const splitCsv = (value) => String(value || "").split(",").map((x) => x.trim()).filter(Boolean);
const splitLines = (value) => String(value || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const unique = (items) => [...new Set(items.filter(Boolean))];
const todayIso = () => new Date().toISOString().slice(0, 10);
const pad2 = (value) => String(value).padStart(2, "0");
const localTimestamp = (date = new Date()) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}_${pad2(date.getHours())}-${pad2(date.getMinutes())}-${pad2(date.getSeconds())}`;
const safeFilenamePart = (value) => String(value || "").trim().replace(/[\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").replace(/_+/g, "_").slice(0, 60);
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};
const compareText = (a, b) => String(a || "").localeCompare(String(b || ""), "he", { numeric: true, sensitivity: "base" });

function demoDiagramDataUrl(title, subtitle, accent = "#7c3aed") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fbff"/><stop offset="1" stop-color="#eef2ff"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#172554" flood-opacity=".16"/></filter></defs>
    <rect width="1600" height="1000" rx="52" fill="url(#bg)"/><rect x="70" y="70" width="1460" height="860" rx="36" fill="#fff" stroke="${accent}" stroke-width="8" filter="url(#shadow)"/>
    <path d="M250 500h1100" stroke="#cbd5e1" stroke-width="18" stroke-linecap="round"/><circle cx="490" cy="500" r="145" fill="#fff" stroke="${accent}" stroke-width="30"/><circle cx="490" cy="500" r="52" fill="${accent}"/><circle cx="1040" cy="500" r="205" fill="#fff" stroke="${accent}" stroke-width="30"/><circle cx="1040" cy="500" r="68" fill="${accent}"/><path d="M690 500h115M760 445l55 55-55 55" fill="none" stroke="${accent}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="800" y="180" text-anchor="middle" font-family="Arial" font-size="66" font-weight="700" fill="#172554">${esc(title)}</text><text x="800" y="835" text-anchor="middle" font-family="Arial" font-size="36" fill="#64748b">${esc(subtitle)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function hierarchyDemoDomain() {
  return {
    id: "domain-demo-drivetrain",
    name: "הדגמת היררכיה — מערכות הנעה",
    nameEn: "Hierarchy Demo — Drivetrain Systems",
    prefix: "DRV",
    icon: "mechanics",
    color: "#7c3aed",
    description: "תחום הדגמה שניתן לערוך או להסיר במצב אדמין. הוא מציג מושג ישיר, מושג בתת־תחום ומושג בתת־תת־תחום.",
    subtopics: [{
      id: "demo-subtopic-transmissions",
      name: "תמסורות מכניות",
      description: "העברת תנועה, מהירות ומומנט בין רכיבים מכניים.",
      color: "#e85d75",
      children: [{
        id: "demo-child-gears",
        name: "גלגלי שיניים",
        description: "גאומטריה ומאפייני תכן של זוגות גלגלי שיניים.",
        color: "#f59e0b",
      }],
    }],
    items: [
      {
        id: "term-demo-shaft", code: "DRV-001", name: "גל הינע", nameEn: "Drive Shaft", subtopic: "כללי", symbol: "T", units: "N·m",
        short: "מושג לדוגמה המשויך ישירות לתחום מערכות ההנעה.",
        definitionHtml: "<h3>מושג ישירות בתחום</h3><p><strong>גל הינע</strong> הוא רכיב מסתובב המעביר מומנט והספק בין מכלולים. בדוגמה זו הוא ממחיש מושג שאינו זקוק לתת־תחום.</p><ul><li>שייך ישירות לתחום.</li><li>ניתן להעבירו לכל ענף מתוך עורך המושג.</li></ul>",
        tags: ["הדגמה", "הנעה", "מומנט"], imageData: demoDiagramDataUrl("גל הינע", "תחום ← מושג", "#7c3aed"), visualTitle: "מסלול ישיר בתחום", updatedAt: "2026-07-19",
      },
      {
        id: "term-demo-ratio", code: "DRV-002", name: "יחס העברה", nameEn: "Transmission Ratio", subtopic: "תמסורות מכניות", symbol: "i", units: "ללא יחידות",
        short: "מושג לדוגמה המשויך לתת־התחום תמסורות מכניות.",
        definitionHtml: "<h3>מושג בתוך תת־תחום</h3><p><strong>יחס העברה</strong> מתאר את היחס בין מהירות הסיבוב בכניסה למהירות הסיבוב ביציאה של תמסורת.</p><blockquote>המסלול ההיררכי: מערכות הנעה ← תמסורות מכניות ← יחס העברה.</blockquote>",
        formula: "i = n_in / n_out", tags: ["הדגמה", "תמסורת"], imageData: demoDiagramDataUrl("יחס העברה", "תחום ← תת־תחום ← מושג", "#e85d75"), visualTitle: "מסלול דרך תת־תחום", updatedAt: "2026-07-19",
      },
      {
        id: "term-demo-gear-module", code: "DRV-003", name: "מודול גלגל שיניים", nameEn: "Gear Module", subtopic: "תמסורות מכניות", subSubtopic: "גלגלי שיניים", symbol: "m", units: "mm",
        short: "מושג לדוגמה המשויך לתת־תת־התחום גלגלי שיניים.",
        definitionHtml: "<h3>מושג בתוך תת־תת־תחום</h3><p><strong>מודול</strong> הוא מדד בסיסי לגודל שיני גלגל השיניים, ומוגדר כיחס בין קוטר החלוקה למספר השיניים.</p><ol><li>תחום: מערכות הנעה.</li><li>תת־תחום: תמסורות מכניות.</li><li>תת־תת־תחום: גלגלי שיניים.</li></ol>",
        formula: "m = d / z", tags: ["הדגמה", "גלגלי שיניים"], imageData: demoDiagramDataUrl("מודול גלגל שיניים", "תחום ← תת־תחום ← תת־תת־תחום ← מושג", "#f59e0b"), visualTitle: "מסלול היררכי מלא", updatedAt: "2026-07-19",
      },
    ],
  };
}

function sampleData() {
  return [
    {
      id: "domain-gdt",
      name: "מידות וטולרנסים גאומטריים",
      nameEn: "Geometric Dimensioning & Tolerancing",
      prefix: "GDT",
      icon: "gdt",
      color: "#1d6885",
      description: "שפה הנדסית להגדרת גאומטריה מותרת, דאטומים, אזורי טולרנס ודרישות פונקציונליות של חלקים והרכבות.",
      subtopics: ["דאטומים", "טולרנסי צורה", "טולרנסי מיקום", "מצבי חומר", "שרשראות מידה"],
      items: [
        {
          id: "term-gdt-001", code: "GDT-001", name: "דאטום", nameEn: "Datum", subtopic: "דאטומים",
          aliases: ["בסיס ייחוס", "Datum Reference"], symbol: "A / B / C", units: "ללא יחידות", difficulty: "בסיסי",
          short: "ייחוס תאורטי מדויק שממנו מגדירים מיקום, כיוון או סיבוב של מאפיינים אחרים.",
          definition: "דאטום הוא מישור, ציר, קו או נקודה תאורטיים מדויקים, הנגזרים ממאפיין דאטום ממשי בחלק. מערכת הדאטומים קובעת כיצד החלק מיוצב במרחב וכיצד יש לפרש ולבדוק טולרנסים גאומטריים ביחס לפונקציה שלו בהרכבה.",
          why: "ללא מערכת ייחוס עקבית, ייצור ובחינה עלולים להתבצע מנקודות שונות ולתת תוצאות סותרות. בחירה נכונה של דאטומים מדמה את אופן הקיבוע וההעמסה האמיתיים של החלק.",
          formula: "Datum Reference Frame = A | B | C", formulaNote: "סדר הדאטומים מגדיר קדימות: ראשי, משני ושלישוני.",
          variables: [{ symbol: "A", meaning: "דאטום ראשי — מגביל בדרך כלל שלוש דרגות חופש", unit: "—" }, { symbol: "B", meaning: "דאטום משני — מגביל שתי דרגות חופש נוספות", unit: "—" }, { symbol: "C", meaning: "דאטום שלישוני — מגביל את דרגת החופש האחרונה", unit: "—" }],
          uses: ["הגדרת מסגרת ייחוס לבדיקת מיקום חורים", "קביעת אופן הצבת חלק ב-CMM", "תכנון מתקני דפינה ובחינה"],
          cautions: ["אין לבחור דאטום רק לפי נוחות השרטוט; הבחירה צריכה לשקף ממשק פונקציונלי.", "מאפיין דאטום ממשי אינו הדאטום התאורטי עצמו."],
          standards: ["ASME Y14.5", "ISO 5459"],
          manufacturing: "יש ליצור משטחי ייחוס יציבים ונגישים לדפינה. משטח דאטום קטן, לא רציף או גמיש עלול לייצר חזרתיות נמוכה.",
          inspection: "ניתן לממש את מערכת הדאטומים באמצעות פלטה, פינים, V-block או יישור מתמטי במכונת מדידה קואורדינטית, בהתאם להגדרת השרטוט.",
          tags: ["GD&T", "Reference Frame", "CMM", "Fixture"], related: ["GDT-002", "GDT-005"],
          visualTitle: "מסגרת ייחוס תלת־מישורית", visualDescription: "הדאטום הראשי A מייצב את החלק, B מכוון אותו ו-C משלים את הקיבוע.", updatedAt: "2026-07-16"
        },
        {
          id: "term-gdt-002", code: "GDT-002", name: "טולרנס מיקום", nameEn: "Position Tolerance", subtopic: "טולרנסי מיקום",
          aliases: ["True Position", "מיקום אמיתי"], symbol: "⌖", units: "mm", difficulty: "בינוני",
          short: "בקרת מיקום של ציר, מישור אמצע או מרכז מאפיין ביחס למיקום התאורטי המדויק.",
          definition: "טולרנס מיקום מגדיר אזור טולרנס שבתוכו חייב להימצא הציר או המרכז הנגזר של מאפיין גודל. עבור חור גלילי, אזור הטולרנס הוא לרוב גליל שקוטרו מצוין במסגרת בקרת המאפיין וממוקם ביחס למידות בסיס ולדאטומים.",
          why: "זהו אחד הכלים המרכזיים להבטחת הרכבה חליפית בין חלקים, משום שהוא משלב שליטה במיקום ובמקרים רבים גם בכיוון המאפיין.",
          formula: "TP = 2 · √(Δx² + Δy²)", formulaNote: "נוסחת חישוב סטייה דיאמטרלית במישור עבור דוגמה פשוטה; פרשנות השרטוט קובעת את אזור הטולרנס בפועל.",
          variables: [{ symbol: "TP", meaning: "סטיית מיקום דיאמטרלית", unit: "mm" }, { symbol: "Δx", meaning: "סטייה בציר X מהמיקום התאורטי", unit: "mm" }, { symbol: "Δy", meaning: "סטייה בציר Y מהמיקום התאורטי", unit: "mm" }],
          uses: ["תבניות חורים לברגים", "מיקום פינים ומיסבים", "שליטה בקואקסיאליות פונקציונלית"],
          cautions: ["אין להשוות ישירות סטייה חד־צירית לקוטר אזור הטולרנס.", "יש לבדוק האם קיים מצב חומר MMC/LMC שמשנה את הטולרנס הזמין."],
          standards: ["ASME Y14.5", "ISO 1101"],
          manufacturing: "קידוח בקואורדינטות, עיבוד במרכז CNC ושימוש בדאטומים יציבים מפחיתים הצטברות שגיאות מיקום.",
          inspection: "CMM, מד־גובה על משטח ייחוס, גייג' פונקציונלי או מדידה אופטית. השיטה צריכה להתאים לאזור הטולרנס ולמצב החומר.",
          tags: ["Position", "Hole Pattern", "CMM", "Assembly"], related: ["GDT-001", "GDT-005", "GDT-007"],
          example: { title: "חישוב סטיית מיקום", given: "מרכז החור סטה ב-Δx = 0.03 mm וב-Δy = 0.04 mm.", solution: "TP = 2 · √(0.03² + 0.04²) = 2 · 0.05", result: "TP = 0.10 mm" },
          visualTitle: "אזור טולרנס גלילי", visualDescription: "ציר החור בפועל חייב להישאר בתוך גליל הממוקם במיקום התאורטי המדויק.", updatedAt: "2026-07-16"
        },
        {
          id: "term-gdt-003", code: "GDT-003", name: "שטיחות", nameEn: "Flatness", subtopic: "טולרנסי צורה",
          aliases: ["מישוריות"], symbol: "▱", units: "mm", difficulty: "בסיסי",
          short: "בקרה על כך שכל נקודות המשטח יימצאו בין שני מישורים מקבילים.",
          definition: "שטיחות היא טולרנס צורה עצמאי. אזור הטולרנס מוגדר בין שני מישורים מקבילים שהמרחק ביניהם הוא ערך הטולרנס. כל המשטח הממשי חייב להימצא בתוך האזור, ללא צורך בדאטום.",
          why: "שטיחות חשובה למגע, אטימה, יציבות בדפינה, פיזור עומס והרכבה של משטחים צמודים.",
          formula: "Flatness = z_max − z_min", formulaNote: "החישוב הפשוט מתייחס לטווח הגבהים לאחר התאמת מישור בהתאם לאלגוריתם הבדיקה.",
          variables: [{ symbol: "z_max", meaning: "הנקודה הגבוהה ביותר ביחס למישור המותאם", unit: "mm" }, { symbol: "z_min", meaning: "הנקודה הנמוכה ביותר ביחס למישור המותאם", unit: "mm" }],
          uses: ["משטחי אטימה", "בסיסי מכונות", "פני אוגנים"],
          cautions: ["שטיחות אינה שולטת בכיוון המשטח ביחס לדאטום.", "חספוס מקומי ושיטת הסינון יכולים להשפיע על תוצאת המדידה."],
          standards: ["ASME Y14.5", "ISO 1101"],
          manufacturing: "השחזה, לפינג וכרסום גמר יכולים לשפר שטיחות; יש להביא בחשבון עיוותים משחרור מאמצים ומדפינה.",
          inspection: "סריקה ב-CMM, אינדיקטור על משטח גרניט, אוטוקולימטור או אינטרפרומטריה לפי הדיוק הנדרש.",
          tags: ["Form", "Surface", "Sealing"], related: ["GDT-004", "MET-002"],
          visualTitle: "שני מישורים מקבילים", visualDescription: "כל נקודות המשטח חייבות להיכלל במרווח שבין המישורים.", updatedAt: "2026-07-16"
        },
        {
          id: "term-gdt-004", code: "GDT-004", name: "פרופיל משטח", nameEn: "Profile of a Surface", subtopic: "טולרנסי צורה",
          aliases: ["Surface Profile"], symbol: "⌓", units: "mm", difficulty: "מתקדם",
          short: "אזור תלת־ממדי העוקב אחר הצורה התאורטית ושולט בצורה, בכיוון ובמיקום בהתאם לייחוסים.",
          definition: "פרופיל משטח מגדיר מעטפת תלת־ממדית סביב הפרופיל התאורטי המדויק. כל נקודה במשטח הממשי חייבת להימצא בתוך המעטפת. ללא דאטומים הוא שולט בעיקר בצורה; עם דאטומים הוא יכול לשלוט גם בכיוון ובמיקום.",
          why: "הטולרנס מתאים במיוחד לגאומטריות חופשיות, יציקות, להבים, משטחים אווירודינמיים וחלקי פלסטיק שבהם ממדים ליניאריים רבים אינם יעילים.",
          formula: "Zone width = t", formulaNote: "ברירת המחדל היא חלוקה שווה סביב הפרופיל התאורטי, אלא אם הוגדר אזור לא־שווה.",
          variables: [{ symbol: "t", meaning: "רוחב כולל של אזור הפרופיל", unit: "mm" }],
          uses: ["להבי טורבינה", "מעטפות יצוקות", "משטחי פלסטיק ופח", "גאומטריה אורגנית"],
          cautions: ["יש להגדיר בבירור את גבולות המשטח המבוקר.", "בחירת אלגוריתם התאמה שונה במדידה יכולה לשנות את התוצאה."],
          standards: ["ASME Y14.5", "ISO 1101"],
          manufacturing: "עיבוד 5 צירים, יציקה מדויקת, הדפסה תלת־ממדית ותבניות. יש לשלוט גם בכיווץ ובעיוות תרמי.",
          inspection: "סריקת CMM, סורק אופטי או CT תעשייתי והשוואת ענן נקודות למודל CAD הנומינלי.",
          tags: ["Profile", "Freeform", "CAD", "Optical Scan"], related: ["GDT-001", "MET-001"],
          visualTitle: "מעטפת סביב פרופיל תאורטי", visualDescription: "המשטח בפועל נבדק מול מעטפת שוות־מרחק מהגאומטריה הנומינלית.", updatedAt: "2026-07-16"
        },
        {
          id: "term-gdt-005", code: "GDT-005", name: "מצב חומר מרבי", nameEn: "Maximum Material Condition", subtopic: "מצבי חומר",
          aliases: ["MMC"], symbol: "Ⓜ", units: "mm", difficulty: "מתקדם",
          short: "מצב שבו מאפיין גודל מכיל את כמות החומר המרבית: חור קטן ביותר או פין גדול ביותר.",
          definition: "מצב חומר מרבי הוא גבול הגודל שבו נשארת בחלק כמות החומר הגדולה ביותר. עבור מאפיין פנימי כגון חור זהו הקוטר הקטן ביותר; עבור מאפיין חיצוני כגון פין זהו הקוטר הגדול ביותר. שימוש במודיפייר MMC מאפשר טולרנס בונוס כאשר הגודל בפועל מתרחק מ-MMC.",
          why: "MMC מחבר בין גודל למיקום באופן פונקציונלי ומאפשר להגדיל חופש ייצור בלי לפגוע בהרכבה במקרה הגרוע ביותר.",
          formula: "Bonus = |Actual size − MMC size|", formulaNote: "כיוון החיסור תלוי במאפיין פנימי או חיצוני; ערך הבונוס הוא מרחק חיובי מ-MMC.",
          variables: [{ symbol: "Actual size", meaning: "הגודל המקומי או הנגזר שנמדד בפועל", unit: "mm" }, { symbol: "MMC size", meaning: "גבול הגודל במצב חומר מרבי", unit: "mm" }],
          uses: ["תכנון גייג' GO פונקציונלי", "תבניות חורים", "פינים וממשקי הרכבה"],
          cautions: ["MMC אינו רמת איכות ואינו אומר שהחלק צריך להיות מיוצר בגבול זה.", "יש להבחין בין גודל מקומי לבין מעטפת מצב חומר לפי התקן הרלוונטי."],
          standards: ["ASME Y14.5", "ISO 2692"],
          manufacturing: "מאפשר לספק להשתמש בטולרנס גאומטרי גדול יותר כאשר הגודל בפועל מיטיב עם ההרכבה.",
          inspection: "CMM עם חישוב בונוס, או גייג' פונקציונלי המדמה את הגבול הווירטואלי של הממשק.",
          tags: ["MMC", "Bonus Tolerance", "Functional Gauge"], related: ["GDT-006", "GDT-007", "GDT-008"],
          example: { title: "טולרנס בונוס בחור", given: "חור: MMC = Ø10.00 mm. הגודל בפועל Ø10.08 mm. טולרנס מיקום ב-MMC הוא Ø0.10 mm.", solution: "Bonus = 10.08 − 10.00 = 0.08 mm\nTotal position tolerance = 0.10 + 0.08", result: "טולרנס מיקום כולל = Ø0.18 mm" },
          visualTitle: "חור במצב חומר מרבי", visualDescription: "בחור, MMC הוא הקוטר הקטן ביותר ולכן מכיל את כמות החומר המרבית בחלק.", updatedAt: "2026-07-16"
        },
        {
          id: "term-gdt-006", code: "GDT-006", name: "מצב חומר מזערי", nameEn: "Least Material Condition", subtopic: "מצבי חומר",
          aliases: ["LMC"], symbol: "Ⓛ", units: "mm", difficulty: "מתקדם",
          short: "מצב שבו מאפיין גודל משאיר בחלק את כמות החומר המזערית: חור גדול ביותר או פין קטן ביותר.",
          definition: "מצב חומר מזערי הוא גבול הגודל שבו כמות החומר בחלק היא הנמוכה ביותר. הוא שימושי כאשר עובי דופן, מרחק מקצה או חוזק מקומי הם הדרישה הפונקציונלית הקריטית.",
          why: "LMC מאפשר להגן על מינימום חומר נדרש סביב מאפיין, למשל למניעת פריצה של חור אל קצה או לשמירת עובי דופן.",
          formula: "LMC boundary = LMC size ± geometric tolerance", formulaNote: "הסימן תלוי בסוג המאפיין ובפרשנות הגבול הפונקציונלי.",
          variables: [{ symbol: "LMC size", meaning: "גבול הגודל במצב חומר מזערי", unit: "mm" }, { symbol: "geometric tolerance", meaning: "ערך הטולרנס הגאומטרי ב-LMC", unit: "mm" }],
          uses: ["שמירת עובי דופן", "מרחק חור מקצה", "חלקים חלולים ויציקות"],
          cautions: ["LMC אינו תחליף לניתוח חוזק כאשר קיימים עומסים משמעותיים.", "בדיקה פונקציונלית של LMC פחות אינטואיטיבית ודורשת תכנון גייג' מתאים."],
          standards: ["ASME Y14.5", "ISO 2692"],
          manufacturing: "רלוונטי במיוחד לקידוחים קרובים לקצה, יציקות דקות וחלקי פלסטיק בעלי שינויי עובי.",
          inspection: "CMM או חישוב גבול LMC מתוך גודל ומיקום בפועל; לעיתים משתמשים בגייג' ייעודי להגנת עובי חומר.",
          tags: ["LMC", "Wall Thickness", "Edge Distance"], related: ["GDT-005", "GDT-007"],
          visualTitle: "שמירת מינימום חומר", visualDescription: "LMC משמש להגנה על עובי דופן או מרחק קצה מינימלי.", updatedAt: "2026-07-16"
        },
        {
          id: "term-gdt-007", code: "GDT-007", name: "גבול וירטואלי", nameEn: "Virtual Condition", subtopic: "מצבי חומר",
          aliases: ["Virtual Boundary", "VC"], symbol: "VC", units: "mm", difficulty: "מומחה",
          short: "גבול במקרה הגרוע ביותר הנוצר משילוב גודל MMC והטולרנס הגאומטרי המוגדר ב-MMC.",
          definition: "הגבול הווירטואלי הוא מעטפת קבועה המייצגת את מצב ההרכבה הגרוע ביותר. עבור מאפיין חיצוני הוא מתקבל בדרך כלל מחיבור גודל MMC והטולרנס הגאומטרי; עבור מאפיין פנימי מחיסור הטולרנס מגודל MMC.",
          why: "הגבול הווירטואלי מאפשר לתכנן גייג' פונקציונלי ולהוכיח חליפיות בהרכבה ללא צורך להגביל כל משתנה בנפרד לערכים מחמירים מדי.",
          formula: "VC_hole = MMC_hole − T_geo\nVC_pin = MMC_pin + T_geo", formulaNote: "נוסחאות בסיסיות למאפיין פנימי וחיצוני כאשר הטולרנס מוגדר ב-MMC.",
          variables: [{ symbol: "MMC_hole", meaning: "קוטר החור במצב חומר מרבי", unit: "mm" }, { symbol: "MMC_pin", meaning: "קוטר הפין במצב חומר מרבי", unit: "mm" }, { symbol: "T_geo", meaning: "הטולרנס הגאומטרי המותר ב-MMC", unit: "mm" }],
          uses: ["תכנון גייג' פונקציונלי", "בדיקת חליפיות", "ניתוח ערימת טולרנסים"],
          cautions: ["אין לבלבל גבול וירטואלי עם הגודל בפועל של המאפיין.", "יש לוודא שהטולרנס אכן מוגדר עם מודיפייר MMC."],
          standards: ["ASME Y14.5", "ISO 2692"],
          manufacturing: "מספק חופש ייצור נוסף תוך שמירה על מעטפת פונקציונלית קבועה.",
          inspection: "גייג' קשיח בגודל הגבול הווירטואלי או הערכת CMM שמשלבת גודל, מיקום וכיוון.",
          tags: ["Virtual Condition", "Gauge", "Worst Case"], related: ["GDT-002", "GDT-005", "GDT-008"],
          example: { title: "גבול וירטואלי לחור", given: "חור ב-MMC: Ø10.00 mm. טולרנס מיקום ב-MMC: Ø0.10 mm.", solution: "VC_hole = 10.00 − 0.10", result: "הגבול הווירטואלי = Ø9.90 mm" },
          visualTitle: "גייג' פונקציונלי בגבול הווירטואלי", visualDescription: "פין גייג' המדמה בו־זמנית את גודל החור ואת סטיית המיקום המרבית המותרת.", updatedAt: "2026-07-16"
        },
        {
          id: "term-gdt-008", code: "GDT-008", name: "טולרנס בונוס", nameEn: "Bonus Tolerance", subtopic: "מצבי חומר",
          aliases: ["Bonus"], symbol: "T_bonus", units: "mm", difficulty: "מתקדם",
          short: "תוספת טולרנס גאומטרי המתקבלת כאשר גודל המאפיין בפועל מתרחק ממצב החומר שצוין.",
          definition: "כאשר טולרנס גאומטרי של מאפיין גודל מוגדר ב-MMC או ב-LMC, סטייה מיטיבה בגודל המאפיין יוצרת טולרנס נוסף מעבר לערך הרשום במסגרת. התוספת שווה למרחק של הגודל בפועל ממצב החומר שצוין.",
          why: "טולרנס בונוס מאפשר תכנון פונקציונלי שאינו מעניש את היצרן כאשר הגודל בפועל משפר את מרווח ההרכבה או את כמות החומר.",
          formula: "T_total = T_stated + T_bonus", formulaNote: "הטולרנס הכולל עדיין כפוף לגבול הפונקציונלי ולדרישות התקן.",
          variables: [{ symbol: "T_total", meaning: "הטולרנס הגאומטרי הכולל הזמין", unit: "mm" }, { symbol: "T_stated", meaning: "הטולרנס הרשום במסגרת", unit: "mm" }, { symbol: "T_bonus", meaning: "התוספת הנגזרת מהגודל בפועל", unit: "mm" }],
          uses: ["הגדלת תשואת ייצור", "הערכת תוצאות CMM", "תכנון טולרנסים פונקציונליים"],
          cautions: ["אין בונוס כאשר הטולרנס מוגדר RFS ללא מודיפייר חומר.", "יש להשתמש בגודל המתאים לפי הגדרת התקן ושיטת ההערכה."],
          standards: ["ASME Y14.5", "ISO 2692"],
          manufacturing: "מאפשר לספק לנצל סטייה בגודל לטובת מיקום או כיוון, במקום לפסול חלק שממשיך לעמוד בדרישה הפונקציונלית.",
          inspection: "מערכת המדידה צריכה לשלב את תוצאת הגודל עם הטולרנס הגאומטרי ולא לדווח עליהם כשתי בדיקות מנותקות.",
          tags: ["Bonus", "MMC", "LMC", "Tolerance"], related: ["GDT-005", "GDT-006", "GDT-007"],
          visualTitle: "התרחבות אזור הטולרנס", visualDescription: "ככל שהמאפיין מתרחק מ-MMC, אזור הטולרנס הגאומטרי הזמין גדל.", updatedAt: "2026-07-16"
        }
      ]
    },
    {
      id: "domain-mechanics", name: "מכניקה וחוזק חומרים", nameEn: "Mechanics & Strength of Materials", prefix: "MEC", icon: "mechanics", color: "#7c4b1f",
      description: "מאמצים, עיבורים, קשיחות, כפיפה, יציבות והתנהגות מכנית של רכיבים תחת עומס.",
      subtopics: ["מאמץ ועיבור", "אלסטיות", "כפיפה", "תכן חוזק"],
      items: [
        {
          id: "term-mec-001", code: "MEC-001", name: "מאמץ נורמלי", nameEn: "Normal Stress", subtopic: "מאמץ ועיבור", aliases: ["מאמץ צירי"], symbol: "σ", units: "Pa, MPa", difficulty: "בסיסי",
          short: "כוח נורמלי ליחידת שטח חתך, במתיחה או בלחיצה.",
          definition: "מאמץ נורמלי ממוצע מתאר את עוצמת הכוח הפנימי הפועל בניצב לחתך. בהעמסה צירית מרכזית ובהנחות של התפלגות אחידה, הוא מתקבל מחלוקת הכוח הצירי בשטח החתך.",
          why: "זהו מדד בסיסי להשוואה בין העומס הפועל לבין חוזק החומר, והוא משמש בתכן מוטות, ברגים, עמודים וחיבורים.",
          formula: "σ = F / A", formulaNote: "הנוסחה מייצגת מאמץ ממוצע; ריכוזי מאמץ או כפיפה דורשים מודל מפורט יותר.",
          variables: [{ symbol: "σ", meaning: "מאמץ נורמלי", unit: "Pa או MPa" }, { symbol: "F", meaning: "כוח צירי", unit: "N" }, { symbol: "A", meaning: "שטח חתך נושא עומס", unit: "m² או mm²" }],
          uses: ["בדיקת מוט מתיחה", "תכן בורג", "בדיקת עמוד בלחיצה"],
          cautions: ["יש לשמור עקביות יחידות: N/mm² שווה MPa.", "בקרבת חורים, כתפיים והברגות המאמץ המקומי גבוה מהמאמץ הממוצע."],
          standards: ["Mechanics of Materials"], manufacturing: "שינויים חדים בחתך ופגמי פני שטח יכולים להגדיל ריכוז מאמץ ולהקטין חיי עייפות.", inspection: "בדיקת ממדים, אימות חומר ולעיתים מדידת עיבור באמצעות strain gauges תחת עומס.",
          tags: ["Stress", "Axial Load", "Strength"], related: ["MEC-002", "MEC-003"],
          example: { title: "מוט במתיחה", given: "כוח F = 20 kN, שטח A = 200 mm².", solution: "σ = 20,000 / 200", result: "σ = 100 MPa" },
          visualTitle: "מוט תחת עומס צירי", visualDescription: "כוחות שווים והפוכים יוצרים מאמץ נורמלי בחתך.", updatedAt: "2026-07-16"
        },
        {
          id: "term-mec-002", code: "MEC-002", name: "עיבור הנדסי", nameEn: "Engineering Strain", subtopic: "מאמץ ועיבור", aliases: ["Strain"], symbol: "ε", units: "ללא יחידות, µε", difficulty: "בסיסי",
          short: "השינוי היחסי באורך ביחס לאורך ההתחלתי.",
          definition: "עיבור הנדסי הוא היחס בין שינוי האורך של מדגם לאורך ההתחלתי שלו. הוא חסר ממד ולעיתים מוצג באחוזים או במיקרו־עיבור.",
          why: "עיבור מאפשר לתאר דפורמציה באופן בלתי תלוי באורך הדגם ולחבר בין תגובת המבנה לתכונות החומר.",
          formula: "ε = ΔL / L₀", formulaNote: "לעיבורים גדולים משתמשים לעיתים בעיבור אמיתי או בתיאור קינמטי מתקדם.",
          variables: [{ symbol: "ε", meaning: "עיבור הנדסי", unit: "—" }, { symbol: "ΔL", meaning: "שינוי באורך", unit: "mm" }, { symbol: "L₀", meaning: "אורך התחלתי", unit: "mm" }],
          uses: ["ניסוי מתיחה", "מדידת דפורמציה", "אימות מודל אלמנטים סופיים"], cautions: ["עיבור הוא יחס ולא שינוי אורך מוחלט.", "יש להגדיר אורך מדידה מתאים ולהימנע מהשפעת החלקה באחיזה."],
          standards: ["ISO 6892", "ASTM E8/E8M"], manufacturing: "תהליכי עיבוד קר יוצרים עיבור פלסטי שיכול לשנות חוזק, קשיות ומאמצים שיוריים.", inspection: "Extensometer, strain gauge, DIC או מדידת העתקה מדויקת.",
          tags: ["Strain", "Deformation", "Tensile Test"], related: ["MEC-001", "MEC-003"], visualTitle: "שינוי אורך יחסי", visualDescription: "העיבור משווה את ההתארכות ΔL לאורך ההתחלתי L₀.", updatedAt: "2026-07-16"
        },
        {
          id: "term-mec-003", code: "MEC-003", name: "מודול יאנג", nameEn: "Young's Modulus", subtopic: "אלסטיות", aliases: ["מודול אלסטיות"], symbol: "E", units: "Pa, GPa", difficulty: "בינוני",
          short: "שיפוע עקומת מאמץ–עיבור בתחום האלסטי הליניארי ומדד לקשיחות החומר.",
          definition: "מודול יאנג הוא היחס בין מאמץ נורמלי לעיבור בתחום שבו ההתנהגות בקירוב ליניארית ואלסטית. ערך גבוה מציין חומר קשיח יותר, כלומר נדרש מאמץ גדול יותר להשגת אותו עיבור.",
          why: "המודול משפיע על שקיעה, סטייה, תדרים טבעיים וחלוקת עומסים, אך אינו מדד ישיר לחוזק או לקשיות.",
          formula: "E = σ / ε", formulaNote: "תקף בתחום האלסטי הליניארי ובהעמסה חד־צירית.",
          variables: [{ symbol: "E", meaning: "מודול יאנג", unit: "Pa או GPa" }, { symbol: "σ", meaning: "מאמץ נורמלי", unit: "Pa" }, { symbol: "ε", meaning: "עיבור", unit: "—" }],
          uses: ["חישוב שקיעת קורות", "חישוב התארכות מוט", "מודלים אלסטיים ב-FEA"], cautions: ["חומר חזק אינו בהכרח קשיח יותר.", "המודול תלוי בטמפרטורה, כיוון סיבים ובחומרים מסוימים גם בקצב העמסה."],
          standards: ["ISO 6892", "ASTM E111"], manufacturing: "ברוב המתכות עיבוד רגיל משנה את חוזק הכניעה יותר מאשר את מודול יאנג; בחומרים מרוכבים הכיוון והתהליך קריטיים.", inspection: "ניסוי מתיחה עם מדידת עיבור מדויקת או שיטות דינמיות לא הרסניות.",
          tags: ["Elasticity", "Stiffness", "Material Property"], related: ["MEC-001", "MEC-002", "MEC-004"], visualTitle: "שיפוע התחום האלסטי", visualDescription: "E הוא השיפוע הליניארי הראשוני בעקומת מאמץ–עיבור.", updatedAt: "2026-07-16"
        },
        {
          id: "term-mec-004", code: "MEC-004", name: "מומנט כפיפה", nameEn: "Bending Moment", subtopic: "כפיפה", aliases: ["Moment"], symbol: "M", units: "N·m, N·mm", difficulty: "בינוני",
          short: "שקול פנימי של מאמצים הגורם לעיקום קורה סביב ציר נייטרלי.",
          definition: "מומנט כפיפה הוא מומנט פנימי בחתך המתנגד לעומסים החיצוניים המבקשים לכופף את הקורה. התפלגות המומנט לאורך הקורה נקבעת מתנאי התמיכה ומהעומסים, וממנה נגזרים מאמצי הכפיפה והעקמומיות.",
          why: "מיקום וערך המומנט המרבי הם בסיס לבחירת חתך, חומר, חיזוקים ומקדם בטיחות.",
          formula: "σ = M·y / I", formulaNote: "נוסחת כפיפה ליניארית לקורה הומוגנית, אלסטית ובעלת סטיות קטנות.",
          variables: [{ symbol: "σ", meaning: "מאמץ כפיפה", unit: "Pa" }, { symbol: "M", meaning: "מומנט כפיפה בחתך", unit: "N·m" }, { symbol: "y", meaning: "מרחק מהציר הנייטרלי", unit: "m" }, { symbol: "I", meaning: "מומנט אינרציה שני של החתך", unit: "m⁴" }],
          uses: ["תכן קורות", "זרועות ומנופים", "בדיקת שלדות ומסגרות"], cautions: ["יש להבדיל בין מומנט חיצוני לתרשים המומנט הפנימי.", "חתכים דקים, חומרים מרוכבים וסטיות גדולות יכולים לדרוש מודל מתקדם."],
          standards: ["Beam Theory"], manufacturing: "רדיוסים, ריתוכים וחורים באזורי מומנט גבוה עלולים ליצור ריכוזי מאמץ ועייפות.", inspection: "מדידת סטייה, strain gauges, בדיקות סדקים באזורי מאמץ גבוה והשוואה למודל חישובי.",
          tags: ["Beam", "Bending", "Stress"], related: ["MEC-001", "MEC-003"],
          example: { title: "קורה פשוט נתמכת עם עומס מרכזי", given: "עומס P = 4 kN, מפתח L = 2 m.", solution: "M_max = P·L/4 = 4·2/4", result: "M_max = 2 kN·m" },
          visualTitle: "תרשים מומנט בקורה", visualDescription: "בעומס מרכזי על קורה פשוט נתמכת, המומנט המרבי מתקבל במרכז.", updatedAt: "2026-07-16"
        }
      ]
    },
    {
      id: "domain-flow", name: "זרימה ומערכות נוזלים", nameEn: "Fluid Flow & Systems", prefix: "FLD", icon: "flow", color: "#2b6e9e",
      description: "ספיקה, משטרי זרימה, הפסדי לחץ והתנהגות של נוזלים וגזים בצנרת ובמערכות.", subtopics: ["ספיקה", "משטר זרימה", "הפסדי לחץ"],
      items: [
        {
          id: "term-fld-001", code: "FLD-001", name: "ספיקה נפחית", nameEn: "Volumetric Flow Rate", subtopic: "ספיקה", aliases: ["ספיקה", "Flow Rate"], symbol: "Q", units: "m³/s, L/min", difficulty: "בסיסי",
          short: "נפח זורם העובר דרך חתך נתון ביחידת זמן.", definition: "ספיקה נפחית מתארת את קצב מעבר הנפח דרך חתך. בזרימה חד־ממדית ממוצעת היא שווה למהירות הממוצעת כפול שטח החתך.", why: "הספיקה קובעת קיבולת מערכת, זמני מילוי, מהירויות בצנרת, הפסדי לחץ והספקי משאבות.",
          formula: "Q = A·v", formulaNote: "לשדה מהירות לא אחיד, הספיקה היא אינטגרל של רכיב המהירות הנורמלי על פני החתך.", variables: [{ symbol: "Q", meaning: "ספיקה נפחית", unit: "m³/s" }, { symbol: "A", meaning: "שטח חתך הזרימה", unit: "m²" }, { symbol: "v", meaning: "מהירות ממוצעת", unit: "m/s" }],
          uses: ["בחירת קוטר צינור", "אפיון משאבה", "חישוב זמן מילוי"], cautions: ["יש להבחין בין ספיקה נפחית לספיקה מסית.", "בגז דחיס הספיקה הנפחית תלויה בלחץ ובטמפרטורה שבהם היא מדווחת."], standards: ["ISO 5167"], manufacturing: "חספוס פנימי, קוטר בפועל ומעברים חדים משפיעים על המהירות ועל הפסדי הלחץ.", inspection: "מד ספיקה, מדידת הפרש לחץ, שקילה לאורך זמן או מדידה נפחית מכוילת.",
          tags: ["Flow", "Pipe", "Pump"], related: ["FLD-002", "FLD-003"], example: { title: "ספיקה בצינור", given: "שטח A = 0.002 m², מהירות ממוצעת v = 3 m/s.", solution: "Q = 0.002 · 3", result: "Q = 0.006 m³/s = 6 L/s" }, visualTitle: "מאזן זרימה בחתך", visualDescription: "הספיקה מתקבלת ממכפלת שטח החתך במהירות הממוצעת.", updatedAt: "2026-07-16"
        },
        {
          id: "term-fld-002", code: "FLD-002", name: "מספר ריינולדס", nameEn: "Reynolds Number", subtopic: "משטר זרימה", aliases: ["Re"], symbol: "Re", units: "ללא יחידות", difficulty: "בינוני",
          short: "מספר חסר ממד המבטא את היחס בין כוחות אינרציה לכוחות צמיגות.", definition: "מספר ריינולדס משמש לאפיון משטר הזרימה ולהערכת הנטייה לזרימה למינרית, מעברית או טורבולנטית. הערכים הקריטיים תלויים בגאומטריה ובהפרעות במערכת.", why: "משטר הזרימה משפיע באופן מהותי על הפסדי לחץ, מעבר חום, ערבוב ורעש.",
          formula: "Re = ρ·v·D / μ = v·D / ν", formulaNote: "בצינור לא עגול משתמשים לעיתים בקוטר הידראולי.", variables: [{ symbol: "ρ", meaning: "צפיפות הזורם", unit: "kg/m³" }, { symbol: "v", meaning: "מהירות אופיינית", unit: "m/s" }, { symbol: "D", meaning: "אורך אופייני או קוטר", unit: "m" }, { symbol: "μ", meaning: "צמיגות דינמית", unit: "Pa·s" }, { symbol: "ν", meaning: "צמיגות קינמטית", unit: "m²/s" }],
          uses: ["בחירת מקדם חיכוך", "תכנון מעבר חום", "השוואת ניסוי למודל"], cautions: ["אין להשתמש בסף יחיד לכל הגאומטריות.", "תכונות הזורם צריכות להילקח בטמפרטורת העבודה המתאימה."], standards: ["Fluid Mechanics"], manufacturing: "אי־עגילות, חספוס וחיבורים יכולים להקדים מעבר לטורבולנציה.", inspection: "חישוב מתוך ספיקה, קוטר ותכונות זורם מאומתות; ניתן לאמת משטר באמצעות מדידות לחץ או ויזואליזציה.",
          tags: ["Reynolds", "Laminar", "Turbulent"], related: ["FLD-001", "FLD-003"], visualTitle: "משטרי זרימה בצינור", visualDescription: "ב-Re נמוך שכבות הזרימה מסודרות; ב-Re גבוה מופיעות מערבולות וערבוב.", updatedAt: "2026-07-16"
        },
        {
          id: "term-fld-003", code: "FLD-003", name: "הפסד לחץ", nameEn: "Pressure Drop", subtopic: "הפסדי לחץ", aliases: ["Δp", "Head Loss"], symbol: "Δp", units: "Pa, bar", difficulty: "בינוני",
          short: "ירידת לחץ הנגרמת מחיכוך לאורך צינור ומאביזרים מקומיים.", definition: "הפסד לחץ הוא הפרש הלחצים הנדרש להתגבר על חיכוך, שינויי כיוון, הצרות, שסתומים ואביזרים. הוא מתורגם להספק משאבה או מדחס ולעלות אנרגטית.", why: "הערכת חסר תוביל לספיקה נמוכה מהנדרש; הערכת יתר תגרום לציוד גדול, יקר ובזבזני.",
          formula: "Δp = f·(L/D)·(ρv²/2) + ΣK·(ρv²/2)", formulaNote: "האיבר הראשון הוא הפסד מפוזר והאיבר השני הפסדים מקומיים.", variables: [{ symbol: "f", meaning: "מקדם חיכוך דארסי", unit: "—" }, { symbol: "L", meaning: "אורך צינור", unit: "m" }, { symbol: "D", meaning: "קוטר פנימי", unit: "m" }, { symbol: "K", meaning: "מקדם הפסד מקומי", unit: "—" }, { symbol: "ρ", meaning: "צפיפות", unit: "kg/m³" }, { symbol: "v", meaning: "מהירות ממוצעת", unit: "m/s" }],
          uses: ["בחירת משאבה", "איזון רשת צנרת", "תכנון שסתומים ומסננים"], cautions: ["יש להשתמש בקוטר הפנימי בפועל ובחספוס מתאים.", "הפסדים מקומיים עשויים לשלוט במערכות קצרות או צפופות באביזרים."], standards: ["Darcy–Weisbach"], manufacturing: "ריתוכים חודרים, קצוות חדים, קוטר לא אחיד והצטברות משקעים מגדילים הפסד לחץ.", inspection: "מדידת לחץ לפני ואחרי רכיב, אימות ספיקה והשוואה לעקומת מערכת.",
          tags: ["Pressure", "Pipe Loss", "Pump"], related: ["FLD-001", "FLD-002"], visualTitle: "ירידת לחץ לאורך קו", visualDescription: "הלחץ הכולל יורד לאורך הצינור ובקפיצות מקומיות על פני אביזרים.", updatedAt: "2026-07-16"
        }
      ]
    },
    {
      id: "domain-thermal", name: "תרמודינמיקה ומעבר חום", nameEn: "Thermodynamics & Heat Transfer", prefix: "THM", icon: "thermal", color: "#a8532a",
      description: "אנרגיה, הולכה, הסעה, קרינה ורכיבים להעברת חום במערכות הנדסיות.", subtopics: ["הולכה", "מחליפי חום"],
      items: [
        {
          id: "term-thm-001", code: "THM-001", name: "חוק פורייה להולכת חום", nameEn: "Fourier's Law of Heat Conduction", subtopic: "הולכה", aliases: ["Fourier Law"], symbol: "q̇", units: "W", difficulty: "בינוני",
          short: "קצב הולכת החום פרופורציונלי לגרדיאנט הטמפרטורה ולמוליכות התרמית.", definition: "חוק פורייה קובע ששטף החום בהולכה נע בכיוון הפוך לגרדיאנט הטמפרטורה. במקרה חד־ממדי יציב דרך קיר שטוח, קצב החום תלוי במוליכות, בשטח, בהפרש הטמפרטורות ובעובי.", why: "החוק משמש לתכנון בידוד, קירות, גופי קירור, מגעים תרמיים וניתוח פיזור חום.",
          formula: "q̇ = −k·A·dT/dx", formulaNote: "הסימן השלילי מציין זרימה מטמפרטורה גבוהה לנמוכה.", variables: [{ symbol: "q̇", meaning: "קצב מעבר חום", unit: "W" }, { symbol: "k", meaning: "מוליכות תרמית", unit: "W/(m·K)" }, { symbol: "A", meaning: "שטח מעבר", unit: "m²" }, { symbol: "dT/dx", meaning: "גרדיאנט טמפרטורה", unit: "K/m" }],
          uses: ["עובי בידוד", "גוף קירור", "ניתוח קיר רב־שכבתי"], cautions: ["מוליכות תרמית יכולה להשתנות עם הטמפרטורה והכיוון.", "התנגדות מגע תרמית עשויה להיות משמעותית גם כשהחומרים מוליכים היטב."], standards: ["Heat Transfer"], manufacturing: "שטיחות, לחץ מגע, חומר ממשק תרמי וחספוס משפיעים על התנגדות המגע.", inspection: "מדידת טמפרטורות, שטף חום והספק בתנאי גבול ידועים; מצלמה תרמית מסייעת לאיתור אי־אחידות.",
          tags: ["Conduction", "Thermal", "Insulation"], related: ["THM-002"], visualTitle: "הולכת חום דרך קיר", visualDescription: "החום זורם לאורך גרדיאנט הטמפרטורה מהצד החם לצד הקר.", updatedAt: "2026-07-16"
        },
        {
          id: "term-thm-002", code: "THM-002", name: "מחליף חום", nameEn: "Heat Exchanger", subtopic: "מחליפי חום", aliases: ["HX"], symbol: "Q̇", units: "W", difficulty: "בינוני",
          short: "רכיב המעביר חום בין זורמים או בין זורם למשטח, לרוב ללא ערבוב ישיר.", definition: "מחליף חום מעביר אנרגיה תרמית בין שני זרמים בעלי טמפרטורות שונות. ביצועיו תלויים במקדם מעבר החום הכולל, בשטח ובכוח המניע התרמי הממוצע.", why: "מחליפי חום נמצאים במערכות קירור, מיזוג, מנועים, תהליכים תעשייתיים ואלקטרוניקה.",
          formula: "Q̇ = U·A·ΔT_lm", formulaNote: "שיטת LMTD דורשת התאמה לסידור הזרימה; חלופה נפוצה היא שיטת effectiveness–NTU.", variables: [{ symbol: "Q̇", meaning: "קצב מעבר החום", unit: "W" }, { symbol: "U", meaning: "מקדם מעבר חום כולל", unit: "W/(m²·K)" }, { symbol: "A", meaning: "שטח מעבר חום", unit: "m²" }, { symbol: "ΔT_lm", meaning: "הפרש טמפרטורות לוגריתמי ממוצע", unit: "K" }],
          uses: ["רדיאטורים", "קונדנסרים", "קירור שמן", "מערכות HVAC"], cautions: ["הצטברות אבנית ולכלוך מורידה ביצועים ומגדילה הפסדי לחץ.", "יש לבדוק גם מאמצים תרמיים, רעידות וקורוזיה בין־חומרית."], standards: ["TEMA", "ASME BPVC"], manufacturing: "איכות הלחמה או ריתוך, עובי דופן, ניקיון פנימי ואטימה בין מעגלים קריטיים לביצועים ולאמינות.", inspection: "בדיקת אטימות, לחץ, זרימה, הפרשי טמפרטורה, תרמוגרפיה ולעיתים בדיקות לא הורסות לריתוכים וצינורות.",
          tags: ["Heat Exchanger", "Cooling", "LMTD"], related: ["THM-001", "FLD-003"], visualTitle: "זרימה נגדית במחליף חום", visualDescription: "שני הזרמים נעים בכיוונים מנוגדים ומגדילים את הכוח המניע התרמי הממוצע.", updatedAt: "2026-07-16"
        }
      ]
    },
    {
      id: "domain-metrology", name: "ייצור, מטרולוגיה ואיכות", nameEn: "Manufacturing, Metrology & Quality", prefix: "MET", icon: "metrology", color: "#536a3f",
      description: "שיטות ייצור ובחינה, מאפייני פני שטח, יכולת תהליך ומדידה קואורדינטית.", subtopics: ["מדידה קואורדינטית", "פני שטח", "יכולת תהליך"],
      items: [
        {
          id: "term-met-001", code: "MET-001", name: "מכונת מדידה קואורדינטית", nameEn: "Coordinate Measuring Machine", subtopic: "מדידה קואורדינטית", aliases: ["CMM"], symbol: "CMM", units: "µm, mm", difficulty: "בינוני",
          short: "מערכת מדידה תלת־ממדית הדוגמת נקודות או סורקת משטחים ומחשבת מאפיינים גאומטריים.", definition: "CMM מודדת קואורדינטות של נקודות על החלק באמצעות ראש מגע או חיישן אופטי. תוכנת המדידה מתאימה גאומטריות נומינליות, מממשת מערכת דאטומים ומעריכה ממדים וטולרנסים גאומטריים.", why: "המערכת מאפשרת בדיקה גמישה ומדויקת של חלקים מורכבים, אך איכות התוצאה תלויה באסטרטגיית הדגימה, ביישור, בכיול ובפרשנות התקן.",
          formula: "Measurement result = geometry fit + alignment + uncertainty", formulaNote: "המדידה אינה רק איסוף נקודות; אלגוריתם ההתאמה ומערכת הייחוס הם חלק מהתוצאה.", variables: [{ symbol: "fit", meaning: "שיטת התאמת הגאומטריה לנקודות", unit: "—" }, { symbol: "alignment", meaning: "מימוש מערכת הדאטומים", unit: "—" }, { symbol: "uncertainty", meaning: "אי־ודאות מדידה", unit: "µm" }],
          uses: ["בדיקת GD&T", "First Article Inspection", "השוואה למודל CAD", "ניתוח תהליך"], cautions: ["מעט נקודות עלולות להחמיץ חריגות צורה.", "Best-fit שאינו נדרש בשרטוט עלול להסתיר שגיאת מיקום אמיתית."], standards: ["ISO 10360", "ASME B89"], manufacturing: "יש לתכנן נקודות גישה, משטחי ייחוס ויכולת דפינה כבר בשלב התכן.", inspection: "כיול ראש, פיצוי טמפרטורה, תכנון אסטרטגיית נקודות, הערכת אי־ודאות ואימות מול גייג'ים או ארטיפקטים.",
          tags: ["CMM", "Inspection", "Metrology", "GD&T"], related: ["GDT-001", "GDT-004"], visualTitle: "בדיקה באמצעות ראש מגע", visualDescription: "הגשש דוגם נקודות במערכת קואורדינטות ומחשב מהן גאומטריה בפועל.", updatedAt: "2026-07-16"
        },
        {
          id: "term-met-002", code: "MET-002", name: "חספוס ממוצע Ra", nameEn: "Arithmetic Average Roughness", subtopic: "פני שטח", aliases: ["Ra", "Surface Roughness"], symbol: "Ra", units: "µm", difficulty: "בינוני",
          short: "הממוצע האריתמטי של הערכים המוחלטים של סטיות פרופיל החספוס מקו האמצע.", definition: "Ra הוא פרמטר נפוץ לתיאור גובה חספוס ממוצע לאורך אורך הערכה. הוא מרכז מידע רב למספר יחיד ולכן אינו מתאר לבדו צורת שיאים, עמקים, כיווניות או תפקוד משטח.", why: "פני השטח משפיעים על חיכוך, איטום, עייפות, שחיקה, צביעה, הידבקות ומגע תרמי.",
          formula: "Ra = (1/L) · ∫₀ᴸ |z(x)| dx", formulaNote: "במדידה דיגיטלית האינטגרל מיושם כסכום על דגימות לאחר סינון מתאים.", variables: [{ symbol: "Ra", meaning: "חספוס ממוצע אריתמטי", unit: "µm" }, { symbol: "L", meaning: "אורך הערכה", unit: "mm" }, { symbol: "z(x)", meaning: "סטיית הפרופיל מקו האמצע", unit: "µm" }],
          uses: ["משטחי אטימה", "מיסבים והחלקה", "הכנה לציפוי", "מגע תרמי"], cautions: ["שני משטחים עם Ra זהה יכולים להיות בעלי התנהגות שונה לחלוטין.", "יש להגדיר cutoff, כיוון מדידה ופרמטרים משלימים לפי הפונקציה."], standards: ["ISO 21920", "ASME B46.1"], manufacturing: "חריטה, כרסום, השחזה, ליטוש וציפוי יוצרים טופוגרפיות שונות גם באותו Ra.", inspection: "פרופילומטר מגע, אינטרפרומטר אופטי או מיקרוסקופ קונפוקלי, עם סינון ואורך הערכה מוגדרים.",
          tags: ["Surface", "Roughness", "Ra", "Finish"], related: ["GDT-003"], visualTitle: "פרופיל חספוס סביב קו האמצע", visualDescription: "Ra מחשב את ממוצע הערכים המוחלטים של סטיות הפרופיל.", updatedAt: "2026-07-16"
        },
        {
          id: "term-met-003", code: "MET-003", name: "מדד יכולת תהליך Cpk", nameEn: "Process Capability Index Cpk", subtopic: "יכולת תהליך", aliases: ["Cpk"], symbol: "Cpk", units: "ללא יחידות", difficulty: "מתקדם",
          short: "מדד המשווה את פיזור התהליך והמרכוז שלו לגבולות המפרט.", definition: "Cpk מעריך עד כמה תהליך יציב ומקורב לנורמלי מסוגל לייצר בתוך גבולות המפרט, תוך התחשבות במרחק הממוצע מהגבול הקרוב. המדד אינו תחליף לבדיקת יציבות סטטיסטית או להבנת מערכת המדידה.", why: "המדד מסייע להחליט אם תהליך מתאים לייצור סדרתי, לזהות חוסר מרכוז ולתעדף פעולות שיפור.",
          formula: "Cpk = min[(USL − μ)/(3σ), (μ − LSL)/(3σ)]", formulaNote: "הפרשנות תקפה רק כאשר התהליך יציב והמודל הסטטיסטי מתאים לנתונים.", variables: [{ symbol: "USL", meaning: "גבול מפרט עליון", unit: "יחידת המאפיין" }, { symbol: "LSL", meaning: "גבול מפרט תחתון", unit: "יחידת המאפיין" }, { symbol: "μ", meaning: "ממוצע התהליך", unit: "יחידת המאפיין" }, { symbol: "σ", meaning: "סטיית תקן של התהליך", unit: "יחידת המאפיין" }],
          uses: ["אישור תהליך", "SPC", "מעקב ספקים", "שיפור מרכוז"], cautions: ["Cpk גבוה מחישוב קצר אינו מוכיח יציבות לאורך זמן.", "אי־ודאות או שונות של מערכת המדידה מנפחות את σ הנצפה."], standards: ["Statistical Process Control", "AIAG SPC"], manufacturing: "שיפור Cpk דורש הקטנת שונות, מרכוז התהליך ותחזוקת כלי, חומר ותנאי סביבה.", inspection: "יש לבצע MSA מתאימה, לאסוף דגימה מייצגת ולבחון תרשימי בקרה לפני חישוב יכולת.",
          tags: ["Cpk", "SPC", "Quality", "Capability"], related: ["MET-001"], example: { title: "חישוב Cpk", given: "USL = 10.20, LSL = 9.80, μ = 10.05, σ = 0.04.", solution: "Cpu = (10.20−10.05)/(3·0.04)=1.25\nCpl = (10.05−9.80)/(3·0.04)=2.08", result: "Cpk = 1.25" }, visualTitle: "התפלגות מול גבולות מפרט", visualDescription: "Cpk נקבע לפי המרחק המתוקנן מהגבול הקרוב יותר לממוצע התהליך.", updatedAt: "2026-07-16"
        }
      ]
    },
    hierarchyDemoDomain()
  ];
}

const DEFAULT_PREFS = {
  theme: "light",
  favorites: [],
  progress: {},
  recent: [],
  view: "grid",
  profileName: "",
};
const DEFAULT_SETTINGS = {
  pin: "1234",
  contentPin: "1234",
  superPin: "9999",
  uiRefreshVersion: 0,
  hierarchyDemoVersion: 0,
  colorDepthVersion: 0,
  appearance: {
    primary: "#0f3d5e",
    background: "#dce7ec",
    surface: "#f2f6f7",
    font: "Arial",
    fontSize: 17,
    radius: 14,
    density: "comfortable",
    buttonShadow: "dynamic",
    buttonHoverScale: 1.04,
    buttonActiveScale: 0.97,
  },
  fields: {
    symbol: true,
    units: true,
    formula: true,
    standards: true,
    example: true,
    cautions: true,
    manufacturing: true,
    inspection: true,
    related: true,
  },
};
const DEFAULT_META = {
  schemaVersion: SCHEMA_VERSION,
  appVersion: APP_VERSION,
  dataRevision: 0,
  dataSource: "embedded",
  lastSavedAt: "",
  lastContentChangeAt: "",
  lastBackupAt: "",
  backupNeeded: false,
  contentBackupNeeded: false,
  systemBackupNeeded: false,
  lastContentBackupAt: "",
  lastSystemBackupAt: "",
};

function safeLoad(key, fallback) {
  try {
    const parsed = JSON.parse(storage.getItem(key));
    return parsed ?? clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function normalizeVariables(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") {
      const [symbol = "", meaning = "", unit = ""] = item.split("|").map((x) => x.trim());
      return { symbol, meaning, unit };
    }
    return { symbol: item?.symbol || "", meaning: item?.meaning || "", unit: item?.unit || "" };
  }).filter((item) => item.symbol || item.meaning || item.unit);
}

function cleanRichHtml(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  const template = document.createElement("template");
  template.innerHTML = source;
  const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H3", "H4", "BLOCKQUOTE", "A"]);
  const walk = (node) => {
    [...node.children].forEach((child) => {
      if (!allowed.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        return;
      }
      [...child.attributes].forEach((attr) => {
        const okay = child.tagName === "A" && ["href", "target", "rel"].includes(attr.name.toLowerCase());
        if (!okay) child.removeAttribute(attr.name);
      });
      if (child.tagName === "A") {
        const href = child.getAttribute("href") || "";
        if (!/^(https?:|mailto:|#)/i.test(href)) child.removeAttribute("href");
        child.setAttribute("target", "_blank"); child.setAttribute("rel", "noopener noreferrer");
      }
      walk(child);
    });
  };
  walk(template.content);
  return template.innerHTML;
}

function plainRichText(value) {
  const template = document.createElement("template");
  template.innerHTML = cleanRichHtml(value);
  return (template.content.textContent || "").replace(/\s+/g, " ").trim();
}

function isDirectTermSubtopic(value) {
  return !String(value || "").trim() || String(value).trim() === "כללי";
}

function termLocationLabel(value, subSubtopic = "") {
  const parent = isDirectTermSubtopic(value) ? "ישירות בתחום" : String(value).trim();
  return subSubtopic ? `${parent} › ${String(subSubtopic).trim()}` : parent;
}

function normalizeSubSubtopics(value) {
  const list = Array.isArray(value) ? value : [];
  const names = new Set();
  return list.map((item) => typeof item === "string" ? { id: uid(), name: item.trim(), description: "", color: "" } : {
    id: item?.id || uid(), name: String(item?.name || "").trim(), description: String(item?.description || "").trim(), color: String(item?.color || "").trim(),
  }).filter((item) => item.name && !names.has(item.name) && names.add(item.name));
}

function normalizeSubtopics(value) {
  const list = Array.isArray(value) ? value : [];
  const names = new Set();
  return list.map((item) => typeof item === "string" ? { id: uid(), name: item.trim(), description: "", color: "", children: [] } : {
    id: item?.id || uid(), name: String(item?.name || "").trim(), description: String(item?.description || "").trim(), color: String(item?.color || "").trim(), children: normalizeSubSubtopics(item?.children || item?.subtopics),
  }).filter((item) => item.name && !isDirectTermSubtopic(item.name) && !names.has(item.name) && names.add(item.name));
}

function normalizeTerm(raw = {}, domainPrefix = "GEN") {
  const code = String(raw.code || `${domainPrefix}-${Math.floor(Math.random() * 900 + 100)}`).trim();
  return {
    id: raw.id || uid(),
    code,
    name: raw.name || "מושג ללא שם",
    nameEn: raw.nameEn || "",
    subtopic: raw.subtopic || "כללי",
    subSubtopic: String(raw.subSubtopic || raw.subsubtopic || "").trim(),
    aliases: Array.isArray(raw.aliases) ? raw.aliases : splitCsv(raw.aliases),
    symbol: raw.symbol || "",
    units: raw.units || "",
    short: raw.short || plainRichText(raw.definitionHtml || raw.definition) || "",
    definition: plainRichText(raw.definitionHtml || raw.definition || raw.short),
    definitionHtml: cleanRichHtml(raw.definitionHtml || raw.definition || raw.short),
    why: raw.why || "",
    formula: raw.formula || "",
    formulaNote: raw.formulaNote || "",
    variables: normalizeVariables(raw.variables),
    uses: Array.isArray(raw.uses) ? raw.uses : splitCsv(raw.uses),
    cautions: Array.isArray(raw.cautions) ? raw.cautions : [],
    standards: Array.isArray(raw.standards) ? raw.standards : splitCsv(raw.standards),
    manufacturing: raw.manufacturing || "",
    inspection: raw.inspection || "",
    tags: Array.isArray(raw.tags) ? raw.tags : splitCsv(raw.tags),
    related: Array.isArray(raw.related) ? raw.related : splitCsv(raw.related),
    example: raw.example && typeof raw.example === "object" ? {
      title: raw.example.title || "",
      given: raw.example.given || "",
      solution: raw.example.solution || "",
      result: raw.example.result || "",
    } : { title: "", given: "", solution: "", result: "" },
    imageName: raw.imageName || raw.name || "",
    imageData: raw.imageData || "",
    visualTitle: raw.visualTitle || raw.name || "",
    visualDescription: raw.visualDescription || "",
    createdAt: raw.createdAt || raw.updatedAt || todayIso(),
    updatedAt: raw.updatedAt || todayIso(),
  };
}

function normalizeDomain(raw = {}, index = 0) {
  const prefix = String(raw.prefix || `D${index + 1}`).trim().toUpperCase();
  return {
    id: raw.id || uid(),
    name: raw.name || `תחום ${index + 1}`,
    nameEn: raw.nameEn || "",
    prefix,
    icon: raw.icon || "general",
    color: raw.color || "#246b87",
    description: raw.description || "",
    subtopics: normalizeSubtopics(raw.subtopics),
    items: Array.isArray(raw.items) ? raw.items.map((term) => normalizeTerm(term, prefix)) : [],
  };
}

function normalizeData(value) {
  if (!Array.isArray(value)) throw new Error("מבנה הנתונים אינו תקין");
  return value.map(normalizeDomain);
}


function uniqueTermCode(baseCode, excludedId = "") {
  const base = String(baseCode || "TERM-COPY").trim().toUpperCase();
  const used = new Set(allTerms().filter((term) => term.id !== excludedId).map((term) => normalizeText(term.code)));
  if (!used.has(normalizeText(base))) return base;
  let counter = 2;
  while (used.has(normalizeText(`${base}-${counter}`))) counter += 1;
  return `${base}-${counter}`;
}

function catalogIntegrityReport(candidateData = data) {
  const issues = [];
  const ids = new Map();
  const codes = new Map();
  const domains = Array.isArray(candidateData) ? candidateData : [];
  const referenceIndex = new Set(domains.flatMap((domain) => (domain.items || []).flatMap((term) => [term.id, term.code, term.name, term.nameEn]).map(normalizeText).filter(Boolean)));
  domains.forEach((domain, domainIndex) => {
    if (!String(domain.name || "").trim()) issues.push(`תחום ${domainIndex + 1}: חסר שם`);
    if (!String(domain.prefix || "").trim()) issues.push(`תחום ${domain.name || domainIndex + 1}: חסרה קידומת`);
    (domain.items || []).forEach((term, termIndex) => {
      const label = term.name || `${domain.name || "תחום"}/${termIndex + 1}`;
      if (!String(term.name || "").trim()) issues.push(`${label}: חסר שם מושג`);
      if (!plainRichText(term.definitionHtml || term.definition || term.short)) issues.push(`${label}: חסרה הגדרה`);
      const idKey = String(term.id || "");
      const codeKey = normalizeText(term.code);
      if (!idKey) issues.push(`${label}: חסר מזהה פנימי`);
      else if (ids.has(idKey)) issues.push(`${label}: מזהה כפול עם ${ids.get(idKey)}`);
      else ids.set(idKey, label);
      if (!codeKey) issues.push(`${label}: חסר קוד`);
      else if (codes.has(codeKey)) issues.push(`${label}: קוד כפול עם ${codes.get(codeKey)}`);
      else codes.set(codeKey, label);
      (term.related || []).forEach((ref) => { if (!referenceIndex.has(normalizeText(ref))) issues.push(`${label}: קישור קשור שבור — ${ref}`); });
    });
  });
  return issues;
}

function repairCatalogIntegrity(candidateData = data) {
  const usedIds = new Set();
  const usedCodes = new Set();
  candidateData.forEach((domain) => {
    domain.id = domain.id && !usedIds.has(domain.id) ? domain.id : uid();
    usedIds.add(domain.id);
    domain.items = Array.isArray(domain.items) ? domain.items : [];
    domain.items.forEach((term) => {
      term.id = term.id && !usedIds.has(term.id) ? term.id : uid();
      usedIds.add(term.id);
      const base = String(term.code || `${domain.prefix || "GEN"}-001`).trim().toUpperCase();
      let code = base;
      let counter = 2;
      while (usedCodes.has(normalizeText(code))) code = `${base}-${counter++}`;
      term.code = code;
      usedCodes.add(normalizeText(code));
    });
  });
  const validIds = new Set(candidateData.flatMap((domain) => domain.items.map((term) => term.id)));
  const validRefs = new Set(candidateData.flatMap((domain) => domain.items.flatMap((term) => [normalizeText(term.id), normalizeText(term.code), normalizeText(term.name), normalizeText(term.nameEn)]).filter(Boolean)));
  candidateData.forEach((domain) => domain.items.forEach((term) => {
    term.related = unique((term.related || []).filter((ref) => validRefs.has(normalizeText(ref))));
  }));
  prefs.favorites = unique((prefs.favorites || []).filter((id) => validIds.has(id)));
  prefs.recent = unique((prefs.recent || []).filter((id) => validIds.has(id))).slice(0, 20);
  Object.keys(prefs.progress || {}).forEach((id) => { if (!validIds.has(id)) delete prefs.progress[id]; });
  return candidateData;
}

function createRecoverySnapshot(reason) {
  try {
    const previous = safeLoad(KEYS.recovery, []);
    const snapshots = Array.isArray(previous) ? previous : [];
    snapshots.unshift({
      id: uid(), reason: String(reason || "שינוי מערכת"), createdAt: new Date().toISOString(),
      appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION,
      data: clone(data), prefs: clone(prefs), settings: settingsForBackup(), meta: clone(meta),
    });
    storage.setItem(KEYS.recovery, JSON.stringify(snapshots.slice(0, RECOVERY_LIMIT)));
  } catch (error) { console.warn("Recovery snapshot failed", error); }
}

const modalFocusState = new WeakMap();
const MODAL_OVERLAY_IDS = ["termOverlay", "adminOverlay", "pinOverlay", "progressOverlay"];
function modalOverlays() {
  return MODAL_OVERLAY_IDS.map($).filter(Boolean);
}
function visibleModalOverlays() {
  return modalOverlays().filter((overlay) => !overlay.classList.contains("hidden") && overlay.getAttribute("aria-hidden") !== "true");
}
function modalFocusable(overlay) {
  return $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])', overlay).filter((element) => element.offsetParent !== null && element.getAttribute("aria-hidden") !== "true");
}
function rememberModalOpener(overlay, explicitOpener = null) {
  if (!overlay) return;
  const opener = explicitOpener || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  modalFocusState.set(overlay, opener);
}
function focusElement(element) {
  if (!element || typeof element.focus !== "function") return false;
  try { element.focus({ preventScroll: true }); }
  catch (_error) { element.focus(); }
  return document.activeElement === element;
}
function restoreModalOpener(overlay) {
  const opener = overlay ? modalFocusState.get(overlay) : null;
  if (opener && document.contains(opener)) focusElement(opener);
}
function syncModalEnvironment() {
  const hasOpenModal = visibleModalOverlays().length > 0;
  document.body.classList.toggle("modal-open", hasOpenModal);
  document.body.style.overflow = hasOpenModal ? "hidden" : "";
  const appShell = document.querySelector(".app-shell");
  if (appShell) {
    if (hasOpenModal) {
      if ("inert" in appShell) appShell.inert = true;
      appShell.setAttribute("aria-hidden", "true");
    } else {
      appShell.removeAttribute("aria-hidden");
      if ("inert" in appShell) appShell.inert = false;
    }
  }
}
function setModalVisibility(overlay, isOpen, options = {}) {
  if (!overlay) return;
  if (isOpen) {
    rememberModalOpener(overlay, options.opener || null);
    overlay.style.zIndex = ++window.highestModalZIndex || (window.highestModalZIndex = 1100);
    overlay.classList.remove("hidden");
    if ("inert" in overlay) overlay.inert = false;
    overlay.setAttribute("aria-hidden", "false");
    const initialFocus = options.initialFocus || modalFocusable(overlay)[0] || overlay;
    focusElement(initialFocus);
  } else {
    if (overlay.contains(document.activeElement) && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    if ("inert" in overlay) overlay.inert = true;
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }
  syncModalEnvironment();
  if (!isOpen && options.restoreFocus !== false) restoreModalOpener(overlay);
}
document.addEventListener("keydown", (event) => {
  const overlays = visibleModalOverlays();
  const overlay = overlays[overlays.length - 1];
  if (!overlay) return;
  if (event.key === "Escape") {
    event.preventDefault();
    if (overlay.id === "termOverlay") closeTerm();
    else if (overlay.id === "adminOverlay") closeAdmin();
    else if (overlay.id === "pinOverlay") closePinDialog();
    else if (overlay.id === "progressOverlay") closeProgressDialog();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = modalFocusable(overlay);
  if (!focusable.length) { event.preventDefault(); overlay.focus(); return; }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}, true);

function loadInitialState() {
  let data;
  let dataSource = "embedded";
  if (storage.getItem(KEYS.data)) {
    data = normalizeData(safeLoad(KEYS.data, sampleData()));
    dataSource = "local";
  } else if (storage.getItem(KEYS.legacyData)) {
    data = normalizeData(safeLoad(KEYS.legacyData, sampleData()));
    dataSource = "legacy-local";
  } else if (Array.isArray(window.MECHLEX_SHARED_DATA) && window.MECHLEX_SHARED_DATA.length) {
    data = normalizeData(window.MECHLEX_SHARED_DATA);
  } else {
    data = normalizeData(sampleData());
    dataSource = "sample";
  }

  let prefs;
  if (storage.getItem(KEYS.prefs)) {
    prefs = { ...clone(DEFAULT_PREFS), ...safeLoad(KEYS.prefs, DEFAULT_PREFS) };
  } else if (storage.getItem(KEYS.legacyPrefs)) {
    const old = safeLoad(KEYS.legacyPrefs, {});
    const progress = {};
    (old.learned || []).forEach((id) => { progress[id] = "mastered"; });
    prefs = { ...clone(DEFAULT_PREFS), theme: old.theme || "light", favorites: old.favorites || [], progress };
  } else {
    prefs = clone(DEFAULT_PREFS);
  }
  prefs.favorites = unique(prefs.favorites || []);
  prefs.recent = unique(prefs.recent || []).slice(0, 20);
  prefs.progress = prefs.progress && typeof prefs.progress === "object" ? prefs.progress : {};
  prefs.view = prefs.view === "list" ? "list" : "grid";
  prefs.profileName = String(prefs.profileName || "");

  let settings;
  if (storage.getItem(KEYS.settings)) {
    const loaded = safeLoad(KEYS.settings, DEFAULT_SETTINGS);
    settings = {
      ...clone(DEFAULT_SETTINGS),
      ...loaded,
      appearance: { ...clone(DEFAULT_SETTINGS.appearance), ...(loaded.appearance || loaded.design || {}) },
      fields: { ...clone(DEFAULT_SETTINGS.fields), ...(loaded.fields || {}) },
    };
  } else if (storage.getItem(KEYS.legacySettings)) {
    const old = safeLoad(KEYS.legacySettings, {});
    settings = {
      ...clone(DEFAULT_SETTINGS),
      appearance: { ...clone(DEFAULT_SETTINGS.appearance), ...(old.design || {}) },
      fields: { ...clone(DEFAULT_SETTINGS.fields), ...(old.fields || {}) },
    };
  } else {
    settings = clone(DEFAULT_SETTINGS);
  }
  settings.contentPin = String(settings.contentPin || settings.pin || "1234");
  settings.superPin = String(settings.superPin || "9999");
  if (Number(settings.uiRefreshVersion || 0) < 2) {
    settings.appearance.fontSize = Math.max(17, Number(settings.appearance.fontSize) || 17);
    settings.appearance.radius = Math.max(14, Number(settings.appearance.radius) || 14);
    settings.appearance.density = "comfortable";
    settings.uiRefreshVersion = 2;
  }
  if (Number(settings.colorDepthVersion || 0) < 1) {
    settings.appearance.background = "#dce7ec";
    settings.appearance.surface = "#f2f6f7";
    settings.colorDepthVersion = 1;
  }
  const loadedMeta = safeLoad(KEYS.meta, DEFAULT_META);
  const meta = {
    ...clone(DEFAULT_META),
    ...loadedMeta,
    appVersion: APP_VERSION,
    dataSource,
  };
  if (!Object.prototype.hasOwnProperty.call(loadedMeta, "contentBackupNeeded") && loadedMeta.backupNeeded) {
    meta.contentBackupNeeded = true;
    meta.systemBackupNeeded = true;
  }

  meta.schemaVersion = SCHEMA_VERSION;
  return { data, prefs, settings, meta };
}

let { data, prefs, settings, meta } = loadInitialState();
repairCatalogIntegrity(data);
let state = {
  collection: "all",
  domainId: "all",
  query: "",
  subtopic: "all",
  subSubtopic: "all",
  sort: "relevance",
  currentTermId: null,
  currentDomainId: null,
  termTab: "overview",
  detailTab: "context",
  adminTab: "terms",
  adminUnlocked: false,
  adminRole: "content", // "content" | "super"
  editingTermId: null,
  editingDomainId: null,
  embeddedImageData: "",
  randomSession: false,
  randomQueue: [],
  randomScopeIds: [],
  randomCycleSize: 0,
  randomCyclePosition: 0,
};
let saveTimer;

function allTerms() {
  return data.flatMap((domain, domainIndex) => domain.items.map((term, termIndex) => ({
    ...term,
    domainId: domain.id,
    domainName: domain.name,
    domainNameEn: domain.nameEn,
    domainColor: domain.color,
    domainIcon: domain.icon,
    domainIndex,
    termIndex,
  })));
}

function findTerm(idOrCodeOrName) {
  const target = normalizeText(idOrCodeOrName);
  return allTerms().find((term) => term.id === idOrCodeOrName || normalizeText(term.code) === target || normalizeText(term.name) === target || normalizeText(term.nameEn) === target);
}

function getTermStatus(id) {
  return ["learning", "mastered"].includes(prefs.progress[id]) ? prefs.progress[id] : "none";
}

function formatBackupDate(value, emptyMessage = "טרם הורד גיבוי") {
  if (!value) return emptyMessage;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "מועד הגיבוי אינו ידוע";
  return `הגיבוי האחרון הורד ב-${new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(date)}`;
}

function updateBackupStatus() {
  if ($("backupStatus")) {
    const contentNeeded = Boolean(meta.contentBackupNeeded);
    const systemNeeded = Boolean(meta.systemBackupNeeded);
    const hasDownloadedBackup = Boolean(meta.lastContentBackupAt || meta.lastSystemBackupAt || meta.lastBackupAt);
    $("backupStatus").innerHTML = `
      <strong>${contentNeeded || systemNeeded ? "יש שינויים שטרם גובו לקובץ" : hasDownloadedBackup ? "אין כרגע שינויים שממתינים לגיבוי" : "קובצי גיבוי בסיס נמצאים בתיקיית backups"}</strong>
      <span>גיבוי תוכן: ${esc(formatBackupDate(meta.lastContentBackupAt, "קובץ בסיס בחבילה"))}${contentNeeded ? " · דורש עדכון" : ""}</span>
      <span>גיבוי אדמין ראשי: ${esc(formatBackupDate(meta.lastSystemBackupAt || meta.lastBackupAt, "קובץ בסיס בחבילה"))}${systemNeeded ? " · דורש עדכון" : ""}</span>`;
    $("backupStatus").classList.toggle("needs-backup", contentNeeded || systemNeeded);
  }
}

function saveAll(message = "נשמר אוטומטית במחשב זה", options = {}) {
  clearTimeout(saveTimer);
  repairCatalogIntegrity(data);
  const now = new Date().toISOString();
  meta.appVersion = APP_VERSION;
  meta.lastSavedAt = now;
  if (options.backupRelevant) {
    meta.dataRevision = Number(meta.dataRevision || 0) + 1;
    meta.lastContentChangeAt = now;
    meta.backupNeeded = true;
    if (options.backupRelevant === "system") {
      meta.systemBackupNeeded = true;
    } else {
      meta.contentBackupNeeded = true;
      meta.systemBackupNeeded = true;
    }
  }
  if (options.contentBackupCompleted) {
    meta.lastContentBackupAt = now;
    meta.contentBackupNeeded = false;
    meta.backupNeeded = Boolean(meta.systemBackupNeeded);
  }
  if (options.backupCompleted || options.fullBackupCompleted) {
    meta.lastBackupAt = now;
    meta.lastContentBackupAt = now;
    meta.lastSystemBackupAt = now;
    meta.backupNeeded = false;
    meta.contentBackupNeeded = false;
    meta.systemBackupNeeded = false;
  }
  $("saveState").textContent = "שומר שינויים…";
  $("saveState").className = "save-state saving";
  try {
    storage.setItem(KEYS.data, JSON.stringify(data));
    storage.setItem(KEYS.prefs, JSON.stringify(prefs));
    storage.setItem(KEYS.settings, JSON.stringify(settings));
    storage.setItem(KEYS.meta, JSON.stringify(meta));
  } catch (error) {
    storageIsPersistent = false;
    storage = memoryStorage;
    storage.setItem(KEYS.data, JSON.stringify(data));
    storage.setItem(KEYS.prefs, JSON.stringify(prefs));
    storage.setItem(KEYS.settings, JSON.stringify(settings));
    storage.setItem(KEYS.meta, JSON.stringify(meta));
    message = "השמירה הקבועה נכשלה · הורד גיבוי מלא עכשיו";
    console.error("MechLex persistent save failed", error);
  }
  if (!storageIsPersistent) message = "השמירה הקבועה חסומה · הורד גיבוי מלא עכשיו";
  updateBackupStatus();
  saveTimer = setTimeout(() => {
    $("saveState").textContent = message;
    $("saveState").className = `save-state ${storageIsPersistent ? "saved" : "storage-error"}`;
  }, 350);
  return storageIsPersistent;
}

function applyAppearance() {
  const root = document.documentElement;
  const appearance = settings.appearance;
  root.style.setProperty("--primary", appearance.primary);
  root.style.setProperty("--bg", appearance.background);
  root.style.setProperty("--surface", appearance.surface);
  root.style.setProperty("--font-family", appearance.font);
  root.style.setProperty("--font-size", `${appearance.fontSize}px`);
  root.style.setProperty("--radius", `${appearance.radius}px`);
  root.style.setProperty("--btn-hover-scale", appearance.buttonHoverScale || 1.04);
  root.style.setProperty("--btn-active-scale", appearance.buttonActiveScale || 0.97);

  const shadowMap = {
    none: "none",
    soft: "0 4px 12px rgba(15, 61, 94, 0.14)",
    dynamic: "0 8px 22px rgba(15, 61, 94, 0.24)",
    deep: "0 14px 32px rgba(15, 61, 94, 0.35), 0 0 0 1px rgba(255,255,255,0.4)"
  };
  root.style.setProperty("--btn-shadow", shadowMap[appearance.buttonShadow] || shadowMap.dynamic);

  document.body.classList.toggle("dark", prefs.theme === "dark");
  document.body.classList.toggle("compact", appearance.density === "compact");
  document.body.classList.toggle("mindmap-view-active", prefs.view === "mindmap");
  $("dictionary").classList.toggle("list-view", prefs.view === "list");
  $("dictionary").classList.toggle("hidden", prefs.view === "mindmap");
  $("mindMapContainer")?.classList.toggle("hidden", prefs.view !== "mindmap");
  $("gridViewBtn").classList.toggle("active", prefs.view === "grid");
  $("listViewBtn").classList.toggle("active", prefs.view === "list");
  $("mindMapViewBtn")?.classList.toggle("active", prefs.view === "mindmap");
}

function iconSvg(type, title = "") {
  const safeTitle = esc(title);
  const grid = `<defs><pattern id="grid-${type}" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="currentColor" opacity=".10" stroke-width="1"/></pattern><marker id="arrow-${type}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0l10 5-10 5z" fill="currentColor"/></marker></defs><rect width="800" height="470" rx="18" fill="url(#grid-${type})"/>`;
  const commonText = `<text x="40" y="54" fill="currentColor" opacity=".75" font-family="Arial" font-size="18">${safeTitle}</text>`;
  const drawings = {
    gdt: `<g fill="none" stroke="currentColor" stroke-width="4"><rect x="180" y="145" width="390" height="190" rx="8"/><circle cx="305" cy="240" r="36"/><circle cx="450" cy="240" r="36"/><path d="M150 360h460M180 335v46M570 335v46"/><path d="M305 105v70M450 105v70" stroke-dasharray="8 7"/><rect x="230" y="385" width="265" height="48"/><path d="M296 385v48M385 385v48"/></g><g fill="currentColor" font-family="Arial" font-size="22"><text x="246" y="416">⌖</text><text x="318" y="416">⌀0.10</text><text x="410" y="416">A | B | C</text><text x="603" y="371">A</text><text x="295" y="98">BASIC</text></g>`,
    mechanics: `<g fill="none" stroke="currentColor" stroke-width="4"><path d="M130 295H665"/><path d="M170 295l-35 55h70zM620 295l-35 55h70z"/><path d="M400 95v150" marker-end="url(#arrow-${type})"/><path d="M170 385h450" marker-start="url(#arrow-${type})" marker-end="url(#arrow-${type})"/><path d="M170 366v38M620 366v38"/></g><g fill="currentColor" font-family="Arial" font-size="22"><text x="414" y="120">P</text><text x="385" y="420">L</text><text x="388" y="270">Mmax</text></g>`,
    flow: `<g fill="none" stroke="currentColor" stroke-width="5"><path d="M110 160h580v160H110z"/><path d="M155 240h480" marker-end="url(#arrow-${type})"/><path d="M220 200h130M220 280h130M420 200h130M420 280h130" marker-end="url(#arrow-${type})" opacity=".65"/><path d="M150 360h500" marker-start="url(#arrow-${type})" marker-end="url(#arrow-${type})"/></g><g fill="currentColor" font-family="Arial" font-size="22"><text x="360" y="130">Q = A·v</text><text x="380" y="397">D</text></g>`,
    thermal: `<g fill="none" stroke="currentColor" stroke-width="5"><path d="M120 170h560M120 300h560"/><path d="M150 170h470" marker-end="url(#arrow-${type})"/><path d="M650 300H180" marker-end="url(#arrow-${type})"/><path d="M170 218c40-50 80 50 120 0s80 50 120 0 80 50 120 0 80 50 120 0"/></g><g fill="currentColor" font-family="Arial" font-size="22"><text x="125" y="145">HOT</text><text x="590" y="335">COLD</text><text x="333" y="410">Q̇ = U·A·ΔT</text></g>`,
    metrology: `<g fill="none" stroke="currentColor" stroke-width="4"><rect x="110" y="330" width="580" height="55"/><rect x="205" y="235" width="390" height="95" rx="8"/><path d="M400 90v115"/><circle cx="400" cy="220" r="15" fill="currentColor"/><path d="M165 90h470M165 90v240M635 90v240"/><path d="M205 420h390" marker-start="url(#arrow-${type})" marker-end="url(#arrow-${type})"/></g><g fill="currentColor" font-family="Arial" font-size="22"><text x="420" y="150">PROBE</text><text x="355" y="455">X / Y / Z</text></g>`,
    manufacturing: `<g fill="none" stroke="currentColor" stroke-width="4"><rect x="150" y="250" width="500" height="100"/><circle cx="400" cy="180" r="70"/><path d="M400 110v-35M400 285v-35M330 180h-35M505 180h-35M350 130l-25-25M475 255l-25-25M450 130l25-25M325 255l25-25"/><path d="M130 400h540" marker-start="url(#arrow-${type})" marker-end="url(#arrow-${type})"/></g>`,
    materials: `<g fill="none" stroke="currentColor" stroke-width="4"><path d="M150 370V110M150 370h520"/><path d="M150 370c70-190 125-235 210-235 75 0 115 65 145 115 35 58 85 70 140 48"/><path d="M360 135v235" stroke-dasharray="8 8"/></g><g fill="currentColor" font-family="Arial" font-size="22"><text x="95" y="130">σ</text><text x="650" y="405">ε</text><text x="370" y="125">Yield</text></g>`,
    general: `<g fill="none" stroke="currentColor" stroke-width="4"><rect x="165" y="115" width="470" height="255" rx="12"/><path d="M215 180h370M215 235h250M215 290h330"/><circle cx="560" cy="290" r="35"/></g>`
  };
  return `<svg viewBox="0 0 800 470" role="img" aria-label="${safeTitle}">${grid}${commonText}${drawings[type] || drawings.general}</svg>`;
}

function collectionLabel(collection) {
  return ({ all: "כל המושגים", favorites: "מועדפים", learning: "בתהליך למידה", mastered: "נלמדו", recent: "נצפו לאחרונה" })[collection] || "כל המושגים";
}

function termSearchText(term) {
  return normalizeText([
    term.code, term.name, term.nameEn, term.short, term.definition, term.subtopic, term.subSubtopic,
    term.domainName, term.domainNameEn, term.symbol, term.units,
    ...(term.aliases || []), ...(term.tags || []), ...(term.standards || []),
  ].join(" "));
}

function searchScore(term, query) {
  if (!query) return 0;
  const q = normalizeText(query);
  const code = normalizeText(term.code);
  const name = normalizeText(term.name);
  const nameEn = normalizeText(term.nameEn);
  const aliases = (term.aliases || []).map(normalizeText);
  const tags = (term.tags || []).map(normalizeText);
  let score = 0;
  if (code === q) score += 160;
  else if (code.startsWith(q)) score += 110;
  if (name === q || nameEn === q) score += 150;
  if (name.startsWith(q) || nameEn.startsWith(q)) score += 100;
  if (name.includes(q) || nameEn.includes(q)) score += 65;
  if (aliases.some((x) => x === q)) score += 100;
  if (aliases.some((x) => x.includes(q))) score += 55;
  if (tags.some((x) => x === q)) score += 45;
  if (termSearchText(term).includes(q)) score += 20;
  q.split(" ").filter(Boolean).forEach((token) => {
    if (termSearchText(term).includes(token)) score += 8;
  });
  return score;
}

function getFilteredTerms() {
  const terms = allTerms();
  const recentRank = new Map(prefs.recent.map((id, index) => [id, index]));
  let filtered = terms.filter((term) => {
    if (state.collection === "favorites" && !prefs.favorites.includes(term.id)) return false;
    if (state.collection === "learning" && getTermStatus(term.id) !== "learning") return false;
    if (state.collection === "mastered" && getTermStatus(term.id) !== "mastered") return false;
    if (state.collection === "recent" && !recentRank.has(term.id)) return false;
    if (state.domainId !== "all" && term.domainId !== state.domainId) return false;
    if (state.subtopic !== "all" && term.subtopic !== state.subtopic) return false;
    if (state.subSubtopic !== "all" && term.subSubtopic !== state.subSubtopic) return false;
    if (state.query && searchScore(term, state.query) <= 0) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (state.collection === "recent" && state.sort === "relevance") return (recentRank.get(a.id) ?? 999) - (recentRank.get(b.id) ?? 999);
    
    const domainDiff = a.domainIndex - b.domainIndex;
    if (domainDiff !== 0) return domainDiff;
    
    const subDiff = (a.subtopic || "").localeCompare(b.subtopic || "");
    if (subDiff !== 0) return subDiff;
    
    const subSubDiff = (a.subSubtopic || "").localeCompare(b.subSubtopic || "");
    if (subSubDiff !== 0) return subSubDiff;

    if (state.sort === "name") return compareText(a.name, b.name);
    if (state.sort === "code") return compareText(a.code, b.code);
    if (state.sort === "updated") return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    if (state.query) return searchScore(b, state.query) - searchScore(a, state.query) || compareText(a.name, b.name);
    return compareText(a.code, b.code);
  });
  return filtered;
}

function renderMetrics() {
  const terms = allTerms();
  const learning = terms.filter((term) => getTermStatus(term.id) === "learning").length;
  const mastered = terms.filter((term) => getTermStatus(term.id) === "mastered").length;
  $("termCount").textContent = terms.length;
  $("domainCount").textContent = data.length;
  $("favCount").textContent = prefs.favorites.filter((id) => terms.some((term) => term.id === id)).length;
  $("masteredCount").textContent = mastered;
  $("navAllCount").textContent = terms.length;
  $("navFavCount").textContent = prefs.favorites.length;
  $("navLearningCount").textContent = learning;
  $("navMasteredCount").textContent = mastered;
  $("navRecentCount").textContent = prefs.recent.length;
  const percent = terms.length ? Math.round((mastered / terms.length) * 100) : 0;
  $("progressPercent").textContent = `${percent}%`;
  $("progressRing").style.setProperty("--progress", `${percent * 3.6}deg`);
  $("progressText").textContent = mastered ? `${mastered} מתוך ${terms.length} מושגים סומנו כנלמדו` : "טרם סומנו מושגים כנלמדו";
}

function renderDomainNavigation() {
  $("domainNav").innerHTML = data.map((domain) => {
    const subtopics = domainSubtopicEntries(domain);
    const isActive = state.domainId === domain.id;
    return `<section class="domain-nav-group ${state.domainId === domain.id ? "active" : ""}" style="--domain-color:${esc(domain.color)}">
      <button data-domain-id="${esc(domain.id)}" class="${state.domainId === domain.id ? "active" : ""}">
        <span class="domain-dot"></span><span>${esc(domain.name)}</span><b>${domain.items.length}</b>
      </button>
      ${isActive && subtopics.length ? `<div class="domain-nav-subtopics" aria-label="תתי־תחומים של ${esc(domain.name)}">${subtopics.map((subtopic) => `
        <div class="domain-nav-branch">
          <button type="button" class="domain-nav-subtopic ${state.domainId === domain.id && state.subtopic === subtopic.name && state.subSubtopic === "all" ? "active" : ""}" data-domain-subtopic="${esc(subtopic.name)}" data-subtopic-domain="${esc(domain.id)}"><span>${esc(subtopic.name)}</span><b>${domain.items.filter((term) => term.subtopic === subtopic.name).length}</b></button>
          ${subtopic.children.length ? `<div class="domain-nav-children">${subtopic.children.map((child) => `<button type="button" class="domain-nav-child ${state.domainId === domain.id && state.subtopic === subtopic.name && state.subSubtopic === child.name ? "active" : ""}" data-domain-child="${esc(child.name)}" data-parent-subtopic="${esc(subtopic.name)}" data-child-domain="${esc(domain.id)}">↳ ${esc(child.name)}</button>`).join("")}</div>` : ""}
        </div>`).join("")}</div>` : ""}
    </section>`;
  }).join("");
  $$('[data-domain-id]').forEach((button) => button.addEventListener("click", () => {
    closeMobileSidebar();
    selectHierarchyLocation(state.domainId === button.dataset.domainId ? "all" : button.dataset.domainId);
  }));
  $$('[data-domain-subtopic]').forEach((button) => button.addEventListener("click", () => {
    closeMobileSidebar();
    selectHierarchyLocation(button.dataset.subtopicDomain, button.dataset.domainSubtopic);
  }));
  $$('[data-domain-child]').forEach((button) => button.addEventListener("click", () => {
    closeMobileSidebar();
    selectHierarchyLocation(button.dataset.childDomain, button.dataset.parentSubtopic, button.dataset.domainChild);
  }));
  $$('[data-collection]').forEach((button) => button.classList.toggle("active", button.dataset.collection === state.collection));
  renderTaxonomyExplorer();
}

function domainSubtopicNames(domain) {
  return unique([...(domain.subtopics || []).map((item) => typeof item === "string" ? item : item.name), ...domain.items.map((term) => term.subtopic)].filter((name) => !isDirectTermSubtopic(name))).sort(compareText);
}

function domainSubtopicEntries(domain) {
  const entries = domainSubtopicNames(domain).map((name) => {
    const stored = (domain.subtopics || []).find((item) => (typeof item === "string" ? item : item.name) === name);
    const base = typeof stored === "object" ? stored : { id: uid(), name, description: "", color: "", children: [] };
    const childNames = unique([
      ...(base.children || []).map((child) => typeof child === "string" ? child : child.name),
      ...domain.items.filter((term) => term.subtopic === name).map((term) => term.subSubtopic),
    ].filter(Boolean)).sort(compareText);
    const children = childNames.map((childName) => {
      const child = (base.children || []).find((item) => (typeof item === "string" ? item : item.name) === childName);
      return typeof child === "object" ? child : { id: uid(), name: childName, description: "", color: "" };
    });
    return { ...base, name, children };
  });
  return entries.sort((a, b) => compareText(a.name, b.name));
}

function ensureTermHierarchy(domain, term) {
  if (isDirectTermSubtopic(term.subtopic)) return;
  const subtopics = normalizeSubtopics(domain.subtopics || []);
  let parent = subtopics.find((item) => item.name === term.subtopic);
  if (!parent) {
    parent = { id: uid(), name: term.subtopic, description: "", color: domain.color, children: [] };
    subtopics.push(parent);
  }
  if (term.subSubtopic && !(parent.children || []).some((child) => child.name === term.subSubtopic)) {
    parent.children = normalizeSubSubtopics([...(parent.children || []), { name: term.subSubtopic, color: parent.color || domain.color }]);
  }
  domain.subtopics = normalizeSubtopics(subtopics);
}

function encodeHierarchyLocation(domainId, subtopic, subSubtopic = "") {
  return `h:${encodeURIComponent(domainId)}|${encodeURIComponent(subtopic)}|${encodeURIComponent(subSubtopic)}`;
}

function decodeHierarchyLocation(value) {
  if (!value || value === "all" || value === "direct") return null;
  const parts = String(value).replace(/^h:/, "").split("|").map((part) => decodeURIComponent(part));
  return { domainId: parts[0] || "", subtopic: parts[1] || "", subSubtopic: parts[2] || "" };
}

function scrollToDictionary() {
  requestAnimationFrame(() => $("resultsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function selectHierarchyLocation(domainId, subtopic = "all", subSubtopic = "all") {
  state.domainId = domainId || "all";
  state.subtopic = subtopic || "all";
  state.subSubtopic = subSubtopic || "all";
  const domain = data.find((item) => item.id === state.domainId);
  const matchingTerms = domain ? domain.items.filter((term) => {
    if (state.subtopic !== "all" && term.subtopic !== state.subtopic) return false;
    if (state.subSubtopic !== "all" && term.subSubtopic !== state.subSubtopic) return false;
    return true;
  }) : [];
  renderAll();
  if (state.domainId === "all") {
    requestAnimationFrame(() => $("domainTabs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return;
  }
  if (state.domainId !== "all" && state.subtopic === "all") {
    requestAnimationFrame(() => $("domainTabs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return;
  }
  if (matchingTerms.length === 1) openTerm(matchingTerms[0].id);
  else scrollToDictionary();
}

function toggleTaxonomyExplorer(event) {
  event?.preventDefault();
  event?.stopPropagation();
  const explorer = $("taxonomyExplorer");
  if (!explorer) return;
  const collapsed = explorer.classList.toggle("collapsed");
  const arrow = $("taxonomyArrow");
  if (arrow) arrow.textContent = collapsed ? "▼" : "▲";
}

function taxonomyTermListMarkup(terms, label = "מושגים") {
  if (!terms.length) return `<span class="taxonomy-no-terms">אין מושגים ברמה זו</span>`;
  return `<div class="taxonomy-term-list" aria-label="${esc(label)}">${terms.map((term) => `<button type="button" class="taxonomy-term-node" data-tree-term="${esc(term.id)}"><span class="taxonomy-term-icon" aria-hidden="true">◆</span><span><strong>${esc(term.name)}</strong><small dir="ltr">${esc(term.code)}</small></span><span aria-hidden="true">←</span></button>`).join("")}</div>`;
}

function renderTaxonomyExplorer() {
  const source = state.domainId === "all" ? data : data.filter((domain) => domain.id === state.domainId);
  $("domainTabs").innerHTML = `
    <div class="taxonomy-tree-toolbar">
      ${state.domainId !== "all" ? `<button type="button" class="taxonomy-all-domains" data-explorer-domain="all"><span aria-hidden="true">→</span> חזרה לכל התחומים</button>` : ""}
      <div class="taxonomy-legend" aria-label="מקרא"><span class="level-domain">תחום</span><span>←</span><span class="level-subtopic">תת־תחום</span><span>←</span><span class="level-child">תת־תת־תחום</span><span>← מושגים</span></div>
    </div>
    <div class="taxonomy-domain-grid">${source.map((domain) => {
      const directTerms = domain.items.filter((term) => isDirectTermSubtopic(term.subtopic));
      const directCount = directTerms.length;
      const subtopics = domainSubtopicEntries(domain);
      return `<article class="taxonomy-domain-card ${state.domainId === domain.id ? "active" : ""}" style="--domain-color:${esc(domain.color)}">
        <button type="button" class="taxonomy-domain-head" data-explorer-domain="${esc(domain.id)}">
          <span class="taxonomy-level-label">תחום</span><span class="taxonomy-domain-dot"></span>
          <span class="taxonomy-domain-copy"><strong>${esc(domain.name)}</strong>${domain.description ? `<small>${esc(domain.description)}</small>` : ""}</span>
          <span class="taxonomy-head-actions" style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn taxonomy-def-btn"  data-def-domain="${esc(domain.id)}" title="הצג הגדרת תחום" aria-label="הצג הגדרת תחום" tabindex="0" style="padding: 4px 8px; font-size: 1.1rem; line-height: 1;" style="display: flex; gap: 6px; align-items: center; border-radius: 99px; padding: 4px 12px; font-size: 0.85rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>הגדרה</button>
            <b>${domain.items.length} מושגים</b>
          </span>
        </button>
        <div class="taxonomy-domain-body">
          <div class="taxonomy-direct-summary"><span>מושגים ישירות בתחום</span><b>${directCount}</b></div>
          ${taxonomyTermListMarkup(directTerms, `מושגים ישירות בתחום ${domain.name}`)}
          ${subtopics.length ? `<div class="taxonomy-subtopic-grid">${subtopics.map((subtopic) => {
            const subtopicTerms = domain.items.filter((term) => term.subtopic === subtopic.name);
            const directTermsInSubtopic = subtopicTerms.filter((term) => !term.subSubtopic);
            const total = subtopicTerms.length;
            const directInSubtopic = directTermsInSubtopic.length;
            return `<section class="taxonomy-subtopic-card ${state.domainId === domain.id && state.subtopic === subtopic.name && state.subSubtopic === "all" ? "active" : ""}" style="--subtopic-color:${esc(subtopic.color || domain.color)}">
              <button type="button" class="taxonomy-subtopic-head" data-tree-subtopic="${esc(subtopic.name)}" data-tree-domain="${esc(domain.id)}">
                <span class="taxonomy-level-label">תת־תחום</span><strong>${esc(subtopic.name)}</strong>
                <span class="taxonomy-head-actions" style="display: flex; gap: 8px; align-items: center; margin-inline-start: auto;">
                  <button type="button" class="btn taxonomy-def-btn"  data-def-domain="${esc(domain.id)}" data-def-subtopic="${esc(subtopic.name)}" title="הצג הגדרת תת-תחום" aria-label="הצג הגדרת תת-תחום" tabindex="0" style="padding: 4px 8px; font-size: 1.1rem; line-height: 1;" style="display: flex; gap: 6px; align-items: center; border-radius: 99px; padding: 4px 12px; font-size: 0.85rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>הגדרה</button>
                  <b>${total}</b>
                </span>
              </button>
              ${subtopic.description ? `<p>${esc(subtopic.description)}</p>` : ""}
              <div class="taxonomy-subtopic-direct"><span>מושגים ברמה זו</span><b>${directInSubtopic}</b></div>
              ${taxonomyTermListMarkup(directTermsInSubtopic, `מושגים בתוך ${subtopic.name}`)}
              ${subtopic.children.length ? `<div class="taxonomy-child-list">${subtopic.children.map((child) => {
                const childTerms = subtopicTerms.filter((term) => term.subSubtopic === child.name);
                const count = childTerms.length;
                return `<section class="taxonomy-child-branch" style="--child-color:${esc(child.color || subtopic.color || domain.color)}"><button type="button" class="taxonomy-child-node ${state.domainId === domain.id && state.subtopic === subtopic.name && state.subSubtopic === child.name ? "active" : ""}" data-tree-child="${esc(child.name)}" data-tree-parent="${esc(subtopic.name)}" data-tree-domain="${esc(domain.id)}"><span class="taxonomy-level-label">תת־תת־תחום</span><strong>${esc(child.name)}</strong><span class="taxonomy-head-actions" style="display: flex; gap: 8px; align-items: center; margin-inline-start: auto;"><button type="button" class="btn taxonomy-def-btn"  data-def-domain="${esc(domain.id)}" data-def-subtopic="${esc(subtopic.name)}" data-def-child="${esc(child.name)}" title="הצג הגדרת תת-תת-תחום" aria-label="הצג הגדרת תת-תת-תחום" tabindex="0" style="padding: 4px 8px; font-size: 1.1rem; line-height: 1;" style="display: flex; gap: 6px; align-items: center; border-radius: 99px; padding: 4px 12px; font-size: 0.85rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>הגדרה</button><b>${count}</b></span>${child.description ? `<small style="flex-basis: 100%; margin-top: 4px;">${esc(child.description)}</small>` : ""}</button>${taxonomyTermListMarkup(childTerms, `מושגים בתוך ${child.name}`)}</section>`;
              }).join("")}</div>` : `<span class="taxonomy-no-children">אין תתי־תתי־תחומים</span>`}
            </section>`;
          }).join("")}</div>` : `<div class="taxonomy-empty-branch">אין עדיין תתי־תחומים — ניתן להוסיף אותם במרכז הניהול.</div>`}
        </div>
      </article>`;
    }).join("")}</div>`;
  $$('[data-explorer-domain]').forEach((button) => button.addEventListener("click", () => {
    selectHierarchyLocation(button.dataset.explorerDomain);
  }));
  $$('[data-tree-subtopic]').forEach((button) => button.addEventListener("click", () => {
    selectHierarchyLocation(button.dataset.treeDomain, button.dataset.treeSubtopic);
  }));
  $$('[data-tree-child]').forEach((button) => button.addEventListener("click", () => {
    selectHierarchyLocation(button.dataset.treeDomain, button.dataset.treeParent, button.dataset.treeChild);
  }));
  $$('[data-tree-term]').forEach((button) => button.addEventListener("click", () => openTerm(button.dataset.treeTerm)));
  $$('.taxonomy-def-btn').forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      openDomainDetailModal(button.dataset.defDomain, button.dataset.defSubtopic || "", button.dataset.defChild || "");
    });
    button.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); e.stopPropagation();
        openDomainDetailModal(button.dataset.defDomain, button.dataset.defSubtopic || "", button.dataset.defChild || "");
      }
    });
  });
}

function availableHierarchyLocations() {
  const source = state.domainId === "all" ? [] : data.filter((domain) => domain.id === state.domainId);
  return source.map((domain) => ({ domain, subtopics: domainSubtopicEntries(domain) }));
}

function renderFilters() {
  $("sortSelect").value = state.sort;
  const locations = availableHierarchyLocations();
  const locationExists = state.subtopic === "all" || locations.some(({ subtopics }) => subtopics.some((subtopic) => subtopic.name === state.subtopic && (state.subSubtopic === "all" || subtopic.children.some((child) => child.name === state.subSubtopic))));
  if (!locationExists) { state.subtopic = "all"; state.subSubtopic = "all"; }
  const options = locations.map(({ domain, subtopics }) => {
    const rows = subtopics.map((subtopic) => `<option value="${esc(encodeHierarchyLocation(domain.id, subtopic.name))}">תת־תחום: ${esc(subtopic.name)}</option>${subtopic.children.map((child) => `<option value="${esc(encodeHierarchyLocation(domain.id, subtopic.name, child.name))}">↳ תת־תת־תחום: ${esc(child.name)}</option>`).join("")}`).join("");
    return state.domainId === "all" ? `<optgroup label="${esc(domain.name)}">${rows}</optgroup>` : rows;
  }).join("");
  $("subtopicFilter").disabled = state.domainId === "all";
  $("subtopicFilter").innerHTML = state.domainId === "all"
    ? `<option value="all">בחרו תחום תחילה</option>`
    : `<option value="all">כל המיקומים בתחום</option>${options}`;
  $("subtopicFilter").value = state.subtopic === "all" ? "all" : encodeHierarchyLocation(state.domainId, state.subtopic, state.subSubtopic === "all" ? "" : state.subSubtopic);
  $("searchInput").value = state.query;

  const domain = data.find((item) => item.id === state.domainId);
  const context = [collectionLabel(state.collection), domain?.name, state.subtopic !== "all" ? state.subtopic : "", state.subSubtopic !== "all" ? state.subSubtopic : ""].filter(Boolean).join(" · ");
  $("contextLabel").textContent = context;
  $("resultsTitle").textContent = context;
  const hasFilters = state.query || state.domainId !== "all" || state.subtopic !== "all" || state.subSubtopic !== "all" || state.collection !== "all";
  $("resetFiltersBtn").classList.toggle("hidden", !hasFilters);

  const chips = [];
  if (state.query) chips.push({ key: "query", label: `חיפוש: ${state.query}` });
  if (domain) chips.push({ key: "domain", label: domain.name });
  if (state.subtopic !== "all") chips.push({ key: "subtopic", label: state.subtopic });
  if (state.subSubtopic !== "all") chips.push({ key: "subSubtopic", label: state.subSubtopic });
  if (state.collection !== "all") chips.push({ key: "collection", label: collectionLabel(state.collection) });
  $("activeChips").innerHTML = chips.map((chip) => `<span class="filter-chip">${esc(chip.label)}<button data-remove-filter="${chip.key}" aria-label="הסר ${esc(chip.label)}">×</button></span>`).join("");
  $$('[data-remove-filter]').forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.removeFilter;
    if (key === "query") state.query = "";
    if (key === "domain") { state.domainId = "all"; state.subtopic = "all"; state.subSubtopic = "all"; }
    if (key === "subtopic") { state.subtopic = "all"; state.subSubtopic = "all"; }
    if (key === "subSubtopic") state.subSubtopic = "all";
    if (key === "collection") state.collection = "all";
    renderAll();
  }));
}

function statusLabel(status) {
  return ({ none: "טרם התחלתי", learning: "בתהליך", mastered: "נלמד" })[status] || "טרם התחלתי";
}

function renderCard(term) {
  const status = getTermStatus(term.id);
  const fields = settings.fields;
  return `
    <article class="term-card" tabindex="0" role="button" aria-label="פתח את הערך ${esc(term.name)}" data-term-id="${esc(term.id)}" style="--domain-color:${esc(term.domainColor)}">
      <div class="card-top">
        <div><div class="card-code">${esc(term.code)}</div></div>
        <div class="card-actions">
          <button data-card-fav="${esc(term.id)}" class="${prefs.favorites.includes(term.id) ? "active" : ""}" title="${prefs.favorites.includes(term.id) ? "הסר ממועדפים" : "הוסף למועדפים"}" aria-label="${prefs.favorites.includes(term.id) ? "הסר ממועדפים" : "הוסף למועדפים"}">${prefs.favorites.includes(term.id) ? "★" : "☆"}</button>
        </div>
      </div>
      <div>
        <h3>${esc(term.name)}</h3>
        <p class="card-name-en">${esc(term.nameEn)}</p>
      </div>
      <p class="summary">${esc(term.short)}</p>
      <div class="card-meta">
        <span class="meta-pill">${esc(term.domainName)}</span>
        <span class="meta-pill">${esc(termLocationLabel(term.subtopic, term.subSubtopic))}</span>
        ${fields.symbol && term.symbol ? `<span class="meta-pill" dir="ltr">${esc(term.symbol)}</span>` : ""}
      </div>
      <footer class="card-footer">
        <span class="card-status"><span class="status-dot ${status}"></span>${statusLabel(status)}</span>
        <span class="open-hint">פתח מושג מלא ←</span>
      </footer>
    </article>`;
}

function renderDictionary() {
  const terms = getFilteredTerms();
  const hasExplicitScope = state.domainId !== "all" || Boolean(state.query.trim()) || state.collection !== "all";
  
  // The control panel (view switchers and filters) is now integrated into the header and should always be visible.
  $("controlPanel").classList.remove("hidden");
  
  $("resultsHead").classList.toggle("hidden", !hasExplicitScope);
  $("dictionary").classList.toggle("hidden", !hasExplicitScope || prefs.view === "mindmap");
  $("mindMapContainer")?.classList.toggle("hidden", prefs.view !== "mindmap");
  $("domainSelectionState").classList.toggle("hidden", hasExplicitScope || prefs.view === "mindmap");
  $("taxonomyContent").classList.toggle("hidden", prefs.view === "mindmap");
  $("taxonomyContent").classList.toggle("list-view", prefs.view === "list");
  
  if (!hasExplicitScope && prefs.view !== "mindmap") {
    $("resultsMeta").textContent = "";
    $("dictionary").innerHTML = "";
    $("emptyState").classList.add("hidden");
    return;
  }
  $("resultsMeta").textContent = `${terms.length} ${terms.length === 1 ? "תוצאה" : "תוצאות"}`;
  
  if (prefs.view === "mindmap") {
    $("emptyState").classList.add("hidden");
    renderMindMap(terms);
    return;
  }

  let html = "";
  let currentDomain = null;
  let currentSubtopic = null;
  
  terms.forEach(term => {
    if (term.domainId !== currentDomain) {
      currentDomain = term.domainId;
      currentSubtopic = null;
      const domainData = data.find(d => d.id === currentDomain);
      if (domainData) {
        html += `<div class="dict-domain-header clickable" role="button" tabindex="0" data-domain-id="${domainData.id}" style="border-bottom-color: ${domainData.color || 'var(--primary)'}; color: ${domainData.color || 'var(--text)'}; cursor: pointer;" aria-label="הצג הגדרת תחום">${domainData.name}</div>`;
      }
    }
    if (term.subtopic && term.subtopic !== currentSubtopic) {
      currentSubtopic = term.subtopic;
      html += `<div class="dict-subtopic-header clickable" role="button" tabindex="0" data-domain-id="${currentDomain}" data-subtopic="${currentSubtopic}" style="cursor: pointer;" aria-label="הצג הגדרת תת-תחום">${currentSubtopic}</div>`;
    }
    html += renderCard(term);
  });

  $("dictionary").innerHTML = html;
  $("dictionary").classList.toggle("list-view", prefs.view === "list");
  $("emptyState").classList.toggle("hidden", terms.length > 0);

  $$('.dict-domain-header').forEach((header) => {
    const handleDomainClick = (event) => {
      openDomainDetailModal(header.dataset.domainId);
    };
    header.addEventListener("click", handleDomainClick);
    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); handleDomainClick(event);
      }
    });
  });

  $$('.dict-subtopic-header').forEach((header) => {
    const handleSubtopicClick = (event) => {
      openDomainDetailModal(header.dataset.domainId, header.dataset.subtopic);
    };
    header.addEventListener("click", handleSubtopicClick);
    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); handleSubtopicClick(event);
      }
    });
  });

  $$('[data-term-id]').forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("[data-card-fav]")) return;
      openTerm(card.dataset.termId);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTerm(card.dataset.termId);
      }
    });
  });
  $$('[data-card-fav]').forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(button.dataset.cardFav);
  }));
}

let mindMapZoom = 1;
let mindMapPanX = 0;
let mindMapPanY = 0;
const mindMapCollapsedNodes = new Set();

let isMindMapDragging = false;
let mindMapStartX = 0;
let mindMapStartY = 0;

function setupMindMapPanAndZoom() {
  const viewport = $("mindMapViewport");
  if (!viewport || viewport.dataset.panBound) return;
  viewport.dataset.panBound = "true";

  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button, .mm-node, input, select")) return;
    isMindMapDragging = true;
    mindMapStartX = e.clientX - mindMapPanX;
    mindMapStartY = e.clientY - mindMapPanY;
    viewport.style.cursor = "grabbing";
    try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!isMindMapDragging) return;
    e.preventDefault();
    mindMapPanX = e.clientX - mindMapStartX;
    mindMapPanY = e.clientY - mindMapStartY;
    updateMindMapTransform();
  });

  viewport.addEventListener("pointerup", (e) => {
    if (isMindMapDragging) {
      isMindMapDragging = false;
      viewport.style.cursor = "grab";
      try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  });

  viewport.addEventListener("pointercancel", () => {
    isMindMapDragging = false;
    viewport.style.cursor = "grab";
  });

  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    mindMapZoom = Math.max(0.15, Math.min(2.5, mindMapZoom + delta));
    updateMindMapTransform();
  }, { passive: false });
}

function updateMindMapTransform() {
  const wrapper = $("mindMapCanvasWrapper");
  if (wrapper) {
    wrapper.style.transform = `translate(${mindMapPanX}px, ${mindMapPanY}px) scale(${mindMapZoom})`;
  }
  const zoomResetBtn = $("mindMapResetZoom");
  if (zoomResetBtn) {
    zoomResetBtn.textContent = `${Math.round(mindMapZoom * 100)}%`;
  }
  requestAnimationFrame(drawMindMapConnections);
}

function fitMindMapToScreen() {
  setupMindMapPanAndZoom();
  const viewport = $("mindMapViewport");
  const nodesContainer = $("mindMapNodes");
  const wrapper = $("mindMapCanvasWrapper");
  if (!viewport || !nodesContainer || !wrapper) return;

  wrapper.style.transform = "none";

  requestAnimationFrame(() => {
    const vRect = viewport.getBoundingClientRect();
    const nRect = nodesContainer.getBoundingClientRect();

    if (nRect.width > 0 && nRect.height > 0 && vRect.width > 0 && vRect.height > 0) {
      const padding = 50;
      const availableWidth = Math.max(200, vRect.width - padding * 2);
      const availableHeight = Math.max(200, vRect.height - padding * 2);

      const scaleX = availableWidth / nRect.width;
      const scaleY = availableHeight / nRect.height;
      mindMapZoom = Math.max(0.15, Math.min(1.0, scaleX, scaleY));

      const scaledWidth = nRect.width * mindMapZoom;
      const scaledHeight = nRect.height * mindMapZoom;

      mindMapPanX = Math.max(20, (vRect.width - scaledWidth) / 2);
      mindMapPanY = Math.max(20, (vRect.height - scaledHeight) / 2);

      updateMindMapTransform();
    }
  });
}

function openDomainDetailModal(domainId, subtopicName = "", subSubtopicName = "") {
  const domain = data.find((d) => d.id === domainId);
  if (!domain) return;

  const overlay = $("domainDetailOverlay");
  if (!overlay) return;
  
  state.currentDomainId = domainId;

  let title = domain.name;
  let titleEn = domain.nameEn || domain.prefix || "";
  let category = "תחום ידע הנדסי";
  let code = domain.prefix || "DOMAIN";
  let desc = domain.description || "תחום ידע הנדסי במילון MechLex.";
  let termsList = domain.items;
  let subtopicCount = domain.subtopics ? domain.subtopics.length : 0;
  let iconName = domain.icon || "mechanics";

  let descHtml = domain.definitionHtml || "";
  let imageData = domain.imageData || "";
  let imageFilename = domain.image || "";

  if (subtopicName) {
    category = `${domain.name} / תת-תחום`;
    title = subtopicName;
    code = `${domain.prefix || "DOM"}-${subtopicName.slice(0, 4).toUpperCase()}`;
    const subObj = domainSubtopicEntries(domain).find((s) => s.name === subtopicName);
    if (subObj) {
      desc = subObj.description || `תת-תחום מקצועי בתוך ${domain.name}.`;
      descHtml = subObj.definitionHtml || "";
      imageData = subObj.imageData || "";
      imageFilename = subObj.image || "";
      subtopicCount = subObj.children ? subObj.children.length : 0;
    }
    termsList = domain.items.filter((t) => t.subtopic === subtopicName);
  }

  if (subSubtopicName) {
    category = `${domain.name} / ${subtopicName} / תת-תת-תחום`;
    title = subSubtopicName;
    code = `${domain.prefix || "DOM"}-SUB`;
    const subObj = domainSubtopicEntries(domain).flatMap(s => s.children || []).find(c => c.name === subSubtopicName);
    if (subObj) {
      desc = subObj.description || "";
      descHtml = subObj.definitionHtml || "";
      imageData = subObj.imageData || "";
      imageFilename = subObj.image || "";
    }
    termsList = domain.items.filter((t) => t.subtopic === subtopicName && t.subSubtopic === subSubtopicName);
  }

  $("domainDetailCategory").textContent = category;
  $("domainDetailCode").textContent = code;
  $("domainDetailTitle").textContent = title;
  $("domainDetailTitleEn").textContent = titleEn;
  
  if (descHtml) {
    $("domainDetailDescription").innerHTML = descHtml;
  } else {
    $("domainDetailDescription").innerHTML = `<p style="font-size: 1.02rem; line-height: 1.6; color: var(--text-strong);"><strong style="color: var(--primary);">${esc(title)}</strong> — ${esc(desc)}</p>`;
  }
  


  // Render Visual Stage Illustration/Image matching Screenshot 5!
  const imgEl = $("domainDetailImage");
  const fallbackEl = $("domainVisualFallback");
  imgEl.classList.add("hidden");
  imgEl.removeAttribute("src");
  fallbackEl.classList.remove("hidden");
  fallbackEl.innerHTML = "";

  const showImage = (source, onMissing) => {
    imgEl.onload = () => {
      imgEl.classList.remove("hidden");
      fallbackEl.classList.add("hidden");
    };
    imgEl.onerror = () => {
      imgEl.classList.add("hidden");
      fallbackEl.classList.remove("hidden");
      if (onMissing) onMissing();
      else {
        fallbackEl.innerHTML = `<div class="missing-image" role="img" aria-label="תמונה חסרה עבור ${esc(title)}"><span class="missing-image-x" aria-hidden="true">×</span><strong>חסרה תמונה לתחום</strong><span>${esc(title)}</span><small>אפשר להוסיף קובץ לתיקיית images בשם התחום, או להטמיע תמונה במרכז הניהול.</small></div>`;
      }
    };
    imgEl.alt = title;
    imgEl.src = source;
  };

  if (imageData && /^data:image\//.test(imageData)) {
    showImage(imageData);
  } else {
    const domainPseudoTerm = { name: title, imageName: imageFilename };
    const imageCandidates = imageCandidatesForTerm(domainPseudoTerm);
    
    if (imageCandidates.length) {
      let candidateIndex = 0;
      const tryNextCandidate = () => {
        if (candidateIndex >= imageCandidates.length) {
          fallbackEl.innerHTML = `<div class="missing-image" role="img" aria-label="תמונה חסרה עבור ${esc(title)}"><span class="missing-image-x" aria-hidden="true">×</span><strong>חסרה תמונה לתחום</strong><span>${esc(title)}</span><small>אפשר להוסיף קובץ לתיקיית images בשם התחום, או להטמיע תמונה במרכז הניהול.</small></div>`;
          return;
        }
        showImage(imageCandidates[candidateIndex], () => {
          candidateIndex += 1;
          tryNextCandidate();
        });
      };
      tryNextCandidate();
    } else {
      fallbackEl.innerHTML = `<div class="missing-image" role="img" aria-label="תמונה חסרה עבור ${esc(title)}"><span class="missing-image-x" aria-hidden="true">×</span><strong>חסרה תמונה לתחום</strong><span>${esc(title)}</span><small>אפשר להוסיף קובץ לתיקיית images בשם התחום, או להטמיע תמונה במרכז הניהול.</small></div>`;
    }
  }

  setModalVisibility(overlay, true, { initialFocus: $("closeDomainDetailBtn") });
}

function closeDomainDetailModal() {
  setModalVisibility($("domainDetailOverlay"), false);
}

function renderMindMap(filteredTerms) {
  const container = $("mindMapNodes");
  const svg = $("mindMapSvg");
  if (!container || !svg) return;

  const currentTerms = filteredTerms || getFilteredTerms();
  const termIdsSet = new Set(currentTerms.map((t) => t.id));

  const filteredDomains = state.domainId === "all"
    ? data.filter((d) => d.items.some((t) => termIdsSet.has(t.id)))
    : data.filter((d) => d.id === state.domainId);

  let html = `<div class="mm-tree-branch">
    <div class="mm-node mm-node-root" id="mmnode-root">
      <span>⚙️ MechLex מפות חשיבה</span>
      <span class="mm-badge" style="background:rgba(255,255,255,0.25); color:#fff;">${currentTerms.length}</span>
    </div>
    <div class="mm-node-children">`;

  filteredDomains.forEach((domain) => {
    const domainNodeId = `domain-${domain.id}`;
    const isDomainCollapsed = mindMapCollapsedNodes.has(domainNodeId);
    const domainTerms = domain.items.filter((t) => termIdsSet.has(t.id));
    const entries = domainSubtopicEntries(domain);

    html += `<div class="mm-tree-branch ${isDomainCollapsed ? "mm-collapsed" : ""}">
      <div class="mm-node mm-node-domain" id="mmnode-${domainNodeId}" style="--domain-color:${esc(domain.color)}" data-mm-domain-id="${esc(domain.id)}" title="לחצו להצגת הגדרת התחום">
        <span class="mm-badge" style="--domain-color:${esc(domain.color)}">${domainTerms.length}</span>
        <strong>${esc(domain.name)}</strong>
        <button type="button" class="mm-toggle-btn" data-mm-toggle="${esc(domainNodeId)}" title="${isDomainCollapsed ? "הרחב ענף" : "כווץ ענף"}">${isDomainCollapsed ? "►" : "◄"}</button>
      </div>
      <div class="mm-node-children">`;

    entries.forEach((subtopic) => {
      const subtopicNodeId = `subtopic-${domain.id}-${subtopic.name}`;
      const isSubtopicCollapsed = mindMapCollapsedNodes.has(subtopicNodeId);
      const subtopicTerms = domainTerms.filter((term) => term.subtopic === subtopic.name);
      if (subtopicTerms.length === 0 && state.query.trim()) return;

      html += `<div class="mm-tree-branch ${isSubtopicCollapsed ? "mm-collapsed" : ""}">
        <div class="mm-node mm-node-subtopic" id="mmnode-${subtopicNodeId}" style="--domain-color:${esc(domain.color)}" data-mm-subtopic-domain="${esc(domain.id)}" data-mm-subtopic-name="${esc(subtopic.name)}" title="לחצו להצגת הגדרת תת-התחום">
          <span>${esc(subtopic.name)}</span>
          <span class="mm-badge" style="--domain-color:${esc(domain.color)}">${subtopicTerms.length}</span>
          ${(subtopic.children.length || subtopicTerms.length) ? `<button type="button" class="mm-toggle-btn" data-mm-toggle="${esc(subtopicNodeId)}" title="${isSubtopicCollapsed ? "הרחב" : "כווץ"}">${isSubtopicCollapsed ? "►" : "◄"}</button>` : ""}
        </div>
        <div class="mm-node-children">`;

      if (subtopic.children.length > 0) {
        subtopic.children.forEach((child) => {
          const childNodeId = `child-${domain.id}-${subtopic.name}-${child.name}`;
          const isChildCollapsed = mindMapCollapsedNodes.has(childNodeId);
          const childTerms = subtopicTerms.filter((term) => term.subSubtopic === child.name);
          if (childTerms.length === 0 && state.query.trim()) return;

          html += `<div class="mm-tree-branch ${isChildCollapsed ? "mm-collapsed" : ""}">
            <div class="mm-node mm-node-subsubtopic" id="mmnode-${childNodeId}" style="--domain-color:${esc(domain.color)}" data-mm-subtopic-domain="${esc(domain.id)}" data-mm-subtopic-name="${esc(subtopic.name)}" data-mm-child-name="${esc(child.name)}" title="לחצו להצגת הפרטים">
              <span>↳ ${esc(child.name)}</span>
              <span class="mm-badge" style="--domain-color:${esc(domain.color)}">${childTerms.length}</span>
              ${childTerms.length ? `<button type="button" class="mm-toggle-btn" data-mm-toggle="${esc(childNodeId)}">${isChildCollapsed ? "►" : "◄"}</button>` : ""}
            </div>
            <div class="mm-node-children">`;

          childTerms.forEach((term) => {
            html += `<div class="mm-node mm-node-term" id="mmnode-term-${term.id}" data-mm-term="${esc(term.id)}">
              ${term.image ? `<img src="images/${esc(term.image)}" class="mm-node-thumb" alt="" />` : ""}
              <span class="mm-node-code">${esc(term.code)}</span>
              <strong>${esc(term.name)}</strong>
            </div>`;
          });

          html += `</div></div>`;
        });
      }

      const directSubtopicTerms = subtopicTerms.filter((t) => !t.subSubtopic || !subtopic.children.some((c) => c.name === t.subSubtopic));
      directSubtopicTerms.forEach((term) => {
        html += `<div class="mm-node mm-node-term" id="mmnode-term-${term.id}" data-mm-term="${esc(term.id)}">
          ${term.image ? `<img src="images/${esc(term.image)}" class="mm-node-thumb" alt="" />` : ""}
          <span class="mm-node-code">${esc(term.code)}</span>
          <strong>${esc(term.name)}</strong>
        </div>`;
      });

      html += `</div></div>`;
    });

    html += `</div></div>`;
  });

  html += `</div></div>`;
  container.innerHTML = html;

  $$("[data-mm-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.mmToggle;
      if (mindMapCollapsedNodes.has(id)) mindMapCollapsedNodes.delete(id);
      else mindMapCollapsedNodes.add(id);
      renderMindMap(currentTerms);
    });
  });

  $$("[data-mm-domain-id]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-mm-toggle]")) return;
      e.stopPropagation();
      openDomainDetailModal(el.dataset.mmDomainId);
    });
  });

  $$("[data-mm-subtopic-name]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-mm-toggle]")) return;
      e.stopPropagation();
      openDomainDetailModal(el.dataset.mmSubtopicDomain, el.dataset.mmSubtopicName, el.dataset.mmChildName || "");
    });
  });

  $$("[data-mm-term]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      openTerm(el.dataset.mmTerm);
    });
  });

  fitMindMapToScreen();
}

function drawMindMapConnections() {
  const svg = $("mindMapSvg");
  const wrapper = $("mindMapCanvasWrapper");
  if (!svg || !wrapper) return;

  const wrapperWidth = wrapper.offsetWidth || wrapper.scrollWidth;
  const wrapperHeight = wrapper.offsetHeight || wrapper.scrollHeight;

  svg.setAttribute("width", wrapperWidth);
  svg.setAttribute("height", wrapperHeight);
  svg.innerHTML = "";

  const isRtl = document.dir === "rtl" || getComputedStyle(document.body).direction === "rtl";

  const branches = wrapper.querySelectorAll(".mm-tree-branch");
  branches.forEach((branch) => {
    const parentNode = branch.querySelector(":scope > .mm-node");
    const childrenContainer = branch.querySelector(":scope > .mm-node-children");
    if (!parentNode || !childrenContainer || branch.classList.contains("mm-collapsed")) return;

    const childNodes = childrenContainer.querySelectorAll(":scope > .mm-tree-branch > .mm-node, :scope > .mm-node-term");

    // Compute center coordinates relative to wrapper
    let pEl = parentNode;
    let pLeft = 0, pTop = 0;
    while (pEl && pEl !== wrapper) {
      pLeft += pEl.offsetLeft;
      pTop += pEl.offsetTop;
      pEl = pEl.offsetParent;
    }

    const x1 = isRtl ? pLeft : (pLeft + parentNode.offsetWidth);
    const y1 = pTop + parentNode.offsetHeight / 2;

    const domainColor = parentNode.style.getPropertyValue("--domain-color") || "#7c3aed";

    childNodes.forEach((childNode) => {
      // Do not draw connections to nodes that are hidden (e.g. collapsed parents)
      if (childNode.offsetParent === null) return;
      
      let cEl = childNode;
      let cLeft = 0, cTop = 0;
      while (cEl && cEl !== wrapper) {
        cLeft += cEl.offsetLeft;
        cTop += cEl.offsetTop;
        cEl = cEl.offsetParent;
      }

      const x2 = isRtl ? (cLeft + childNode.offsetWidth) : cLeft;
      const y2 = cTop + childNode.offsetHeight / 2;

      const controlDist = Math.max(28, Math.abs(x2 - x1) * 0.45);
      const cx1 = isRtl ? (x1 - controlDist) : (x1 + controlDist);
      const cx2 = isRtl ? (x2 + controlDist) : (x2 - controlDist);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`);
      path.setAttribute("class", "mindmap-curve");
      path.setAttribute("stroke", domainColor);
      svg.appendChild(path);
    });
  });
}

function renderAll() {
  applyAppearance();
  renderMetrics();
  renderDomainNavigation();
  renderFilters();
  renderDictionary();
}

function toggleFavorite(termId) {
  const index = prefs.favorites.indexOf(termId);
  if (index >= 0) prefs.favorites.splice(index, 1);
  else prefs.favorites.unshift(termId);
  saveAll(index >= 0 ? "הוסר מהמועדפים" : "נוסף למועדפים", { backupRelevant: "system" });
  renderAll();
  if (state.currentTermId === termId && !$("termOverlay").classList.contains("hidden")) renderCurrentTerm();
}

function setProgress(termId, status) {
  if (status === "none") delete prefs.progress[termId];
  else prefs.progress[termId] = status;
  saveAll("התקדמות הלמידה עודכנה", { backupRelevant: "system" });
  renderAll();
  renderCurrentTerm();
}

function updateRecent(termId) {
  prefs.recent = [termId, ...prefs.recent.filter((id) => id !== termId)].slice(0, 20);
  saveAll("המצב נשמר מקומית · לגיבוי אישי הורד קובץ");
}

function setTermTab(tab) {
  state.termTab = tab;
  $$('#termModal [data-term-tab]').forEach((button) => button.classList.toggle("active", button.dataset.termTab === tab));
  $$("#termModal .term-page").forEach((page) => page.classList.toggle("active", page.id === `tab-${tab}`));
  if (tab === "details") setDetailTab(state.detailTab);
  requestAnimationFrame(fitTermModal);
}

function setDetailTab(tab) {
  const availableButtons = $$('[data-detail-tab]');
  const target = availableButtons.some((button) => button.dataset.detailTab === tab)
    ? tab
    : (availableButtons[0]?.dataset.detailTab || "context");
  state.detailTab = target;
  availableButtons.forEach((button) => button.classList.toggle("active", button.dataset.detailTab === target));
  $$('[data-detail-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.detailPanel === target));
  requestAnimationFrame(fitTermModal);
}

function detailTabDefinitions(term, fields) {
  const hasExample = fields.example && term.example && (term.example.given || term.example.solution || term.example.result);
  const relatedTerms = fields.related ? (term.related || []).map(findTerm).filter(Boolean) : [];
  return [
    { key: "context", label: "פרטים", show: Boolean(term.why || term.symbol || term.units || term.subtopic) },
    { key: "taxonomy", label: "שמות ותגיות", show: Boolean(term.aliases?.length || term.tags?.length) },
    { key: "media", label: "על התמונה", show: Boolean(term.visualDescription) },
    { key: "related", label: "מושגים קשורים", show: relatedTerms.length > 0 },
    { key: "equation", label: "נוסחה", show: Boolean(fields.formula && (term.formula || term.variables?.length)) },
    { key: "standards", label: "תקנים", show: Boolean(fields.standards && term.standards?.length) },
    { key: "uses", label: "שימושים", show: Boolean(term.uses?.length) },
    { key: "manufacturing", label: "ייצור", show: Boolean(fields.manufacturing && term.manufacturing) },
    { key: "inspection", label: "בחינה", show: Boolean(fields.inspection && term.inspection) },
    { key: "example", label: "דוגמה", show: Boolean(hasExample) },
    { key: "notes", label: "דגשים", show: Boolean(fields.cautions && term.cautions?.length) },
  ];
}

function renderDetailTabs(term, fields) {
  const container = $("detailTabs");
  if (!container) return;
  let items = detailTabDefinitions(term, fields).filter((item) => item.show);
  if (!items.length) items = [{ key: "context", label: "פרטים", show: true }];
  container.innerHTML = items.map((item) => `<button type="button" data-detail-tab="${item.key}">${esc(item.label)}</button>`).join("");
  if (!items.some((item) => item.key === state.detailTab)) state.detailTab = items[0].key;
  setDetailTab(state.detailTab);
}

function shrinkTextToFit(element, minSize = 12) {
  if (!element || !element.clientHeight) return;
  element.style.fontSize = "";
  let size = parseFloat(getComputedStyle(element).fontSize) || 16;
  let guard = 0;
  while (element.scrollHeight > element.clientHeight + 2 && size > minSize && guard < 16) {
    size -= 0.5;
    element.style.fontSize = `${size}px`;
    guard += 1;
  }
}

function fitTermModal() {
  const modal = $("termModal");
  if (!modal || $("termOverlay").classList.contains("hidden")) return;
  const term = findTerm(state.currentTermId);
  modal.classList.remove("term-modal-wide", "term-modal-compact", "term-modal-dense");
  if (term && (term.definition.length > 650 || term.name.length > 34)) modal.classList.add("term-modal-wide");
  const body = modal.querySelector(".term-body");
  const activePage = modal.querySelector(".term-page.active");
  const activeDetailCard = modal.querySelector(".detail-panel.active .detail-card");
  const hasOverflow = () => Boolean(
    (body && activePage && activePage.scrollHeight > body.clientHeight + 3)
    || (activeDetailCard && activeDetailCard.scrollHeight > activeDetailCard.clientHeight + 3)
  );
  if (hasOverflow()) modal.classList.add("term-modal-compact");
  requestAnimationFrame(() => {
    if (hasOverflow()) modal.classList.add("term-modal-dense");
    shrinkTextToFit($("termDefinition"), 12);
    if (activeDetailCard) shrinkTextToFit(activeDetailCard, 11);
  });
}

function renderList(targetId, items, emptyText = "לא הוגדר") {
  $(targetId).innerHTML = items?.length ? items.map((item) => `<li>${esc(item)}</li>`).join("") : `<li>${esc(emptyText)}</li>`;
}

function renderCurrentTerm() {
  const term = findTerm(state.currentTermId);
  if (!term) return closeTerm();
  const fields = settings.fields;
  const randomNextBtn = $("randomNextBtn");
  randomNextBtn?.classList.toggle("hidden", !state.randomSession);
  $("termModal")?.classList.toggle("random-learning-mode", state.randomSession);
  if ($("randomSessionProgress")) {
    $("randomSessionProgress").textContent = state.randomSession && state.randomCycleSize
      ? `מושג ${state.randomCyclePosition} מתוך ${state.randomCycleSize} בסבב`
      : "";
  }
  $("termDomain").textContent = term.domainName;
  $("termSubtopic").textContent = termLocationLabel(term.subtopic);
  $("termSubSubtopic").textContent = term.subSubtopic || "";
  $("termSubSubtopic").classList.toggle("hidden", !term.subSubtopic);
  $("termSubSubtopicSeparator").classList.toggle("hidden", !term.subSubtopic);
  $("termCode").textContent = term.code;
  $("termTitle").textContent = term.name;
  $("termTitleEn").textContent = term.nameEn || "";
  $("termDefinition").innerHTML = term.definitionHtml || esc(term.definition || "לא הוגדרה הגדרה מקצועית.");
  $("termWhy").textContent = term.why || "לא הוזן מידע נוסף למושג זה.";
  $("termSymbol").textContent = fields.symbol && term.symbol ? term.symbol : "—";
  $("termUnits").textContent = fields.units && term.units ? term.units : "—";
  $("termFactSubtopic").textContent = termLocationLabel(term.subtopic, term.subSubtopic);
  $("termUpdated").textContent = formatDate(term.updatedAt);

  $("cautionCard").classList.toggle("hidden", !fields.cautions || !(term.cautions || []).length);
  renderList("termCautions", term.cautions || []);
  $("aliasCard").classList.toggle("hidden", !(term.aliases || []).length);
  $("termAliases").innerHTML = (term.aliases || []).map((item) => `<span class="chip">${esc(item)}</span>`).join("");

  $("termFormula").textContent = fields.formula && term.formula ? term.formula : "לא הוגדרה נוסחה";
  $("formulaNote").textContent = fields.formula ? (term.formulaNote || "") : "שדה הנוסחה מוסתר בהגדרות התצוגה.";
  $("termStandards").innerHTML = fields.standards && term.standards?.length ? term.standards.map((item) => `<div class="standard-item">${esc(item)}</div>`).join("") : `<p>לא הוגדרו תקנים.</p>`;
  $("variablesCard").classList.toggle("hidden", !fields.formula || !term.variables?.length);
  $("variablesBody").innerHTML = (term.variables || []).map((item) => `<tr><td>${esc(item.symbol)}</td><td>${esc(item.meaning)}</td><td>${esc(item.unit)}</td></tr>`).join("");

  const hasExample = fields.example && term.example && (term.example.given || term.example.solution || term.example.result);
  $("exampleCard").classList.toggle("hidden", !hasExample);
  $("exampleTitle").textContent = term.example?.title || "דוגמה מחושבת";
  $("exampleGiven").textContent = term.example?.given || "—";
  $("exampleSolution").textContent = term.example?.solution || "—";
  $("exampleResult").textContent = term.example?.result || "—";

  renderList("termUses", term.uses || []);
  $("termManufacturing").textContent = fields.manufacturing ? (term.manufacturing || "לא הוגדר.") : "שדה זה מוסתר בהגדרות התצוגה.";
  $("termInspection").textContent = fields.inspection ? (term.inspection || "לא הוגדר.") : "שדה זה מוסתר בהגדרות התצוגה.";
  $("termTags").innerHTML = term.tags?.length ? term.tags.map((tag) => `<span class="chip">${esc(tag)}</span>`).join("") : `<span class="chip">ללא תגיות</span>`;
  $("tagsCard").classList.toggle("hidden", !term.tags?.length);

  const relatedTerms = fields.related ? (term.related || []).map(findTerm).filter(Boolean) : [];
  $("termRelated").innerHTML = relatedTerms.length ? relatedTerms.map((item) => `<button class="related-btn" data-related-id="${esc(item.id)}"><span dir="ltr">${esc(item.code)}</span> · ${esc(item.name)}</button>`).join("") : `<span>לא הוגדרו מושגים קשורים.</span>`;
  $$('[data-related-id]').forEach((button) => button.addEventListener("click", () => openTerm(button.dataset.relatedId)));

  const isFavorite = prefs.favorites.includes(term.id);
  $("termFavBtn").innerHTML = `<span aria-hidden="true">${isFavorite ? "★" : "☆"}</span><span>${isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}</span>`;
  $$('[data-status]').forEach((button) => button.classList.toggle("active", button.dataset.status === getTermStatus(term.id)));

  $("visualTitle").textContent = term.visualTitle || "מידע על התמונה";
  $("visualDescription").textContent = term.visualDescription || "";
  renderDetailTabs(term, fields);
  loadTermImage(term);
  setTermTab(state.termTab);
  requestAnimationFrame(fitTermModal);
}

function missingImageMarkup(term) {
  return `<div class="missing-image" role="img" aria-label="חסרה תמונה עבור ${esc(term.name)}"><span class="missing-image-x" aria-hidden="true">×</span><strong>חסרה תמונה למושג</strong><span>${esc(term.name)}</span><small>אפשר להוסיף קובץ לתיקיית images בשם המושג, לציין שם קובץ מדויק במרכז הניהול, או להטמיע תמונה בתוך המושג.</small></div>`;
}

function imageCandidatesForTerm(term) {
  const candidates = [];
  const catalogNames = [...IMAGE_CATALOG];
  const explicitName = String(term.imageName || "").trim();
  const requestedNames = unique([explicitName, term.name, term.visualTitle].map((name) => String(name || "").trim()).filter(Boolean));
  for (const [index, requestedName] of requestedNames.entries()) {
    const safeName = requestedName.replace(/^.*[\\/]/, "").trim();
    if (!safeName) continue;
    if (EMBEDDED_IMAGES[safeName]) candidates.push(EMBEDDED_IMAGES[safeName]);
    if (IMAGE_CATALOG.has(safeName)) candidates.push(EMBEDDED_IMAGES[safeName] || `images/${encodeURIComponent(safeName)}`);
    const requestedStem = normalizeText(safeName.replace(/\.[^.]+$/, ""));
    const matchingName = catalogNames.find((fileName) => normalizeText(fileName.replace(/\.[^.]+$/, "")) === requestedStem);
    if (matchingName) candidates.push(EMBEDDED_IMAGES[matchingName] || `images/${encodeURIComponent(matchingName)}`);
    if (index === 0 && explicitName && /\.(?:jpe?g|png|webp|svg)$/i.test(safeName) && !IMAGE_CATALOG.has(safeName)) {
      candidates.push(`images/${encodeURIComponent(safeName)}`);
    }
  }
  return unique(candidates);
}

function imagePathForTerm(term) {
  return imageCandidatesForTerm(term)[0] || "";
}

function loadTermImage(term) {
  const image = $("termImage");
  const fallback = $("visualFallback");
  $("termModal").classList.remove("term-modal-image-landscape", "term-modal-image-portrait", "term-modal-image-square");
  delete $("termModal").dataset.imageRatio;
  image.classList.add("hidden");
  image.removeAttribute("src");
  fallback.classList.remove("hidden");
  fallback.innerHTML = "";

  const showImage = (source, onMissing) => {
    image.onload = () => {
      image.classList.remove("hidden");
      fallback.classList.add("hidden");
      const modal = $("termModal");
      const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
      modal.dataset.imageRatio = ratio.toFixed(3);
      modal.classList.remove("term-modal-image-landscape", "term-modal-image-portrait", "term-modal-image-square");
      modal.classList.add(ratio > 1.25 ? "term-modal-image-landscape" : ratio < 0.8 ? "term-modal-image-portrait" : "term-modal-image-square");
      if (ratio > 1.55) modal.classList.add("term-modal-wide");
      requestAnimationFrame(fitTermModal);
    };
    image.onerror = () => {
      image.classList.add("hidden");
      fallback.classList.remove("hidden");
      $("termModal").classList.remove("term-modal-image-landscape", "term-modal-image-portrait", "term-modal-image-square");
      if (onMissing) onMissing();
      else {
        fallback.innerHTML = missingImageMarkup(term);
        requestAnimationFrame(fitTermModal);
      }
    };
    image.alt = term.visualTitle || term.name;
    image.src = source;
  };

  if (term.imageData && /^data:image\//.test(term.imageData)) {
    showImage(term.imageData);
    return;
  }

  const imageCandidates = imageCandidatesForTerm(term);
  if (imageCandidates.length) {
    let candidateIndex = 0;
    const tryNextCandidate = () => {
      if (candidateIndex >= imageCandidates.length) {
        fallback.innerHTML = missingImageMarkup(term);
        requestAnimationFrame(fitTermModal);
        return;
      }
      showImage(imageCandidates[candidateIndex], () => {
        candidateIndex += 1;
        tryNextCandidate();
      });
    };
    tryNextCandidate();
    return;
  }

  fallback.innerHTML = missingImageMarkup(term);
  requestAnimationFrame(fitTermModal);
}

function shuffleIds(ids) {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function resetRandomSession() {
  state.randomSession = false;
  state.randomQueue = [];
  state.randomScopeIds = [];
  state.randomCycleSize = 0;
  state.randomCyclePosition = 0;
  $("termModal")?.classList.remove("random-learning-mode");
  $("randomNextBtn")?.classList.add("hidden");
}

function refillRandomQueue() {
  let scopeIds = state.randomScopeIds.filter((id) => Boolean(findTerm(id)));
  if (!scopeIds.length) scopeIds = allTerms().map((term) => term.id);
  if (!scopeIds.length) return false;
  let queue = shuffleIds(scopeIds);
  if (queue.length > 1 && queue[0] === state.currentTermId) {
    queue.push(queue.shift());
  }
  state.randomQueue = queue;
  state.randomCycleSize = queue.length;
  state.randomCyclePosition = 0;
  return true;
}

function openNextRandomTerm() {
  if (!state.randomSession) return startRandomSession();
  const finishedCycle = state.randomQueue.length === 0 && state.randomCyclePosition > 0;
  if (!state.randomQueue.length && !refillRandomQueue()) {
    toast("אין מושגים זמינים למסלול ההפתעה", "error");
    return;
  }
  const nextId = state.randomQueue.shift();
  state.randomCyclePosition += 1;
  openTerm(nextId, { randomSession: true });
  if (finishedCycle) toast("כל הכבוד — השלמת סבב. ערבבתי עבורך סבב חדש ✦", "success");
}

function startRandomSession() {
  const filteredTerms = getFilteredTerms();
  const completeDictionary = allTerms();
  if (!filteredTerms.length && !completeDictionary.length) {
    toast("אין מושגים זמינים למסלול ההפתעה", "error");
    return;
  }
  const scopeTerms = filteredTerms.length > 1 || completeDictionary.length <= 1 ? filteredTerms : completeDictionary;
  resetRandomSession();
  state.randomSession = true;
  state.randomScopeIds = scopeTerms.map((term) => term.id);
  refillRandomQueue();
  openNextRandomTerm();
}

function openTerm(termId, options = {}) {
  const term = findTerm(termId);
  if (!term) return;
  if (options.randomSession !== true) resetRandomSession();
  else state.randomSession = true;
  state.currentTermId = term.id;
  state.termTab = "overview";
  $("termModal").classList.remove("term-modal-fullscreen");
  $("termOverlay").classList.remove("term-overlay-fullscreen");
  const expandBtn = $("expandTermBtn");
  if (expandBtn) {
    expandBtn.textContent = "⛶";
    expandBtn.setAttribute("aria-label", "הגדל למסך מלא");
    expandBtn.title = "הגדל למסך מלא";
  }
  state.detailTab = "context";
  updateRecent(term.id);
  renderCurrentTerm();
  setModalVisibility($("termOverlay"), true, { initialFocus: $("closeTermBtn") });
  requestAnimationFrame(fitTermModal);
}

function toggleTermFullscreen() {
  const modal = $("termModal");
  const button = $("expandTermBtn");
  if (!modal || !button) return;
  const expanded = modal.classList.toggle("term-modal-fullscreen");
  $("termOverlay").classList.toggle("term-overlay-fullscreen", expanded);
  button.textContent = expanded ? "❐" : "⛶";
  button.setAttribute("aria-label", expanded ? "החזר לגודל חלון" : "הגדל למסך מלא");
  button.title = expanded ? "החזר לגודל חלון" : "הגדל למסך מלא";
  requestAnimationFrame(fitTermModal);
}

function toggleDomainFullscreen() {
  const modal = $("domainDetailModal");
  const button = $("expandDomainDetailBtn");
  if (!modal || !button) return;
  const expanded = modal.classList.toggle("term-modal-fullscreen");
  $("domainDetailOverlay").classList.toggle("term-overlay-fullscreen", expanded);
  button.textContent = expanded ? "❐" : "⛶";
  button.setAttribute("aria-label", expanded ? "החזר לגודל חלון" : "הגדל למסך מלא");
  button.title = expanded ? "החזר לגודל חלון" : "הגדל למסך מלא";
}

function closeTerm() {
  $("termModal").classList.remove("term-modal-fullscreen");
  $("termOverlay").classList.remove("term-overlay-fullscreen");
  setModalVisibility($("termOverlay"), false);
  resetRandomSession();
}

function resetFilters() {
  state.collection = "all";
  state.domainId = "all";
  state.query = "";
  state.subtopic = "all";
  state.subSubtopic = "all";
  state.sort = "relevance";
  renderAll();
}

function toast(message, type = "") {
  const item = document.createElement("div");
  item.className = `toast ${type}`.trim();
  item.textContent = message;
  $("toastRegion").appendChild(item);
  setTimeout(() => item.remove(), 3200);
}

function openPinDialog() {
  $("pinInput").value = "";
  $("pinError").classList.add("hidden");
  if ($("pinRoleSelect")) $("pinRoleSelect").value = state.adminRole || "content";
  setModalVisibility($("pinOverlay"), true, { initialFocus: $("pinInput") });
}

function closePinDialog(options = {}) {
  setModalVisibility($("pinOverlay"), false, { restoreFocus: options?.restoreFocus !== false });
}

async function openAdmin(role, providedPin = null) {
  const expectedPin = role === "super" ? (settings.superPin || "9999") : (settings.contentPin || settings.pin || "1234");
  if (providedPin !== expectedPin) {
    toast("גישה נדחתה: סיסמה שגויה או חסרה", "error");
    return;
  }

  if (window.MechLexCore && window.MechLexCore.sharedSync) {
    try {
      const response = await fetch("/api/can-write", { cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        if (!result.canWrite) {
          toast("אין לך הרשאת כתיבה לתיקייה המשותפת. גישת ניהול נדחתה.", "error");
          return;
        }
      }
    } catch (e) {
      console.warn("Could not verify write access", e);
    }
  }

  const opener = modalFocusState.get($("pinOverlay")) || $("adminBtn");
  state.adminUnlocked = true;
  state.adminRole = role || state.adminRole || "content";
  closePinDialog({ restoreFocus: false });
  setModalVisibility($("adminOverlay"), true, { opener, initialFocus: $("closeAdminBtn") });

  if ($("adminRoleName")) {
    $("adminRoleName").textContent = state.adminRole === "super" ? "אדמין ראשי (Super Admin)" : "מומחה תוכן (Content Admin)";
  }
  if ($("headerExportDataBtn")) {
    $("headerExportDataBtn").textContent = state.adminRole === "super" ? "⬇ גיבוי מערכת מלא" : "⬇ גיבוי תוכן";
    $("headerExportDataBtn").title = state.adminRole === "super"
      ? "מוריד תוכן, UI/UX והעדפות — ללא קודי גישה"
      : "מוריד תחומים, תתי־תחומים, מושגים ותמונות מוטמעות";
  }

  const isSuper = state.adminRole === "super";
  $$('[data-admin-tab="appearance"], [data-admin-tab="data"]').forEach((tab) => {
    tab.style.display = isSuper ? "" : "none";
  });
  if (!isSuper && (state.adminTab === "appearance" || state.adminTab === "data")) {
    state.adminTab = "terms";
  }

  renderAdmin();
  setAdminTab(state.adminTab);
}

function switchAdminRole() {
  state.adminUnlocked = false;
  closeAdmin();
  openPinDialog();
}

function closeAdmin() {
  setModalVisibility($("adminOverlay"), false);
  renderAll();
}

function setAdminTab(tab) {
  state.adminTab = tab;
  $$('[data-admin-tab]').forEach((button) => button.classList.toggle("active", button.dataset.adminTab === tab));
  $$(".admin-page").forEach((page) => page.classList.toggle("active", page.id === `admin-${tab}`));
}

function fillAdminSelects() {
  const domainOptions = data.map((domain) => `<option value="${esc(domain.id)}">${esc(domain.name)}</option>`).join("");
  $("editDomain").innerHTML = domainOptions;
  $("adminDomainFilter").innerHTML = `<option value="all">כל התחומים</option>${domainOptions}`;
  if (!data.some((domain) => domain.id === $("editDomain").value) && data.length) $("editDomain").value = data[0].id;
  fillTermSubtopicSelect();
}

function generateTermCode(domain) {
  const prefix = String(domain?.prefix || "GEN").trim().toUpperCase() || "GEN";
  const prefixToken = `${prefix}-`;
  const numbers = allTerms().map((term) => {
    const code = String(term.code || "").toUpperCase();
    if (!code.startsWith(prefixToken)) return 0;
    const value = Number(code.slice(prefixToken.length));
    return Number.isInteger(value) && value > 0 ? value : 0;
  });
  let next = Math.max(0, ...numbers) + 1;
  let code = `${prefix}-${String(next).padStart(3, "0")}`;
  const used = new Set(allTerms().map((term) => normalizeText(term.code)));
  while (used.has(normalizeText(code))) {
    next += 1;
    code = `${prefix}-${String(next).padStart(3, "0")}`;
  }
  return code;
}

function fillTermSubtopicSelect(preferredValue) {
  const domain = data.find((item) => item.id === $("editDomain").value);
  const currentValue = preferredValue && typeof preferredValue === "object"
    ? (isDirectTermSubtopic(preferredValue.subtopic) ? "direct" : encodeHierarchyLocation(domain?.id || "", preferredValue.subtopic, preferredValue.subSubtopic || ""))
    : (preferredValue === "כללי" ? "direct" : preferredValue ?? $("editSubtopic").value ?? "direct");
  const subtopics = domain ? domainSubtopicEntries(domain) : [];
  $("editSubtopic").innerHTML = `<option value="direct">ישירות בתחום (ללא תת־תחום)</option>${subtopics.map((subtopic) => `<optgroup label="תת־תחום: ${esc(subtopic.name)}"><option value="${esc(encodeHierarchyLocation(domain.id, subtopic.name))}">מושג בתוך ${esc(subtopic.name)}</option>${subtopic.children.map((child) => `<option value="${esc(encodeHierarchyLocation(domain.id, subtopic.name, child.name))}">↳ בתוך תת־תת־תחום: ${esc(child.name)}</option>`).join("")}</optgroup>`).join("")}`;
  $("editSubtopic").value = [...$("editSubtopic").options].some((option) => option.value === currentValue) ? currentValue : "direct";
}

function renderTermRecords() {
  const query = normalizeText($("adminSearchInput").value);
  const domainFilter = $("adminDomainFilter").value || "all";
  const terms = allTerms().filter((term) => {
    if (domainFilter !== "all" && term.domainId !== domainFilter) return false;
    return !query || termSearchText(term).includes(query);
  });
  $("termRecords").innerHTML = terms.length ? terms.map((term) => `
    <div class="record-item ${state.editingTermId === term.id ? "active" : ""}" data-edit-record="${esc(term.id)}">
      <div><strong>${esc(term.name)}</strong><span>${esc(term.domainName)} · ${esc(termLocationLabel(term.subtopic, term.subSubtopic))}</span></div>
      <div class="record-actions"><button class="btn ghost" data-clone-term="${esc(term.id)}" title="שכפל" aria-label="שכפל">⧉</button></div>
    </div>`).join("") : `<div class="empty-state"><p>לא נמצאו מושגים ברשימה.</p></div>`;
  $$('[data-edit-record]').forEach((item) => item.addEventListener("click", (event) => {
    if (event.target.closest("[data-clone-term]")) return;
    editTerm(item.dataset.editRecord);
  }));
  $$('[data-clone-term]').forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    cloneTerm(button.dataset.cloneTerm);
  }));
}

function renderDomainRecords() {
  $("domainRecords").innerHTML = data.map((domain) => `
    <article class="domain-record" data-edit-domain-record="${esc(domain.id)}" style="--domain-color:${esc(domain.color)}">
      <h3>${esc(domain.name)}</h3><small dir="ltr">${esc(domain.nameEn)}</small>
      <p>${esc(domain.description || "ללא תיאור")}</p>
      <footer><span>${domain.items.length} מושגים</span><span>${(domain.subtopics || []).length} תתי־תחומים · ${(domain.subtopics || []).reduce((sum, item) => sum + (item.children || []).length, 0)} תתי־תתי־תחומים</span></footer>
    </article>`).join("");
  $$('[data-edit-domain-record]').forEach((item) => item.addEventListener("click", () => editDomainRecord(item.dataset.editDomainRecord)));
}

function renderFieldVisibility() {
  const labels = {
    symbol: "סימון", units: "יחידות", formula: "נוסחה ומשתנים", standards: "תקנים", example: "דוגמה מחושבת",
    cautions: "דגשים וטעויות", manufacturing: "שיקולי ייצור", inspection: "שיטות בחינה", related: "מושגים קשורים"
  };
  $("fieldVisibility").innerHTML = Object.entries(labels).map(([key, label]) => `<label class="toggle-item"><span>${esc(label)}</span><input type="checkbox" data-field-setting="${key}" ${settings.fields[key] ? "checked" : ""}></label>`).join("");
}

function loadAppearanceInputs() {
  const a = settings.appearance;
  $("settingPrimary").value = a.primary;
  $("settingBackground").value = a.background;
  $("settingSurface").value = a.surface;
  $("settingFont").value = a.font;
  $("settingFontSize").value = a.fontSize;
  $("settingRadius").value = a.radius;
  $("settingDensity").value = a.density;
  if ($("settingButtonShadow")) $("settingButtonShadow").value = a.buttonShadow || "dynamic";
  if ($("settingButtonHoverScale")) $("settingButtonHoverScale").value = String(a.buttonHoverScale || 1.04);
  if ($("settingButtonActiveScale")) $("settingButtonActiveScale").value = String(a.buttonActiveScale || 0.97);
  $("fontSizeOutput").textContent = `${a.fontSize}px`;
  $("radiusOutput").textContent = `${a.radius}px`;
}

function renderAdmin() {
  fillAdminSelects();
  renderTermRecords();
  renderDomainRecords();
  renderFieldVisibility();
  loadAppearanceInputs();
  updateBackupStatus();
}

function subSubtopicRowMarkup(item = {}) {
  return `<div class="subsubtopic-editor-row" data-subsubtopic-row data-subsubtopic-id="${esc(item.id || uid())}">
    <span class="hierarchy-connector" aria-hidden="true">↳</span>
    <input data-subsubtopic-name aria-label="שם תת־תת־התחום" placeholder="שם תת־תת־התחום" value="${esc(item.name || "")}">
    <input data-subsubtopic-description aria-label="תיאור תת־תת־התחום" placeholder="תיאור קצר (אופציונלי)" value="${esc(item.description || "")}">
    <input data-subsubtopic-color type="color" aria-label="צבע תת־תת־התחום" value="${esc(item.color || "#6f8795")}" title="צבע תת־תת־התחום">
    <input data-subsubtopic-image-file type="file" accept="image/*" title="העלאת תמונה">
    <input data-subsubtopic-image-data type="hidden" value="${esc(item.imageData || "")}">
    <button type="button" class="icon-btn" data-remove-subsubtopic aria-label="הסרת תת־תת־תחום">×</button>
  </div>`;
}

function subtopicRowMarkup(item = {}) {
  const children = normalizeSubSubtopics(item.children || []);
  return `<section class="subtopic-editor-row" data-subtopic-row data-subtopic-id="${esc(item.id || uid())}">
    <div class="subtopic-editor-main">
      <span class="hierarchy-level-badge">תת־תחום</span>
      <input data-subtopic-name aria-label="שם תת־התחום" placeholder="שם תת־התחום" value="${esc(item.name || "")}">
      <input data-subtopic-description aria-label="תיאור תת־התחום" placeholder="תיאור קצר (אופציונלי)" value="${esc(item.description || "")}">
      <input data-subtopic-color type="color" aria-label="צבע תת־התחום" value="${esc(item.color || "#496a80")}" title="צבע">
      <input data-subtopic-image-file type="file" accept="image/*" title="העלאת תמונה">
      <input data-subtopic-image-data type="hidden" value="${esc(item.imageData || "")}">
      <button type="button" class="text-btn" data-add-subsubtopic>+ תת־תת־תחום</button>
      <button type="button" class="icon-btn" data-remove-subtopic aria-label="הסרת תת־תחום">×</button>
    </div>
    <div class="subsubtopic-editor-rows">${children.map(subSubtopicRowMarkup).join("")}</div>
  </section>`;
}

function bindSubtopicRowEvents() {
  $$('[data-remove-subtopic]', $("domainSubtopicRows")).forEach((button) => { button.onclick = () => {
    const rows = $$('[data-subtopic-row]', $("domainSubtopicRows"));
    if (rows.length === 1) {
      rows[0].querySelector("[data-subtopic-name]").value = "";
      rows[0].querySelector("[data-subtopic-description]").value = "";
      rows[0].querySelector(".subsubtopic-editor-rows").innerHTML = "";
      return;
    }
    button.closest("[data-subtopic-row]").remove();
  }; });
  $$('[data-add-subsubtopic]', $("domainSubtopicRows")).forEach((button) => { button.onclick = () => {
    button.closest("[data-subtopic-row]").querySelector(".subsubtopic-editor-rows").insertAdjacentHTML("beforeend", subSubtopicRowMarkup());
    bindSubtopicRowEvents();
  }; });
  $$('[data-remove-subsubtopic]', $("domainSubtopicRows")).forEach((button) => { button.onclick = () => button.closest("[data-subsubtopic-row]").remove(); });
  
  $$('[data-subtopic-image-file], [data-subsubtopic-image-file]', $("domainSubtopicRows")).forEach((fileInput) => {
    fileInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) { e.target.value = ""; return toast("התמונה עולה על 15MB.", "error"); }
      const reader = new FileReader();
      const hiddenInput = e.target.nextElementSibling;
      reader.onload = () => { hiddenInput.value = String(reader.result); toast("תמונה נטענה", "success"); };
      reader.onerror = () => toast("שגיאה בטעינת תמונה", "error");
      reader.readAsDataURL(file);
    };
  });
}

function renderSubtopicRows(items = []) {
  $("domainSubtopicRows").innerHTML = items.map(subtopicRowMarkup).join("");
  if (!items.length) $("domainSubtopicRows").innerHTML = subtopicRowMarkup();
  bindSubtopicRowEvents();
}

function readSubtopicRows() {
  return $$('[data-subtopic-row]', $("domainSubtopicRows")).map((row) => ({
    id: row.dataset.subtopicId || uid(),
    name: row.querySelector("[data-subtopic-name]").value.trim(),
    description: row.querySelector("[data-subtopic-description]").value.trim(),
    color: row.querySelector("[data-subtopic-color]").value,
    imageData: row.querySelector("[data-subtopic-image-data]").value,
    children: $$('[data-subsubtopic-row]', row).map((child) => ({
      id: child.dataset.subsubtopicId || uid(),
      name: child.querySelector("[data-subsubtopic-name]").value.trim(),
      description: child.querySelector("[data-subsubtopic-description]").value.trim(),
      color: child.querySelector("[data-subsubtopic-color]").value,
      imageData: child.querySelector("[data-subsubtopic-image-data]").value,
    })).filter((child) => child.name),
  })).filter((item) => item.name);
}

function clearTermForm() {
  state.editingTermId = null;
  state.embeddedImageData = "";
  if ($("editTermId")) $("editTermId").value = "";
  if ($("editCode")) $("editCode").value = "";
  if ($("editName")) $("editName").value = "";
  if ($("editNameEn")) $("editNameEn").value = "";
  if ($("editDefinition")) $("editDefinition").innerHTML = "";
  if ($("editDefinitionHtml")) $("editDefinitionHtml").value = "";
  if ($("editImageName")) $("editImageName").value = "";
  if ($("editImageFile")) $("editImageFile").value = "";
  if ($("embeddedImageState")) $("embeddedImageState").textContent = "לא הוטמעה תמונה";
  if ($("editSymbol")) $("editSymbol").value = "";
  if ($("editUnits")) $("editUnits").value = "";
  if ($("editShort")) $("editShort").value = "";
  if ($("editWhy")) $("editWhy").value = "";
  if ($("editRelated")) $("editRelated").value = "";
  if ($("editAliases")) $("editAliases").value = "";
  if ($("editTags")) $("editTags").value = "";
  if ($("editStandards")) $("editStandards").value = "";
  if ($("editFormula")) $("editFormula").value = "";
  if ($("editFormulaNote")) $("editFormulaNote").value = "";
  if ($("editVariables")) $("editVariables").value = "";
  if ($("editExampleTitle")) $("editExampleTitle").value = "";
  if ($("editExampleGiven")) $("editExampleGiven").value = "";
  if ($("editExampleSolution")) $("editExampleSolution").value = "";
  if ($("editExampleResult")) $("editExampleResult").value = "";
  if ($("editUses")) $("editUses").value = "";
  if ($("editCautions")) $("editCautions").value = "";
  if ($("editManufacturing")) $("editManufacturing").value = "";
  if ($("editInspection")) $("editInspection").value = "";
  if ($("editVisualTitle")) $("editVisualTitle").value = "";
  if ($("editVisualDescription")) $("editVisualDescription").value = "";
  if ($("termFormTitle")) $("termFormTitle").textContent = "הוספת מושג";
  if ($("deleteCurrentTermBtn")) $("deleteCurrentTermBtn").classList.add("hidden");
  if (data[0] && $("editDomain")) $("editDomain").value = data[0].id;
  fillTermSubtopicSelect("direct");
  renderTermRecords();
}

function editTerm(termId) {
  const term = findTerm(termId);
  if (!term) return;
  state.editingTermId = term.id;
  state.embeddedImageData = term.imageData || "";
  $("editTermId").value = term.id;
  $("termFormTitle").textContent = `עריכת ${term.name}`;
  $("editDomain").value = term.domainId;
  fillTermSubtopicSelect(term);
  $("editCode").value = term.code;
  $("editName").value = term.name;
  $("editNameEn").value = term.nameEn || "";
  $("editSymbol").value = term.symbol || "";
  $("editUnits").value = term.units || "";
  $("editShort").value = term.short || "";
  $("editDefinition").innerHTML = term.definitionHtml || esc(term.definition || "");
  $("editDefinitionHtml").value = term.definitionHtml || esc(term.definition || "");
  $("editWhy").value = term.why || "";
  $("editFormula").value = term.formula || "";
  $("editFormulaNote").value = term.formulaNote || "";
  $("editVariables").value = (term.variables || []).map((item) => `${item.symbol} | ${item.meaning} | ${item.unit}`).join("\n");
  $("editUses").value = (term.uses || []).join("\n");
  $("editCautions").value = (term.cautions || []).join("\n");
  $("editStandards").value = (term.standards || []).join(", ");
  $("editTags").value = (term.tags || []).join(", ");
  $("editRelated").value = (term.related || []).join(", ");
  $("editAliases").value = (term.aliases || []).join(", ");
  $("editManufacturing").value = term.manufacturing || "";
  $("editInspection").value = term.inspection || "";
  $("editExampleTitle").value = term.example?.title || "";
  $("editExampleGiven").value = term.example?.given || "";
  $("editExampleSolution").value = term.example?.solution || "";
  $("editExampleResult").value = term.example?.result || "";
  $("editImageName").value = term.imageName || "";
  $("editVisualTitle").value = term.visualTitle || "";
  $("editVisualDescription").value = term.visualDescription || "";
  $("embeddedImageState").textContent = term.imageData ? "קיימת תמונה מוטמעת" : "לא הוטמעה תמונה";
  $("deleteCurrentTermBtn").classList.remove("hidden");
  renderTermRecords();
  $("termForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function parseVariablesInput(value) {
  return splitLines(value).map((line) => {
    const [symbol = "", meaning = "", unit = ""] = line.split("|").map((item) => item.trim());
    return { symbol, meaning, unit };
  }).filter((item) => item.symbol || item.meaning || item.unit);
}

function upsertTermFromForm(event) {
  event.preventDefault();
  const id = $("editTermId").value || uid();
  const domainId = $("editDomain").value;
  const domain = data.find((item) => item.id === domainId);
  if (!domain) return toast("יש לבחור תחום תקין", "error");
  const name = $("editName").value.trim();
  const definitionHtml = cleanRichHtml($("editDefinition").innerHTML);
  const definitionText = plainRichText(definitionHtml);
  if (!name) { $("editName").focus(); return toast("חובה להזין שם מושג", "error"); }
  if (name.length < 2) { $("editName").focus(); return toast("שם המושג קצר מדי", "error"); }
  if (!definitionText) { $("editDefinition").focus(); return toast("חובה להזין הגדרה מקצועית", "error"); }
  const existing = findTerm(id);
  const code = existing?.code || $("editCode").value.trim() || generateTermCode(domain);
  const duplicate = allTerms().find((term) => normalizeText(term.code) === normalizeText(code) && term.id !== id);
  if (duplicate) return toast(`הקוד ${code} כבר משויך למושג ${duplicate.name}`, "error");
  const selectedLocation = decodeHierarchyLocation($("editSubtopic").value);
  const term = normalizeTerm({
    id,
    code,
    name,
    nameEn: existing?.nameEn || $("editNameEn").value.trim(),
    subtopic: selectedLocation?.subtopic || "כללי",
    subSubtopic: selectedLocation?.subSubtopic || "",
    symbol: $("editSymbol").value.trim(),
    units: $("editUnits").value.trim(),
    short: $("editShort").value.trim() || definitionText.slice(0, 180),
    definition: definitionText,
    definitionHtml,
    why: $("editWhy").value.trim(),
    formula: $("editFormula").value.trim(),
    formulaNote: $("editFormulaNote").value.trim(),
    variables: parseVariablesInput($("editVariables").value),
    uses: splitLines($("editUses").value),
    cautions: splitLines($("editCautions").value),
    standards: splitCsv($("editStandards").value),
    tags: splitCsv($("editTags").value),
    related: splitCsv($("editRelated").value),
    aliases: splitCsv($("editAliases").value),
    manufacturing: $("editManufacturing").value.trim(),
    inspection: $("editInspection").value.trim(),
    example: {
      title: $("editExampleTitle").value.trim(),
      given: $("editExampleGiven").value.trim(),
      solution: $("editExampleSolution").value.trim(),
      result: $("editExampleResult").value.trim(),
    },
    imageName: $("editImageName").value.trim(),
    imageData: state.embeddedImageData,
    visualTitle: $("editVisualTitle").value.trim() || $("editName").value.trim(),
    visualDescription: $("editVisualDescription").value.trim(),
    createdAt: existing?.createdAt || todayIso(),
    updatedAt: todayIso(),
  }, domain.prefix);

  data.forEach((item) => { item.items = item.items.filter((candidate) => candidate.id !== id); });
  domain.items.push(term);
  ensureTermHierarchy(domain, term);
  saveAll("המושג נשמר אוטומטית במחשב זה · מומלץ להוריד גיבוי", { backupRelevant: true });
  toast("המושג נשמר אוטומטית במחשב זה", "success");
  clearTermForm();
  renderAdmin();
  renderAll();
}

function cloneTerm(termId) {
  const source = findTerm(termId);
  if (!source) return;
  const domain = data.find((item) => item.id === source.domainId);
  if (!domain) return toast("לא נמצא התחום של המושג", "error");
  createRecoverySnapshot(`לפני שכפול המושג ${source.name}`);
  const copyCode = uniqueTermCode(`${source.code}-COPY`);
  const copy = normalizeTerm({ ...clone(source), id: uid(), code: copyCode, name: `${source.name} — עותק`, related: [...(source.related || [])], createdAt: todayIso(), updatedAt: todayIso() }, domain.prefix);
  domain.items.push(copy);
  repairCatalogIntegrity(data);
  saveAll("המושג שוכפל ונשמר אוטומטית", { backupRelevant: true });
  toast(`נוצר עותק עם הקוד ${copyCode}`, "success");
  renderAdmin();
  editTerm(copy.id);
}

function deleteTerm(termId) {
  const term = findTerm(termId);
  if (!term || !confirm(`למחוק את המושג “${term.name}”? לפני המחיקה תישמר נקודת שחזור מקומית.`)) return;
  createRecoverySnapshot(`לפני מחיקת המושג ${term.name}`);
  const removedRefs = new Set([term.id, term.code, term.name, term.nameEn].map(normalizeText).filter(Boolean));
  let cleanedLinks = 0;
  data.forEach((domain) => {
    domain.items = domain.items.filter((item) => item.id !== termId);
    domain.items.forEach((item) => {
      const before = (item.related || []).length;
      item.related = (item.related || []).filter((ref) => !removedRefs.has(normalizeText(ref)));
      cleanedLinks += before - item.related.length;
    });
  });
  prefs.favorites = prefs.favorites.filter((id) => id !== termId);
  prefs.recent = prefs.recent.filter((id) => id !== termId);
  delete prefs.progress[termId];
  repairCatalogIntegrity(data);
  saveAll("המושג נמחק והשינוי נשמר אוטומטית", { backupRelevant: true });
  toast(`המושג נמחק${cleanedLinks ? ` ונוקו ${cleanedLinks} קישורים קשורים` : ""}`, "success");
  clearTermForm();
  renderAdmin();
  renderAll();
}

function clearDomainForm() {
  state.editingDomainId = null;
  state.embeddedDomainImageData = "";
  if ($("editDomainId")) $("editDomainId").value = "";
  if ($("domainName")) $("domainName").value = "";
  if ($("domainNameEn")) $("domainNameEn").value = "";
  if ($("domainPrefix")) $("domainPrefix").value = "";
  if ($("domainIcon")) $("domainIcon").value = "general";
  if ($("domainColor")) $("domainColor").value = "#246b87";
  if ($("domainDescription")) $("domainDescription").value = "";
  if ($("domainDefinition")) $("domainDefinition").innerHTML = "";
  if ($("domainDefinitionHtml")) $("domainDefinitionHtml").value = "";
  if ($("domainImageFile")) $("domainImageFile").value = "";
  if ($("domainEmbeddedImageState")) $("domainEmbeddedImageState").textContent = "לא נבחרה תמונה";
  if ($("domainFormTitle")) $("domainFormTitle").textContent = "הוספת תחום";
  renderSubtopicRows([]);
  if ($("deleteCurrentDomainBtn")) $("deleteCurrentDomainBtn").classList.add("hidden");
  if ($("deleteDomainWithTermsBtn")) $("deleteDomainWithTermsBtn").classList.add("hidden");
}

function editDomainRecord(domainId) {
  const domain = data.find((item) => item.id === domainId);
  if (!domain) return;
  state.editingDomainId = domain.id;
  state.embeddedDomainImageData = domain.imageData || "";
  $("editDomainId").value = domain.id;
  $("domainFormTitle").textContent = `עריכת ${domain.name}`;
  $("domainName").value = domain.name;
  $("domainNameEn").value = domain.nameEn || "";
  $("domainPrefix").value = domain.prefix;
  $("domainIcon").value = domain.icon;
  $("domainColor").value = domain.color;
  $("domainDescription").value = domain.description || "";
  $("domainDefinition").innerHTML = domain.definitionHtml || domain.description || "";
  $("domainDefinitionHtml").value = domain.definitionHtml || domain.description || "";
  if ($("domainImageFile")) $("domainImageFile").value = "";
  if ($("domainEmbeddedImageState")) $("domainEmbeddedImageState").textContent = domain.imageData ? "תמונה קיימת בבסיס הנתונים" : "לא נבחרה תמונה";
  renderSubtopicRows(domain.subtopics || []);
  $("deleteCurrentDomainBtn").classList.remove("hidden");
  $("deleteDomainWithTermsBtn")?.classList.remove("hidden");
  $("domainForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function reconcileDomainHierarchy(domain, nextSubtopics) {
  const operations = [];
  for (const previousParent of normalizeSubtopics(domain.subtopics || [])) {
    const nextParent = nextSubtopics.find((candidate) => candidate.id === previousParent.id);
    if (!nextParent) {
      const count = domain.items.filter((term) => term.subtopic === previousParent.name).length;
      operations.push({ type: "remove-parent", parent: previousParent.name, count });
      continue;
    }
    for (const previousChild of previousParent.children || []) {
      const nextChild = (nextParent.children || []).find((candidate) => candidate.id === previousChild.id);
      if (!nextChild) {
        const count = domain.items.filter((term) => term.subtopic === previousParent.name && term.subSubtopic === previousChild.name).length;
        operations.push({ type: "remove-child", parent: previousParent.name, child: previousChild.name, count });
      } else if (nextChild.name !== previousChild.name) {
        operations.push({ type: "rename-child", parent: previousParent.name, child: previousChild.name, nextName: nextChild.name });
      }
    }
    if (nextParent.name !== previousParent.name) operations.push({ type: "rename-parent", parent: previousParent.name, nextName: nextParent.name });
  }

  const movedTerms = operations.filter((operation) => operation.type.startsWith("remove-")).reduce((total, operation) => total + operation.count, 0);
  if (movedTerms && !confirm(`הסרת הענף תשנה את המיקום של ${movedTerms} מושגים, אך לא תמחק אותם. מושגים מתת־תת־תחום יועברו לתת־התחום, ומושגים מתת־תחום יועברו ישירות לתחום. להמשיך?`)) return false;

  for (const operation of operations) {
    if (operation.type === "remove-parent") {
      domain.items.filter((term) => term.subtopic === operation.parent).forEach((term) => { term.subtopic = "כללי"; term.subSubtopic = ""; });
    }
    if (operation.type === "remove-child") {
      domain.items.filter((term) => term.subtopic === operation.parent && term.subSubtopic === operation.child).forEach((term) => { term.subSubtopic = ""; });
    }
    if (operation.type === "rename-child") {
      domain.items.filter((term) => term.subtopic === operation.parent && term.subSubtopic === operation.child).forEach((term) => { term.subSubtopic = operation.nextName; });
    }
    if (operation.type === "rename-parent") {
      domain.items.filter((term) => term.subtopic === operation.parent).forEach((term) => { term.subtopic = operation.nextName; });
    }
  }
  return true;
}

function upsertDomainFromForm(event) {
  event.preventDefault();
  const id = $("editDomainId").value || uid();
  const name = $("domainName").value.trim();
  const prefix = $("domainPrefix").value.trim().toUpperCase();
  if (!name) { $("domainName").focus(); return toast("חובה להזין שם תחום", "error"); }
  if (!prefix) { $("domainPrefix").focus(); return toast("חובה להזין קידומת קוד", "error"); }
  if (!/^[A-Z0-9_-]{2,12}$/.test(prefix)) { $("domainPrefix").focus(); return toast("קידומת התחום יכולה להכיל 2–12 אותיות באנגלית, מספרים, מקף או קו תחתון", "error"); }
  const duplicate = data.find((domain) => normalizeText(domain.prefix) === normalizeText(prefix) && domain.id !== id);
  if (duplicate) return toast(`הקידומת ${prefix} כבר בשימוש`, "error");
  let domain = data.find((item) => item.id === id);
  if (!domain) {
    domain = { id, items: [] };
    data.push(domain);
  }
  domain.name = name;
  domain.nameEn = $("domainNameEn").value.trim();
  domain.prefix = prefix;
  domain.icon = $("domainIcon").value;
  domain.color = $("domainColor").value;
  domain.description = $("domainDefinition") ? $("domainDefinition").textContent.replace(/\s+/g, " ").trim() : $("domainDescription").value.trim();
  domain.definitionHtml = $("domainDefinition") ? $("domainDefinition").innerHTML.trim() : "";
  domain.imageData = state.embeddedDomainImageData;
  const nextSubtopics = normalizeSubtopics(readSubtopicRows());
  if (!reconcileDomainHierarchy(domain, nextSubtopics)) return;
  domain.subtopics = nextSubtopics;
  saveAll("התחום נשמר אוטומטית במחשב זה · מומלץ להוריד גיבוי", { backupRelevant: true });
  toast("התחום נשמר אוטומטית במחשב זה", "success");
  clearDomainForm();
  renderAdmin();
  renderAll();
}

function deleteDomain(domainId) {
  const domain = data.find((item) => item.id === domainId);
  if (!domain) return;
  if (domain.items.length) return toast("לא ניתן למחוק תחום שמכיל מושגים. העבר או מחק אותם תחילה.", "error");
  if (!confirm(`למחוק את התחום “${domain.name}”? לפני המחיקה תישמר נקודת שחזור מקומית.`)) return;
  createRecoverySnapshot(`לפני מחיקת התחום הריק ${domain.name}`);
  data = data.filter((item) => item.id !== domainId);
  if (state.domainId === domainId) state.domainId = "all";
  saveAll("התחום נמחק והשינוי נשמר אוטומטית", { backupRelevant: true });
  toast("התחום הריק נמחק", "success");
  clearDomainForm();
  renderAdmin();
  renderAll();
}

function deleteDomainWithTerms(domainId) {
  const domain = data.find((item) => item.id === domainId);
  if (!domain) return;
  const count = domain.items.length;
  if (!confirm(`מחיקה מלאה של “${domain.name}” תמחק לצמיתות את התחום, ${count} המושגים שבו, תתי־התחומים ותתי־תתי־התחומים. לא ניתן לבטל פעולה זו. להמשיך?`)) return;
  createRecoverySnapshot(`לפני מחיקת התחום ${domain.name}`);
  const removedIds = new Set(domain.items.map((term) => term.id));
  const removedRefs = new Set(domain.items.flatMap((term) => [term.id, term.code, term.name, term.nameEn]).map(normalizeText).filter(Boolean));
  data = data.filter((item) => item.id !== domainId);
  data.forEach((remainingDomain) => remainingDomain.items.forEach((term) => { term.related = (term.related || []).filter((ref) => !removedRefs.has(normalizeText(ref))); }));
  prefs.favorites = prefs.favorites.filter((id) => !removedIds.has(id));
  prefs.recent = prefs.recent.filter((id) => !removedIds.has(id));
  Object.keys(prefs.progress).forEach((id) => { if (removedIds.has(id)) delete prefs.progress[id]; });
  if (state.domainId === domainId) { state.domainId = "all"; state.subtopic = "all"; state.subSubtopic = "all"; }
  saveAll("התחום וכל תוכנו נמחקו והשינוי נשמר", { backupRelevant: true });
  toast(`התחום ו־${count} המושגים שבו נמחקו`, "success");
  clearDomainForm();
  renderAdmin();
  renderAll();
}

function applyAppearanceFromForm() {
  settings.appearance = {
    primary: $("settingPrimary").value,
    background: $("settingBackground").value,
    surface: $("settingSurface").value,
    font: $("settingFont").value,
    fontSize: Number($("settingFontSize").value),
    radius: Number($("settingRadius").value),
    density: $("settingDensity").value,
    buttonShadow: $("settingButtonShadow") ? $("settingButtonShadow").value : "dynamic",
    buttonHoverScale: $("settingButtonHoverScale") ? Number($("settingButtonHoverScale").value) : 1.04,
    buttonActiveScale: $("settingButtonActiveScale") ? Number($("settingButtonActiveScale").value) : 0.97,
  };
  $$('[data-field-setting]').forEach((input) => { settings.fields[input.dataset.fieldSetting] = input.checked; });
  saveAll("הגדרות התצוגה נשמרו", { backupRelevant: "system" });
  applyAppearance();
  toast("הגדרות התצוגה עודכנו", "success");
  renderAll();
}

function restoreEmbeddedCatalog() {
  if (Array.isArray(window.MECHLEX_SHARED_DATA) && window.MECHLEX_SHARED_DATA.length) {
    const termCount = window.MECHLEX_SHARED_DATA.reduce((sum, domain) => sum + (domain.items?.length || 0), 0);
    if (!confirm(`לשחזר את קטלוג הבסיס המובנה (${termCount} מושגים)? הנתונים המקומיים הנוכחיים יוחלפו. מומלץ להוריד גיבוי לפני הפעולה.`)) return;
    data = normalizeData(window.MECHLEX_SHARED_DATA);
    saveAll("קטלוג הבסיס שוחזר ונשמר במחשב זה", { backupRelevant: true });
    renderAdmin();
    renderAll();
    toast("קטלוג הבסיס המובנה שוחזר", "success");
  } else {
    toast("לא נמצא קטלוג בסיס מובנה", "error");
  }
}


function personalProgressFilename(extension = "json") {
  const employee = safeFilenamePart($("progressUserName")?.value || prefs.profileName);
  const namePart = employee ? `_${employee}` : "";
  return `mechlex-personal-progress${namePart}_${localTimestamp()}.${extension}`;
}

function updateProgressFilenamePreview() {
  if (!$("progressFilenamePreview")) return;
  $("progressFilenamePreview").textContent = personalProgressFilename($("progressFileFormat").value || "json");
}

function openProgressDialog() {
  $("progressUserName").value = prefs.profileName || "";
  $("progressFileFormat").value = "json";
  updateProgressFilenamePreview();
  setModalVisibility($("progressOverlay"), true, { initialFocus: $("progressUserName") });
}

function closeProgressDialog() {
  setModalVisibility($("progressOverlay"), false);
}

function buildPersonalProgressPayload() {
  const byId = new Map(allTerms().map((term) => [term.id, term]));
  const favoriteRefs = prefs.favorites.map((id) => byId.get(id)).filter(Boolean).map((term) => ({ id: term.id, code: term.code, name: term.name }));
  const learning = Object.entries(prefs.progress).map(([id, status]) => {
    const term = byId.get(id);
    return term ? { id: term.id, code: term.code, name: term.name, status } : null;
  }).filter(Boolean);
  const recentRefs = prefs.recent.map((id) => byId.get(id)).filter(Boolean).map((term) => ({ id: term.id, code: term.code, name: term.name }));
  return {
    format: PERSONAL_PROGRESS_FORMAT,
    version: 1,
    appVersion: APP_VERSION,
    savedAt: new Date().toISOString(),
    profileName: prefs.profileName || "",
    catalogTermCount: allTerms().length,
    favorites: favoriteRefs,
    learning,
    recent: recentRefs,
    preferences: { theme: prefs.theme, view: prefs.view },
  };
}

function exportPersonalProgress(event) {
  event?.preventDefault();
  prefs.profileName = $("progressUserName").value.trim();
  const extension = $("progressFileFormat").value === "txt" ? "txt" : "json";
  const payload = buildPersonalProgressPayload();
  const type = extension === "txt" ? "text/plain;charset=utf-8" : "application/json;charset=utf-8";
  downloadFile(personalProgressFilename(extension), JSON.stringify(payload, null, 2), type);
  saveAll("המצב האישי נשמר מקומית והורד כקובץ");
  closeProgressDialog();
  toast("קובץ המצב האישי הורד לתיקיית ההורדות", "success");
}

function resolveProgressReference(reference) {
  if (!reference) return null;
  if (typeof reference === "string") return findTerm(reference);
  return findTerm(reference.code || reference.id || reference.name || "");
}

async function importPersonalProgressFile(file) {
  try {
    const payload = JSON.parse(await file.text());
    let personal = payload;
    if (payload?.format !== PERSONAL_PROGRESS_FORMAT && payload?.prefs) {
      const oldPrefs = payload.prefs;
      personal = {
        format: PERSONAL_PROGRESS_FORMAT,
        profileName: oldPrefs.profileName || "",
        favorites: (oldPrefs.favorites || []).map((id) => ({ id })),
        learning: Object.entries(oldPrefs.progress || {}).map(([id, status]) => ({ id, status })),
        recent: (oldPrefs.recent || []).map((id) => ({ id })),
        preferences: { theme: oldPrefs.theme, view: oldPrefs.view },
      };
    }
    if (!personal || personal.format !== PERSONAL_PROGRESS_FORMAT) throw new Error("הקובץ אינו קובץ מצב אישי תקין של MechLex");
    if (!confirm(`לטעון את המצב האישי${personal.profileName ? ` של ${personal.profileName}` : ""}? המועדפים והתקדמות הלמידה הנוכחיים יוחלפו, אך מאגר המושגים לא ישתנה.`)) return;

    const favorites = unique((personal.favorites || []).map(resolveProgressReference).filter(Boolean).map((term) => term.id));
    const progress = {};
    (personal.learning || []).forEach((item) => {
      const term = resolveProgressReference(item);
      if (term && ["learning", "mastered"].includes(item.status)) progress[term.id] = item.status;
    });
    const recent = unique((personal.recent || []).map(resolveProgressReference).filter(Boolean).map((term) => term.id)).slice(0, 20);

    prefs.favorites = favorites;
    prefs.progress = progress;
    prefs.recent = recent;
    prefs.profileName = personal.profileName || prefs.profileName || "";
    if (["light", "dark"].includes(personal.preferences?.theme)) prefs.theme = personal.preferences.theme;
    if (["grid", "list"].includes(personal.preferences?.view)) prefs.view = personal.preferences.view;
    saveAll("המצב האישי נטען", { backupRelevant: "system" });
    renderAll();
    toast(`המצב האישי נטען: ${favorites.length} מועדפים ו-${Object.keys(progress).length} מצבי למידה`, "success");
  } catch (error) {
    console.warn("MechLex personal progress import rejected", error.message);
    toast(`טעינת מצב אישי נכשלה: ${error.message}`, "error");
  } finally {
    $("importProgressFile").value = "";
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = []; let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
    else line = candidate;
  });
  if (line) lines.push(line);
  return lines;
}

function loadImageSource(source) {
  return new Promise((resolve) => {
    if (!source) return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

async function loadExportImage(term) {
  const source = term.imageData || imagePathForTerm(term) || $("termImage")?.src || "";
  if (location.protocol === "file:" && source && !/^data:image\//.test(source)) return null;
  return loadImageSource(source);
}

async function requestImageSaveDestination(filename, mime, extension) {
  // A normal browser download is deterministic in Edge/Chrome, works in local
  // offline mode and avoids an extra operating-system permission prompt.
  void filename; void mime; void extension;
  return { handle: null, cancelled: false };
}

async function saveImageBlob(blob, filename, destination) {
  if (destination.handle) {
    const writable = await destination.handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function drawRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawExportImagePlaceholder(ctx, imageBox, accent, isDomain = false, termName = "") {
  drawRoundRect(ctx, imageBox.x, imageBox.y, imageBox.w, imageBox.h, 24);
  ctx.fillStyle = "#f1f5f9";
  ctx.fill();

  const padding = 35;
  const innerX = imageBox.x + padding;
  const innerY = imageBox.y + padding;
  const innerW = imageBox.w - padding * 2;
  const innerH = imageBox.h - padding * 2;

  drawRoundRect(ctx, innerX, innerY, innerW, innerH, 20);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = "#e879f9";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.stroke();
  ctx.restore();

  const centerX = innerX + innerW / 2;
  const centerY = innerY + innerH / 2 - 50;
  const circleRadius = 50;

  ctx.beginPath();
  ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(244, 114, 182, 0.15)";
  ctx.fill();
  ctx.strokeStyle = "#ec4899";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = "#ec4899";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const iconSize = 18;
  ctx.beginPath();
  ctx.moveTo(centerX - iconSize, centerY - iconSize);
  ctx.lineTo(centerX + iconSize, centerY + iconSize);
  ctx.moveTo(centerX + iconSize, centerY - iconSize);
  ctx.lineTo(centerX - iconSize, centerY + iconSize);
  ctx.stroke();
  ctx.restore();

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 36px 'Segoe UI', system-ui, Arial, sans-serif";
  ctx.fillText(isDomain ? "חסרה תמונה לתחום" : "חסרה תמונה למושג", centerX, centerY + 95);

  if (termName) {
    ctx.fillStyle = "#475569";
    ctx.font = "600 28px 'Segoe UI', system-ui, Arial, sans-serif";
    ctx.fillText(termName, centerX, centerY + 145);

    ctx.fillStyle = "#64748b";
    ctx.font = "400 22px 'Segoe UI', system-ui, Arial, sans-serif";
    const helpText = isDomain 
      ? "אפשר להוסיף קובץ לתיקיית images בשם התחום, או להטמיע תמונה במרכז הניהול." 
      : "אפשר להוסיף קובץ לתיקיית images בשם המושג, לציין שם קובץ מדויק במרכז הניהול, או להטמיע תמונה בתוך המושג.";
    ctx.fillText(helpText, centerX, centerY + 190);
  } else {
    ctx.fillStyle = "#64748b";
    ctx.font = "500 24px 'Segoe UI', system-ui, Arial, sans-serif";
    const helpText = isDomain 
      ? "אפשר להוסיף קובץ לתיקיית images בשם התחום, או להטמיע תמונה במרכז הניהול." 
      : "אפשר להוסיף קובץ לתיקיית images בשם המושג, או להטמיע תמונה במרכז הניהול.";
    ctx.fillText(helpText, centerX, centerY + 142);
  }
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("EMPTY_EXPORT_BLOB")), mime, quality);
    } catch (error) {
      reject(error);
    }
  });
}

async function exportTermImage(format) {
  const term = findTerm(state.currentTermId);
  if (!term) return;
  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  const extension = format === "jpeg" ? "jpg" : "png";
  const filename = `mechlex-${safeFilenamePart(term.name)}-${term.code}.${extension}`;
  const destination = await requestImageSaveDestination(filename, mime, extension);
  if (destination.cancelled) return;

  const canvas = document.createElement("canvas");
  canvas.width = 2400; 
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  const accentColor = term.domainColor || "#0284c7";
  const isDomain = term.id.startsWith("TEMP_DOMAIN_TERM_");

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, "#ebf3f9");
  bgGrad.addColorStop(0.5, "#f4f8fc");
  bgGrad.addColorStop(1, "#e5eff7");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer card window
  const outerX = 60, outerY = 60, outerW = 2280, outerH = 1230, outerR = 32;
  drawRoundRect(ctx, outerX, outerY, outerW, outerH, outerR);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(15, 30, 60, 0.08)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 15;
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Top accent bar
  ctx.save();
  drawRoundRect(ctx, outerX, outerY, outerW, outerH, outerR);
  ctx.clip();
  const stripeGrad = ctx.createLinearGradient(outerX, outerY, outerX + outerW, outerY);
  stripeGrad.addColorStop(0, accentColor);
  stripeGrad.addColorStop(0.6, "#3b82f6");
  stripeGrad.addColorStop(1, "#06b6d4");
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(outerX, outerY, outerW, 14);
  ctx.restore();

  // Outer border
  drawRoundRect(ctx, outerX, outerY, outerW, outerH, outerR);
  ctx.strokeStyle = "rgba(180, 205, 225, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header - Breadcrumb
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  const categoryPath = isDomain ? "תחום ידע הנדסי" : `${term.domainName || "הנדסה"} / ${termLocationLabel(term.subtopic, term.subSubtopic)}`;
  ctx.fillStyle = "#475569";
  ctx.font = "600 26px 'Segoe UI', system-ui, Arial, sans-serif";
  ctx.fillText(categoryPath, outerX + outerW - 40, outerY + 65);

  // Header - Code badge (Top Left)
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  const codeText = term.code || "TERM";
  ctx.font = "700 26px 'Segoe UI', system-ui, Arial, sans-serif";
  const codeWidth = ctx.measureText(codeText).width;
  const badgeW = codeWidth + 36, badgeH = 46;
  const badgeX = outerX + 40, badgeY = outerY + 42;
  
  drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
  ctx.fillStyle = "#e0f2fe";
  ctx.fill();
  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#0369a1";
  ctx.fillText(codeText, badgeX + 18, badgeY + 32);

  // Brand Name
  ctx.fillStyle = "#94a3b8";
  ctx.font = "800 22px 'Segoe UI', system-ui, Arial, sans-serif";
  ctx.fillText("MECHLEX · ENGINEERING KNOWLEDGE", badgeX + badgeW + 30, outerY + 70);

  // Header - Main Hebrew Title (Right aligned)
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 70px 'Segoe UI', system-ui, Arial, sans-serif";
  ctx.fillText(term.name, outerX + outerW - 40, outerY + 165);

  // Header - English Title (Right aligned directly under Hebrew Title)
  if (term.nameEn) {
    ctx.direction = "ltr";
    ctx.textAlign = "right";
    ctx.fillStyle = "#64748b";
    ctx.font = "600 34px 'Segoe UI', system-ui, Arial, sans-serif";
    ctx.fillText(term.nameEn, outerX + outerW - 40, outerY + 220);
  }

  // Header Divider Line
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(outerX + 40, outerY + 250);
  ctx.lineTo(outerX + outerW - 40, outerY + 250);
  ctx.stroke();

  // Cards layout coordinates
  const cardY = outerY + 280;
  const cardH = 820;
  const cardW = 1080;

  const rightCardX = outerX + outerW - 40 - cardW; // 1160 (Right Column for RTL)
  const leftCardX = outerX + 40; // 100 (Left Column for Visual)

  // ----------------------------------------------------
  // RIGHT CARD: DEFINITION CARD ("הגדרה מקצועית")
  // ----------------------------------------------------
  drawRoundRect(ctx, rightCardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Kicker
  ctx.direction = "ltr";
  ctx.textAlign = "right";
  ctx.fillStyle = accentColor;
  ctx.font = "700 20px 'Segoe UI', system-ui, Arial, sans-serif";
  ctx.fillText(isDomain ? "DOMAIN DEFINITION" : "DEFINITION", rightCardX + cardW - 35, cardY + 45);

  // Title
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 38px 'Segoe UI', system-ui, Arial, sans-serif";
  ctx.fillText("הגדרה מקצועית", rightCardX + cardW - 35, cardY + 98);

  // Accent Line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(rightCardX + cardW - 35 - 120, cardY + 116);
  ctx.lineTo(rightCardX + cardW - 35, cardY + 116);
  ctx.stroke();

  // Wrapped Definition Text
  const maxDefWidth = cardW - 70;
  const textX = rightCardX + cardW - 35;
  let currentY = cardY + 180;

  if (term.visualTitle) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 34px 'Segoe UI', system-ui, Arial, sans-serif";
    const titleLines = wrapCanvasText(ctx, term.visualTitle, maxDefWidth);
    titleLines.forEach(line => {
      ctx.fillText(line, textX, currentY);
      currentY += 46;
    });
    currentY += 12; // Extra padding
  }

  ctx.fillStyle = "#334155";
  ctx.font = "400 32px 'Segoe UI', system-ui, Arial, sans-serif";
  const lineHeight = 50;

  const cleanHtml = (term.definitionHtml || term.definition || "").replace(/<\/(p|div|h[1-6]|li)>/gi, " </$1> ");
  const tempTemplate = document.createElement("template");
  tempTemplate.innerHTML = cleanHtml;
  const rawDefinitionText = (tempTemplate.content.textContent || "").replace(/\s+/g, " ").trim();

  const maxLines = term.visualTitle ? 9 : 12;
  const lines = wrapCanvasText(ctx, rawDefinitionText, maxDefWidth).slice(0, maxLines);
  lines.forEach((line) => {
    ctx.fillText(line, textX, currentY);
    currentY += lineHeight;
  });

  // ----------------------------------------------------
  // LEFT CARD: VISUAL CARD (Image Stage / Placeholder)
  // ----------------------------------------------------
  drawRoundRect(ctx, leftCardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = "#f1f5f9";
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.stroke();

  const image = await loadExportImage(term);
  const imageBox = { x: leftCardX, y: cardY, w: cardW, h: cardH };

  if (image) {
    const imgPad = 20;
    const innerImgX = leftCardX + imgPad;
    const innerImgY = cardY + imgPad;
    const innerImgW = cardW - imgPad * 2;
    const innerImgH = cardH - imgPad * 2;

    drawRoundRect(ctx, innerImgX, innerImgY, innerImgW, innerImgH, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    const scale = Math.min(innerImgW / image.width, innerImgH / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const drawX = innerImgX + (innerImgW - width) / 2;
    const drawY = innerImgY + (innerImgH - height) / 2;

    try {
      ctx.drawImage(image, drawX, drawY, width, height);
    } catch {
      drawExportImagePlaceholder(ctx, imageBox, accentColor, isDomain, term.name);
    }
  } else {
    drawExportImagePlaceholder(ctx, imageBox, accentColor, isDomain, term.name);
  }

  // Footer Section
  const footerY = outerY + outerH - 30;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(outerX + 40, footerY - 25);
  ctx.lineTo(outerX + outerW - 40, footerY - 25);
  ctx.stroke();

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#64748b";
  ctx.font = "500 22px 'Segoe UI', system-ui, Arial, sans-serif";
  const dateStr = new Intl.DateTimeFormat("he-IL").format(new Date());
  ctx.fillText(`נוצר מתוך מערכת MechLex  ·  ${dateStr}`, outerX + outerW - 40, footerY);

  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 22px 'Segoe UI', system-ui, Arial, sans-serif";
  ctx.fillText("MechLex Engineering Knowledge Base · Visual Admin Edition 10.1.0", outerX + 40, footerY);

  try {
    const blob = await canvasToBlob(canvas, mime, format === "jpeg" ? 0.95 : undefined);
    await saveImageBlob(blob, filename, destination);
    toast(`קובץ ${extension.toUpperCase()} מעוצב ואיכותי הורד בהצלחה`, "success");
  } catch (error) {
    toast("לא ניתן היה להכין את הקובץ. נסו שוב.", "error");
  }
}


function recoverySnapshots() {
  const snapshots = safeLoad(KEYS.recovery, []);
  return Array.isArray(snapshots) ? snapshots : [];
}

function restoreLatestRecoverySnapshot() {
  const snapshots = recoverySnapshots();
  if (!snapshots.length) return toast("אין נקודות שחזור מקומיות זמינות", "error");
  const snapshot = snapshots[0];
  const when = formatDate(snapshot.createdAt);
  if (!confirm(`לשחזר את נקודת השחזור האחרונה (${snapshot.reason}, ${when})? המצב הנוכחי יישמר תחילה כנקודת שחזור חדשה.`)) return;
  createRecoverySnapshot("לפני שחזור נקודת שחזור");
  data = normalizeData(snapshot.data || []);
  prefs = { ...clone(DEFAULT_PREFS), ...(snapshot.prefs || {}), progress: snapshot.prefs?.progress || {} };
  if (snapshot.settings) {
    settings.appearance = { ...clone(DEFAULT_SETTINGS.appearance), ...(snapshot.settings.appearance || {}) };
    settings.fields = { ...clone(DEFAULT_SETTINGS.fields), ...(snapshot.settings.fields || {}) };
  }
  repairCatalogIntegrity(data);
  meta.dataRevision = Number(meta.dataRevision || 0) + 1;
  meta.lastContentChangeAt = new Date().toISOString();
  meta.contentBackupNeeded = true;
  meta.systemBackupNeeded = true;
  saveAll("נקודת השחזור שוחזרה ונשמרה", { backupRelevant: true });
  applyAppearance();
  clearTermForm();
  clearDomainForm();
  renderAdmin();
  renderAll();
  toast("נקודת השחזור שוחזרה בהצלחה", "success");
}

async function exportDomainImage(format) {
  const domain = data.find((d) => d.id === state.currentDomainId);
  if (!domain) return;
  const fakeTermId = "TEMP_DOMAIN_TERM_" + Date.now();
  
  let html = $("domainDetailDescription").innerHTML || "";
  html = html.replace(/<strong[^>]*>.*?<\/strong>\s*—\s*/, "");

  const fakeTerm = {
    id: fakeTermId,
    name: $("domainDetailTitle").textContent || domain.name,
    nameEn: $("domainDetailTitleEn").textContent || domain.nameEn || domain.prefix,
    code: $("domainDetailCode").textContent || domain.prefix || "DOMAIN",
    visualTitle: $("domainDetailTitle").textContent || domain.name,
    definition: "",
    definitionHtml: html,
    imageName: $("domainDetailTitle").textContent || domain.name,
    domainId: domain.id,
    domainName: "תחום ידע הנדסי",
    domainColor: domain.color || "#0284c7",
    subtopic: "",
    subSubtopic: ""
  };
  
  const fakeDomain = {
    id: "TEMP_FAKE_DOMAIN_" + Date.now(),
    name: "TEMP",
    items: [fakeTerm]
  };
  
  data.push(fakeDomain);
  const oldTermId = state.currentTermId;
  state.currentTermId = fakeTermId;
  
  try {
    await exportTermImage(format);
  } finally {
    state.currentTermId = oldTermId;
    data.pop(); // remove fake domain
  }
}
function runCatalogAudit() {
  const before = catalogIntegrityReport(data);
  repairCatalogIntegrity(data);
  const after = catalogIntegrityReport(data);
  saveAll("בדיקת שלמות הקטלוג הושלמה");
  if (!before.length && !after.length) return toast("הקטלוג תקין: אין קודים, מזהים או קישורים שבורים", "success");
  if (!after.length) return toast(`תוקנו אוטומטית ${before.length} בעיות שלמות`, "success");
  toast(`נותרו ${after.length} בעיות הדורשות טיפול: ${after.slice(0, 3).join("; ")}`, "error");
}

function settingsForBackup() {
  return {
    appearance: clone(settings.appearance),
    fields: clone(settings.fields),
  };
}

function contentBackupPayload() {
  return {
    format: CONTENT_BACKUP_FORMAT,
    version: 9,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
    meta: {
      dataRevision: meta.dataRevision,
      lastContentChangeAt: meta.lastContentChangeAt,
    },
  };
}

function fullBackupPayload() {
  return {
    ...contentBackupPayload(),
    format: FULL_BACKUP_FORMAT,
    prefs,
    settings: settingsForBackup(),
  };
}

function exportContentJson() {
  const payload = JSON.stringify(contentBackupPayload(), null, 2);
  downloadFile(`mechlex-content-backup-${localTimestamp()}.json`, payload, "application/json;charset=utf-8");
  saveAll("גיבוי התוכן הופעל להורדה", { contentBackupCompleted: true });
  updateBackupStatus();
  toast("גיבוי התוכן הורד. מומלץ להעתיק אותו לתיקיית backups.", "success");
}

function exportFullJson() {
  const payload = JSON.stringify(fullBackupPayload(), null, 2);
  downloadFile(`mechlex-full-admin-backup-${localTimestamp()}.json`, payload, "application/json;charset=utf-8");
  saveAll("גיבוי האדמין הראשי הופעל להורדה", { fullBackupCompleted: true });
  updateBackupStatus();
  toast("גיבוי המערכת המלא הורד. מומלץ להעתיק אותו לתיקיית backups.", "success");
}

function exportRoleBackup() {
  if (state.adminRole === "super") exportFullJson();
  else exportContentJson();
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const headers = ["Code", "Name_HE", "Name_EN", "Domain", "Subtopic", "Sub_Subtopic", "Symbol", "Units", "Short_Definition", "Formula", "Standards", "Tags", "Updated"];
  const rows = allTerms().map((term) => [term.code, term.name, term.nameEn, term.domainName, term.subtopic, term.subSubtopic, term.symbol, term.units, term.short, term.formula, (term.standards || []).join("; "), (term.tags || []).join("; "), term.updatedAt]);
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  downloadFile(`mechlex-terms-${todayIso()}.csv`, csv, "text/csv;charset=utf-8");
  toast("קובץ CSV יוצא", "success");
}

async function importJsonFile(file) {
  try {
    if (file.size > 25 * 1024 * 1024) throw new Error("קובץ הגיבוי גדול מ-25MB");
    const payload = JSON.parse(await file.text());
    if (!payload || !Array.isArray(payload.data)) throw new Error("קובץ הגיבוי אינו מכיל מערך תחומים תקין");
    const isFullBackup = payload.format === FULL_BACKUP_FORMAT || Boolean(payload.prefs || payload.settings);
    const importedData = normalizeData(payload.data);
    if (!importedData.length) throw new Error("קובץ הגיבוי ריק");
    const importIssues = catalogIntegrityReport(importedData);
    if (importIssues.length) throw new Error(`קובץ הגיבוי כולל כשלים בשלמות הקטלוג: ${importIssues.slice(0, 5).join("; ")}`);
    if (!confirm(`לשחזר ${isFullBackup ? "גיבוי מערכת מלא" : "גיבוי תוכן"} הכולל ${importedData.reduce((sum, domain) => sum + domain.items.length, 0)} מושגים? התחומים, תתי־התחומים והמושגים הנוכחיים יוחלפו. קודי הגישה המקומיים לא ישתנו.`)) return;
    createRecoverySnapshot("לפני שחזור גיבוי");
    data = repairCatalogIntegrity(importedData);
    if (payload.prefs) prefs = { ...clone(DEFAULT_PREFS), ...payload.prefs, progress: payload.prefs.progress || {} };
    if (payload.settings) {
      settings.appearance = { ...clone(DEFAULT_SETTINGS.appearance), ...(payload.settings.appearance || payload.settings.design || {}) };
      settings.fields = { ...clone(DEFAULT_SETTINGS.fields), ...(payload.settings.fields || {}) };
    }
    meta.dataRevision = Math.max(Number(meta.dataRevision || 0), Number(payload.meta?.dataRevision || 0)) + 1;
    meta.lastContentChangeAt = new Date().toISOString();
    if (isFullBackup) {
      meta.lastBackupAt = payload.exportedAt || payload.meta?.lastBackupAt || "";
      meta.lastContentBackupAt = payload.exportedAt || "";
      meta.lastSystemBackupAt = payload.exportedAt || "";
      meta.contentBackupNeeded = false;
      meta.systemBackupNeeded = false;
      meta.backupNeeded = false;
    } else {
      meta.lastContentBackupAt = payload.exportedAt || "";
      meta.contentBackupNeeded = false;
      meta.systemBackupNeeded = true;
      meta.backupNeeded = true;
    }
    saveAll(`${isFullBackup ? "גיבוי המערכת" : "גיבוי התוכן"} שוחזר ונשמר אוטומטית במחשב זה`);
    clearTermForm();
    clearDomainForm();
    renderAdmin();
    renderAll();
    toast(`${isFullBackup ? "גיבוי המערכת המלא" : "גיבוי התוכן"} שוחזר בהצלחה. קודי הגישה המקומיים נשמרו.`, "success");
  } catch (error) {
    console.warn("MechLex backup import rejected", error.message);
    toast(`ייבוא נכשל: ${error.message}`, "error");
  } finally {
    $("importJsonFile").value = "";
  }
}

function closeMobileSidebar() {
  $("sidebar").classList.remove("open");
  $("menuBtn").setAttribute("aria-expanded", "false");
}

function bindInteractiveMotion() {
  const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const selector = ".domain-picker-card, .term-card, .domain-record";
  document.addEventListener("pointermove", (event) => {
    if (!canHover?.matches || reducedMotion?.matches) return;
    const card = event.target.closest(selector);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    card.style.setProperty("--tilt-x", `${((.5 - y) * 5).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${((x - .5) * 7).toFixed(2)}deg`);
    card.style.setProperty("--pointer-x", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--pointer-y", `${(y * 100).toFixed(1)}%`);
  });
  document.addEventListener("pointerout", (event) => {
    const card = event.target.closest(selector);
    if (!card || card.contains(event.relatedTarget)) return;
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
    card.style.removeProperty("--pointer-x");
    card.style.removeProperty("--pointer-y");
  });
}

function bindEvents() {
  bindInteractiveMotion();
  $("skipToContentBtn").addEventListener("click", () => $("mainContent").focus({ preventScroll: true }) || $("mainContent").scrollIntoView({ behavior: "smooth", block: "start" }));
  $("searchInput").addEventListener("input", (event) => { state.query = event.target.value; renderFilters(); renderDictionary(); });
  $("subtopicFilter").addEventListener("change", (event) => {
    const location = decodeHierarchyLocation(event.target.value);
    if (!location) { state.subtopic = "all"; state.subSubtopic = "all"; }
    else { state.domainId = location.domainId; state.subtopic = location.subtopic; state.subSubtopic = location.subSubtopic || "all"; }
    renderAll();
  });
  $("sortSelect").addEventListener("change", (event) => { state.sort = event.target.value; renderAll(); });
  $("resetFiltersBtn").addEventListener("click", resetFilters);
  $("emptyResetBtn").addEventListener("click", resetFilters);
  $("clearDomainFilter").addEventListener("click", () => { state.domainId = "all"; state.subtopic = "all"; state.subSubtopic = "all"; renderAll(); });
  $$('[data-collection]').forEach((button) => button.addEventListener("click", () => { 
    state.collection = button.dataset.collection;
    if (state.collection === "all") {
      state.domainId = "all";
      state.subtopic = "all";
      state.subSubtopic = "all";
      $("searchInput").value = "";
      state.query = "";
    }
    closeMobileSidebar(); 
    renderAll(); 
  }));
  $("gridViewBtn").addEventListener("click", () => { prefs.view = "grid"; saveAll(); renderAll(); });
  $("listViewBtn").addEventListener("click", () => { prefs.view = "list"; saveAll(); renderAll(); });
  $("mindMapViewBtn")?.addEventListener("click", () => {
    prefs.view = "mindmap";
    saveAll();
    renderAll();
    requestAnimationFrame(() => {
      $("mindMapContainer")?.scrollIntoView({ behavior: "smooth", block: "start" });
      fitMindMapToScreen();
    });
  });

  $("mindMapFitScreen")?.addEventListener("click", fitMindMapToScreen);
  $("mindMapZoomIn")?.addEventListener("click", () => { mindMapZoom = Math.min(2, mindMapZoom + 0.15); updateMindMapTransform(); });
  $("mindMapZoomOut")?.addEventListener("click", () => { mindMapZoom = Math.max(0.2, mindMapZoom - 0.15); updateMindMapTransform(); });
  $("mindMapResetZoom")?.addEventListener("click", () => { mindMapZoom = 1; mindMapPanX = 0; mindMapPanY = 0; updateMindMapTransform(); });
  $("mindMapExpandAll")?.addEventListener("click", () => { mindMapCollapsedNodes.clear(); renderMindMap(); });
  $("mindMapCollapseAll")?.addEventListener("click", () => {
    data.forEach((d) => mindMapCollapsedNodes.add(`domain-${d.id}`));
    renderMindMap();
  });

  $("closeDomainDetailBtn")?.addEventListener("click", closeDomainDetailModal);
  $("expandDomainDetailBtn")?.addEventListener("click", toggleDomainFullscreen);
  $("domainDetailOverlay")?.addEventListener("click", (event) => { if (event.target === $("domainDetailOverlay")) closeDomainDetailModal(); });
  $("printDomainDetailBtn")?.addEventListener("click", () => window.print());
  $("downloadDomainPngBtn")?.addEventListener("click", () => exportDomainImage("png"));
  $("downloadDomainJpegBtn")?.addEventListener("click", () => exportDomainImage("jpeg"));
  $("domainFavBtn")?.addEventListener("click", () => state.currentDomainId && toggleFavorite(state.currentDomainId));

  window.addEventListener("resize", () => {
    if (prefs.view === "mindmap") requestAnimationFrame(drawMindMapConnections);
  });
  $("themeBtn").addEventListener("click", () => { prefs.theme = prefs.theme === "dark" ? "light" : "dark"; saveAll(); renderAll(); });
  $("randomBtn").addEventListener("click", startRandomSession);
  $("menuBtn").addEventListener("click", () => {
    const open = $("sidebar").classList.toggle("open");
    $("menuBtn").setAttribute("aria-expanded", String(open));
  });

  $("closeTermBtn").addEventListener("click", closeTerm);
  $("expandTermBtn")?.addEventListener("click", toggleTermFullscreen);
  $("randomNextBtn")?.addEventListener("click", openNextRandomTerm);
  $("termOverlay").addEventListener("pointerdown", (event) => { if (event.target === $("termOverlay")) closeTerm(); });
  $$('[data-term-tab]').forEach((button) => button.addEventListener("click", () => setTermTab(button.dataset.termTab)));
  $("termFavBtn").addEventListener("click", () => state.currentTermId && toggleFavorite(state.currentTermId));
  $$('[data-status]').forEach((button) => button.addEventListener("click", () => state.currentTermId && setProgress(state.currentTermId, button.dataset.status)));
  $("printTermBtn").addEventListener("click", () => window.print());
  $("downloadPngBtn").addEventListener("click", () => exportTermImage("png"));
  $("downloadJpegBtn").addEventListener("click", () => exportTermImage("jpeg"));
  $("detailTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-detail-tab]");
    if (button) setDetailTab(button.dataset.detailTab);
  });

  $("saveProgressBtn").addEventListener("click", openProgressDialog);
  $("loadProgressBtn").addEventListener("click", () => $("importProgressFile").click());
  $("importProgressFile").addEventListener("change", (event) => event.target.files?.[0] && importPersonalProgressFile(event.target.files[0]));
  $("progressForm")?.addEventListener("submit", exportPersonalProgress);
  $("closeProgressBtn").addEventListener("click", closeProgressDialog);
  $("progressOverlay").addEventListener("click", (event) => { if (event.target === $("progressOverlay")) closeProgressDialog(); });
  $("progressUserName").addEventListener("input", updateProgressFilenamePreview);
  $("progressFileFormat").addEventListener("change", updateProgressFilenamePreview);

  const handlePinSubmit = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    const role = $("pinRoleSelect")?.value || "content";
    const enteredPin = $("pinInput").value.trim();
    const expectedPin = role === "super" ? (settings.superPin || "9999") : (settings.contentPin || settings.pin || "1234");
    if (enteredPin === expectedPin) {
      openAdmin(role, enteredPin);
    } else {
      $("pinError").classList.remove("hidden");
      $("pinInput").select();
    }
  };

  $("adminBtn").addEventListener("click", openPinDialog);
  $("pinForm")?.addEventListener("submit", handlePinSubmit);
  $("closePinBtn").addEventListener("click", closePinDialog);
  $("pinOverlay").addEventListener("click", (event) => { if (event.target === $("pinOverlay")) closePinDialog(); });
  $("closeAdminBtn").addEventListener("click", closeAdmin);
  $("switchRoleBtn")?.addEventListener("click", switchAdminRole);
  $("headerExportDataBtn")?.addEventListener("click", exportRoleBackup);
  $("adminOverlay").addEventListener("click", (event) => { if (event.target === $("adminOverlay")) closeAdmin(); });
  $$('[data-admin-tab]').forEach((button) => button.addEventListener("click", () => setAdminTab(button.dataset.adminTab)));

  $("reloadSharedDataBtn")?.addEventListener("click", restoreEmbeddedCatalog);
  $("toggleTaxonomyBtn")?.addEventListener("click", toggleTaxonomyExplorer);

  $("termForm")?.addEventListener("submit", upsertTermFromForm);
  $$('[data-rich-command]').forEach((button) => button.addEventListener("click", () => {
    $("editDefinition").focus();
    document.execCommand(button.dataset.richCommand, false, button.dataset.richValue || null);
    $("editDefinitionHtml").value = cleanRichHtml($("editDefinition").innerHTML);
  }));
  $("editDefinition").addEventListener("input", () => { $("editDefinitionHtml").value = cleanRichHtml($("editDefinition").innerHTML); });
  $("clearTermBtn").addEventListener("click", clearTermForm);
  $("deleteCurrentTermBtn").addEventListener("click", () => state.editingTermId && deleteTerm(state.editingTermId));
  $("adminSearchInput").addEventListener("input", renderTermRecords);
  $("adminDomainFilter").addEventListener("change", renderTermRecords);
  $("editDomain").addEventListener("change", () => fillTermSubtopicSelect("direct"));
  $("editImageFile").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { event.target.value = ""; return toast("התמונה גדולה מ-15MB. יש לדחוס אותה כדי שהשמירה האופליין תישאר אמינה.", "error"); }
    const reader = new FileReader();
    reader.onload = () => { state.embeddedImageData = String(reader.result); $("embeddedImageState").textContent = `הוטמעה: ${file.name}`; toast("התמונה הוטמעה בערך", "success"); };
    reader.onerror = () => toast("קריאת התמונה נכשלה", "error");
    reader.readAsDataURL(file);
  });
  $("removeEmbeddedImageBtn").addEventListener("click", () => { state.embeddedImageData = ""; $("editImageFile").value = ""; $("embeddedImageState").textContent = "לא הוטמעה תמונה"; });

  $("domainForm")?.addEventListener("submit", upsertDomainFromForm);
  $("addSubtopicBtn").addEventListener("click", () => {
    const existing = readSubtopicRows();
    renderSubtopicRows([...existing, {}]);
  });
  $("clearDomainBtn").addEventListener("click", clearDomainForm);
  $("deleteCurrentDomainBtn").addEventListener("click", () => state.editingDomainId && deleteDomain(state.editingDomainId));
  $("deleteDomainWithTermsBtn")?.addEventListener("click", () => state.editingDomainId && deleteDomainWithTerms(state.editingDomainId));

  $("settingFontSize").addEventListener("input", (event) => { $("fontSizeOutput").textContent = `${event.target.value}px`; });
  $("settingRadius").addEventListener("input", (event) => { $("radiusOutput").textContent = `${event.target.value}px`; });
  $("applyAppearanceBtn").addEventListener("click", applyAppearanceFromForm);
  $("resetAppearanceBtn").addEventListener("click", () => { settings.appearance = clone(DEFAULT_SETTINGS.appearance); settings.fields = clone(DEFAULT_SETTINGS.fields); loadAppearanceInputs(); renderFieldVisibility(); applyAppearanceFromForm(); });

  $("exportContentJsonBtn")?.addEventListener("click", exportContentJson);
  $("exportFullJsonBtn")?.addEventListener("click", exportFullJson);
  $("exportCsvBtn").addEventListener("click", exportCsv);
  $("restoreRecoveryBtn")?.addEventListener("click", restoreLatestRecoverySnapshot);
  $("auditCatalogBtn")?.addEventListener("click", runCatalogAudit);
  $("importJsonBtn").addEventListener("click", () => $("importJsonFile").click());
  $("importJsonFile").addEventListener("change", (event) => event.target.files?.[0] && importJsonFile(event.target.files[0]));
  $("pinSettingsForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const newContent = $("newContentPin")?.value.trim();
    const newSuper = $("newSuperPin")?.value.trim();
    let updated = false;

    if (newContent) {
      if (newContent.length < 4) return toast("קוד מומחה תוכן חייב להכיל לפחות 4 תווים", "error");
      settings.contentPin = newContent;
      settings.pin = newContent;
      if ($("newContentPin")) $("newContentPin").value = "";
      updated = true;
    }
    if (newSuper) {
      if (newSuper.length < 4) return toast("קוד אדמין ראשי חייב להכיל לפחות 4 תווים", "error");
      settings.superPin = newSuper;
      if ($("newSuperPin")) $("newSuperPin").value = "";
      updated = true;
    }

    if (updated) {
      saveAll("קודי הגישה עודכנו בהצלחה");
      toast("קודי הגישה עודכנו בהצלחה", "success");
    } else {
      toast("נא להזין קוד חדש לתפקיד הרצוי", "error");
    }
  });
  $("clearProgressBtn").addEventListener("click", () => {
    if (!confirm("לאפס מועדפים, היסטוריה והתקדמות למידה?")) return;
    prefs.favorites = []; prefs.progress = {}; prefs.recent = [];
    saveAll("התקדמות הלמידה אופסה", { backupRelevant: "system" }); renderAdmin(); renderAll(); toast("ההתקדמות אופסה");
  });
  $("resetAllBtn").addEventListener("click", () => {
    if (!confirm("איפוס מלא ימחק את כל הנתונים המקומיים ויחזיר את ברירת המחדל. להמשיך?")) return;
    if (!confirm("אישור סופי: הפעולה אינה ניתנת לביטול ללא קובץ גיבוי.")) return;
    data = normalizeData(Array.isArray(window.MECHLEX_SHARED_DATA) && window.MECHLEX_SHARED_DATA.length ? window.MECHLEX_SHARED_DATA : sampleData());
    prefs = clone(DEFAULT_PREFS); settings = clone(DEFAULT_SETTINGS); meta = clone(DEFAULT_META);
    saveAll("המערכת אופסה לקטלוג הבסיס", { backupRelevant: true }); state.editingTermId = null; state.editingDomainId = null; renderAdmin(); renderAll(); toast("המערכת אופסה לקטלוג הבסיס", "success");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      event.preventDefault(); $("searchInput").focus();
    }
    if (event.key === "Escape") {
      if (!$("progressOverlay").classList.contains("hidden")) closeProgressDialog();
      else if (!$("pinOverlay").classList.contains("hidden")) closePinDialog();
      else if (!$("adminOverlay").classList.contains("hidden")) closeAdmin();
      else if (!$("termOverlay").classList.contains("hidden")) closeTerm();
      else closeMobileSidebar();
    }
  });
}

function init() {
  fetchImageCatalog();
  bindEvents();
  clearTermForm();
  clearDomainForm();
  renderAll();
  const initMessage = !storageIsPersistent
    ? "השמירה הקבועה חסומה · הורד גיבוי מלא עכשיו"
    : meta.backupNeeded
      ? "נטענו שינויים מקומיים · מומלץ להוריד גיבוי"
      : "הנתונים נשמרים אוטומטית במחשב זה";
  saveAll(initMessage);
}

window.addEventListener("beforeunload", (e) => {
  const isInlineEditorOpen = $("inlineEditorOverlay") && $("inlineEditorOverlay").getAttribute("aria-hidden") === "false";
  const isDomainModalOpen = $("domainModal") && $("domainModal").getAttribute("aria-hidden") === "false";
  const isSyncing = window.MechLexCore && window.MechLexCore.sharedSync && window.MechLexCore.sharedSync.syncing && window.MechLexCore.sharedSync.syncing();
  if (isInlineEditorOpen || isDomainModalOpen || isSyncing) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Boot is delegated to core/boot.js after extension modules load.
