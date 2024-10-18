"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// NEEDS CHANGE
const User = mongoose_1.default.model("user", new mongoose_1.default.Schema({
    userId: {
        type: String,
        minlength: 6,
        maxlength: 50,
    },
    firstName: {
        type: String,
        minlength: 6,
        maxlength: 50,
    },
    middleName: {
        type: String,
        minlength: 6,
        maxlength: 50,
    },
    lastName: {
        type: String,
        required: true,
        maxlength: 50,
        minlength: 6,
    },
    email: {
        type: String,
        required: true,
        maxlength: 255,
        minlength: 6,
    },
    number: {
        type: String,
        maxlength: 255,
        minlength: 6,
    },
    licenseCertificateUrl: {
        type: Array,
    },
    otpCreatedAt: {
        type: Date,
    },
    otpVerified: {
        type: Boolean,
        default: false,
    },
    date: {
        type: Date,
        default: Date.now,
    },
}));
exports.default = User;
