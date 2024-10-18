"use strict";
// import { Router } from "express";
// const router = Router();
// router.post("/api/document/good-standing", async (req, res) => {
//   // Store the good standing certificate in Blob Storage
//   const blobServiceClient = BlobServiceClient.fromConnectionString(
//     process.env.AZURE_STORAGE_CONNECTION_STRING
//   );
//   const containerClient = blobServiceClient.getContainerClient("documents");
//   const blobName = req.file.originalname;
//   const blockBlobClient = containerClient.getBlockBlobClient(blobName);
//   try {
//     await blockBlobClient.uploadStream(req.file.buffer);
//     // Save document reference in Cosmos DB
//     const client = new CosmosClient({
//       endpoint: process.env.COSMOS_DB_ENDPOINT,
//       key: process.env.COSMOS_DB_KEY,
//     });
//     const database = client.database("UserProfileDB");
//     const container = database.container("GoodStandingDocs");
//     const docData = {
//       id: req.body.id,
//       blobUri: blockBlobClient.url,
//       issuedDate: new Date().toISOString(),
//     };
//     const { resource } = await container.items.create(docData);
//     res
//       .status(201)
//       .json({ message: "Good Standing document saved", data: resource });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// app.post("/api/others/report-issue", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("IssueDB");
//   const container = database.container("Reports");
//   const issueData = {
//     userId: req.body.userId,
//     issue: req.body.issue,
//     timestamp: new Date().toISOString(),
//   };
//   try {
//     const { resource } = await container.items.create(issueData);
//     res
//       .status(201)
//       .json({ message: "Issue reported successfully", data: resource });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// export default router;
