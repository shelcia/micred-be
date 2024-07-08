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
const User_1 = __importDefault(require("../../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
//REGISTER SCHEMA - NEEDS CHANGE
const registerSchema = joi_1.default.object({
    name: joi_1.default.string().min(3).required(),
    email: joi_1.default.string().min(6).required().email(),
    password: joi_1.default.string().min(6).required(),
});
//REGISTER - NEEDS CHANGE
router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        //CHECK IF MAIL ALREADY EXISTS
        const emailExist = yield User_1.default.findOne({ email: req.body.email });
        if (emailExist) {
            return res
                .status(400)
                .json({ status: 400, message: "Email Already Exists" });
        }
        //HASHING THE PASSWORD
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(req.body.password, salt);
        const user = new User_1.default({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        });
        //VALIDATION OF USER INPUTS
        yield registerSchema.validateAsync(req.body);
        //THE USER IS ADDED
        yield user.save();
        //CREATE TOKEN
        const token = jsonwebtoken_1.default.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
            expiresIn: "6h", // expires in 6 hours
        });
        res.status(200).header("auth-token", token).json({
            status: "200",
            token: token,
            userId: user._id,
            name: user.name,
        });
    }
    catch (error) {
        if (error.details) {
            return res
                .status(400)
                .json({ status: "500", message: (_a = error.details[0]) === null || _a === void 0 ? void 0 : _a.message });
        }
        else {
            return res.status(500).json({ status: "500", message: error });
        }
    }
}));
//LOGIN SCHEMA
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().min(6).required().email(),
    password: joi_1.default.string().min(6).required(),
});
//SIGNIN USER - NEEDS CHANGE
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        //CHECKING IF EMAIL EXISTS
        const user = yield User_1.default.findOne({ email: req.body.email });
        if (!user) {
            return res
                .status(400)
                .json({ status: "400", message: 'Email doesn"t exist' });
        }
        const validPassword = yield bcryptjs_1.default.compare(req.body.password, user.password);
        if (!validPassword) {
            return res
                .status(400)
                .json({ status: "400", message: "Incorrect Password !!!" });
        }
        //VALIDATION OF USER INPUTS
        yield loginSchema.validateAsync(req.body);
        //CREATE TOKEN
        const token = jsonwebtoken_1.default.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
            expiresIn: "6h", // expires in 6 hours
        });
        res.status(200).header("auth-token", token).json({
            status: "200",
            token: token,
            userId: user._id,
            name: user.name,
        });
    }
    catch (error) {
        if (error.details) {
            return res
                .status(400)
                .json({ status: "400", message: (_b = error.details[0]) === null || _b === void 0 ? void 0 : _b.message });
        }
        else {
            return res.status(500).json({ status: "400", message: error });
        }
    }
}));
exports.default = router;
