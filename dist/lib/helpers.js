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
exports.sendMail = exports.uploadToBlobStorage = exports.getDbCollection = exports.uploadToAzure = exports.upload = exports.webReadableStreamToNodeReadable = exports.streamToBuffer = void 0;
const stream_1 = require("stream");
const multer_1 = __importDefault(require("multer"));
const storage_blob_1 = require("@azure/storage-blob");
const dbConnect_1 = require("../db/dbConnect");
const nodemailer_1 = __importDefault(require("nodemailer"));
// export async function streamToBuffer(stream: Readable | null): Promise<Buffer> {
//   if (!stream) {
//     throw new Error("Stream is null or undefined.");
//   }
//   const chunks: any[] = [];
//   return new Promise((resolve, reject) => {
//     stream.on("data", (chunk) => {
//       chunks.push(chunk);
//     });
//     stream.on("end", () => {
//       resolve(Buffer.concat(chunks));
//     });
//     stream.on("error", (err) => {
//       reject(err);
//     });
//   });
// }
function streamToBuffer(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        const reader = stream.getReader();
        const chunks = [];
        let done;
        let value;
        while ((({ done, value } = yield reader.read()), !done)) {
            if (value) {
                // Ensure value is not undefined before pushing
                chunks.push(value);
            }
        }
        // Concatenate all the Uint8Array chunks into a single Buffer
        return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    });
}
exports.streamToBuffer = streamToBuffer;
// export async function streamToUint8Array(
//   stream: ReadableStream<Uint8Array>
// ): Promise<Uint8Array> {
//   const reader = stream.getReader();
//   const chunks: Uint8Array[] = [];
//   let result = await reader.read();
//   while (!result.done) {
//     chunks.push(result.value);
//     result = await reader.read();
//   }
//   return new Uint8Array(
//     chunks.reduce((acc, chunk) => acc.concat(Array.from(chunk)), [])
//   );
// }
function webReadableStreamToNodeReadable(webReadableStream) {
    const reader = webReadableStream.getReader();
    return new stream_1.Readable({
        // This method is called when the stream needs more data
        read(size) {
            reader
                .read()
                .then(({ done, value }) => {
                if (done) {
                    this.push(null); // No more data
                }
                else {
                    this.push(Buffer.from(value)); // Push the chunk to the readable stream
                }
            })
                .catch((err) => {
                this.destroy(err); // Handle any errors
            });
        },
        // This method is called when the stream is canceled
        destroy(err, callback) {
            reader
                .cancel()
                .then(() => callback(err))
                .catch(callback);
        },
    });
}
exports.webReadableStreamToNodeReadable = webReadableStreamToNodeReadable;
// Multer setup for memory storage
exports.upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Replace with your actual connection string
const AZURE_STORAGE_CONNECTION_STRING = process.env
    .AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const uploadToAzure = (containerName, blobName, buffer) => __awaiter(void 0, void 0, void 0, function* () {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    // Upload buffer to Azure Blob Storage
    yield blockBlobClient.upload(buffer, buffer.length);
    console.log(`Uploaded blob ${blobName} to container ${containerName}`);
});
exports.uploadToAzure = uploadToAzure;
function getDbCollection(collectionName = "") {
    return __awaiter(this, void 0, void 0, function* () {
        const db = yield (0, dbConnect_1.connectToDatabase)();
        const collection = db.collection(collectionName);
        return collection;
    });
}
exports.getDbCollection = getDbCollection;
function uploadToBlobStorage(fileBuffer, fileName, containerName) {
    return __awaiter(this, void 0, void 0, function* () {
        const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        // Upload file to blob storage
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        yield blockBlobClient.uploadData(fileBuffer);
        return blockBlobClient.url;
    });
}
exports.uploadToBlobStorage = uploadToBlobStorage;
function sendMail(email, subject, text) {
    return __awaiter(this, void 0, void 0, function* () {
        const transporter = nodemailer_1.default.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            // subject: "Your OTP Code",
            subject: subject,
            // text: `Your OTP code is: ${otp}`,
            text: text,
        };
        yield transporter.sendMail(mailOptions);
    });
}
exports.sendMail = sendMail;
