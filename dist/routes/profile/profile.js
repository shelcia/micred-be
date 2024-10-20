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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const helpers_1 = require("../../lib/helpers");
const router = (0, express_1.Router)();
router.get("/:email", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // const { email } = req.body;
    try {
        const collection = yield (0, helpers_1.getDbCollection)("user");
        // Find user by email
        const user = yield collection.findOne({ email: req.params.email });
        if (user) {
            const profile = {
                firstName: user.firstName,
                lastName: user.lastName,
                middleName: user.middleName,
                profileUrl: user.profileUrl,
                primarySpeciality: user.primarySpeciality,
                licenseCertificateUrl: user.licenseCertificateUrl[0],
                licensedState: user.licensedState,
                expirationDate: user.expirationDate,
                deaNumber: user.deaNumber,
                npiNumber: user.npiNumber,
                licenseNumber: user.licenseNumber,
            };
            res.status(200).json({ message: profile });
        }
        else {
            res.status(404).json({ message: "User not found" });
        }
    }
    catch (error) {
        res.status(500).json({ error: "Error" });
    }
}));
router.post("/profile-image", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        // Validate file type
        if (![
            "image/png", // PNG
            "image/jpeg", // JPG and JPEG
        ].includes(req.file.mimetype)) {
            return res.status(400).json({ message: "Unsupported file type" });
        }
        let imageUrl = yield (0, helpers_1.uploadToBlobStorage)(req.file.buffer, `${req.file.originalname}-${Date.now()}`, "profile");
        const collection = yield (0, helpers_1.getDbCollection)("user");
        yield collection.updateOne({ email: email }, {
            $set: {
                profileUrl: imageUrl,
            },
        }, { upsert: true });
    }
    catch (error) {
        res.status(500).json({ error: "Error" });
    }
}));
router.post("/progress", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, licenseNumber, progressCertificateName, issueDate, progressCertificateHours, } = req.body;
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
        const collection = yield (0, helpers_1.getDbCollection)("progress");
        yield collection.updateOne({ email: email }, {
            $set: {
                licenseNumber: licenseNumber,
                progressCertificateName: progressCertificateName,
                progressCertificateUrl: docUrl,
                progressCertificateAt: new Date(),
                issueDate: issueDate,
                progressCertificateHours: parseInt(progressCertificateHours),
                isVerified: false,
            },
        }, { upsert: true });
    }
    catch (error) {
        res.status(500).json({ error: "Error" });
    }
}));
router.get("/progress/:licenseNumber", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const collection = yield (0, helpers_1.getDbCollection)("progress");
        const progresses = yield collection
            .find({
            licenseNumber: req.params.licenseNumber,
        })
            .toArray();
        res.status(404).json({ message: progresses });
    }
    catch (error) {
        res.status(500).json({ error: "Error" });
    }
}));
// router.post("/api/profile/create", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("UserProfileDB");
//   const container = database.container("Profiles");
//   const userProfile = {
//     id: req.body.id,
//     email: req.body.email,
//     firstName: req.body.firstName,
//     lastName: req.body.lastName,
//     phoneNumber: req.body.phoneNumber,
//     npiNumber: req.body.npiNumber,
//     specialties: req.body.specialties,
//   };
//   try {
//     const { resource } = await container.items.create(userProfile);
//     res.status(201).json(resource);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// // Update Profile
// router.put("/api/profile/update/:id", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("UserProfileDB");
//   const container = database.container("Profiles");
//   const { id } = req.params;
//   const updatedProfile = {
//     ...req.body,
//   };
//   try {
//     const { resource } = await container.item(id).replace(updatedProfile);
//     res.status(200).json(resource);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
exports.default = router;
