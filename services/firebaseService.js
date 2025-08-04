const { db, bucket } = require('../config/firebase');
const path = require('path');

class FirebaseService {
  
  // ==================== CASES OPERATIONS ====================
  
  async getCases() {
    try {
      const casesRef = db.collection('cases');
      const snapshot = await casesRef.orderBy('createdAt', 'desc').get();
      
      if (snapshot.empty) {
        return [];
      }
      
      const cases = [];
      snapshot.forEach(doc => {
        cases.push({ id: doc.id, ...doc.data() });
      });
      
      return cases;
    } catch (error) {
      console.error('Error getting cases from Firestore:', error);
      throw error;
    }
  }
  
  async saveCase(caseData) {
    try {
      // If case has an ID, update existing, otherwise create new
      if (caseData.id) {
        const caseRef = db.collection('cases').doc(caseData.id);
        await caseRef.set({
          ...caseData,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        return caseData;
      } else {
        // Create new case
        const caseRef = db.collection('cases').doc();
        const newCase = {
          ...caseData,
          id: caseRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await caseRef.set(newCase);
        return newCase;
      }
    } catch (error) {
      console.error('Error saving case to Firestore:', error);
      throw error;
    }
  }
  
  async updateCase(caseId, updates) {
    try {
      const caseRef = db.collection('cases').doc(caseId);
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await caseRef.update(updatedData);
      
      // Get and return the updated case
      const doc = await caseRef.get();
      if (!doc.exists) {
        throw new Error('Case not found after update');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error updating case in Firestore:', error);
      throw error;
    }
  }
  
  // ==================== DOCUMENTS OPERATIONS ====================
  
  async getDocuments() {
    try {
      const docsRef = db.collection('documents');
      const snapshot = await docsRef.orderBy('createdAt', 'desc').get();
      
      if (snapshot.empty) {
        return [];
      }
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      return documents;
    } catch (error) {
      console.error('Error getting documents from Firestore:', error);
      throw error;
    }
  }
  
  async saveDocumentMetadata(docData) {
    try {
      const docRef = db.collection('documents').doc();
      const newDoc = {
        ...docData,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await docRef.set(newDoc);
      return newDoc;
    } catch (error) {
      console.error('Error saving document metadata to Firestore:', error);
      throw error;
    }
  }
  
  // ==================== GRAPH DATA OPERATIONS ====================
  
  async getGraphData() {
    try {
      const graphRef = db.collection('graphData').doc('main');
      const doc = await graphRef.get();
      
      if (!doc.exists) {
        return {};
      }
      
      return doc.data();
    } catch (error) {
      console.error('Error getting graph data from Firestore:', error);
      throw error;
    }
  }
  
  async saveGraphData(graphData) {
    try {
      const graphRef = db.collection('graphData').doc('main');
      await graphRef.set({
        ...graphData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return graphData;
    } catch (error) {
      console.error('Error saving graph data to Firestore:', error);
      throw error;
    }
  }
  
  // ==================== FILE STORAGE OPERATIONS ====================
  
  async uploadPDF(fileBuffer, filename) {
    try {
      const file = bucket.file(`pdfs/${filename}`);
      
      // Upload the file
      await file.save(fileBuffer, {
        metadata: {
          contentType: 'application/pdf',
        },
      });
      
      // Make the file publicly accessible (optional)
      await file.makePublic();
      
      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/pdfs/${filename}`;
      
      return {
        filename,
        url: publicUrl,
        path: `pdfs/${filename}`
      };
    } catch (error) {
      console.error('Error uploading PDF to Firebase Storage:', error);
      throw error;
    }
  }
  
  async getPDFAsBase64(filename) {
    try {
      const file = bucket.file(`pdfs/${filename}`);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('File not found');
      }
      
      // Download the file as buffer
      const [buffer] = await file.download();
      
      // Convert to base64
      const base64 = buffer.toString('base64');
      
      return {
        filename,
        base64,
        mimeType: 'application/pdf'
      };
    } catch (error) {
      console.error('Error getting PDF from Firebase Storage:', error);
      throw error;
    }
  }
  
  async deletePDF(filename) {
    try {
      const file = bucket.file(`pdfs/${filename}`);
      await file.delete();
      return { message: `${filename} deleted successfully` };
    } catch (error) {
      console.error('Error deleting PDF from Firebase Storage:', error);
      throw error;
    }
  }
}

module.exports = new FirebaseService();