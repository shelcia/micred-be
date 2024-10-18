import mongoose, { Schema, Document, model } from "mongoose";
import { IUser } from "../lib/types";

// NEEDS CHANGE

const User = mongoose.model(
  "user",
  new mongoose.Schema({
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
  })
);

export default User;
