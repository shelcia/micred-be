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
exports.generateOtp = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto")); // For generating OTP
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const helpers_1 = require("../../lib/helpers");
const axios_1 = __importDefault(require("axios"));
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
function sendOtp(email, otp) {
    return __awaiter(this, void 0, void 0, function* () {
        // Example using Nodemailer for email
        const transporter = nodemailer_1.default.createTransport({
            service: "Gmail", // Replace with your email service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP code is: ${otp}`,
        };
        yield transporter.sendMail(mailOptions);
    });
}
// Generate a random OTP
function generateOtp() {
    return crypto_1.default.randomInt(1000, 9999).toString(); // Generates a 4-digit OTP
}
exports.generateOtp = generateOtp;
router.post("/send-otp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, number } = req.body;
    if (!email) {
        return res.status(400).send("Email is required");
    }
    try {
        const collection = yield (0, helpers_1.getDbCollection)("user");
        const otp = generateOtp();
        // Store the OTP in the database with the user (you might want to also store an expiration time)
        yield collection.updateOne({ email: email, number: number }, { $set: { otp: otp, otpCreatedAt: new Date() } }, { upsert: true } // Create a new document if one does not exist
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
        const collection = yield (0, helpers_1.getDbCollection)("user");
        // Find user by email
        const user = yield collection.findOne({ email });
        if (!user) {
            return res.status(404).json("User not found");
        }
        // Check if OTP matches and is still valid (you can also add a timestamp check here)
        if (user.otp === otp) {
            // If valid, clear the OTP from the database or mark as verified
            yield collection.updateOne({ email }, { $unset: { otp: "" } } // Remove the OTP after successful verification
            );
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
router.post("/set-password", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json("Email, password are required");
    }
    try {
        const collection = yield (0, helpers_1.getDbCollection)("user");
        // Find user by email
        const user = yield collection.findOne({ email });
        if (!user) {
            return res.status(404).json("User not found");
        }
        // Hash the new password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Set the new password and mark OTP as verified
        yield collection.updateOne({ email }, {
            $set: { password: hashedPassword, otpVerified: true },
            $unset: { otp: "" }, // Remove the OTP after successful verification
        });
        return res.status(200).json("Password set successfully");
    }
    catch (error) {
        console.error("Error setting password:", error);
        res.status(500).json("Failed to set password");
    }
}));
router.post("/complete-name", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstName, middleName, lastName, email } = req.body;
    // Validate input
    if (!firstName || !lastName) {
        return res
            .status(400)
            .json({ message: "First name and last name are required." });
    }
    try {
        const collection = yield (0, helpers_1.getDbCollection)("user");
        // Find user by email
        const user = yield collection.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        // Update user's profile details
        user.firstName = firstName;
        user.middleName = middleName || ""; // Optional
        user.lastName = lastName;
        yield collection.updateOne({ email }, {
            $set: {
                firstName: firstName,
                middleName: middleName,
                lastName: lastName,
            },
        });
        res.status(200).json({ message: "Profile updated successfully." });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Failed to update profile." });
    }
}));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.post("/complete-profile", upload.single("licenseCertificate"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, npiNumber, primarySpeciality, licensedState, licenseNumber, expirationDate, deaNumber, } = req.body;
    let licenseCertificateUrl = "";
    if (req.file) {
        console.log(req.file);
        // Upload file to Azure Blob Storage
        licenseCertificateUrl = yield (0, helpers_1.uploadToBlobStorage)(req.file.buffer, `${req.file.originalname}-${Date.now()}`, "licenses");
    }
    const collection = yield (0, helpers_1.getDbCollection)("user");
    // Find user by email
    const user = yield collection.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found." });
    }
    yield collection.updateOne({ email }, {
        $set: {
            npiNumber: npiNumber,
            primarySpeciality: primarySpeciality,
            licensedState: licensedState,
            licenseNumber: licenseNumber,
            expirationDate: expirationDate,
            deaNumber: deaNumber,
            licenseCertificateUrl: [
                ...(user.licenseCertificateUrl ? user.licenseCertificateUrl : []),
                licenseCertificateUrl,
            ],
        },
    });
    res
        .status(201)
        .json({ message: "Profile created successfully", profile: user });
    try {
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error while completing form", error: error });
    }
}));
router.get("/npi/:number", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const npiNumber = req.params.number;
    try {
        const response = yield axios_1.default.get(`https://npiregistry.cms.hhs.gov/api/?number=${npiNumber}&version=2.1`);
        res.json(response.data);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching NPI data", error });
    }
}));
router.get("/allusers", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const collection = yield (0, helpers_1.getDbCollection)("user");
    // Find user by email
    const users = yield collection.find().toArray();
    console.log({ users });
    res.status(200).send(users);
    try {
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching NPI data", error });
    }
}));
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
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().min(6).required().email(),
    password: joi_1.default.string().min(6).required(),
});
//SIGNIN USER - NEEDS CHANGE
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { email, password } = req.body;
    //CHECKING IF EMAIL EXISTS
    const collection = yield (0, helpers_1.getDbCollection)("user");
    // Find user by email
    const user = yield collection.findOne({ email });
    if (!user) {
        res.status(400).json({ status: "400", message: 'Email doesn"t exist' });
        return;
    }
    // const validPassword = await bcrypt.compare(
    //   req.body.password,
    //   "user.password"
    // );
    // if (!validPassword) {
    //   return res
    //     .status(400)
    //     .json({ status: "400", message: "Incorrect Password !!!" });
    // }
    //VALIDATION OF USER INPUTS
    // await loginSchema.validateAsync(req.body);
    //CREATE TOKEN
    const token = jsonwebtoken_1.default.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
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
    try {
    }
    catch (error) {
        if (error.details) {
            return res
                .status(400)
                .json({ status: "400", message: (_a = error.details[0]) === null || _a === void 0 ? void 0 : _a.message });
        }
        else {
            return res.status(500).json({ status: "400", message: error });
        }
    }
}));
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
exports.default = router;
