import { Router, Request, Response } from "express";
import { generateOtp } from "../auth/auth";
import {
  getDbCollection,
  sendMail,
  uploadToBlobStorage,
} from "../../lib/helpers";
import multer from "multer";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/send-otp", async (req: Request, res: Response) => {
  const { email, _id } = req.body;

  if (!email) {
    return res.status(400).send("Email is required");
  }

  try {
    const collection = await getDbCollection("vault");

    const otp = generateOtp();

    // Store the OTP in the database with the user (you might want to also store an expiration time)
    await collection.updateOne(
      { email: email },
      { $set: { otp: otp, otpCreatedAt: new Date(), _id: _id } },
      { upsert: true } // Create a new document if one does not exist
    );

    // Send the OTP to the user's email
    await sendMail(email, "Your OTP Code", `Your OTP code is: ${otp}`);

    res.status(200).send("OTP sent successfully");
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).send("Failed to send OTP");
  }
});

// Verify OTP endpoint
router.post("/verify-otp", async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).send("Email and OTP are required");
  }

  try {
    const collection = await getDbCollection("vault");
    // Find user by email
    const vault = await collection.findOne({ email });

    if (!vault) {
      return res.status(404).json("User not found");
    }

    // Check if OTP matches and is still valid (you can also add a timestamp check here)
    if (vault.otp === otp) {
      // If valid, clear the OTP from the database or mark as verified
      await collection.updateOne(
        { email },
        {
          $unset: { otp: "" },
          $set: {
            otpVerified: true,
          },
        }
      );

      return res.status(200).json("OTP verified successfully");
    } else {
      return res.status(400).json("Invalid OTP");
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).send("Failed to verify OTP");
  }
});

router.post("/save-pin", async (req: Request, res: Response) => {
  const { email, pin } = req.body;

  if (!email) {
    res.status(400).send("Email is required");
    return;
  }

  try {
    const collection = await getDbCollection("vault");

    await collection.updateOne(
      { email: email },
      { $set: { pin: pin, pinCreatedAt: new Date() } }
    );

    res.status(200).send("Pin set successfully");
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).send("Failed to send OTP");
  }
});

router.get("/get-certs/:email", async (req: Request, res: Response) => {
  const email = req.params.email;

  if (!email) {
    res.status(400).send("Email is required");
    return;
  }

  try {
    const usercollection = await getDbCollection("user");
    // Find user by email
    const user = await usercollection.findOne({ email });
    let profileCert;

    if (user) {
      profileCert = {
        licenseType: user?.licenseType,
        licensedState: user.licensedState,
        licenseNumber: user.licenseNumber,
        primarySpeciality: user.primarySpeciality,
        licenseCertificateUrl: user.licenseCertificateUrl[0],
      };
    }

    const collection = await getDbCollection("vault");

    const uname = await collection.findOne({ email });

    const vaultsCerts = uname?.vaultCerts ? uname?.vaultCerts : [];

    res.status(200).json({ message: [...vaultsCerts, profileCert] });
  } catch (error) {
    console.error("Error fetching Certificates:", error);
    res.status(500).send("Failed to send OTP");
  }
});

router.post(
  "/add-certs",
  upload.single("licenseCertificate"),
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        licenseType,
        primarySpeciality,
        licensedState,
        expiryDate,
        licenseNumber,
        empType,
        empNumber,
        empAddress,
        empPhNumber,
      } = req.body;
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

      let docUrl = await uploadToBlobStorage(
        req.file.buffer,
        `${req.file.originalname}-${Date.now()}`,
        "licenses"
      );

      const collection = await getDbCollection("vault");

      await collection.updateOne(
        { email: email },
        {
          $set: {
            licenseCertificateUrl: docUrl,
            licenseCertificateAt: new Date(),
            licenseType: licenseType,
            primarySpeciality: primarySpeciality,
            licensedState: licensedState,
            expiryDate: expiryDate,
            licenseNumber: licenseNumber,
            empType: empType,
            empNumber: empNumber,
            empAddress: empAddress,
            empPhNumber: empPhNumber,
            isVerified: false,
          },
        },
        { upsert: true }
      );

      res.status(200).json({ message: "Successfully Uploaded Certificates" });
    } catch (error) {
      console.error("Error fetching Certificates:", error);
      res.status(500).send("Failed to send OTP");
    }
  }
);

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

export default router;
