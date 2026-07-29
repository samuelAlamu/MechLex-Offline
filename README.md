# MechLex 10.1.0 — מילון הנדסי אופליין עם עריכה חזותית

> **גרסה נוכחית:** 10.1.0  
> **סכמת נתונים:** 2  
> **מהדורה:** Desktop Offline Visual Admin RTL  
> **תאריך עדכון אחרון:** 2026-07-25

---

## 📋 מטרת המסמך

README זה הוא **נקודת הכניסה** לכלי AI וגם למפתחים אנושיים.  
קראו אותו **לפני כל שינוי** בפרויקט.

### סדר קריאה מומלץ
1. `README.md` (מסמך זה)
2. `VERSION.txt`
3. `CHANGELOG_HE.txt`
4. `core/README.md`
5. קובצי המקור הרלוונטיים לשינוי

---

## 🏗️ ארכיטקטורה כללית

MechLex הוא **אפליקציית ווב אופליין** (HTML + JS + CSS בלבד, ללא framework).  
מיועד לעבודה ב**רשת פנימית בארגון (LAN) ללא גישה לאינטרנט**, ותומך בדפדפני לגאסי ארגוניים החל מ-**Edge 95** ומקביליו מ-2021.
המערכת עובדת מול שרת HTTP מקומי (`127.0.0.1:8765`) שמופעל על ידי `START_MECHLEX.bat`.

```
אין תלות בצד שרת, אין API חיצוני, אין בסיס נתונים חיצוני.
כל הנתונים נשמרים ב-IndexedDB + localStorage של הדפדפן.
הכניסה למצב עריכה ניהולי בממשק הינה פתוחה ואינה דורשת סיסמאות.
```

### מבנה התיקייה לארגון האופליין (הנחיות העברה וגיבוי)

כדי שהמערכת תעבוד בצורה אופטימלית ונקייה בסביבת הרשת הפנימית, יש להעביר **רק** את תיקיות וקובצי הליבה, ולהימנע מהעברת קובצי פיתוח ובדיקות.
אותו כלל תקף גם לגבי **הגיבוי לוורד**: יש לגבות ולשמור רק את התוכן של התיקיות והקבצים הדרושים המפורטים מטה, ואין לגבות תיקיות בדיקות או ספריות.

#### 🟢 1. קבצים ותיקיות חובה (להעברה ולגיבוי)
```text
MechLex_Visual_Admin_Fork/
├── index.html          ← מבנה ה-DOM, כל המודאלים, סדר טעינת הסקריפטים
├── app.js              ← הלוגיקה הראשית
├── style.css           ← עיצוב מלא 
├── START_MECHLEX.bat   ← הפעלת השרת המקומי המשותף
├── SHARED_DATA_PATH.txt← הגדרת נתיב התיקייה המשותפת
├── core/               ← סנכרון משותף, שרת מקומי, שמירה ועריכה
├── data/               ← קטלוג הבסיס (mechlex-data.js)
├── images/             ← תמונות הנדסיות 
├── backups/            ← קובצי איפוס מערכת התחלתיים
└── תיעוד (README, CHANGELOG, הוראות_התקנה.txt, VERSION.txt)
```

> **הנחיית אבטחה לאדמין הרשת (IT):** כדי למנוע מעקיפת הרשאות ברמת ה-UI (על ידי מפתחים או כלים), **חובה** להגדיר את תיקיית היעד המשותפת כ-`Read-Only` למשתמשים רגילים, וכ-`Read/Write` רק למנהלי התוכן ב-NTFS/SMB. המערכת תזהה את ההרשאה ותפעל בהתאם.

#### 🔴 2. קבצים ותיקיות מיותרים (למחוק/לא להעביר/לא לגבות)
שאריות ממערכות אוטומטיות, טסטים ופיתוח. **אין להעביר או לגבות קבצים אלו**:
```text
├── node_modules/       ← תיקיית ספריות פיתוח ובדיקה עצומה - למחוק לחלוטין!
├── tests/              ← סקריפטים של בדיקות אוטומטיות (Puppeteer וכו')
├── artifacts/          ← תוצרי בדיקות (screenshots ודוחות קודמים)
├── package.json / lock ← קבצי הגדרות של סביבת הפיתוח (npm)
└── קבצי שורש מיותרים   ← עשרות צילומי מסך (png), קובצי CJS (test_*.cjs), 
                          וסקריפטים ניסיוניים (כמו 3d_buttons.css).
```

