import { Router, Request, Response } from "express";
import multer from "multer";
import { getDbCollection, uploadToBlobStorage } from "../../lib/helpers";
import { BlobSASPermissions, BlobServiceClient } from "@azure/storage-blob";
import {
  AzureKeyCredential,
  DocumentAnalysisClient,
} from "@azure/ai-form-recognizer";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);

const formRecognizerClient = new DocumentAnalysisClient(
  process.env.FORM_RECOGNIZER_ENDPOINT!,
  new AzureKeyCredential(process.env.FORM_RECOGNIZER_KEY!)
);

// Refined regex patterns for CV sections
const sectionPatterns = {
  "Personal details": /personal\s*details:?/i,
  "Clinical experience": /clinical\s*experience:?/i,
  "Residency fellowship training": /residency\s*fellowship\s*training:?/i,
  Education: /education:?/i,
  "Board certification": /board\s*certification:?/i,
  Publications: /publications:?/i,
  "Research Experience": /research\s*experience:?/i,
  "Professional Membership": /professional\s*membership:?/i,
  "Languages spoken": /languages\s*spoken:?/i,
  "Awards and Honors": /awards\s*and\s*honors:?/i,
  "Interest & Hobbies": /interest\s*&\s*hobbies:?/i,
  References: /references:?/i,
};

// Improved section extraction using flexible regex patterns
const extractSections = (text: string) => {
  const extractedSections: any = {};

  Object.entries(sectionPatterns).forEach(([section, pattern]) => {
    const regex = new RegExp(
      `${pattern.source}\\s*(.*?)(?=${Object.values(sectionPatterns)
        .map((p) => p.source)
        .join("|")}|$)`,
      "gis"
    );
    const match = regex.exec(text);
    if (match) {
      extractedSections[section] = match[1].trim();
    }
  });

  return extractedSections;
};

router.post(
  "/cv-upload",
  upload.single("cvDocument"),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      if (
        ![
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(req.file.mimetype)
      ) {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      let cvUrl = await uploadToBlobStorage(
        req.file.buffer,
        `${req.file.originalname}-${Date.now()}`,
        "cv-docs"
      );

      const collection = await getDbCollection("cv");

      await collection.updateOne(
        { email: email },
        { $set: { cvDocumentUrl: cvUrl, cvCreatedAt: new Date() } },
        { upsert: true }
      );

      // Analyze document using custom model or prebuilt model
      const poller = await formRecognizerClient.beginAnalyzeDocumentFromUrl(
        "prebuilt-document", // Replace with your custom model ID
        cvUrl
      );
      const result = await poller.pollUntilDone();

      const extractedText = result.content || "";
      const extractedData = extractSections(extractedText);

      res
        .status(200)
        .json({ message: "CV successfully processed", data: extractedData });
    } catch (error) {
      res.status(500).json({ message: "Error while processing CV", error });
    }
  }
);

router.get("/:email", async (req: Request, res: Response) => {
  try {
    const collection = await getDbCollection("cv");

    const cvs = await collection.find({ email: req.params.email }).toArray();
    res.status(200).json({ message: cvs });
  } catch (error) {
    res.status(500).json({ message: "Error while fetching CV", error });
  }
});

export default router;

// import { Router } from "express";

// const router = Router();

// router.post("/api/cv/upload", async (req, res) => {
//   const blobServiceClient = BlobServiceClient.fromConnectionString(
//     process.env.AZURE_STORAGE_CONNECTION_STRING
//   );
//   const containerClient = blobServiceClient.getContainerClient("cv");
//   const blobName = req.file.originalname;

//   const blockBlobClient = containerClient.getBlockBlobClient(blobName);

//   try {
//     await blockBlobClient.uploadStream(req.file.buffer);
//     res.status(200).json({ message: "CV uploaded successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// router.post("/api/cv/create", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("UserProfileDB");
//   const container = database.container("CVs");

//   const cvData = {
//     id: req.body.id,
//     content: req.body.content, // CV details such as sections, etc.
//   };

//   try {
//     const { resource } = await container.items.create(cvData);
//     res
//       .status(201)
//       .json({ message: "CV created successfully", data: resource });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// router.put("/api/cv/update/:id", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("UserProfileDB");
//   const container = database.container("CVs");

//   const { id } = req.params;
//   const updatedCvData = {
//     ...req.body, // Updated CV details
//   };

//   try {
//     const { resource } = await container.item(id).replace(updatedCvData);
//     res.status(200).json(resource);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// router.post("/api/cv/rearrange-section", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("UserProfileDB");
//   const container = database.container("CVs");

//   const { id, sections } = req.body; // Sections of the CV to be rearranged

//   try {
//     const cvItem = await container.item(id).read();
//     cvItem.resource.sections = sections; // Update the sections order

//     const { resource } = await container.item(id).replace(cvItem.resource);
//     res.status(200).json(resource);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// router.post("/api/cv/generate", (req, res) => {
//   const PDFDocument = require("pdfkit");
//   const fs = require("fs");

//   const doc = new PDFDocument();
//   const filename = `generated-cv-${req.body.id}.pdf`;

//   doc.pipe(fs.createWriteStream(filename));

//   // Add CV content to PDF
//   doc.text(req.body.content);

//   doc.end();

//   res.status(200).json({ message: "CV generated as PDF successfully" });
// });

// export default router;
