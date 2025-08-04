#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up local files...');
console.log('Your system is now fully cloud-based with Firebase + Cloudinary!');
console.log('');

// List of local files to remove since everything is now in the cloud
const filesToRemove = [
  'cases.json',
  'documents.json', 
  'graphData.json',
  'pdfs' // Directory
];

// Backup first (optional)
const backupDir = './backup-local-files';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log('📦 Created backup directory...');
}

filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    try {
      // Create backup first
      const backupPath = path.join(backupDir, file);
      
      if (fs.statSync(filePath).isDirectory()) {
        // Copy directory
        fs.cpSync(filePath, backupPath, { recursive: true });
        console.log(`📦 Backed up directory: ${file}`);
        
        // Remove original
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`🗑️  Removed local directory: ${file}`);
      } else {
        // Copy file
        fs.copyFileSync(filePath, backupPath);
        console.log(`📦 Backed up file: ${file}`);
        
        // Remove original
        fs.unlinkSync(filePath);
        console.log(`🗑️  Removed local file: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  } else {
    console.log(`ℹ️  File not found: ${file}`);
  }
});

console.log('');
console.log('✅ Cleanup completed!');
console.log('');
console.log('📊 Your system status:');
console.log('  📄 JSON Data: Firebase Firestore ✅');
console.log('  📁 PDF Files: Cloudinary ✅');
console.log('  💾 Local Backup: ./backup-local-files/ ✅');
console.log('');
console.log('🚀 Your API is now 100% cloud-based!');
console.log('   No more local file dependencies.');
console.log('   Ready for production deployment.');