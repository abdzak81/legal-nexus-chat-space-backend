# Firebase Migration Setup Guide

## Prerequisites
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database and Cloud Storage
3. Generate a service account key

## Setup Steps

### 1. Firebase Console Setup
1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the downloaded JSON file as `serviceAccountKey.json` in your project root
4. **Important**: Add `serviceAccountKey.json` to your `.gitignore` file

### 2. Update Firebase Configuration
Edit `config/firebase.js` and replace:
- `your-project-id.appspot.com` with your actual Firebase storage bucket URL
- You can find this in Firebase Console > Storage

### 3. Environment Variables (Optional but Recommended)
Instead of using the service account JSON file directly, you can use environment variables:

```javascript
// Alternative config using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});
```

### 4. Firestore Security Rules
Set up basic security rules in Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    // Adjust according to your authentication needs
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 5. Cloud Storage Security Rules
Set up storage rules in Firebase Console > Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## Migration Process

### 1. Run Migration Script
```bash
node migrate.js
```

### 2. Test the Migration
Start your server and test the endpoints:
```bash
npm start
```

Test these endpoints:
- GET `/api/cases` - Should return cases from Firestore
- GET `/api/documents` - Should return documents from Firestore
- GET `/api/graph` - Should return graph data from Firestore
- POST `/api/upload` - Upload a test PDF to Firebase Storage
- GET `/api/documents/filename.pdf` - Get PDF as base64 from Firebase Storage

### 3. Verify Data Migration
Check your Firebase Console:
- **Firestore**: Should see `cases`, `documents`, and `graphData` collections
- **Storage**: Should see uploaded PDFs in the `pdfs/` folder

## Important Notes

⚠️ **Security**: The current setup allows unrestricted access. In production, implement proper authentication and security rules.

⚠️ **Backup**: Before running migration, backup your local files (`cases.json`, `documents.json`, `graphData.json`, `pdfs/` folder).

⚠️ **Cost**: Firebase has usage limits. Monitor your usage in the Firebase Console.

## Troubleshooting

### Common Issues:
1. **Authentication Error**: Ensure service account key is valid and has proper permissions
2. **Storage Bucket Error**: Verify the bucket name in your config matches your Firebase project
3. **Permission Denied**: Check Firestore and Storage security rules

### Testing Individual Components:
```javascript
// Test Firestore connection
const firebaseService = require('./services/firebaseService');
firebaseService.getCases().then(console.log).catch(console.error);

// Test Storage connection
// Upload a test file through the API endpoint
```