const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 8765;
const DOMAIN = "הנדסת מכונות";

const subtopicsData = [
  {
    name: "מכניקת מוצקים",
    subsubtopics: [
      "חוזק חומרים",
      "חוזק חומרים - עומסים בסיסיים - מתיחה ולחיצה",
      "חוזק חומרים - עומסים בסיסיים - כפיפה",
      "חוזק חומרים - עומסים בסיסיים - פיתול",
      "חוזק חומרים - עייפות ושבר - עייפות חומרים",
      "חוזק חומרים - עייפות ושבר - מכניקת שבר"
    ]
  },
  {
    name: "תרמודינמיקה",
    subsubtopics: [
      "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור אוטו",
      "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור דיזל",
      "מחזורים תרמודינמיים - מערכות קירור - מחזור קירור בדחיסת אדים",
      "מעבר חום - הולכה",
      "מעבר חום - הסעה",
      "מעבר חום - קרינה"
    ]
  },
  {
    name: "מכניקת זורמים",
    subsubtopics: [
      "זרימה פנימית - זרימה בצנרת",
      "זרימה פנימית - משאבות",
      "זרימה חיצונית - שכבת גבול"
    ]
  },
  {
    name: "תכן מכני",
    subsubtopics: [
      "אלמנטים מכניים - גלגלי שיניים",
      "אלמנטים מכניים - מיסבים",
      "אלמנטים מכניים - חיבורים מכניים"
    ]
  },
  {
    name: "תהליכי ייצור",
    subsubtopics: [
      "עיבוד שבבי - חריטה",
      "עיבוד שבבי - כרסום",
      "ייצור בתוספת חומר - FDM",
      "ייצור בתוספת חומר - SLS"
    ]
  },
  {
    name: "בקרה ומכטרוניקה",
    subsubtopics: [
      "מערכות בקרה - בקר PID",
      "בקרת תנועה - מנוע סרוו",
      "בקרת תנועה - משוב מיקום"
    ]
  }
];

