import { Router, Request, Response } from "express";
import authenticate from "../../core/authValidation";
import { BlobSASPermissions, BlobServiceClient } from "@azure/storage-blob";
import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from "@azure/ai-form-recognizer";
import PDFDocument from "pdfkit";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

import {
  streamToBuffer,
  upload,
  // streamToUint8Array,
  webReadableStreamToNodeReadable,
} from "../../lib/helpers"; // Assumed helper for stream to buffer
import { Readable } from "stream";

dotenv.config();

const router = Router();

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);
const formRecognizerClient = new DocumentAnalysisClient(
  process.env.FORM_RECOGNIZER_ENDPOINT!,
  new AzureKeyCredential(process.env.FORM_RECOGNIZER_KEY!)
);

// MongoDB connection
const connectionString: string = process.env.DB_CONNECT!;
const client = new MongoClient(connectionString);
const dbName = "micred";
const collectionName = "documents";

async function getDbCollection() {
  await client.connect();
  const db = client.db(dbName);
  return db.collection(collectionName);
}

// interface FileRequest extends Request {
//   // file: Buffer;
//   body: {
//     file: Buffer;
//   };
// }

interface MulterRequest extends Request {
  file?: Express.Multer.File; // `file` can be undefined, so we use `?`
}

// Document upload route
router.post(
  "/document-upload",
  upload.single("file"),
  // authenticate,
  async (req: MulterRequest, res: Response) => {
    // console.log(req);
    // const { file } = req.;
    // console.log(file);

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }
      let file = undefined;
      // console.log(req);
      if (req.file) file = req.file.buffer;
      const containerClient = blobServiceClient.getContainerClient("licenses");
      const blobName = `doc-${Date.now()}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      // await blockBlobClient.upload(file, file.length);
      if (file) {
        await blockBlobClient.upload(file, 1);
        // Insert metadata into MongoDB
        const collection = await getDbCollection();
        await collection.insertOne({ blobName, uploadDate: new Date() });

        return res
          .status(200)
          .json({ message: "Document uploaded successfully", blobName });
      } else {
        return res.status(400).json({ message: "Document not found" });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to upload document", details: err });
    }
  }
);

// Document view route
router.post(
  "/document-view",
  // authenticate,
  async (req: Request, res: Response) => {
    try {
      const { blobName } = req.body;
      const containerClient = blobServiceClient.getContainerClient("licenses");
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse("r"), // This allows read access
        expiresOn: new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
      });

      return res.status(200).json({ viewUrl: sasUrl });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to retrieve document", details: err });
    }
  }
);

// Document download route

// router.post(
//   "/document-download",
//   authenticate,
//   async (req: Request, res: Response) => {
//     try {
//       const { blobName } = req.body;
//       const containerClient = blobServiceClient.getContainerClient("documents");
//       const blockBlobClient = containerClient.getBlockBlobClient(blobName);

//       const downloadBlockBlobResponse = await blockBlobClient.download(0);

//       // Ensure the stream is treated as a ReadableStream<Uint8Array>
//       const stream =
//         downloadBlockBlobResponse.readableStreamBody as ReadableStream<Uint8Array>;

//       if (stream) {
//         const downloaded = await streamToUint8Array(stream);
//         return res.status(200).send(downloaded);
//       } else {
//         return res
//           .status(500)
//           .json({ error: "No readable stream returned from blob" });
//       }
//     } catch (err) {
//       return res
//         .status(500)
//         .json({
//           error: "Failed to download document",
//           details: err instanceof Error ? err.message : err,
//         });
//     }
//   }
// );

// Scan document using Form Recognizer
router.post(
  "/scan-document",
  // authenticate,
  async (req: Request, res: Response) => {
    try {
      const { blobName } = req.body;
      const containerClient = blobServiceClient.getContainerClient("licenses");
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse("r"), // This allows read access
        expiresOn: new Date(Date.now() + 3600 * 1000),
      });

      const client = new DocumentAnalysisClient(
        process.env.FORM_RECOGNIZER_ENDPOINT!,
        new AzureKeyCredential(process.env.FORM_RECOGNIZER_KEY!)
      );
      const poller = await client.beginAnalyzeDocumentFromUrl(
        "prebuilt-invoice",
        sasUrl
      );
      const result = await poller.pollUntilDone();

      return res.status(200).json({ analysis: result });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to scan document", details: err });
    }
  }
);

// Generate PDF document and upload it
router.post(
  "/gen-document",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { data } = req.body;

      const doc = new PDFDocument();
      let buffers: any[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(buffers);

        const containerClient =
          blobServiceClient.getContainerClient("documents");
        const blobName = `generated-doc-${Date.now()}.pdf`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(pdfBuffer, pdfBuffer.length);

        const collection = await getDbCollection();
        await collection.insertOne({
          blobName,
          uploadDate: new Date(),
          docData: data,
        });

        return res
          .status(200)
          .json({ message: "Document generated and uploaded", blobName });
      });

      doc.text(data.title, { align: "center" });
      doc.text(data.body);
      doc.end();
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to generate document", details: err });
    }
  }
);

export default router;
