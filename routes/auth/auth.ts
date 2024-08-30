import { Router, Request, Response } from "express";
import User from "../../models/User";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import Joi from "joi";
import authenticate  from "../../core/authValidation";
import { CosmosClient, CosmosClientOptions } from "@azure/cosmos";

import database, { getContainer } from "../../db/dbClient";

const router = Router();

//REGISTER SCHEMA - NEEDS CHANGE
const registerSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});

//REGISTER - NEEDS CHANGE
router.post("/register", authenticate, async (req: Request, res: Response) => {
  try {

    const databaseId:string = String(process.env.DB_ID);

    const { container } = await getContainer(databaseId, 'USERS');

    const values = JSON.parse(JSON.stringify(req.user));
   
    const user = {
      "id": values.user_id,
      "email": values.email,
      "firstName": values.given_name,
      "lastName": values.family_name
    };
    /*const emailExist = await User.findOne({ email: user.email  });
    if (emailExist) {
      return res
        .status(400)
        .json({ status: 400, message: "Email Already Exists" });
    }
*/
    //THE USER IS ADDED
    //await user.save();
    const createResponse = await container.items.create(user);


    res.status(201).json({
      status: "201",
      message: "created",
    });
  } catch (error: any) {
    console.log(error.details);
    if (error.details) {
      return res
        .status(400)
        .json({ status: "500", message: error.details[0]?.message });
    } else {
      return res.status(500).json({ status: "500", message: error });
    }
  }
});

//LOGIN SCHEMA
const loginSchema = Joi.object({
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});

//SIGNIN USER - NEEDS CHANGE
router.post("/signin", async (req: Request, res: Response) => {
  try {
    //CHECKING IF EMAIL EXISTS
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(400)
        .json({ status: "400", message: 'Email doesn"t exist' });
    }

    const validPassword = await bcrypt.compare(
      req.body.password,
      "user.password"
    );

    if (!validPassword) {
      return res
        .status(400)
        .json({ status: "400", message: "Incorrect Password !!!" });
    }

    //VALIDATION OF USER INPUTS
    await loginSchema.validateAsync(req.body);

    //CREATE TOKEN
    const token = jwt.sign({ _id: user.userId }, process.env.TOKEN_SECRET!, {
      expiresIn: "6h", // expires in 6 hours
    });

    res.status(200).header("auth-token", token).json({
      status: "200",
      token: token,
      userId: user.userId,
      name: user.firstName,
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

export default router;
