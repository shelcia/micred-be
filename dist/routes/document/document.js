"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authValidation_1 = __importDefault(require("../../core/authValidation"));
const storage_blob_1 = require("@azure/storage-blob");
const ai_form_recognizer_1 = require("@azure/ai-form-recognizer");
const pdfkit_1 = __importDefault(require("pdfkit"));
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const helpers_1 = require("../../lib/helpers"); // Assumed helper for stream to buffer
dotenv_1.default.config();
const router = (0, express_1.Router)();
const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const formRecognizerClient = new ai_form_recognizer_1.DocumentAnalysisClient(process.env.FORM_RECOGNIZER_ENDPOINT, new ai_form_recognizer_1.AzureKeyCredential(process.env.FORM_RECOGNIZER_KEY));
// MongoDB connection
const connectionString = process.env.DB_CONNECT;
const client = new mongodb_1.MongoClient(connectionString);
const dbName = "micred";
const collectionName = "documents";
function getDbCollection() {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.connect();
        const db = client.db(dbName);
        return db.collection(collectionName);
    });
}
// Document upload route
router.post("/document-upload", helpers_1.upload.single("file"), 
// authenticate,
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // console.log(req);
    // const { file } = req.;
    // console.log(file);
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }
        let file = undefined;
        // console.log(req);
        if (req.file)
            file = req.file.buffer;
        const containerClient = blobServiceClient.getContainerClient("licenses");
        const blobName = `doc-${Date.now()}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // await blockBlobClient.upload(file, file.length);
        if (file) {
            yield blockBlobClient.upload(file, 1);
            // Insert metadata into MongoDB
            const collection = yield getDbCollection();
            yield collection.insertOne({ blobName, uploadDate: new Date() });
            return res
                .status(200)
                .json({ message: "Document uploaded successfully", blobName });
        }
        else {
            return res.status(400).json({ message: "Document not found" });
        }
    }
    catch (err) {
        return res
            .status(500)
            .json({ error: "Failed to upload document", details: err });
    }
}));
// Document view route
router.post("/document-view", 
// authenticate,
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { blobName } = req.body;
        const containerClient = blobServiceClient.getContainerClient("licenses");
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const sasUrl = yield blockBlobClient.generateSasUrl({
            permissions: storage_blob_1.BlobSASPermissions.parse("r"), // This allows read access
            expiresOn: new Date(Date.now() + 3600 * 1000), // Expires in 1 hour
        });
        return res.status(200).json({ viewUrl: sasUrl });
    }
    catch (err) {
        return res
            .status(500)
            .json({ error: "Failed to retrieve document", details: err });
    }
}));
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
router.post("/scan-document", 
// authenticate,
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { blobName } = req.body;
        const containerClient = blobServiceClient.getContainerClient("licenses");
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const sasUrl = yield blockBlobClient.generateSasUrl({
            permissions: storage_blob_1.BlobSASPermissions.parse("r"), // This allows read access
            expiresOn: new Date(Date.now() + 3600 * 1000),
        });
        const client = new ai_form_recognizer_1.DocumentAnalysisClient(process.env.FORM_RECOGNIZER_ENDPOINT, new ai_form_recognizer_1.AzureKeyCredential(process.env.FORM_RECOGNIZER_KEY));
        const poller = yield client.beginAnalyzeDocumentFromUrl("prebuilt-invoice", sasUrl);
        const result = yield poller.pollUntilDone();
        return res.status(200).json({ analysis: result });
    }
    catch (err) {
        return res
            .status(500)
            .json({ error: "Failed to scan document", details: err });
    }
}));
// Generate PDF document and upload it
router.post("/gen-document", authValidation_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data } = req.body;
        const doc = new pdfkit_1.default();
        let buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => __awaiter(void 0, void 0, void 0, function* () {
            const pdfBuffer = Buffer.concat(buffers);
            const containerClient = blobServiceClient.getContainerClient("documents");
            const blobName = `generated-doc-${Date.now()}.pdf`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            yield blockBlobClient.upload(pdfBuffer, pdfBuffer.length);
            const collection = yield getDbCollection();
            yield collection.insertOne({
                blobName,
                uploadDate: new Date(),
                docData: data,
            });
            return res
                .status(200)
                .json({ message: "Document generated and uploaded", blobName });
        }));
        doc.text(data.title, { align: "center" });
        doc.text(data.body);
        doc.end();
    }
    catch (err) {
        return res
            .status(500)
            .json({ error: "Failed to generate document", details: err });
    }
}));
exports.default = router;