const termsData = [
  // Direct under domain
  { name: "כוח", en: "Force", symbol: "F", unit: "N", def: "השפעה מכנית היכולה לשנות את מצב התנועה או ליצור עיוות בגוף.", sub: "direct", subsub: "" },
  { name: "מומנט", en: "Torque", symbol: "T או M", unit: "N·m", formula: "T = F × r", def: "הנטייה של כוח לגרום לסיבוב סביב ציר.", sub: "direct", subsub: "" },
  { name: "עבודה מכנית", en: "Mechanical Work", symbol: "W", unit: "J", formula: "W = F · s", def: "", sub: "direct", subsub: "" },
  { name: "הספק מכני", en: "Mechanical Power", symbol: "P", unit: "W", formula: "P = W/t", def: "", sub: "direct", subsub: "" },
  { name: "אנרגיה מכנית", en: "Mechanical Energy", unit: "J", def: "סכום האנרגיה הקינטית והפוטנציאלית של מערכת מכנית.", sub: "direct", subsub: "" },
  { name: "נצילות", en: "Efficiency", symbol: "η", formula: "η = Pout / Pin", def: "היחס בין התפוקה השימושית לבין האנרגיה או ההספק שהושקעו במערכת.", sub: "direct", subsub: "" },

  // Solid Mechanics -> Direct
  { name: "מאמץ", en: "Stress", symbol: "σ", unit: "Pa", def: "", sub: "מכניקת מוצקים", subsub: "" },
  { name: "מעוות", en: "Strain", symbol: "ε", unit: "ללא יחידות", def: "", image: "Stress-Strain.png", sub: "מכניקת מוצקים", subsub: "" },
  { name: "מודול יאנג", en: "Young’s Modulus", symbol: "E", unit: "Pa", def: "", sub: "מכניקת מוצקים", subsub: "" },
  
  // Solid Mechanics -> חוזק חומרים -> Direct
  { name: "מקדם בטיחות", en: "Factor of Safety", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים" },
  { name: "ריכוז מאמצים", en: "Stress Concentration", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים" },
  { name: "מאמץ מותר", en: "Allowable Stress", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים" },

  // Solid Mechanics -> חוזק חומרים -> עומסים בסיסיים -> מתיחה ולחיצה
  { name: "מאמץ נורמלי", en: "Normal Stress", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - מתיחה ולחיצה" },
  { name: "התארכות", en: "Elongation", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - מתיחה ולחיצה" },
  { name: "יחס פואסון", en: "Poisson’s Ratio", symbol: "ν", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - מתיחה ולחיצה" },
  { name: "חוק הוק", en: "Hooke’s Law", formula: "σ = Eε", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - מתיחה ולחיצה" },

  // Solid Mechanics -> חוזק חומרים -> עומסים בסיסיים -> כפיפה
  { name: "מומנט כפיפה", en: "Bending Moment", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - כפיפה" },
  { name: "ציר נייטרלי", en: "Neutral Axis", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - כפיפה" },
  { name: "מומנט התמד שטחי", en: "Second Moment of Area", symbol: "I", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - כפיפה" },
  { name: "מאמץ כפיפה", en: "Bending Stress", formula: "σ = My/I", def: "מאמץ הכפיפה מחושב לפי σ = My/I, כאשר M הוא מומנט הכפיפה.", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - כפיפה" },

  // Solid Mechanics -> חוזק חומרים -> עומסים בסיסיים -> פיתול
  { name: "מומנט פיתול", en: "Torsional Moment", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - פיתול" },
  { name: "מאמץ גזירה", en: "Shear Stress", symbol: "τ", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - פיתול" },
  { name: "מומנט אינרציה פולרי", en: "Polar Moment of Inertia", symbol: "J", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - פיתול" },
  { name: "זווית פיתול", en: "Angle of Twist", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עומסים בסיסיים - פיתול" },

  // Solid Mechanics -> עייפות ושבר -> עייפות חומרים
  { name: "עקומת S-N", en: "", def: "", image: "S-N_Curve.png", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עייפות ושבר - עייפות חומרים" },
  { name: "גבול עייפות", en: "Endurance Limit", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עייפות ושבר - עייפות חומרים" },
  { name: "מספר מחזורי העמסה", en: "", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עייפות ושבר - עייפות חומרים" },
  { name: "כלל מינר", en: "Miner’s Rule", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עייפות ושבר - עייפות חומרים" },

  // Solid Mechanics -> עייפות ושבר -> מכניקת שבר
  { name: "קצה סדק", en: "Crack Tip", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עייפות ושבר - מכניקת שבר" },
  { name: "מקדם עוצמת מאמצים", en: "Stress Intensity Factor", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עייפות ושבר - מכניקת שבר" },
  { name: "קשיחות לשבר", en: "Fracture Toughness", symbol: "KIC", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עייפות ושבר - מכניקת שבר" },
  { name: "התקדמות סדק", en: "Crack Propagation", def: "", sub: "מכניקת מוצקים", subsub: "חוזק חומרים - עייפות ושבר - מכניקת שבר" },

  // Thermodynamics -> Direct
  { name: "מערכת סגורה", en: "Closed System", def: "", sub: "תרמודינמיקה", subsub: "" },
  { name: "מערכת פתוחה", en: "Open System", def: "", sub: "תרמודינמיקה", subsub: "" },
  { name: "אנתלפיה", en: "Enthalpy", symbol: "h", def: "", sub: "תרמודינמיקה", subsub: "" },
  { name: "אנטרופיה", en: "Entropy", symbol: "s", def: "", sub: "תרמודינמיקה", subsub: "" },

  // Thermodynamics -> מחזורים -> אוטו
  { name: "יחס דחיסה", en: "Compression Ratio", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור אוטו" },
  { name: "נצילות תרמית", en: "Thermal Efficiency", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור אוטו" },
  { name: "הצתה בניצוץ", en: "Spark Ignition", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור אוטו" },
  { name: "נקישה", en: "Engine Knock", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור אוטו" },
  { name: "מחזור אוטו", en: "", def: "", image: "Otto_Cycle.png", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור אוטו" },

  // Thermodynamics -> מחזורים -> דיזל
  { name: "הצתה בדחיסה", en: "Compression Ignition", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור דיזל" },
  { name: "יחס חיתוך", en: "Cut-off Ratio", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור דיזל" },
  { name: "צריכת דלק סגולית", en: "Specific Fuel Consumption", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור דיזל" },
  { name: "לחץ אפקטיבי ממוצע", en: "Mean Effective Pressure", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מנועי בעירה פנימית - מחזור דיזל" },

  // Thermodynamics -> מחזורים -> קירור
  { name: "מאייד", en: "Evaporator", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מערכות קירור - מחזור קירור בדחיסת אדים" },
  { name: "מדחס", en: "Compressor", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מערכות קירור - מחזור קירור בדחיסת אדים" },
  { name: "מעבה", en: "Condenser", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מערכות קירור - מחזור קירור בדחיסת אדים" },
  { name: "שסתום התפשטות", en: "Expansion Valve", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מערכות קירור - מחזור קירור בדחיסת אדים" },
  { name: "מקדם ביצועים", en: "COP", def: "", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מערכות קירור - מחזור קירור בדחיסת אדים" },
  { name: "מחזור קירור בדחיסת אדים", en: "", def: "", image: "Vapor_Compression.png", sub: "תרמודינמיקה", subsub: "מחזורים תרמודינמיים - מערכות קירור - מחזור קירור בדחיסת אדים" },

  // Thermodynamics -> מעבר חום -> הולכה
  { name: "מוליכות תרמית", en: "Thermal Conductivity", symbol: "k", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - הולכה" },
  { name: "חוק פורייה", en: "Fourier’s Law", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - הולכה" },
  { name: "התנגדות תרמית", en: "Thermal Resistance", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - הולכה" },

  // Thermodynamics -> מעבר חום -> הסעה
  { name: "מקדם מעבר חום בהסעה", en: "", symbol: "h", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - הסעה" },
  { name: "מספר נוסלט", en: "Nusselt Number", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - הסעה" },
  { name: "הסעה טבעית", en: "", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - הסעה" },
  { name: "הסעה מאולצת", en: "", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - הסעה" },

  // Thermodynamics -> מעבר חום -> קרינה
  { name: "פליטה תרמית", en: "Emissivity", symbol: "ε", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - קרינה" },
  { name: "חוק סטפן–בולצמן", en: "", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - קרינה" },
  { name: "גוף שחור", en: "Black Body", def: "", sub: "תרמודינמיקה", subsub: "מעבר חום - קרינה" },

  // Fluid Mechanics -> Direct
  { name: "צפיפות", en: "Density", symbol: "ρ", unit: "kg/m³", def: "", sub: "מכניקת זורמים", subsub: "" },
  { name: "צמיגות דינמית", en: "Dynamic Viscosity", symbol: "μ", def: "", sub: "מכניקת זורמים", subsub: "" },
  { name: "לחץ", en: "Pressure", symbol: "p", unit: "Pa", def: "", sub: "מכניקת זורמים", subsub: "" },
  { name: "ספיקה נפחית", en: "Volumetric Flow Rate", symbol: "Q", def: "", sub: "מכניקת זורמים", subsub: "" },

  // Fluid Mechanics -> זרימה פנימית -> זרימה בצנרת
  { name: "מספר ריינולדס", en: "Reynolds Number", formula: "Re = ρVD/μ", def: "מספר ריינולדס קובע אם הזרימה למינרית או טורבולנטית.", sub: "מכניקת זורמים", subsub: "זרימה פנימית - זרימה בצנרת" },
  { name: "זרימה למינרית", en: "Laminar Flow", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - זרימה בצנרת" },
  { name: "זרימה טורבולנטית", en: "Turbulent Flow", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - זרימה בצנרת" },
  { name: "מקדם חיכוך דארסי", en: "", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - זרימה בצנרת" },
  { name: "הפסד עומד", en: "Head Loss", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - זרימה בצנרת" },
  { name: "משוואת דארסי–וייסבך", en: "", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - זרימה בצנרת" },

  // Fluid Mechanics -> זרימה פנימית -> משאבות
  { name: "עומד משאבה", en: "Pump Head", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - משאבות" },
  { name: "עקומת משאבה", en: "Pump Curve", def: "", image: "Pump_Curve.png", sub: "מכניקת זורמים", subsub: "זרימה פנימית - משאבות" },
  { name: "ספיקה נומינלית", en: "", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - משאבות" },
  { name: "קוויטציה", en: "Cavitation", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - משאבות" },
  { name: "NPSH", en: "", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - משאבות" },
  { name: "נקודת עבודה", en: "Operating Point", def: "", sub: "מכניקת זורמים", subsub: "זרימה פנימית - משאבות" },

  // Fluid Mechanics -> זרימה חיצונית -> שכבת גבול
  { name: "עובי שכבת גבול", en: "", def: "", sub: "מכניקת זורמים", subsub: "זרימה חיצונית - שכבת גבול" },
  { name: "היפרדות זרימה", en: "Flow Separation", def: "", sub: "מכניקת זורמים", subsub: "זרימה חיצונית - שכבת גבול" },
  { name: "מקדם גרר", en: "Drag Coefficient", symbol: "Cd", def: "", sub: "מכניקת זורמים", subsub: "זרימה חיצונית - שכבת גבול" },
  { name: "מקדם עילוי", en: "Lift Coefficient", symbol: "Cl", def: "", sub: "מכניקת זורמים", subsub: "זרימה חיצונית - שכבת גבול" },

  // Mechanical Design -> Direct
  { name: "סבולת ממדית", en: "Dimensional Tolerance", def: "", sub: "תכן מכני", subsub: "" },
  { name: "התאמה", en: "Fit", def: "", sub: "תכן מכני", subsub: "" },
  { name: "מקדם בטיחות", en: "Safety Factor", def: "", sub: "תכן מכני", subsub: "" },
  { name: "אמינות תכן", en: "Design Reliability", def: "", sub: "תכן מכני", subsub: "" },

  // Mechanical Design -> אלמנטים מכניים -> גלגלי שיניים
  { name: "גלגל שיניים ישר", en: "Spur Gear", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - גלגלי שיניים" },
  { name: "מודול", en: "Gear Module", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - גלגלי שיניים" },
  { name: "זווית לחץ", en: "Pressure Angle", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - גלגלי שיניים" },
  { name: "מרווח שיניים", en: "Backlash", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - גלגלי שיניים" },
  { name: "יחס העברה", en: "Gear Ratio", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - גלגלי שיניים" },
  { name: "גלגלי שיניים", en: "Gears", def: "", image: "Gears.png", sub: "תכן מכני", subsub: "אלמנטים מכניים - גלגלי שיניים" },

  // Mechanical Design -> אלמנטים מכניים -> מיסבים
  { name: "מיסב כדורי", en: "Ball Bearing", def: "", image: "Ball_Bearing.png", sub: "תכן מכני", subsub: "אלמנטים מכניים - מיסבים" },
  { name: "מיסב גלילים", en: "Roller Bearing", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - מיסבים" },
  { name: "אורך חיים L10", en: "", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - מיסבים" },
  { name: "עומס דינמי", en: "", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - מיסבים" },
  { name: "עומס מוקדם", en: "Preload", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - מיסבים" },

  // Mechanical Design -> אלמנטים מכניים -> חיבורים מכניים
  { name: "חיבור ברגים", en: "Bolted Joint", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - חיבורים מכניים" },
  { name: "קדם־מתיחה בבורג", en: "Bolt Preload", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - חיבורים מכניים" },
  { name: "ריתוך", en: "Welding", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - חיבורים מכניים" },
  { name: "עובי גרון ריתוך", en: "Weld Throat", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - חיבורים מכניים" },
  { name: "מפתח", en: "Key", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - חיבורים מכניים" },
  { name: "שגם", en: "Spline", def: "", sub: "תכן מכני", subsub: "אלמנטים מכניים - חיבורים מכניים" },

  // Manufacturing -> Direct
  { name: "חספוס פני שטח", en: "Surface Roughness", def: "", sub: "תהליכי ייצור", subsub: "" },
  { name: "Ra", en: "", def: "", sub: "תהליכי ייצור", subsub: "" },
  { name: "סבולת גאומטרית", en: "Geometric Tolerance", def: "", sub: "תהליכי ייצור", subsub: "" },
  { name: "Datum", en: "", def: "", sub: "תהליכי ייצור", subsub: "" },

  // Manufacturing -> עיבוד שבבי -> חריטה
  { name: "מהירות חיתוך", en: "Cutting Speed", def: "", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - חריטה" },
  { name: "קצב הזנה", en: "Feed Rate", def: "", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - חריטה" },
  { name: "עומק חיתוך", en: "Depth of Cut", def: "", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - חריטה" },
  { name: "שחיקת כלי", en: "Tool Wear", def: "", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - חריטה" },
  { name: "תהליך חריטה", en: "Turning Process", def: "", image: "Turning.png", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - חריטה" },

  // Manufacturing -> עיבוד שבבי -> כרסום
  { name: "מהירות כוש", en: "Spindle Speed", def: "", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - כרסום" },
  { name: "עומס שבב", en: "Chip Load", def: "", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - כרסום" },
  { name: "כרסום מטפס", en: "Climb Milling", def: "", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - כרסום" },
  { name: "כרסום קונבנציונלי", en: "Conventional Milling", def: "", sub: "תהליכי ייצור", subsub: "עיבוד שבבי - כרסום" },

  // Manufacturing -> ייצור בתוספת חומר -> FDM
  { name: "גובה שכבה", en: "Layer Height", def: "", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - FDM" },
  { name: "אחוז מילוי", en: "Infill Percentage", def: "", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - FDM" },
  { name: "מבני תמיכה", en: "Support Structures", def: "", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - FDM" },
  { name: "כיוון בנייה", en: "Build Orientation", def: "", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - FDM" },
  { name: "שכבות FDM", en: "FDM Layers", def: "", image: "FDM_Layers.png", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - FDM" },

  // Manufacturing -> ייצור בתוספת חומר -> SLS
  { name: "מיטת אבקה", en: "Powder Bed", def: "", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - SLS" },
  { name: "סינטור בלייזר", en: "Laser Sintering", def: "", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - SLS" },
  { name: "נקבוביות", en: "Porosity", def: "", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - SLS" },
  { name: "טיפול לאחר ייצור", en: "Post Processing", def: "", sub: "תהליכי ייצור", subsub: "ייצור בתוספת חומר - SLS" },

  // Control -> Direct
  { name: "חיישן", en: "Sensor", def: "", sub: "בקרה ומכטרוניקה", subsub: "" },
  { name: "מפעיל", en: "Actuator", def: "", sub: "בקרה ומכטרוניקה", subsub: "" },
  { name: "משוב", en: "Feedback", def: "", sub: "בקרה ומכטרוניקה", subsub: "" },
  { name: "מערכת בחוג סגור", en: "Closed-loop System", def: "", sub: "בקרה ומכטרוניקה", subsub: "" },

  // Control -> מערכות בקרה -> בקר PID
  { name: "הגבר פרופורציונלי", en: "Proportional Gain", symbol: "Kp", def: "", sub: "בקרה ומכטרוניקה", subsub: "מערכות בקרה - בקר PID" },
  { name: "רכיב אינטגרלי", en: "Integral Term", symbol: "Ki", def: "", sub: "בקרה ומכטרוניקה", subsub: "מערכות בקרה - בקר PID" },
  { name: "רכיב נגזר", en: "Derivative Term", symbol: "Kd", def: "", sub: "בקרה ומכטרוניקה", subsub: "מערכות בקרה - בקר PID" },
  { name: "תגובת יתר", en: "Overshoot", def: "", sub: "בקרה ומכטרוניקה", subsub: "מערכות בקרה - בקר PID" },
  { name: "זמן התייצבות", en: "Settling Time", def: "", sub: "בקרה ומכטרוניקה", subsub: "מערכות בקרה - בקר PID" },
  { name: "שגיאת מצב מתמיד", en: "Steady-state Error", def: "", sub: "בקרה ומכטרוניקה", subsub: "מערכות בקרה - בקר PID" },
  { name: "תגובת PID", en: "PID Response", def: "", image: "PID_Response.png", sub: "בקרה ומכטרוניקה", subsub: "מערכות בקרה - בקר PID" },

  // Control -> בקרת תנועה -> מנוע סרוו
  { name: "מנוע סרוו", en: "Servo Motor", def: "", sub: "בקרה ומכטרוניקה", subsub: "בקרת תנועה - מנוע סרוו" },
  { name: "מומנט החזקה", en: "", def: "", sub: "בקרה ומכטרוניקה", subsub: "בקרת תנועה - מנוע סרוו" },
  { name: "פרופיל תנועה", en: "", def: "", sub: "בקרה ומכטרוניקה", subsub: "בקרת תנועה - מנוע סרוו" },
  { name: "תאוצה זוויתית", en: "", def: "", sub: "בקרה ומכטרוניקה", subsub: "בקרת תנועה - מנוע סרוו" },

  // Control -> בקרת תנועה -> משוב מיקום
  { name: "אנקודר", en: "Encoder", def: "", sub: "בקרה ומכטרוניקה", subsub: "בקרת תנועה - משוב מיקום" },
  { name: "רזולוציית אנקודר", en: "", def: "", sub: "בקרה ומכטרוניקה", subsub: "בקרת תנועה - משוב מיקום" },
  { name: "שגיאת מיקום", en: "", def: "", sub: "בקרה ומכטרוניקה", subsub: "בקרת תנועה - משוב מיקום" },
  { name: "חוג משוב", en: "", def: "", sub: "בקרה ומכטרוניקה", subsub: "בקרת תנועה - משוב מיקום" }
];

async function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function run() {
  // Server is already running

  await delay(5000);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.evaluate(() => openAdmin('super', '9999'));
  await delay(1000);

  // Switch to Domains Tab
  await page.click('nav.admin-tabs button[data-admin-tab="domains"]');
  await delay(500);

  // Add Main Domain
  console.log("Creating domain:", DOMAIN);
  await page.click('#clearDomainBtn');
  await delay(300);
  await page.fill('#domainName', DOMAIN);
  await page.fill('#domainNameEn', "Mechanical Engineering");
  await page.fill('#domainPrefix', "ME");
  
  // Create all subtopics in the domain
  for (let i = 0; i < subtopicsData.length; i++) {
    const st = subtopicsData[i];
    await page.click('#addSubtopicBtn');
    await delay(300);
    const rows = await page.$$('.subtopic-editor-row');
    const currentRow = rows[rows.length - 1];
    
    const subtopicInput = await currentRow.$('input[data-subtopic-name]');
    await subtopicInput.fill(st.name);

    for (let j = 0; j < st.subsubtopics.length; j++) {
      const addSubSubBtn = await currentRow.$('button[data-add-subsubtopic]');
      await addSubSubBtn.click();
      await delay(100);
      const subsubRows = await currentRow.$$('.subsubtopic-editor-rows input[data-subsubtopic-name]');
      await subsubRows[subsubRows.length - 1].fill(st.subsubtopics[j]);
    }
  }
  
  await page.click('#saveDomainBtn');
  // Wait for the domain to be saved and available in terms dropdown
  await delay(2000);

  // Switch to Terms tab
  await page.click('nav.admin-tabs button[data-admin-tab="terms"]');
  await delay(500);

  const domainSelectOptions = await page.locator('#editDomain').innerText();
  if (!domainSelectOptions.includes(DOMAIN)) {
    console.error("Domain not found in term editor dropdown");
  }

  // Ensure correct domain is selected
  await page.selectOption('#editDomain', { label: DOMAIN });
  await delay(1000); // Wait for subtopics to load

  for (let term of termsData) {
    console.log("Creating term:", term.name);
    await page.click('#clearTermBtn');
  await delay(300);
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
    
    await page.fill('#editName', term.name);
    if (term.en) await page.fill('#editNameEn', term.en);
    if (term.symbol) await page.fill('#editSymbol', term.symbol);
    if (term.unit) await page.fill('#editUnits', term.unit);
    if (term.formula) await page.fill('#editFormula', term.formula);
    
    const defText = term.def || "[תוכן הדגמת QA — הנדסת מכונות] " + term.name + " " + (term.en || "");
    await page.locator('#editDefinition').fill(defText);

    // Select subtopic
    if (term.sub === "direct") {
      await page.selectOption('#editSubtopic', 'direct');
    } else {
      // Find the right option text
      const selectHTML = await page.$eval('#editSubtopic', el => el.innerHTML);
      // We need to pick the option that represents subtopic or subsubtopic
      // If term.subsub is empty, we just pick the subtopic
      let matchedValue = "direct";
      const options = await page.$$eval('#editSubtopic option', opts => opts.map(o => ({ v: o.value, t: o.textContent })));
      for (const opt of options) {
        if (term.subsub) {
          if (opt.t.includes(`↳ תת־תת־תחום: ${term.subsub}`)) {
            matchedValue = opt.v; break;
          }
        } else {
          if (opt.t.includes(term.sub) || opt.t === `תת־תחום: ${term.sub}`) {
            matchedValue = opt.v; break;
          }
        }
      }
      await page.selectOption('#editSubtopic', matchedValue);
    }

    if (term.image) {
      const imgPath = path.resolve(__dirname, 'test-images', term.image);
      await page.setInputFiles('#editImageFile', imgPath);
      await delay(500);
    }

    await page.click('#saveTermBtn');
    await delay(1500);
  }

  // --- CRUD TESTS ---
  console.log("Starting CRUD Tests");
  await page.click('#clearTermBtn');
  await delay(300);
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await page.fill('#editName', "מושג בדיקת מחיקה");
  await page.locator('#editDefinition').fill("temporary definition");
  
  // Set to תכן מכני (Subtopic only)
  let crudVal = "direct";
  let options = await page.$$eval('#editSubtopic option', opts => opts.map(o => ({ v: o.value, t: o.textContent })));
  for (const opt of options) if (opt.t === "תת־תחום: תכן מכני") crudVal = opt.v;
  await page.selectOption('#editSubtopic', crudVal);
  await page.click('#saveTermBtn');
  await delay(1500);

  // Close and reopen admin to ensure it exists
  await page.click('#closeAdminBtn');
  await delay(500);
  await page.evaluate(() => openAdmin('super', '9999'));
  await delay(1000);

  // Search and Edit
  await page.fill('#adminSearchInput', "מושג בדיקת מחיקה");
  await delay(500);
  await page.click('.record-item:has-text("מושג בדיקת מחיקה")');
  await delay(500);

  // Change name and location
  await page.fill('#editName', "מושג בדיקת מחיקה — נערך");
  crudVal = "direct";
  options = await page.$$eval('#editSubtopic option', opts => opts.map(o => ({ v: o.value, t: o.textContent })));
  for (const opt of options) if (opt.t.includes("↳ תת־תת־תחום: אלמנטים מכניים - חיבורים מכניים")) crudVal = opt.v;
  await page.selectOption('#editSubtopic', crudVal);
  await page.click('#saveTermBtn');
  await delay(1500);

  // Delete
  page.on('dialog', dialog => dialog.accept());
  
  await page.fill('#adminSearchInput', "מושג בדיקת מחיקה");
  await delay(500);
  await page.click('.record-item:has-text("מושג בדיקת מחיקה")');
  await delay(500);
  
  await page.click('#deleteCurrentTermBtn');
  await delay(1000);
  
  console.log("Finished script successfully.");
  await browser.close();
}

run().catch(console.error);

