import { Router } from "express";
import { getDbCollection, uploadToBlobStorage } from "../../lib/helpers";
import multer from "multer";
import axios from "axios";
import {
  AnalyzeResult,
  AzureKeyCredential,
  DocumentAnalysisClient,
} from "@azure/ai-form-recognizer";
import { cmeGuidelines } from "../../constants";
import { StateKeys } from "../../lib/types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/:email", async (req, res) => {
  // const { email } = req.body;
  try {
    const collection = await getDbCollection("user");
    // Find user by email
    const user = await collection.findOne({ email: req.params.email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    // Fetch CME hours from progress collection
    const progressCollection = await getDbCollection("progress");
    const progressRecords = await progressCollection
      .find({ email: req.params.email })
      .toArray();

    // Calculate total CME hours completed
    const cmeHoursCompleted = progressRecords.reduce(
      (total, record) => total + (record.progressCertificateHours || 0),
      0
    );

    const licensedState = user.licensedState as StateKeys; // Explicitly cast if you are sure the state is valid
    if (!licensedState || !(licensedState in cmeGuidelines)) {
      return res.status(400).json({
        message: "Invalid or missing licensed state for the user.",
      });
    }

    let stateGuidelines = cmeGuidelines[licensedState];

    const { cmeHoursRequired } = stateGuidelines;

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
        nextRenewalDate: user.nextRenewalDate,
        cmeHoursCompleted: cmeHoursCompleted,
        cmeHoursRequired: cmeHoursRequired,
      };
      res.status(200).json({ message: profile });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

router.post("/profile-image", upload.single("profilePic"), async (req, res) => {
  const { email } = req.body;

  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const collection = await getDbCollection("user");

    const user = await collection.findOne({ email });

    if (!user) {
      res.status(400).json({ message: "No user found" });
      return;
    }

    // Validate file type
    if (
      ![
        "image/png", // PNG
        "image/jpeg", // JPG and JPEG
      ].includes(req.file.mimetype)
    ) {
      return res.status(400).json({ message: "Unsupported file type" });
    }

    let imageUrl = await uploadToBlobStorage(
      req.file.buffer,
      `${req.file.originalname}-${Date.now()}`,
      "profile"
    );

    await collection.updateOne(
      { email: email },
      {
        $set: {
          profileUrl: imageUrl,
        },
      }
    );

    res.status(200).json({ message: "Success" });
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

router.post(
  "/progress",
  upload.single("licenseCertificate"),
  async (req, res) => {
    try {
      const {
        email,
        licenseNumber,
        progressCertificateName,
        issueDate,
        progressCertificateHours,
        progressCertificateNumber,
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

      const collection = await getDbCollection("progress");

      await collection.updateOne(
        { email: email },
        {
          $set: {
            licenseNumber: licenseNumber,
            progressCertificateName: progressCertificateName,
            progressCertificateUrl: docUrl,
            progressCertificateAt: new Date(),
            issueDate: issueDate,
            progressCertificateHours: parseInt(progressCertificateHours),
            progressCertificateNumber: progressCertificateNumber,
            isVerified: false,
          },
        },
        { upsert: true }
      );
      res.status(200).json({ message: "Added Success" });
    } catch (error) {
      res.status(500).json({ error: "Error" });
    }
  }
);

router.get("/progress/:licenseNumber", async (req, res) => {
  try {
    const collection = await getDbCollection("progress");
    const progresses = await collection
      .find({
        licenseNumber: req.params.licenseNumber,
      })
      .toArray();
    res.status(200).json({ message: progresses });
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

const formRecognizerClient = new DocumentAnalysisClient(
  process.env.FORM_RECOGNIZER_ENDPOINT!,
  new AzureKeyCredential(process.env.FORM_RECOGNIZER_KEY!)
);

// Interface for the extracted fields
interface ExtractedData {
  certificationName: string;
  certificationNumber: string;
  issueDate: string;
}

const extractFromText = (text: string) => {
  let certificationName = "";
  let certificationNumber = "";
  let issueDate = "";

  // Define regex patterns to match the fields
  const namePattern = /[A-Za-z]+\s+[A-Za-z]+/; // Simple pattern for name (first and last)
  const numberPattern = /(\d{6,})/; // Assuming certification number is numeric with at least 6 digits
  const datePattern = /(\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b)/; // For dates like MM/DD/YYYY or similar

  // Match patterns in the text
  const nameMatch = text.match(namePattern);
  const numberMatch = text.match(numberPattern);
  const dateMatch = text.match(datePattern);

  if (nameMatch) certificationName = nameMatch[0];
  if (numberMatch) certificationNumber = numberMatch[0];
  if (dateMatch) issueDate = dateMatch[0];

  return { certificationName, certificationNumber, issueDate };
};

// Route to upload and process the certificate using OCR and regex
router.post(
  "/upload-certificate",
  upload.single("certificate"),
  async (req, res) => {
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("File:", req.file);
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Get the file buffer from the uploaded certificate
    const fileBuffer = req.file.buffer;

    // Perform OCR analysis using Azure Form Recognizer's OCR capabilities
    const poller = await formRecognizerClient.beginAnalyzeDocument(
      "prebuilt-document",
      fileBuffer
    );

    // Poll until the OCR analysis is complete
    const result = await poller.pollUntilDone();

    if (!result) {
      res.status(400).send("Document OCR analysis failed");
      return;
    }

    // Get the full text content from the document
    const extractedText = result.content || "";

    // Use pattern matching to extract the relevant fields
    const extractedData = extractFromText(extractedText);

    // Send the extracted data as a response
    res.json(extractedData);
    try {
    } catch (error: any) {
      console.error("Error processing certificate:", error.message);
      res.status(500).send("Error processing the certificate");
    }
  }
);

const extractDEADetails = (text: string) => {
  let deaNumber = "";
  let certificationNumber = "";
  let businessActivity = "";
  let employerAddress = "";
  let expiryDate = "";

  // Regex patterns for matching fields in the DEA document
  const deaNumberPattern = /DEA REGISTRATION NUMBER\s+([A-Z0-9]+)/i;
  const certificationNumberPattern = /THIS REGISTRATION EXPIRES\s+([0-9\-]+)/i;
  const businessActivityPattern = /BUSINESS ACTIVITY\s+([A-Z]+)/i;
  const employerAddressPattern = /(\d+\s+[A-Za-z]+\s+[A-Za-z0-9\s,]+)/i;
  const expiryDatePattern = /THIS REGISTRATION EXPIRES\s+([0-9\-]+)/i; // Expiry date regex pattern

  const deaNumberMatch = text.match(deaNumberPattern);
  const certificationNumberMatch = text.match(certificationNumberPattern);
  const businessActivityMatch = text.match(businessActivityPattern);
  const employerAddressMatch = text.match(employerAddressPattern);
  const expiryDateMatch = text.match(expiryDatePattern);

  if (deaNumberMatch) deaNumber = deaNumberMatch[1];
  if (certificationNumberMatch)
    certificationNumber = certificationNumberMatch[1];
  if (businessActivityMatch) businessActivity = businessActivityMatch[1];
  if (employerAddressMatch) employerAddress = employerAddressMatch[1];
  if (expiryDateMatch) expiryDate = expiryDateMatch[1];

  return {
    deaNumber,
    certificationNumber,
    businessActivity,
    employerAddress,
    expiryDate,
  };
};

// Route to upload and process the DEA certificate
router.post(
  "/upload-dea-certificate",
  upload.single("certificate"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      // Get the file buffer from the uploaded certificate
      const fileBuffer = req.file.buffer;

      // Perform OCR analysis using Azure Form Recognizer's OCR capabilities
      const poller = await formRecognizerClient.beginAnalyzeDocument(
        "prebuilt-document",
        fileBuffer
      );

      // Poll until the OCR analysis is complete
      const result = await poller.pollUntilDone();

      if (!result) {
        return res.status(400).send("Document OCR analysis failed");
      }

      // Get the full text content from the document
      const extractedText = result.content || "";

      // Use pattern matching to extract the relevant fields
      const extractedData = extractDEADetails(extractedText);

      // Send the extracted data as a response
      res.json(extractedData);
    } catch (error: any) {
      console.error("Error processing DEA certificate:", error.message);
      res.status(500).send("Error processing the certificate");
    }
  }
);

router.post("/custom-resume", async (req, res) => {
  try {
    const { resume, email } = req.body;
    const collection = await getDbCollection("user");

    const user = await collection.findOne({ email });

    if (!user) {
      res.status(400).json({ message: "No user found" });
      return;
    }

    await collection.updateOne(
      { email: email },
      {
        $set: {
          customResume: resume,
        },
      }
    );

    res.status(200).json({ message: "Added Custom Resume" });
  } catch (error: any) {
    console.error("Error Uploading Custom Resume:", error.message);
    res.status(500).json({ message: "Error Uploading Custom Resume" });
  }
});

router.get("/custom-resume/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const collection = await getDbCollection("user");

    const user = await collection.findOne({ email });

    if (!user) {
      res.status(400).json({ message: "No user found" });
      return;
    }

    res.status(200).json({ message: user.customResume });
  } catch (error: any) {
    console.error("Error processing DEA certificate:", error.message);
    res.status(500).send("Error processing the certificate");
  }
});

router.get("/view-profile/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const collection = await getDbCollection("user");
    const user = await collection.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "No user found" });
      return;
    }

    const progressCollection = await getDbCollection("progress");

    const progresses = await progressCollection.find({ email }).toArray();

    const {
      number,
      firstName,
      middleName,
      lastName,
      npiNumber,
      primarySpeciality,
      licensedState,
      licenseNumber,
      expirationDate,
      deaNumber,
      licenseCertificateUrl,
    } = user;

    res.status(200).json({
      message: {
        number,
        firstName,
        middleName,
        lastName,
        npiNumber,
        primarySpeciality,
        licensedState,
        licenseNumber,
        expirationDate,
        deaNumber,
        licenseCertificateUrl,
        progresses: progresses,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

router.post("/update-employer-info", async (req, res) => {
  try {
    const { email, employmentType, empNumber, empAddress, empPhNumber } =
      req.body;
    const collection = await getDbCollection("user");

    const user = await collection.findOne({ email });

    if (!user) {
      res.status(400).json({ message: "No user found" });
      return;
    }

    await collection.updateOne(
      { email: email },
      {
        $set: {
          employmentType: employmentType,
          empNumber: empNumber,
          empAddress: empAddress,
          empPhNumber: empPhNumber,
        },
      }
    );

    res.status(200).json({ message: "Update Employer Information" });
  } catch (error: any) {
    console.error("Error Updating Employer Information:", error.message);
    res.status(500).json({ message: "Error Updating Employer Information" });
  }
});

router.post("/cme-hours", async (req, res) => {
  try {
    const { email, startDate, endDate } = req.body;

    if (!email || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Email, startDate, and endDate are required" });
    }

    const progressCollection = await getDbCollection("progress");

    // Fetch records that fall within the date range
    const progressRecords = await progressCollection
      .find({
        email: email,
        issueDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      })
      .toArray();

    // Calculate total CME hours completed within the date range
    const totalCmeHours = progressRecords.reduce(
      (total, record) => total + (record.progressCertificateHours || 0),
      0
    );

    res.status(200).json({ cmeHoursCompleted: totalCmeHours });
  } catch (error) {
    console.error("Error fetching CME hours:", error);
    res.status(500).json({ message: "Error fetching CME hours", error: error });
  }
});

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

export default router;