---

## ⚡ סדר טעינת הסקריפטים — קריטי

```html
<!-- ב-index.html, בסוף ה-body: -->
1. data/mechlex-data.js      ← קטלוג הבסיס (משתנה גלובלי)
2. images/catalog.js          ← רשימת תמונות
3. app.js                     ← הלוגיקה הראשית + כל ה-global functions
4. core/integrity.js          ← עוטפת (wraps) פונקציות מ-app.js
5. core/persistence.js        ← עוטפת init(), saveAll()
6. core/shared-sync.js        ← סנכרון תיקייה משותפת
7. core/inline-editor.js      ← עורך חזותי, עוטפת renderAll() + bindEvents()
8. core/boot.js               ← מפעילה init() פעם אחת — חייבת להיות אחרונה
```

> **חשוב:** כל קובץ `core/*.js` **עוטף** (monkey-patches) פונקציות גלובליות שהוגדרו ב-`app.js`.  
> שינוי סדר הטעינה **ישבור את המערכת**.

---

## 🎨 מבנה CSS

`style.css` בנוי בשכבות (top-to-bottom):

| שורות (בערך) | תוכן |
|---|---|
| 1–100 | CSS variables, design tokens |
| 100–700 | Layout: app-shell, sidebar, topbar, page grid |
| 700–900 | Term modal, term pages, core-layout |
| 900–1050 | Admin modal, editor panels |
| 1050–1130 | Taxonomy explorer (knowledge map) |
| 1130–1260 | Visual editor toolbar (inline-editor) |
| 1260–1500 | Taxonomy cards, subtopic cards, term nodes |
| 1500–1620 | Aurora visual theme layer |
| 1620–1700 | Taxonomy term lists, hierarchy guide |
| 1700–1860 | Dark mode overrides |
| 1860–2010 | Animation system (hover, shine, glow) |
| 2010–2290 | Legacy Edge 95 fallbacks |
| 2290–2450 | Shared sync status bar |
| **2450–2570** | **Mind Map (מפת חשיבה) — viewport, panning, nodes** |
| 2570–2740 | Mind Map node styles, domain detail modal |

---

## 🗺️ מפת חשיבה (Mind Map) — מצב נוכחי

### ארכיטקטורה
- **Viewport** (`#mindMapViewport`): `overflow: hidden`, `cursor: grab`
- **Canvas Wrapper** (`#mindMapCanvasWrapper`): `position: absolute`, `transform-origin: 0 0`
- **SVG** (`#mindMapSvg`): קווי חיבור בין nodes
- **Nodes** (`#mindMapNodes`): DOM elements עם class `mm-node-*`

### אינטראקציה
- **Pan**: pointer events (pointerdown/move/up) → `mindMapPanX/Y` → `translate(x,y)`
- **Zoom**: wheel event → `mindMapZoom` → `scale(z)`
- **Collapse/Expand**: click על domain/subtopic → toggle ב-`mindMapCollapsedNodes` Set
- **Fit to Screen**: חישוב `scaleX/scaleY` מתוך `getBoundingClientRect()`

### בעיות ידועות (נכון ל-2026-07-24)
- ⚠️ ב-`fitMindMapToScreen()` הזום מוגבל ל-`Math.min(1.0, ...)` — אם התוכן רחב, הוא יוקטן.
- ✅ (תוקן) מפת החשיבה פועלת כעת כרכיב משולב (inline) ואינה מעלימה את תפריט הצד והכותרות.
- ✅ (תוקן) מפת החשיבה יכולה להציג כעת את כל התחומים גם ללא בחירת תחום מפורשת בדף הבית.
- ✅ (תוקן) מנגנון ה-Pan עובד באופן חלק לאחר תיקון אירועי ה-mousedown.

---

## ✏️ עורך חזותי (inline-editor.js) — מצב נוכחי

### אזורי טקסט ניתנים לעריכה
קובץ `core/inline-editor.js` מגדיר מערך `textTargets` עם **35+ אזורי טקסט**:
- שם מותג, כותרות, תיאורים, מדדים, ניווט צד, כותרות מפה, מצב ריק, ועוד

