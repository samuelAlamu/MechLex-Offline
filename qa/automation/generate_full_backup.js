const fs = require('fs');
const path = require('path');
const docx = require('docx');

const rootDir = 'C:\\Users\\samue\\Documents\\Projects\\Active\\MechLex_Visual_Admin_Fork';
const sharedDir = 'C:\\Users\\samue\\Documents\\Projects\\Active\\MechLex_Shared_Data_Simulation';
const outputFolder = path.join(rootDir, 'Word_Backup_Full');

// Create docx from text
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

// Check if a file should be converted
const textExtensions = ['.js', '.html', '.css', '.json', '.txt', '.md', '.bat', '.ps1'];
function isTextFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return textExtensions.includes(ext);
}

// Deep copy
async function copyFolderRecursive(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      await copyFolderRecursive(sourcePath, targetPath);
    } else {
      if (isTextFile(file)) {
        await convertToDocx(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

async function run() {
  if (fs.existsSync(outputFolder)) {
    fs.rmSync(outputFolder, { recursive: true, force: true });
  }
  fs.mkdirSync(outputFolder);

  // Folders to copy
  const foldersToCopy = ['backups', 'core', 'data', 'images', 'tests'];
  for (const folder of foldersToCopy) {
    const src = path.join(rootDir, folder);
    const dst = path.join(outputFolder, folder);
    if (fs.existsSync(src)) {
      await copyFolderRecursive(src, dst);
    }
  }

  // Files in root
  const rootFiles = fs.readdirSync(rootDir);
  for (const file of rootFiles) {
    const sourcePath = path.join(rootDir, file);
    if (fs.lstatSync(sourcePath).isFile()) {
      if (isTextFile(file)) {
        await convertToDocx(sourcePath, path.join(outputFolder, file));
      } else {
        fs.copyFileSync(sourcePath, path.join(outputFolder, file));
      }
    }
  }

  // Also include the shared data state.json inside a 'MechLex_Shared_Data_Simulation' folder
  const sharedDataDst = path.join(outputFolder, 'MechLex_Shared_Data_Simulation');
  fs.mkdirSync(sharedDataDst);
  await convertToDocx(path.join(sharedDir, 'state.json'), path.join(sharedDataDst, 'state.json'));

  console.log(`Backup completed successfully at ${outputFolder}`);
}

run().catch(console.error);
