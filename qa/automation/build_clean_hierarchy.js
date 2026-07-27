const fs = require('fs');
const path = require('path');

const statePath = path.resolve(__dirname, '../../../MechLex_Shared_Data_Simulation/state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

// Define the precise subtopics & sub-subtopics structure requested
const subtopics = [
  {
    id: "st-solid-mechanics",
    name: "מכניקת מוצקים",
    description: "ניתוח מאמצים, מעוותים ותכונות חומרים",
    color: "#2563eb",
    children: [
      { id: "sst-strength", name: "חוזק חומרים", description: "תכונות חוזק, בטיחות וריכוזי מאמצים", color: "#2563eb" },
      { id: "sst-basic-loads", name: "עומסים בסיסיים", description: "מתיחה, לחיצה, כפיפה ופיתול", color: "#2563eb" },
      { id: "sst-fatigue", name: "עייפות ושבר", description: "התנהגות תחת העמסה מחזורית וסדקים", color: "#2563eb" }
    ]
  },
  {
    id: "st-thermodynamics",
    name: "תרמודינמיקה",
    description: "מעברי אנרגיה, חום ועבודה",
    color: "#dc2626",
    children: []
  },
  {
    id: "st-fluid-mechanics",
    name: "מכניקת זורמים",
    description: "דינמיקה וסטטיקה של נוזלים וגזים",
    color: "#0284c7",
    children: []
  },
  {
    id: "st-mechanical-design",
    name: "תכן מכני",
    description: "תכנון רכיבי מכונות וממסרות",
    color: "#16a34a",
    children: []
  },
  {
    id: "st-manufacturing",
    name: "תהליכי ייצור",
    description: "עיבוד שבבי, הדפסה תלת-ממדית וטכנולוגיות ייצור",
    color: "#9333ea",
    children: []
  },
  {
    id: "st-mechatronics",
    name: "בקרה ומכטרוניקה",
    description: "חיישנים, מפעילים ומערכות בקרה",
    color: "#ea580c",
    children: []
  }
];

// Mapping terms to their correct (subtopic, subSubtopic)
const termMappings = {
  // Direct terms (Level 2 directly under domain)
  "כוח": { sub: "כללי", subsub: "" },
  "מומנט": { sub: "כללי", subsub: "" },
  "עבודה מכנית": { sub: "כללי", subsub: "" },
  "הספק מכני": { sub: "כללי", subsub: "" },
  "אנרגיה מכנית": { sub: "כללי", subsub: "" },
  "נצילות": { sub: "כללי", subsub: "" },

  // מכניקת מוצקים -> Direct
  "מאמץ": { sub: "מכניקת מוצקים", subsub: "" },
  "מעוות": { sub: "מכניקת מוצקים", subsub: "" },
  "מודול יאנג": { sub: "מכניקת מוצקים", subsub: "" },

  // מכניקת מוצקים -> חוזק חומרים
  "מקדם בטיחות": { sub: "מכניקת מוצקים", subsub: "חוזק חומרים" },
  "ריכוז מאמצים": { sub: "מכניקת מוצקים", subsub: "חוזק חומרים" },

  // מכניקת מוצקים -> עומסים בסיסיים
  "מתיחה ולחיצה": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "התארכות": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "יחס פואסון": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "חוק הוק": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "כפיפה": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "ציר נייטרלי": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "מומנט כפיפה": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "מאמץ כפיפה": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "מומנט התמד שטחי": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "פיתול": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "מומנט פיתול": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "מאמץ גזירה": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },
  "זווית פיתול": { sub: "מכניקת מוצקים", subsub: "עומסים בסיסיים" },

  // מכניקת מוצקים -> עייפות ושבר
  "עקומת S-N": { sub: "מכניקת מוצקים", subsub: "עייפות ושבר" },
  "גבול עייפות": { sub: "מכניקת מוצקים", subsub: "עייפות ושבר" },
  "מספר מחזורי העמסה": { sub: "מכניקת מוצקים", subsub: "עייפות ושבר" },
  "כלל מינר": { sub: "מכניקת מוצקים", subsub: "עייפות ושבר" },
  "קצה סדק": { sub: "מכניקת מוצקים", subsub: "עייפות ושבר" },
  "התקדמות סדק": { sub: "מכניקת מוצקים", subsub: "עייפות ושבר" },
  "קשיחות לשבר": { sub: "מכניקת מוצקים", subsub: "עייפות ושבר" },

  // תרמודינמיקה
  "מערכת סגורה": { sub: "תרמודינמיקה", subsub: "" },
  "מערכת פתוחה": { sub: "תרמודינמיקה", subsub: "" },
  "אנתלפיה": { sub: "תרמודינמיקה", subsub: "" },
  "אנטרופיה": { sub: "תרמודינמיקה", subsub: "" },
  "מחזור אוטו": { sub: "תרמודינמיקה", subsub: "" },
  "מחזור קירור בדחיסת אדים": { sub: "תרמודינמיקה", subsub: "" },
  "מוליכות תרמית": { sub: "תרמודינמיקה", subsub: "" },
  "חוק פורייה": { sub: "תרמודינמיקה", subsub: "" },
  "הסעה טבעית": { sub: "תרמודינמיקה", subsub: "" },
  "הסעה מאולצת": { sub: "תרמודינמיקה", subsub: "" },

  // מכניקת זורמים
  "צפיפות": { sub: "מכניקת זורמים", subsub: "" },
  "צמיגות דינמית": { sub: "מכניקת זורמים", subsub: "" },
  "לחץ": { sub: "מכניקת זורמים", subsub: "" },
  "ספיקה נפחית": { sub: "מכניקת זורמים", subsub: "" },
  "מספר ריינולדס": { sub: "מכניקת זורמים", subsub: "" },
  "זרימה למינרית": { sub: "מכניקת זורמים", subsub: "" },
  "זרימה טורבולנטית": { sub: "מכניקת זורמים", subsub: "" },
  "משוואת דארסי–וייסבך": { sub: "מכניקת זורמים", subsub: "" },
  "קוויטציה": { sub: "מכניקת זורמים", subsub: "" },
  "NPSH": { sub: "מכניקת זורמים", subsub: "" },

  // תכן מכני
  "סבולת ממדית": { sub: "תכן מכני", subsub: "" },
  "התאמה": { sub: "תכן מכני", subsub: "" },
  "גלגל שיניים ישר": { sub: "תכן מכני", subsub: "" },
  "מיסב כדורי": { sub: "תכן מכני", subsub: "" },
  "חיבור ברגים": { sub: "תכן מכני", subsub: "" },
  "מומנט סגירה": { sub: "תכן מכני", subsub: "" },

  // תהליכי ייצור
  "תהליך חריטה": { sub: "תהליכי ייצור", subsub: "" },
  "כרסום מטפס": { sub: "תהליכי ייצור", subsub: "" },
  "גובה שכבה": { sub: "תהליכי ייצור", subsub: "" },
  "שכבות FDM": { sub: "תהליכי ייצור", subsub: "" },
  "סינטור בלייזר": { sub: "תהליכי ייצור", subsub: "" },

  // בקרה ומכטרוניקה
  "חיישן": { sub: "בקרה ומכטרוניקה", subsub: "" },
  "מפעיל": { sub: "בקרה ומכטרוניקה", subsub: "" },
  "משוב": { sub: "בקרה ומכטרוניקה", subsub: "" },
  "מערכת בחוג סגור": { sub: "בקרה ומכטרוניקה", subsub: "" },
  "תגובת PID": { sub: "בקרה ומכטרוניקה", subsub: "" },
  "מנוע סרוו": { sub: "בקרה ומכטרוניקה", subsub: "" },
  "אנקודר": { sub: "בקרה ומכטרוניקה", subsub: "" }
};

