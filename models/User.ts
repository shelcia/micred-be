import { Schema, Document, model } from "mongoose";
import { IUser } from "../lib/types";

interface IUserDocument extends IUser, Document {}

// NEEDS CHANGE

const UserSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    minlength: 6,
    maxlength: 255,
  },
  email: {
    type: String,
    required: true,
    maxlength: 255,
    minlength: 6,
  },
  password: {
    type: String,
    required: true,
    maxlength: 1024,
    minlength: 6,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const User = model<IUserDocument>("User", UserSchema);

export default User;
