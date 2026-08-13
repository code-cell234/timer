const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy static assets
['styles', 'js', 'icons'].forEach(folder => {
  const folderPath = path.join(srcDir, folder);
  if (fs.existsSync(folderPath)) {
    copyFolderRecursive(folderPath, path.join(destDir, folder));
  }
});

['index.html', 'manifest.json', 'sw.js'].forEach(file => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, path.join(destDir, file));
  }
});

console.log('✓ Assets successfully prepared in www/');
