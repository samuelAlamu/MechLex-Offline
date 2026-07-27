const fs = require('fs');
const path = require('path');
const docx = require('docx');

const rootDir = 'C:\\\\Users\\\\samue\\\\Documents\\\\Projects\\\\Active\\\\MechLex_Visual_Admin_Fork';
const outputFolder = path.join(rootDir, 'גיבוי וורד - MechLex_Visual_Admin_Fork');

async function convertToDocx(sourcePath, destPath) {
  const content = fs.readFileSync(sourcePath, 'utf8');
  const doc = new docx.Document({
    sections: [
      {
        properties: {},
        children: content.split('\\n').map(line => 
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: line,
                font: 'Courier New',
                size: 20
              })
            ]
          })
        )
      }
    ]
  });
  
  const buffer = await docx.Packer.toBuffer(doc);
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(destPath + '.docx', buffer);
}

async function run() {
  const changedFiles = [
    'core/persistence.js',
    'core/start-local-server.ps1',
    'app.js',
    'index.html'
  ];

  for (const file of changedFiles) {
    const src = path.join(rootDir, file);
    const dst = path.join(outputFolder, file);
    console.log(`Backing up ${file}...`);
    await convertToDocx(src, dst);
  }

  // Also remove images/catalog.js.docx since it was deleted
  const deletedFile = path.join(outputFolder, 'images', 'catalog.js.docx');
  if (fs.existsSync(deletedFile)) {
    fs.unlinkSync(deletedFile);
    console.log('Deleted catalog.js.docx');
  }

  console.log('Changed files backed up to Word successfully.');
}

run().catch(console.error);
