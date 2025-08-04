# Cloudinary Setup Guide

## Why Cloudinary?
- ✅ **25 GB storage + 25 GB bandwidth/month** completely FREE
- ✅ No credit card required to start
- ✅ Perfect for PDF documents and images
- ✅ Global CDN for fast file access
- ✅ Automatic optimization and transformations

## Setup Steps

### 1. Create Free Cloudinary Account
1. Go to https://cloudinary.com
2. Click "Sign up for free"
3. Fill in your details (no credit card needed)
4. Verify your email

### 2. Get Your Credentials
1. After login, go to your **Dashboard**
2. You'll see your credentials:
   - **Cloud Name**: (e.g., `dxxxxx`)
   - **API Key**: (numbers like `123456789012345`)
   - **API Secret**: (letters/numbers like `abcdefg...`)

### 3. Configure Your App
Option A: **Environment Variables** (Recommended)
```bash
# Create .env file in your project root
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret
```

Option B: **Direct Configuration**
Edit `services/cloudinaryService.js` and replace the placeholder values:
```javascript
cloudinary.config({
  cloud_name: 'your-actual-cloud-name',
  api_key: 'your-actual-api-key',
  api_secret: 'your-actual-api-secret'
});
```

### 4. Test the Setup
Run the migration script to upload your existing PDFs:
```bash
node migrate-pdfs.js
```

### 5. Test File Upload
Start your server and test uploading a new PDF through your API.

## Current Setup Benefits

✅ **JSON Data**: Stored locally (fast, free, simple)
✅ **PDF Files**: Uploaded to Cloudinary (free, reliable, CDN)
✅ **Fallback**: If Cloudinary fails, files are saved locally
✅ **Dual Access**: Files accessible from both Cloudinary and local storage

## API Endpoints

- `POST /api/upload` - Upload PDF to Cloudinary (with local backup)
- `GET /api/documents/:filename` - Get PDF (tries Cloudinary first, then local)
- All other endpoints work exactly as before

## Free Tier Limits

**Cloudinary Free Plan:**
- 25 GB total storage
- 25 GB bandwidth per month
- 1,000 transformations per month
- No time limit

**Your Current Usage:**
- ~1 MB total files
- **You're using less than 0.01% of the free limit!**

## Troubleshooting

**If upload fails:**
- Check your Cloudinary credentials
- Verify internet connection
- Files will automatically save locally as backup

**If you exceed limits:**
- Very unlikely with your usage
- Can upgrade to paid plan later if needed
- Local storage always works as fallback