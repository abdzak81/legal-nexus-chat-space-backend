const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
// You'll need to sign up at https://cloudinary.com and get these values
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfmmkbsez',
  api_key: process.env.CLOUDINARY_API_KEY || '613551691655995',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'wyRqdC1pZlQquui_PQzGOk0bFIA'
});

class CloudinaryService {
  
  // Upload PDF file to Cloudinary
  async uploadPDF(fileBuffer, filename) {
    try {
      console.log(`📤 Uploading ${filename} to Cloudinary...`);
      
      // Convert buffer to base64 for Cloudinary upload
      const base64File = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;
      
      // Use a cleaner public_id based on filename
      const cleanFilename = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      
      const result = await cloudinary.uploader.upload(base64File, {
        resource_type: 'auto',
        folder: 'pdfs',
        public_id: cleanFilename,
        use_filename: false, // Don't use original filename to avoid conflicts
        unique_filename: true, // Allow Cloudinary to make it unique if needed
        overwrite: false // Don't overwrite existing files
      });
      
      console.log(`✅ Successfully uploaded ${filename} to Cloudinary`);
      console.log(`📋 Public ID: ${result.public_id}`);
      
      return {
        filename,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        bytes: result.bytes
      };
      
    } catch (error) {
      console.error(`❌ Error uploading ${filename} to Cloudinary:`, error.message);
      throw error;
    }
  }
  
  // Get PDF as base64 from Cloudinary
  async getPDFAsBase64(filename) {
    try {
      console.log(`🔍 Looking for file: ${filename}`);
      
      // First, try to find the file by searching with the exact filename
      let publicId = `pdfs/${filename.replace(/\.[^/.]+$/, "")}`;
      
      // Get the file URL
      let url = cloudinary.url(publicId, {
        resource_type: 'auto',
        format: 'pdf'
      });
      
      console.log(`🔍 Trying URL: ${url}`);
      
      // Fetch the file from Cloudinary
      let response = await fetch(url);
      
      // If not found, try to search for the file in the resources
      if (!response.ok) {
        console.log(`📋 File not found with direct access, searching in resources...`);
        
        try {
          const searchResult = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'pdfs/',
            resource_type: 'auto',
            max_results: 100
          });
          
          // Look for the file by original filename or public_id
          const foundResource = searchResult.resources.find(resource => {
            const resourceFilename = `${resource.public_id.split('/').pop()}.pdf`;
            return resourceFilename === filename || 
                   resource.public_id.includes(filename.replace(/\.[^/.]+$/, "")) ||
                   resource.original_filename === filename;
          });
          
          if (foundResource) {
            console.log(`✅ Found file with public_id: ${foundResource.public_id}`);
            url = foundResource.secure_url;
            response = await fetch(url);
          } else {
            throw new Error(`File ${filename} not found in Cloudinary resources`);
          }
        } catch (searchError) {
          console.error(`❌ Error searching for file: ${searchError.message}`);
          throw new Error('File not found');
        }
      }
      
      if (!response.ok) {
        throw new Error('File not found');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      return {
        filename,
        base64,
        mimeType: 'application/pdf'
      };
      
    } catch (error) {
      console.error(`❌ Error getting ${filename} from Cloudinary:`, error.message);
      throw error;
    }
  }
  
  // Delete PDF from Cloudinary
  async deletePDF(filename) {
    try {
      const publicId = `pdfs/${filename.replace(/\.[^/.]+$/, "")}`;
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'auto'
      });
      
      console.log(`🗑️ Deleted ${filename} from Cloudinary`);
      return { message: `${filename} deleted successfully`, result };
      
    } catch (error) {
      console.error(`❌ Error deleting ${filename} from Cloudinary:`, error.message);
      throw error;
    }
  }
  
  // List all files in the pdfs folder
  async listPDFs() {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'pdfs/',
        resource_type: 'auto',
        max_results: 100
      });
      
      return result.resources.map(resource => ({
        filename: `${resource.public_id.split('/').pop()}.pdf`,
        url: resource.secure_url,
        publicId: resource.public_id,
        bytes: resource.bytes,
        createdAt: resource.created_at
      }));
      
    } catch (error) {
      console.error('❌ Error listing PDFs from Cloudinary:', error.message);
      throw error;
    }
  }
  
  // Check if Cloudinary is properly configured
  async testConnection() {
    try {
      const result = await cloudinary.api.ping();
      console.log('✅ Cloudinary connection successful');
      return true;
    } catch (error) {
      console.error('❌ Cloudinary connection failed:', error.message);
      return false;
    }
  }
}

module.exports = new CloudinaryService();