// Collect all existing items across all domains
let allExistingItems = [];
state.shared.data.forEach(d => {
  if (d.items && d.items.length) {
    allExistingItems.push(...d.items);
  }
});

// Remove duplicates by name
const uniqueMap = new Map();
allExistingItems.forEach(item => {
  if (!uniqueMap.has(item.name)) {
    uniqueMap.set(item.name, item);
  }
});
const uniqueItems = Array.from(uniqueMap.values());

// Update subtopic and subSubtopic for each item
uniqueItems.forEach(item => {
  const mapping = termMappings[item.name];
  if (mapping) {
    item.subtopic = mapping.sub;
    item.subSubtopic = mapping.subsub;
  } else {
    // If not explicitly mapped, default to "כללי"
    item.subtopic = "כללי";
    item.subSubtopic = "";
  }
  item.code = item.code.replace(/^D1-/, 'ME-');
});

// Construct clean MechLex domain
const mechEngDomain = {
  id: "mech-eng-domain-1",
  name: "הנדסת מכונות",
  nameEn: "Mechanical Engineering",
  prefix: "ME",
  icon: "⚙️",
  color: "#2563eb",
  description: "תחום הנדסי היקפי העוסק בתכנון, ניתוח, ייצור ותחזוקה של מערכות מכניות וזרימה.",
  subtopics: subtopics,
  items: uniqueItems
};

// Update shared data
state.shared.data = [mechEngDomain];
state.revision = Number(state.revision || 0) + 1;

fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
console.log(`Successfully updated state.json! Domain 'הנדסת מכונות' has ${uniqueItems.length} items and ${subtopics.length} subtopics.`);
