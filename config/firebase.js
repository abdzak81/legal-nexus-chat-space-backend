const admin = require('firebase-admin');
const path = require('path');

// Check if service account key file exists
const serviceAccountPath = path.join(__dirname, '..', 'moci-legal-firebase-adminsdk-fbsvc-61056ae799.json');
let serviceAccount;

try {
  // Try to load from file first (for local development)
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  // If file doesn't exist, try environment variables
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: "googleapis.com"
    };
  } else {
    console.warn('⚠️  Firebase credentials not found. Please either:');
    console.warn('1. Add Firebase credentials file (for local development)');
    console.warn('2. Set environment variables (for production)');
    console.warn('');
    console.warn('Required environment variables:');
    console.warn('- FIREBASE_PROJECT_ID');
    console.warn('- FIREBASE_PRIVATE_KEY');
    console.warn('- FIREBASE_CLIENT_EMAIL');
    console.warn('');
    console.warn('For now, creating a mock configuration...');
    
    // Create a mock service account for development when no credentials are available
    serviceAccount = null;
  }
}

// Initialize Firebase Admin SDK
let db, bucket;

try {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'moci-legal.firebasestorage.app'
    });
    
    db = admin.firestore();
    bucket = admin.storage().bucket();
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    // Mock Firebase for when credentials are not available
    console.warn('🚫 Using mock Firebase configuration. Please set up real Firebase credentials.');
    
    db = {
      collection: () => ({
        orderBy: () => ({
          get: () => Promise.resolve({ empty: true, forEach: () => {} })
        }),
        doc: (id) => ({
          set: (data) => {
            console.log(`Mock: Would save to Firestore doc ${id}:`, data);
            return Promise.resolve();
          },
          update: (data) => {
            console.log(`Mock: Would update Firestore doc ${id}:`, data);
            return Promise.resolve();
          },
          get: () => Promise.resolve({ 
            exists: false, 
            id: id || 'mock-id',
            data: () => ({}) 
          })
        })
      })
    };
    
    bucket = {
      file: (filename) => ({
        save: (buffer) => {
          console.log(`Mock: Would upload file ${filename} (${buffer.length} bytes)`);
          return Promise.resolve();
        },
        makePublic: () => {
          console.log(`Mock: Would make file ${filename} public`);
          return Promise.resolve();
        },
        exists: () => Promise.resolve([false]),
        download: () => Promise.resolve([Buffer.from('mock-pdf-data')]),
        delete: () => {
          console.log(`Mock: Would delete file ${filename}`);
          return Promise.resolve();
        }
      }),
      name: 'moci-legal.firebasestorage.app'
    };
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

module.exports = {
  admin,
  db,
  bucket
};