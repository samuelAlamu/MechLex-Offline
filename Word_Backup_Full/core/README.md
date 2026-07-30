# core/ — שכבות ליבה של MechLex

> **עדכון אחרון:** 2026-07-23  
> **גרסה:** 10.1.0

---

## 📋 תפקיד התיקייה

תיקיית `core/` מכילה **שכבות ליבה** שנטענות אחרי `app.js` ו**עוטפות** (monkey-patch)
את הפונקציות הגלובליות שלו. כל קובץ כאן מרחיב התנהגות קיימת בלי לשנות את `app.js` עצמו.

---

## 📁 קבצים

### `boot.js` — אתחול (40 שורות)
- **חייב להיטען אחרון** מבין כל הסקריפטים
- קורא ל-`init()` פעם אחת בלבד (guard: `window.__MECHLEX_BOOTED__`)
- מציג הודעת שגיאה ב-UI אם `init()` לא קיימת
- **אין לשנות** את שם `init()` מבלי לעדכן כאן

### `integrity.js` — ולידציה ושלמות (~28,500 בתים)
- ולידציה של מושגים (שם, הגדרה, קוד ייחודי)
- מניעת מזהים וקודים כפולים
- ניקוי אוטומטי של קישורי `related` לאחר מחיקה
- ניקוי מועדפים, היסטוריה והתקדמות עבור פריטים שנמחקו
- בדיקת שלמות קטלוג (catalog integrity check)
- עוטפת פונקציות מ-`app.js`: `upsertTerm`, `deleteTerm`, `upsertDomain`, `deleteDomain`

### `persistence.js` — שמירה ואחסון (~29,000 בתים)
- IndexedDB כמאגר ראשי
- localStorage כמראת אתחול ותאימות לאחור
- ניהול טיוטות עריכה
- עד 10 נקודות שחזור לפני פעולות מסוכנות
- חתימות checksum בגיבויים
- **עוטפת:** `init()`, `saveAll()`, `exportBackup()`

### `shared-sync.js` — סנכרון תיקייה משותפת (~11,400 בתים)
- קריאה וכתיבה לתיקייה משותפת ב-LAN
- נתיב מוגדר ב-`SHARED_DATA_PATH.txt` (שורש הפרויקט)
- polling כל ~1.5 שניות
- מחוון סטטוס סנכרון ב-topbar
- **עוטפת:** `saveAll()`

### `inline-editor.js` — עורך חזותי (~13,200 בתים)
- מצב עריכה חזותית לאדמין ראשי (Super Admin בלבד)
- 35+ אזורי טקסט ניתנים לעריכה (מערך `textTargets`)
- סרגל צף (`#visualEditorToolbar`) לשינוי צבעים, גופן, רדיוס
- כפתור "💾 שמור שינויים" בראש הסרגל
- כפתורי "✎ עריכת המושג/התחום" על כרטיסים
- **עוטפת:** `renderAll()`, `renderAdmin()`, `bindEvents()`

### `start-local-server.ps1` — שרת HTTP (~15,800 בתים)
- שרת PowerShell על `127.0.0.1:8765`
- GET/HEAD בלבד, מניעת path traversal
- כותרות אבטחה (CSP, X-Frame-Options)
- בחירת פורט חלופי אם 8765 תפוס
- **לא דורש אינטרנט**

---

## 🔗 שרשרת העטיפה (Wrapping Chain)

```
app.js          → מגדיר: init(), renderAll(), saveAll(), bindEvents(), renderAdmin()
                   ↓
integrity.js    → עוטפת: upsertTerm, deleteTerm, upsertDomain, deleteDomain
                   ↓
persistence.js  → עוטפת: init(), saveAll(), exportBackup()
                   ↓
shared-sync.js  → עוטפת: saveAll()
                   ↓
inline-editor.js→ עוטפת: renderAll(), renderAdmin(), bindEvents()
                   ↓
boot.js         → קוראת: init() ← הגרסה הסופית שכוללת את כל העטיפות
```

> **כלל ברזל:** אם מוסיפים קובץ `core/*.js` חדש — הוא חייב להיטען **לפני** `boot.js`
> ולהוסיף אותו ל-`index.html` בסדר הנכון.

---

## ⚠️ הנחיות לכלי AI

1. **אין לשנות את שמות הפונקציות הגלובליות** שנעטפות — כל שרשרת העטיפה תישבר
2. **אם מוסיפים wrapping חדש** — לעטוף ב-IIFE עם `const base = existingFunction; existingFunction = function() { ... base(); ... }`
3. **boot.js תמיד אחרון** — אל תוסיפו סקריפט אחריו
4. **שינוי ב-persistence.js** דורש בדיקת: שמירה, סגירה, פתיחה מחדש, גיבוי ושחזור
5. **שינוי ב-integrity.js** דורש: `npm test` + בדיקת יצירה/מחיקה/שכפול מושג
6. **שינוי ב-inline-editor.js** דורש: כניסה כ-Super Admin → עריכה חזותית → בדיקת כל אזורי הטקסט
