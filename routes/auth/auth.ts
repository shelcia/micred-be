import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto"; // For generating OTP
import jwt, { JwtPayload } from "jsonwebtoken";
import multer from "multer";
import {
  getDbCollection,
  sendMail,
  uploadToBlobStorage,
} from "../../lib/helpers";
import axios from "axios";
import Joi from "joi";
import dayjs from "dayjs";
import { StateKeys } from "../../lib/types";
import { cmeGuidelines } from "../../constants";

const router = Router();

// Generate a random OTP
export function generateOtp() {
  return crypto.randomInt(1000, 9999).toString(); // Generates a 4-digit OTP
}

router.post("/send-otp", async (req: Request, res: Response) => {
  const { email, number } = req.body;

  if (!email) {
    return res.status(400).send("Email is required");
  }

  try {
    const collection = await getDbCollection("user");

    const otp = generateOtp();

    // Store the OTP in the database with the user (you might want to also store an expiration time)
    await collection.updateOne(
      { email: email, number: number },
      { $set: { otp: otp, otpCreatedAt: new Date() } },
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
    const collection = await getDbCollection("user");
    // Find user by email
    const user = await collection.findOne({ email });

    if (!user) {
      return res.status(404).json("User not found");
    }

    // Check if OTP matches and is still valid (you can also add a timestamp check here)
    if (user.otp === otp) {
      // If valid, clear the OTP from the database or mark as verified
      await collection.updateOne(
        { email },
        { $unset: { otp: "" } } // Remove the OTP after successful verification
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

router.post("/set-password", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json("Email, password are required");
  }

  try {
    const collection = await getDbCollection("user");

    // Find user by email
    const user = await collection.findOne({ email });

    if (!user) {
      return res.status(404).json("User not found");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set the new password and mark OTP as verified
    await collection.updateOne(
      { email },
      {
        $set: { password: hashedPassword, otpVerified: true },
        $unset: { otp: "" }, // Remove the OTP after successful verification
      }
    );

    return res.status(200).json("Password set successfully");
  } catch (error) {
    console.error("Error setting password:", error);
    res.status(500).json("Failed to set password");
  }
});

router.post("/complete-name", async (req: Request, res: Response) => {
  const { firstName, middleName, lastName, email } = req.body;

  // Validate input
  if (!firstName || !lastName) {
    return res
      .status(400)
      .json({ message: "First name and last name are required." });
  }

  try {
    const collection = await getDbCollection("user");
    // Find user by email
    const user = await collection.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update user's profile details
    user.firstName = firstName;
    user.middleName = middleName || ""; // Optional
    user.lastName = lastName;

    await collection.updateOne(
      { email },
      {
        $set: {
          firstName: firstName,
          middleName: middleName,
          lastName: lastName,
        },
      }
    );

    const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET!, {
      expiresIn: "6h", // expires in 6 hours
    });

    res.status(200).json({
      message: {
        token: token,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/complete-profile",
  upload.single("licenseCertificate"),
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        npiNumber,
        primarySpeciality,
        licensedState,
        licenseNumber,
        expirationDate,
        deaNumber,
      } = req.body as {
        currentLicenseDate: string;
        cmeHoursCompleted: number;
        email: string;
        npiNumber: string;
        primarySpeciality: string;
        licensedState: StateKeys;
        licenseNumber: string;
        expirationDate: string;
        deaNumber: string;
      };
      let licenseCertificateUrl = "";
      if (req.file) {
        console.log(req.file);
        // Upload file to Azure Blob Storage
        licenseCertificateUrl = await uploadToBlobStorage(
          req.file.buffer,
          `${req.file.originalname}-${Date.now()}`,
          "licenses"
        );
      }

      const collection = await getDbCollection("user");
      // Find user by email
      const user = await collection.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      let stateGuidelines = cmeGuidelines[licensedState];
      const { renewalCycleYears } = stateGuidelines;

      const nextRenewalDate = dayjs(user.expirationDate)
        .add(renewalCycleYears, "year")
        .format("MM/DD/YYYY");

      await collection.updateOne(
        { email },
        {
          $set: {
            npiNumber: npiNumber,
            primarySpeciality: primarySpeciality,
            licensedState: licensedState,
            licenseNumber: licenseNumber,
            expirationDate: expirationDate,
            nextRenewalDate: nextRenewalDate,
            deaNumber: deaNumber,
            licenseCertificateUrl: [
              ...(user.licenseCertificateUrl ? user.licenseCertificateUrl : []),
              licenseCertificateUrl,
            ],
          },
        }
      );

      res
        .status(201)
        .json({ message: "Profile created successfully", profile: user });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error while completing form", error: error });
    }
  }
);

router.get("/npi/:number", async (req: Request, res: Response) => {
  const npiNumber = req.params.number;
  try {
    const response = await axios.get(
      `https://npiregistry.cms.hhs.gov/api/?number=${npiNumber}&version=2.1`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching NPI data", error });
  }
});

// router.post("/complete-date", async (req: Request, res: Response) => {
//   try {
//     const { email } = req.body;

//     const collection = await getDbCollection("user");
//     // Find user by email
//     const user = await collection.findOne({ email });

//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Ensure the licensedState is valid
//     const licensedState = user.licensedState as StateKeys; // Explicitly cast if you are sure the state is valid
//     if (!licensedState || !(licensedState in cmeGuidelines)) {
//       return res.status(400).json({
//         message: "Invalid or missing licensed state for the user.",
//       });
//     }

//     let stateGuidelines = cmeGuidelines[licensedState];
//     const { renewalCycleYears } = stateGuidelines;

//     const nextRenewalDate = dayjs(user.expirationDate)
//       .add(renewalCycleYears, "year")
//       .format("MM/DD/YYYY");

//     await collection.updateOne(
//       { email },
//       {
//         $set: {
//           nextRenewalDate: nextRenewalDate,
//         },
//       }
//     );

//     res
//       .status(201)
//       .json({ message: "Profile created successfully", profile: user });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error while completing form", error: error });
//   }
// });

//REGISTER SCHEMA - NEEDS CHANGE
// const registerSchema = Joi.object({
//   name: Joi.string().min(3).required(),
//   email: Joi.string().min(6).required().email(),
//   password: Joi.string().min(6).required(),
// });

// //REGISTER - NEEDS CHANGE
// router.post("/register", authenticate, async (req: Request, res: Response) => {
//   try {
//     const databaseId: string = String(process.env.DB_ID);

//     const { container } = await getContainer(databaseId, "USERS");

//     const values = JSON.parse(JSON.stringify(req.user));

//     const user = {
//       id: values.user_id,
//       email: values.email,
//       firstName: values.given_name,
//       lastName: values.family_name,
//     };
//     /*const emailExist = await User.findOne({ email: user.email  });
//     if (emailExist) {
//       return res
//         .status(400)
//         .json({ status: 400, message: "Email Already Exists" });
//     }
// */
//     //THE USER IS ADDED
//     //await user.save();
//     const createResponse = await container.items.create(user);

//     res.status(201).json({
//       status: "201",
//       message: "created",
//     });
//   } catch (error: any) {
//     console.log(error.details);
//     if (error.details) {
//       return res
//         .status(400)
//         .json({ status: "500", message: error.details[0]?.message });
//     } else {
//       return res.status(500).json({ status: "500", message: error });
//     }
//   }
// });

//LOGIN SCHEMA
const loginSchema = Joi.object({
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});

//SIGNIN USER - NEEDS CHANGE
router.post("/signin", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    //CHECKING IF EMAIL EXISTS
    const collection = await getDbCollection("user");
    // Find user by email
    const user = await collection.findOne({ email });

    if (!user) {
      res.status(400).json({ status: "400", message: 'Email doesn"t exist' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res
        .status(400)
        .json({ status: "400", message: "Incorrect Password !!!" });
    }

    //VALIDATION OF USER INPUTS
    // await loginSchema.validateAsync(req.body);

    //CREATE TOKEN
    const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET!, {
      expiresIn: "6h", // expires in 6 hours
    });

    res
      .status(200)
      .header("auth-token", token)
      .json({
        message: {
          status: "200",
          token: token,
          _id: user._id,
          name: user.firstName,
        },
      });
  } catch (error: any) {
    if (error.details) {
      return res
        .status(400)
        .json({ status: "400", message: error.details[0]?.message });
    } else {
      return res.status(500).json({ status: "400", message: error });
    }
  }
});

// router.get("/signin/callback", async (req: Request, res: Response) => {
//   const { code } = req.query;
//   try {
//     const response = await axios.post(
//       `https://${tenant}.b2clogin.com/${tenant}.onmicrosoft.com/oauth2/v2.0/token`,
//       new URLSearchParams({
//         client_id: clientId,
//         client_secret: clientSecret,
//         grant_type: "authorization_code",
//         code: code as string,
//         redirect_uri: redirectUri,
//       })
//     );
//     const { access_token } = response.data;
//     res.json({ message: "Login successful", token: access_token });
//   } catch (error) {
//     res.status(500).json({ message: "Login failed", error: error.message });
//   }
// });

// router.get("/forgot-password", (req: Request, res: Response) => {
//   res.redirect(b2cForgotPasswordUrl);
// });

export default router;
