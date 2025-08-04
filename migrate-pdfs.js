const cloudinaryService = require('./services/cloudinaryService');
const fs = require('fs');
const path = require('path');

async function migratePDFsToCloudinary() {
  console.log('📁 Starting PDF migration to Cloudinary...');

  try {
    // First test Cloudinary connection
    const isConnected = await cloudinaryService.testConnection();
    if (!isConnected) {
      console.log('❌ Cloudinary connection failed. Please check your configuration.');
      console.log('');
      console.log('To set up Cloudinary:');
      console.log('1. Sign up at https://cloudinary.com (free account)');
      console.log('2. Get your Cloud Name, API Key, and API Secret from your dashboard');
      console.log('3. Set environment variables or update the service configuration');
      return;
    }

    const pdfsDir = path.join(__dirname, 'pdfs');
    if (!fs.existsSync(pdfsDir)) {
      console.log('❌ PDFs directory not found');
      return;
    }

    const files = fs.readdirSync(pdfsDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('📁 No PDF files found to migrate');
      return;
    }

    console.log(`📄 Found ${pdfFiles.length} PDF files to migrate`);
    
    for (const filename of pdfFiles) {
      const filePath = path.join(pdfsDir, filename);
      const fileBuffer = fs.readFileSync(filePath);
      const fileSizeKB = Math.round(fileBuffer.length / 1024);
      
      try {
        console.log(`⬆️  Uploading ${filename} (${fileSizeKB}KB)...`);
        const result = await cloudinaryService.uploadPDF(fileBuffer, filename);
        console.log(`✅ Successfully uploaded: ${filename}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Size: ${Math.round(result.bytes / 1024)}KB`);
      } catch (error) {
        console.error(`❌ Failed to upload ${filename}:`, error.message);
      }
    }

    console.log('🎉 PDF migration to Cloudinary completed!');
    console.log('');
    console.log('Your files are now accessible via:');
    console.log('- Cloudinary URLs (primary)');
    console.log('- Local storage (backup)');

  } catch (error) {
    console.error('❌ PDF migration failed:', error);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  migratePDFsToCloudinary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('PDF migration error:', error);
      process.exit(1);
    });
}

module.exports = { migratePDFsToCloudinary };