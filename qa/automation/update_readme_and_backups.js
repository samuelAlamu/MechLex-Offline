const fs = require('fs');
const path = require('path');
const docx = require('docx');

const rootDir = 'C:\\Users\\samue\\Documents\\Projects\\Active\\MechLex_Visual_Admin_Fork';
const outputFolder = path.join(rootDir, 'Word_Backup_Full');
const sharedDataStatePath = 'C:\\Users\\samue\\Documents\\Projects\\Active\\MechLex_Shared_Data_Simulation\\state.json';
const backupsDir = path.join(rootDir, 'backups');

// 1. Copy current state.json to backups/full-admin-backup-latest.json
if (fs.existsSync(sharedDataStatePath)) {
  fs.copyFileSync(sharedDataStatePath, path.join(backupsDir, 'full-admin-backup-latest.json'));
}

async function convertToDocx(sourcePath, destPath) {
  const content = fs.readFileSync(sourcePath, 'utf8');
  const doc = new docx.Document({
    sections: [
      {
        properties: {},
        children: content.split('\n').map(line => 
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
  fs.writeFileSync(destPath + '.docx', buffer);
}

async function run() {
  // Convert README_HE.txt
  const readmePath = path.join(rootDir, 'README_HE.txt');
  if (fs.existsSync(readmePath)) {
    await convertToDocx(readmePath, path.join(outputFolder, 'README_HE.txt'));
  }

  // Handle backups folder
  const backupOutDir = path.join(outputFolder, 'backups');
  if (!fs.existsSync(backupOutDir)) {
    fs.mkdirSync(backupOutDir);
  }

  const backupFiles = fs.readdirSync(backupsDir);
  for (const file of backupFiles) {
    const srcPath = path.join(backupsDir, file);
    if (file.endsWith('.json') || file.endsWith('.txt') || file.endsWith('.md')) {
      await convertToDocx(srcPath, path.join(backupOutDir, file));
    } else {
      fs.copyFileSync(srcPath, path.join(backupOutDir, file));
    }
  }

  console.log('Update of README_HE and backups complete!');
}

run().catch(console.error);
