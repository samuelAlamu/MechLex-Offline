const fs = require('fs');
const path = require('path');
const docx = require('docx');

async function createDocx(filepath, outputFolder) {
  if (!fs.existsSync(filepath)) {
    console.log(`Skipping ${filepath} - not found`);
    return;
  }
  
  const content = fs.readFileSync(filepath, 'utf8');
  const filename = path.basename(filepath);
  
  const doc = new docx.Document({
    sections: [
      {
        properties: {},
        children: [
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: content,
                font: 'Courier New',
                size: 20
              })
            ]
          })
        ]
      }
    ]
  });
  
  const buffer = await docx.Packer.toBuffer(doc);
  const outputPath = path.join(outputFolder, `${filename}.docx`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
}

async function run() {
  const rootDir = 'C:\\Users\\samue\\Documents\\Projects\\Active\\MechLex_Visual_Admin_Fork';
  const sharedDir = 'C:\\Users\\samue\\Documents\\Projects\\Active\\MechLex_Shared_Data_Simulation';
  const outputFolder = path.join(rootDir, 'Word_Backup');
  
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }
  
  const files = [
    path.join(rootDir, 'index.html'),
    path.join(rootDir, 'app.js'),
    path.join(rootDir, 'style.css'),
    path.join(rootDir, 'core', 'shared-sync.js'),
    path.join(rootDir, 'core', 'start-local-server.ps1'),
    path.join(rootDir, 'core', 'recovery-wizard.ps1'),
    path.join(rootDir, 'core', 'integrity.js'),
    path.join(rootDir, 'core', 'persistence.js'),
    path.join(rootDir, 'core', 'inline-editor.js'),
    path.join(rootDir, 'core', 'boot.js'),
    path.join(rootDir, 'START_MECHLEX.bat'),
    path.join(sharedDir, 'state.json')
  ];
  
  for (const file of files) {
    await createDocx(file, outputFolder);
  }
}

run().catch(console.error);
