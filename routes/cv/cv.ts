import { Router, Request, Response } from "express";
import multer from "multer";
import { getDbCollection, uploadToBlobStorage } from "../../lib/helpers";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/cv-upload",
  upload.single("cv"),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      let cvUrl = "";
      if (req.file) {
        console.log(req.file);
        // Upload file to Azure Blob Storage
        cvUrl = await uploadToBlobStorage(
          req.file.buffer,
          `${req.file.originalname}-${Date.now()}`,
          "cv-docs"
        );
      }

      const collection = await getDbCollection("cv");
      // Find user by email
      const user = await collection.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      await collection.updateOne(
        { email },
        {
          $set: {
            cvDoc: cvUrl,
          },
        },
        { upsert: true } // Create a new document if one does not exist
      );

      res
        .status(201)
        .json({ message: "CV uploaded successfully", profile: user });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error while completing form", error: error });
    }
  }
);

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
