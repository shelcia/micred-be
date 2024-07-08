import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoute from "./routes/auth/auth";

dotenv.config();

const app: Application = express();
const PORT: number | string = process.env.PORT || 8000;

// CONNECTION TO DATABASE
mongoose
  .connect(process.env.DB_CONNECT!, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server up and running at ${PORT}`));
  })
  .catch((error: any) => {
    console.error("Error connecting to MongoDB:", error);
  });

// MIDDLEWARE
app.use(express.json(), cors());

// ROUTE MIDDLEWARE
app.use("/api/auth", authRoute);

app.get("/", (req: Request, res: Response) => {
  res.send(`<p>Ai Fairness Backend !</p>`);
});