### מצב עריכה חזותית
1. נכנסים דרך: מרכז ניהול → אדמין ראשי → "עריכה חזותית בדף"
2. טקסטים מסומנים במסגרת סגולה → `contentEditable="true"`
3. כפתור "✎ עריכת המושג/התחום" מופיע על כל כרטיס
4. סרגל צף (`#visualEditorToolbar`) מאפשר שינוי צבעים, גופן, רדיוס
5. כפתור "💾 שמור שינויים" שומר את כל השינויים בבת אחת

### שיפורים אחרונים (2026-07-23)
- ✅ שדות `editNameEn` (שם באנגלית) ו-`editCode` (קוד קטלוגי) הפכו **לשדות גלויים** בטופס
- ✅ כפתורי "שמור מושג" / "שמור תחום" נוספו **גם בראש הטפסים**
- ✅ תוקן באג היעלמות טקסט ב-Rich Editor בעת focus (CSS `background` שונה ל-`var(--surface)`)
- ✅ נוספו עוד מטרות טקסט לעריכה חזותית (ניווט צד, מסך ריק, כפתורי UI)

---

## 🔌 תחום/תת-תחום — Modal הגדרה ותמונה

### מבנה DOM
- `#domainDetailOverlay` + `#domainDetailModal` (class `term-modal`)
- מבנה **זהה ל-`#termModal`**: `core-layout` → `core-definition` + `core-visual`
- הגדרה מקצועית, כמות מושגים, כמות תת-תחומים, רשימת מושגים כלולים
- תמונה מ-`domain.image` או fallback עם אייקון SVG

### מה עדיין חסר
- ⚠️ ה-Modal מציג את תמונת ה-**domain** גם כשנפתח עבור subtopic, צריך לפצל את התצוגה במודאל.
- ✅ (תוקן) הוספנו אפשרות להעלאת תמונה ותיאור עבור כל תת-תחום ותת-תת-תחום היישר מתוך חלון הניהול, עם שדות נפרדים.

---

## 📦 סכמת נתונים (Schema 2)

### מבנה domain:
```javascript
{
  id: "dom-xxx",
  name: "שם התחום",
  nameEn: "Domain Name",
  prefix: "DOM",       // קידומת קוד אוטומטית
  color: "#hexcolor",
  icon: "⚙️",
  description: "תיאור",
  image: "filename.jpg", // אופציונלי — קובץ ב-images/
  subtopics: [
    {
      name: "שם תת-תחום",
      description: "תיאור",
      color: "#hexcolor",
      children: [
        { name: "שם תת-תת-תחום", description: "...", color: "#..." }
      ]
    }
  ],
  items: [ /* מושגים */ ]
}
```

### מבנה term (item):
```javascript
{
  id: "unique-id",
  code: "DOM-001",
  title: "שם המושג",
  name: "שם המושג",      // alias
  nameEn: "English Name",
  subtopic: "שם תת-תחום", // או "direct"
  subSubtopic: "שם תת-תת-תחום", // אופציונלי
  definition: "טקסט רגיל",
  definitionHtml: "<p>HTML מעוצב</p>",
  short: "תקציר",
  image: "filename.jpg",
  embeddedImage: "data:image/...", // אופציונלי — base64
  symbol: "σ",
  units: "MPa",
  formula: "F/A",
  formulaNote: "הערה",
  variables: [{ symbol: "F", meaning: "כוח", unit: "N" }],
  why: "למה זה חשוב",
  uses: ["שימוש 1", "שימוש 2"],
  cautions: ["אזהרה 1"],
  manufacturing: "שיקולי ייצור",
  inspection: "שיטות בחינה",
  standards: ["ISO 1101"],
  tags: ["tag1"],
  aliases: ["שם חלופי"],
  related: ["DOM-002"],
  example: { title: "", given: "", solution: "", result: "" },
  visualTitle: "כותרת תרשים",
  visualDescription: "תיאור תרשים"
}
```

---

## 🔄 עדכוני תוכנה ושמירת נתונים בארגון

