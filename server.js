// Load environment variables first
require('dotenv').config();

const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5001;
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swaggerConfig");
const multer = require("multer");
const cloudinaryService = require("./services/cloudinaryService");
const firebaseService = require("./services/firebaseService");
const cloudinary = require('cloudinary').v2; // Add this import for API access

// Multer setup for memory storage (to upload to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"));
    }
  },
});

app.use(cors());
app.use(express.json());

/**
 * @swagger
 * /api/cases:
 *   get:
 *     summary: Get all cases from Firebase
 *     tags: [Cases]
 *     responses:
 *       200:
 *         description: List of cases
 */
app.get("/api/cases", async (req, res) => {
  try {
    console.log("📄 Getting cases from Firebase...");
    const cases = await firebaseService.getCases();
    res.json(cases);
  } catch (error) {
    console.error("❌ Error reading cases from Firebase:", error);
    res.status(500).json({ message: "Failed to read cases data" });
  }
});

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get all documents from Firebase
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: List of documents
 */
app.get("/api/documents", async (req, res) => {
  try {
    console.log("📄 Getting documents from Firebase...");
    const documents = await firebaseService.getDocuments();
    res.json(documents);
  } catch (error) {
    console.error("❌ Error reading documents from Firebase:", error);
    res.status(500).json({ message: "Failed to read documents data" });
  }
});

/**
 * @swagger
 * /api/cases:
 *   post:
 *     summary: Add a new case to Firebase
 *     tags: [Cases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: The created case
 */
app.post("/api/cases", async (req, res) => {
  const newCase = req.body;
  console.log("🔍 Received new case:", newCase);

  try {
    // Get existing cases from Firebase
    const cases = await firebaseService.getCases();
    
    if (!newCase || typeof newCase !== "object") {
      console.error("❌ Invalid case data:", newCase);
      return res.status(400).json({ message: "Invalid case format" });
    }

    let savedCase;
    const existingCaseIndex = cases.findIndex((c) => c.id === newCase.id);
    
    if (existingCaseIndex !== -1) {
      // Update existing case
      savedCase = await firebaseService.updateCase(newCase.id, newCase);
      cases[existingCaseIndex] = savedCase;
    } else {
      // Save new case
      savedCase = await firebaseService.saveCase(newCase);
      cases.unshift(savedCase);
    }

    // ---- Custom logic: Check and POST to external API if needed ----
    try {
      if (
        Array.isArray(cases) &&
        cases.length >= 2 &&
        Array.isArray(cases[1].messages)
      ) {
        const messages = cases[1].messages;
        let question = "";
        if (messages[messages.length - 1].type === "user") {
          question = messages[messages.length - 1].content;
        }
        const payload = {
          messages: messages,
          question: question,
        };

        try {
          const apiRes = await fetch(
            "https://app-weu-moci-dev-001.azurewebsites.net/api/v2/moci/chatcompletion",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          
          let apiData;
          const contentType = apiRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            apiData = await apiRes.json();
          } else {
            apiData = await apiRes.text();
          }
          
          let answer = "";
          if (typeof apiData === "string") {
            answer = apiData;
          } else if (apiData && typeof apiData.message === "string") {
            answer = apiData.message;
          }
          
          if (answer) {
            const assistantMessage = {
              id: Date.now().toString(),
              type: "assistant",
              content: answer,
              timestamp: new Date().toISOString(),
            };
            messages.push(assistantMessage);
            
            // Update the case with new assistant message in Firebase
            const updatedCase = await firebaseService.updateCase(cases[1].id, {
              ...cases[1],
              messages: messages
            });
            
            return res.status(201).json({ messages });
          } else {
            console.error("❌ chatcompletion API did not return a message:", apiData);
            return res.status(201).json({ messages });
          }
        } catch (err) {
          console.error("❌ Error calling external API:", err);
          return res.status(201).json({ messages });
        }
      } else {
        return res.status(201).json(savedCase);
      }
    } catch (externalErr) {
      console.error("❌ Error in external API logic:", externalErr);
      return res.status(201).json(savedCase);
    }
  } catch (error) {
    console.error("❌ Error saving case to Firebase:", error);
    res.status(500).json({ message: "Failed to save case" });
  }
});

/**
 * @swagger
 * /api/cases/{id}:
 *   put:
 *     summary: Update a case by ID in Firebase
 *     tags: [Cases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: The updated case
 */
app.put("/api/cases/:id", async (req, res) => {
  const caseId = req.params.id;
  const updates = req.body;

  try {
    console.log("🔄 Updating case in Firebase:", caseId);
    const updatedCase = await firebaseService.updateCase(caseId, updates);
    res.json(updatedCase);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: "Case not found" });
    }
    console.error("❌ Error updating case in Firebase:", error);
    res.status(500).json({ message: "Failed to update case" });
  }
});

/**
 * @swagger
 * /api/graph:
 *   get:
 *     summary: Get graph data from Firebase
 *     tags: [Graph]
 *     responses:
 *       200:
 *         description: Graph data
 */
app.get("/api/graph", async (req, res) => {
  try {
    console.log("📊 Getting graph data from Firebase...");
    const graphData = await firebaseService.getGraphData();
    res.json(graphData);
  } catch (error) {
    console.error("❌ Error reading graph data from Firebase:", error);
    res.status(500).json({ message: "Failed to read graph data" });
  }
});

/**
 * @swagger
 * /api/documents/{filename}:
 *   get:
 *     summary: Get PDF document from Cloudinary
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Base64-encoded PDF
 */
