import { Readable } from "stream";
import multer from "multer";
import { BlobServiceClient } from "@azure/storage-blob";
import { connectToDatabase } from "../db/dbConnect";
import nodemailer from "nodemailer";

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
export async function streamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  let done: boolean | undefined;
  let value: Uint8Array | undefined;

  while ((({ done, value } = await reader.read()), !done)) {
    if (value) {
      // Ensure value is not undefined before pushing
      chunks.push(value);
    }
  }

  // Concatenate all the Uint8Array chunks into a single Buffer
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

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

export function webReadableStreamToNodeReadable(
  webReadableStream: ReadableStream<Uint8Array>
): NodeJS.ReadableStream {
  const reader = webReadableStream.getReader();

  return new Readable({
    // This method is called when the stream needs more data
    read(size: number) {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            this.push(null); // No more data
          } else {
            this.push(Buffer.from(value)); // Push the chunk to the readable stream
          }
        })
        .catch((err) => {
          this.destroy(err); // Handle any errors
        });
    },
    // This method is called when the stream is canceled
    destroy(err: Error | null, callback: (error?: Error | null) => void) {
      reader
        .cancel()
        .then(() => callback(err))
        .catch(callback);
    },
  });
}

// Multer setup for memory storage
export const upload = multer({ storage: multer.memoryStorage() });

// Replace with your actual connection string
const AZURE_STORAGE_CONNECTION_STRING = process.env
  .AZURE_STORAGE_CONNECTION_STRING as string;

const blobServiceClient = BlobServiceClient.fromConnectionString(
  AZURE_STORAGE_CONNECTION_STRING
);

export const uploadToAzure = async (
  containerName: string,
  blobName: string,
  buffer: Buffer
): Promise<void> => {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Upload buffer to Azure Blob Storage
  await blockBlobClient.upload(buffer, buffer.length);
  console.log(`Uploaded blob ${blobName} to container ${containerName}`);
};

export async function getDbCollection(collectionName: string = "") {
  const db = await connectToDatabase();
  const collection = db.collection(collectionName);
  return collection;
}

export async function uploadToBlobStorage(
  fileBuffer: Buffer,
  fileName: string,
  containerName: string
): Promise<string> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING as string
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Upload file to blob storage
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  await blockBlobClient.uploadData(fileBuffer);

  return blockBlobClient.url;
}

export async function sendMail(email: string, subject: string, text: string) {
  const transporter = nodemailer.createTransport({
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

  await transporter.sendMail(mailOptions);
}