המערכת תוכננה מראש להפריד לחלוטין בין הקוד לבין התוכן שלך:
- **קוד התוכנה:** נמצא בקבצי הליבה (`app.js`, `index.html` וכו').
- **התוכן שלך:** נשמר בקובץ `state.json` (בתוך התיקייה המשותפת) וכל התמונות בתיקיית `images/`.

**איך מעדכנים גרסה בלי לאבד מידע?**
אם קיבלת עדכון למערכת (תיקון באג או גרסה חדשה), **אין שום סכנה לתוכן שלך**. 
כל שעליך לעשות הוא להחליף את קבצי המערכת בקבצים החדשים, ולשמור על:
1. קובץ ההגדרה `SHARED_DATA_PATH.txt`.
2. תיקיית התמונות `images/`.
3. קובצי הגיבוי ששמרת בעבר.

ברגע שתפעיל את המערכת מחדש, הקוד החדש יטען אוטומטית את כל התחומים, תתי-התחומים, המושגים, ההגדרות והתמונות בדיוק כפי שעזבת אותם, ללא צורך בהגדרה מחדש.

---
## 🔧 פקודות פיתוח

```bash
# בדיקה סטטית (ללא דפדפן)
npm test

# בדיקת סנכרון
npm run test:sync

# בדיקת layout
npm run test:layout

# בדיקת דפדפן מלאה
npm run test:browser

# כל הבדיקות ברצף
npm run test:all

# עדכון חתימות manifest
npm run build:manifest
```

---

## ⚠️ כללים קריטיים לכלי AI

### מה לא לעשות
1. **אין לשנות סדר טעינת סקריפטים** ב-`index.html` ללא בדיקה מלאה
2. **אין להסיר פונקציות גלובליות** מ-`app.js` — הן נעטפות ב-`core/*.js`
3. **אין לדרוס `data/mechlex-data.js`** — זה קטלוג הבסיס
4. **אין לשנות שמות מפתחות** ב-localStorage, IndexedDB או מבנה הגיבוי
5. **אין לשנות את שם `init()`** — `boot.js` תלויה בה

### מה חשוב לבדוק אחרי שינוי
1. `npm test` — בדיקה סטטית
2. `npm run build:manifest` — עדכון חתימות
3. אין שגיאות ב-Console של הדפדפן
4. חלון מושג נפתח ונסגר
5. Tab focus נשאר בתוך המודאל
6. Mind Map מגיב ל-pan ו-zoom

### פונקציות גלובליות מרכזיות (app.js)
| פונקציה | תפקיד |
|---|---|
| `init()` | אתחול ראשי — נעטפת ע"י persistence, boot |
| `renderAll()` | רינדור מחדש של כל ה-UI — נעטפת ע"י inline-editor |
| `bindEvents()` | חיבור אירועים — נעטפת ע"י inline-editor |
| `saveAll()` | שמירת כל הנתונים — נעטפת ע"י persistence, shared-sync |
| `renderAdmin()` | רינדור מרכז הניהול — נעטפת ע"י inline-editor |
| `openTerm(id)` | פתיחת מושג במודאל |
| `renderMindMap()` | רינדור מפת חשיבה |
| `fitMindMapToScreen()` | התאמת המפה לגודל המסך |
| `openDomainDetailModal()` | פתיחת מודאל הגדרת תחום/תת-תחום |

---

## 📝 למשך הפיתוח — מצב נוכחי וצעדים הבאים

### מה הושלם (עדכון אחרון 2026-07-25)
- [x] הוגדלה מגבלת העלאת התמונות המובנית ל-15MB (בממשק התוכנה) והוגדלה תקרת שרת הליבה ל-100MB כדי לאפשר שמירת קבצים כבדים.
- [x] תוקן באג: חלון הגדרת תת-תחומים משתמש מעתה בתמונה הייעודית לתת-התחום (אם הוגדרה) ולא רק בתמונת התחום הראשי.
- [x] מפת חשיבה (Mind Map) עם Pan ו-Zoom שמשתלבת בצורה חלקה בתוך הממשק (מבלי להסתיר סרגל צד).
- [x] ביטול גובה `100vh` קשיח ב-`.page` שגרם לחיתוך (clipping) אופקי במסכים וברזולוציות גדולות.
- [x] כפתורי בקרת תצוגה (רשימה, כרטיסים, מפת חשיבה) עברו לראש הדף וזמינים תמיד.
- [x] רכיב העלאת תמונה + הגדרה שולב בתאי ה-grid של מנהל התחומים (לרמת תת-תחום ותת-תת-תחום).
- [x] Modal הגדרה ותמונה לתחומים (domain detail)
- [x] תיקון היעלמות טקסט בעריכת Rich Editor
- [x] כפתור שמירה בראש טפסי העריכה

### מה צריך שיפור
- [ ] Visual Editor: ייתכנו שדות נוספים שלא ניתנים לעריכה חזותית.
- [ ] בדיקות: `browser-layout.cjs` צריך עדכון לכסות את Mind Map ו-domain detail modal.