app.get("/api/documents/:filename", async (req, res) => {
  const filename = req.params.filename;
  
  try {
    console.log("☁️ Getting PDF from Cloudinary:", filename);
    
    // First, try to get the document metadata from Firebase to find the correct public ID
    try {
      const documents = await firebaseService.getDocuments();
      const documentMetadata = documents.find(doc => doc.filename === filename);
      
      if (documentMetadata && documentMetadata.cloudinaryPublicId) {
        console.log(`📋 Found metadata with public ID: ${documentMetadata.cloudinaryPublicId}`);
        
        // Try multiple URL formats for Cloudinary PDFs
        const urlFormats = [
          // Format 1: Auto resource type
          `https://res.cloudinary.com/dfmmkbsez/image/upload/${documentMetadata.cloudinaryPublicId}.pdf`,
          // Format 2: Raw resource type  
          `https://res.cloudinary.com/dfmmkbsez/raw/upload/${documentMetadata.cloudinaryPublicId}.pdf`,
          // Format 3: Auto with explicit format
          `https://res.cloudinary.com/dfmmkbsez/auto/upload/${documentMetadata.cloudinaryPublicId}.pdf`,
          // Format 4: The stored URL directly
          documentMetadata.cloudinaryUrl || documentMetadata.url
        ];
        
        for (let i = 0; i < urlFormats.length; i++) {
          const testUrl = urlFormats[i];
          console.log(`🔗 Trying URL format ${i + 1}: ${testUrl}`);
          
          try {
            const response = await fetch(testUrl);
            
            if (response.ok) {
              console.log(`✅ Success with URL format ${i + 1}`);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const base64 = buffer.toString('base64');
              
              return res.json({
                filename,
                base64,
                mimeType: 'application/pdf'
              });
            } else {
              console.log(`❌ URL format ${i + 1} failed with status: ${response.status}`);
            }
          } catch (fetchError) {
            console.log(`❌ URL format ${i + 1} failed with error: ${fetchError.message}`);
          }
        }
        
        console.log(`📋 All URL formats failed, trying Cloudinary API search...`);
      }
    } catch (metadataError) {
      console.log("📋 No metadata found, trying direct Cloudinary search...");
    }
    
    // Fallback: Search in Cloudinary resources by filename
    try {
      const searchResult = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'pdfs/',
        resource_type: 'auto',
        max_results: 100
      });
      
      console.log(`📋 Found ${searchResult.resources.length} resources in pdfs/ folder`);
      
      // Look for the file by various matching criteria
      const foundResource = searchResult.resources.find(resource => {
        const resourceFilename = `${resource.public_id.split('/').pop()}.pdf`;
        const matches = [
          resourceFilename === filename,
          resource.public_id.includes(filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_")),
          resource.original_filename === filename
        ];
        
        console.log(`🔍 Checking resource: ${resource.public_id}, matches: ${matches}`);
        return matches.some(match => match);
      });
      
      if (foundResource) {
        console.log(`✅ Found resource: ${foundResource.public_id}`);
        console.log(`🔗 Using URL: ${foundResource.secure_url}`);
        
        const response = await fetch(foundResource.secure_url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          
          return res.json({
            filename,
            base64,
            mimeType: 'application/pdf'
          });
        }
      }
    } catch (searchError) {
      console.error(`❌ Error searching Cloudinary resources: ${searchError.message}`);
    }
    
    // Final fallback to the original method
    const pdfData = await cloudinaryService.getPDFAsBase64(filename);
    res.json(pdfData);
  } catch (error) {
    console.error("❌ Error getting PDF from Cloudinary:", error);
    res.status(404).json({ message: "File not found" });
  }
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a PDF file to Cloudinary
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    console.log("☁️ Uploading PDF to Cloudinary:", req.file.originalname);
    
    // Upload to Cloudinary only
    const uploadResult = await cloudinaryService.uploadPDF(
      req.file.buffer, 
      req.file.originalname
    );
    
    // Save document metadata to Firebase with Cloudinary mapping
    const documentMetadata = {
      filename: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: uploadResult.url,
      cloudinaryPublicId: uploadResult.publicId, // Store the actual public ID
      cloudinaryUrl: uploadResult.url
    };
    
    await firebaseService.saveDocumentMetadata(documentMetadata);
    
    res.json({
      filename: req.file.originalname,
      message: "File uploaded successfully to Cloudinary",
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      cloudinary: true
    });
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

//summarize
/**
 * @swagger
 * /api/summarize:
 *   get:
 *     summary: Summarize request in Arabic
 *     tags: [Summarize]
 *     responses:
 *       200:
 *         description: Arabic summary message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: بناءً على طلبك قمنا بتلخيص المعلومات المطلوبة بعناية لتقديم نظرة شاملة ومبسطة لمحتوى القضية أو المستند.
 */

app.get("/api/summarize", (req, res) => {
  const arabicMessage =
    "بناءً على طلبك قمنا بتلخيص المعلومات المطلوبة بعناية لتقديم نظرة شاملة ومبسطة لمحتوى القضية أو المستند.";
  res.json({ message: arabicMessage });
});

//legal-opinion
/**
 * @swagger
 * /api/legal-opinion:
 *   get:
 *     summary: احصل على إفادة بالرأي القانوني
 *     tags: [LegalOpinion]
 *     responses:
 *       200:
 *         description: رسالة إفادة بالرأي القانوني
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: هذا هو الرأي القانوني الخاص بك بناءً على البيانات المقدمة.
 */

app.get("/api/legal-opinion", (req, res) => {
  res.json({
    message:
      "📜 هذا هو الرأي القانوني الخاص بك بناءً على البيانات المقدمة. إذا كنت بحاجة إلى توضيح إضافي، يرجى التواصل مع القسم القانوني.",
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
