const fs = require('fs');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

function generateTerm(code, name, subtopic, subSubtopic, domainName) {
  return {
    id: uuidv4(),
    code: code,
    name: name,
    nameEn: '',
    subtopic: subtopic || '',
    subSubtopic: subSubtopic || '',
    aliases: [],
    symbol: '',
    units: '',
    short: `[QA Demo] ${name} - ${domainName}`,
    definition: `[QA Demo] Detailed definition for ${name} in ${domainName}.`,
    definitionHtml: `[QA Demo] Detailed definition for ${name} in ${domainName}.`,
    why: '',
    formula: '',
    formulaNote: '',
    variables: [],
    uses: [],
    cautions: [],
    standards: [],
    manufacturing: '',
    inspection: '',
    tags: [],
    related: [],
    example: { title: '', given: '', solution: '', result: '' },
    imageName: name,
    imageData: '',
    visualTitle: name,
    visualDescription: '',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0]
  };
}

const sharedDir = '../../../MechLex_Shared_Data_Simulation';
const stateFile = `${sharedDir}/state.json`;

let raw = fs.readFileSync(stateFile, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const stateObj = JSON.parse(raw);

const matDomain = {
  id: "domain-materials",
  name: "הנדסת חומרים",
  nameEn: "Materials Engineering",
  prefix: "MAT",
  icon: "🔬",
  color: "#eab308",
  description: "תחום העוסק בתכונות של חומרים ויישומם בהנדסה.",
  items: [
    // Direct terms (no subtopic)
    generateTerm("MAT-001", "מבנה גבישי", "", "", "הנדסת חומרים"),
    generateTerm("MAT-002", "קשר מתכתי", "", "", "הנדסת חומרים"),
    // Subtopic with terms
    generateTerm("MAT-003", "קורוזיה אחידה", "קורוזיה", "", "הנדסת חומרים"),
    generateTerm("MAT-004", "קורוזיה גלוונית", "קורוזיה", "", "הנדסת חומרים"),
    // Subtopic -> SubSubtopic -> Terms
    generateTerm("MAT-005", "טיפול תרמי בהרפיה", "טיפולים תרמיים", "הרפיה", "הנדסת חומרים"),
    generateTerm("MAT-006", "טיפול תרמי בחיסום", "טיפולים תרמיים", "חיסום", "הנדסת חומרים"),
    generateTerm("MAT-007", "ציפוי אנודייז", "טיפולי פני שטח", "ציפויים אלקטרוכימיים", "הנדסת חומרים"),
    generateTerm("MAT-008", "ציפוי כרום קשה", "טיפולי פני שטח", "ציפויים אלקטרוכימיים", "הנדסת חומרים")
  ]
};

const iemDomain = {
  id: "domain-iem",
  name: "הנדסת תעשייה וניהול",
  nameEn: "Industrial Engineering",
  prefix: "IEM",
  icon: "🏭",
  color: "#10b981",
  description: "תחום העוסק בייעול תהליכים, מערכות וארגונים.",
  items: [
    // Direct terms
    generateTerm("IEM-001", "חקר ביצועים", "", "", "הנדסת תעשייה וניהול"),
    generateTerm("IEM-002", "שרשרת אספקה", "", "", "הנדסת תעשייה וניהול"),
    // Subtopic with terms
    generateTerm("IEM-003", "בקרת איכות סטטיסטית", "ניהול איכות", "", "הנדסת תעשייה וניהול"),
    // Subtopic -> SubSubtopic -> Terms
    generateTerm("IEM-004", "תזמון פרויקטים (PERT)", "ניהול פרויקטים", "תזמון ובקרה", "הנדסת תעשייה וניהול"),
    generateTerm("IEM-005", "נתיב קריטי (CPM)", "ניהול פרויקטים", "תזמון ובקרה", "הנדסת תעשייה וניהול"),
    generateTerm("IEM-006", "ניהול סיכונים כמותי", "ניהול פרויקטים", "ניהול סיכונים", "הנדסת תעשייה וניהול")
  ]
};

stateObj.shared.data.push(matDomain);
stateObj.shared.data.push(iemDomain);

stateObj.revision += 1;
stateObj.updatedAt = new Date().toISOString();

fs.writeFileSync(stateFile, JSON.stringify(stateObj, null, 2), 'utf8');
console.log("Added new domains and terms.");
