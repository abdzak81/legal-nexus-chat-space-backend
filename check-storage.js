const { bucket, admin } = require('./config/firebase');

async function checkFirebaseStorageSetup() {
  console.log('🔍 Checking Firebase Storage setup...');
  
  try {
    // Check if bucket exists
    const [exists] = await bucket.exists();
    
    if (exists) {
      console.log('✅ Firebase Storage bucket exists and is accessible');
      
      // List some files to test access
      const [files] = await bucket.getFiles({ maxResults: 5 });
      console.log(`📁 Found ${files.length} files in bucket`);
      
      return true;
    } else {
      console.log('❌ Firebase Storage bucket does not exist');
      console.log('');
      console.log('To fix this:');
      console.log('1. Go to https://console.firebase.google.com/project/moci-legal/storage');
      console.log('2. Click "Get started" to enable Firebase Storage');
      console.log('3. Choose "Start in test mode" for security rules');
      console.log('4. Select a location (preferably same as your Firestore)');
      console.log('');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking Firebase Storage:', error.message);
    
    if (error.message.includes('bucket does not exist')) {
      console.log('');
      console.log('💡 Solution: Enable Firebase Storage in your Firebase Console');
      console.log('   Visit: https://console.firebase.google.com/project/moci-legal/storage');
    }
    
    return false;
  }
}

if (require.main === module) {
  checkFirebaseStorageSetup()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkFirebaseStorageSetup };