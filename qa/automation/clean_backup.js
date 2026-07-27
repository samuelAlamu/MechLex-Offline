const fs = require('fs');
const path = require('path');

const backupFolder = 'C:\\Users\\samue\\Documents\\Projects\\Active\\MechLex_Visual_Admin_Fork\\Word_Backup_Full';

const filesToKeep = [
  'index.html.docx',
  'app.js.docx',
  'style.css.docx',
  'manifest.json.docx',
  'START_MECHLEX.bat.docx',
  'MechLex_Shared_Data_Simulation',
  'core',
  'data',
  'images'
];

function cleanFolder() {
  const items = fs.readdirSync(backupFolder);
  for (const item of items) {
    if (!filesToKeep.includes(item)) {
      const fullPath = path.join(backupFolder, item);
      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`Deleted directory: ${item}`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`Deleted file: ${item}`);
      }
    }
  }
}

cleanFolder();
console.log('Cleanup complete!');
