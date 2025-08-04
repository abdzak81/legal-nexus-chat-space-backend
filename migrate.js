const firebaseService = require('./services/firebaseService');
const fs = require('fs');
const path = require('path');

async function migrateDataToFirebase() {
  console.log('🔄 Starting migration to Firebase...');

  try {
    // 1. Migrate cases.json
    console.log('📄 Migrating cases.json...');
    const casesPath = path.join(__dirname, 'cases.json');
    if (fs.existsSync(casesPath)) {
      const casesData = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
      if (Array.isArray(casesData) && casesData.length > 0) {
        for (const caseItem of casesData) {
          await firebaseService.saveCase(caseItem);
          console.log(`✅ Migrated case: ${caseItem.id || 'Unknown ID'}`);
        }
      }
    }

    // 2. Migrate documents.json
    console.log('📄 Migrating documents.json...');
    const docsPath = path.join(__dirname, 'documents.json');
    if (fs.existsSync(docsPath)) {
      const docsData = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
      if (Array.isArray(docsData) && docsData.length > 0) {
        for (const doc of docsData) {
          await firebaseService.saveDocumentMetadata(doc);
          console.log(`✅ Migrated document: ${doc.filename || 'Unknown filename'}`);
        }
      }
    }

    // 3. Migrate graphData.json
    console.log('📄 Migrating graphData.json...');
    const graphPath = path.join(__dirname, 'graphData.json');
    if (fs.existsSync(graphPath)) {
      const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
      await firebaseService.saveGraphData(graphData);
      console.log('✅ Migrated graph data');
    }

    // 4. Migrate PDF files
    console.log('📁 Migrating PDF files...');
    const pdfsDir = path.join(__dirname, 'pdfs');
    if (fs.existsSync(pdfsDir)) {
      const files = fs.readdirSync(pdfsDir);
      const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
      
      for (const filename of pdfFiles) {
        const filePath = path.join(pdfsDir, filename);
        const fileBuffer = fs.readFileSync(filePath);
        
        try {
          await firebaseService.uploadPDF(fileBuffer, filename);
          console.log(`✅ Migrated PDF: ${filename}`);
        } catch (error) {
          console.error(`❌ Failed to migrate PDF ${filename}:`, error.message);
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('⚠️  IMPORTANT: After verifying the migration, you can:');
    console.log('1. Backup your local files (cases.json, documents.json, graphData.json, pdfs/)');
    console.log('2. Delete the local files once you confirm everything works');
    console.log('3. Add your Firebase service account key file');
    console.log('4. Update the Firebase config with your project details');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateDataToFirebase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { migrateDataToFirebase };