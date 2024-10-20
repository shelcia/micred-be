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
const auth_1 = require("../auth/auth");
const helpers_1 = require("../../lib/helpers");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post("/send-otp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, _id } = req.body;
    if (!email) {
        return res.status(400).send("Email is required");
    }
    try {
        const collection = yield (0, helpers_1.getDbCollection)("vault");
        const otp = (0, auth_1.generateOtp)();
        // Store the OTP in the database with the user (you might want to also store an expiration time)
        yield collection.updateOne({ email: email }, { $set: { otp: otp, otpCreatedAt: new Date(), _id: _id } }, { upsert: true } // Create a new document if one does not exist
        );
        // Send the OTP to the user's email
        yield (0, helpers_1.sendMail)(email, "Your OTP Code", `Your OTP code is: ${otp}`);
        res.status(200).send("OTP sent successfully");
    }
    catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).send("Failed to send OTP");
    }
}));
// Verify OTP endpoint
router.post("/verify-otp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).send("Email and OTP are required");
    }
    try {
        const collection = yield (0, helpers_1.getDbCollection)("vault");
        // Find user by email
        const vault = yield collection.findOne({ email });
        if (!vault) {
            return res.status(404).json("User not found");
        }
        // Check if OTP matches and is still valid (you can also add a timestamp check here)
        if (vault.otp === otp) {
            // If valid, clear the OTP from the database or mark as verified
            yield collection.updateOne({ email }, {
                $unset: { otp: "" },
                $set: {
                    otpVerified: true,
                },
            });
            return res.status(200).json("OTP verified successfully");
        }
        else {
            return res.status(400).json("Invalid OTP");
        }
    }
    catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).send("Failed to verify OTP");
    }
}));
router.post("/save-pin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, pin } = req.body;
    if (!email) {
        res.status(400).send("Email is required");
        return;
    }
    try {
        const collection = yield (0, helpers_1.getDbCollection)("vault");
        yield collection.updateOne({ email: email }, { $set: { pin: pin, pinCreatedAt: new Date() } });
        res.status(200).send("Pin set successfully");
    }
    catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).send("Failed to send OTP");
    }
}));
router.get("/get-certs/:email", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = req.params.email;
    if (!email) {
        res.status(400).send("Email is required");
        return;
    }
    try {
        const usercollection = yield (0, helpers_1.getDbCollection)("user");
        // Find user by email
        const user = yield usercollection.findOne({ email });
        let profileCert;
        if (user) {
            profileCert = {
                licenseType: user === null || user === void 0 ? void 0 : user.licenseType,
                licensedState: user.licensedState,
                licenseNumber: user.licenseNumber,
                primarySpeciality: user.primarySpeciality,
                licenseCertificateUrl: user.licenseCertificateUrl[0],
            };
        }
        const collection = yield (0, helpers_1.getDbCollection)("vault");
        const vaultCerts = yield collection.find({ email }).toArray();
        let licenses = [];
        vaultCerts.forEach((doc) => {
            if (doc.licenses && doc.licenses.length > 0) {
                licenses = licenses.concat(doc.licenses); // Collect licenses
            }
        });
        // const vaultsCerts = uname?.vaultCerts ? uname?.vaultCerts : [];
        res.status(200).json({ message: [...licenses, profileCert] });
    }
    catch (error) {
        console.error("Error fetching Certificates:", error);
        res.status(500).send("Failed to send OTP");
    }
}));
router.post("/add-certs", upload.single("licenseCertificate"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, licenseType, primarySpeciality, licensedState, expiryDate, licenseNumber, empType, empAddress, empPhNumber, } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        // Validate file type
        if (![
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(req.file.mimetype)) {
            return res.status(400).json({ message: "Unsupported file type" });
        }
        let docUrl = yield (0, helpers_1.uploadToBlobStorage)(req.file.buffer, `${req.file.originalname}-${Date.now()}`, "licenses");
        const collection = yield (0, helpers_1.getDbCollection)("vault");
        const user = yield collection.findOne({ email: email });
        yield collection.updateOne({ email: email }, {
            $set: {
                licenses: [
                    ...((user === null || user === void 0 ? void 0 : user.licenses) ? user.licenses : []),
                    {
                        licenseCertificateUrl: docUrl,
                        licenseCertificateAt: new Date(),
                        licenseType: licenseType,
                        primarySpeciality: primarySpeciality,
                        licensedState: licensedState,
                        expiryDate: expiryDate,
                        licenseNumber: licenseNumber,
                        empType: empType,
                        empAddress: empAddress,
                        empPhNumber: empPhNumber,
                        isVerified: false,
                    },
                ],
            },
        }, { upsert: true });
        res.status(200).json({ message: "Successfully Uploaded Certificates" });
    }
    catch (error) {
        console.error("Error fetching Certificates:", error);
        res.status(500).send("Failed to send OTP");
    }
}));
// router.post("/api/vault/upload/cert", async (req, res) => {
//   const blobServiceClient = BlobServiceClient.fromConnectionString(
//     process.env.AZURE_STORAGE_CONNECTION_STRING
//   );
//   const containerClient = blobServiceClient.getContainerClient("vault");
//   const blobName = req.file.originalname;
//   const blockBlobClient = containerClient.getBlockBlobClient(blobName);
//   try {
//     await blockBlobClient.uploadStream(req.file.buffer);
//     res.status(200).json({ message: "Certificate uploaded successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// router.post("/api/vault/set-pin", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("UserProfileDB");
//   const container = database.container("Vault");
//   const { userId, pin } = req.body;
//   const vaultData = {
//     id: userId,
//     pin: pin,
//   };
//   try {
//     const { resource } = await container.items.create(vaultData);
//     res
//       .status(201)
//       .json({ message: "Vault PIN set successfully", data: resource });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// router.put("/api/vault/update-doc/:id", async (req, res) => {
//   const blobServiceClient = BlobServiceClient.fromConnectionString(
//     process.env.AZURE_STORAGE_CONNECTION_STRING
//   );
//   const containerClient = blobServiceClient.getContainerClient("vault");
//   const blobName = req.params.id;
//   const blockBlobClient = containerClient.getBlockBlobClient(blobName);
//   try {
//     await blockBlobClient.uploadStream(req.file.buffer, { overwrite: true });
//     res.status(200).json({ message: "Document updated successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// router.get("/api/vault/scan-doc/:id", async (req, res) => {
//   const client = new FormRecognizerClient(
//     process.env.FORM_RECOGNIZER_ENDPOINT,
//     new AzureKeyCredential(process.env.FORM_RECOGNIZER_KEY)
//   );
//   const url = `https://<your_blob_storage_path>/${req.params.id}`;
//   try {
//     const poller = await client.beginRecognizeContentFromUrl(url);
//     const pages = await poller.pollUntilDone();
//     res.status(200).json(pages);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
exports.default = router;
