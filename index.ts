import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import authRoute from "./routes/auth/auth";
import docRoute from "./routes/document/document";
import profileRoute from "./routes/profile/profile";

dotenv.config();

const app: Application = express();
const PORT: number | string = process.env.PORT || 8000;

// MIDDLEWARE
app.use(express.json(), cors());

app.use(
  bodyParser.raw({ type: "application/octet-stream", limit: "50mb" }),
  cors()
);

// ROUTE MIDDLEWARE
app.use("/api/auth", authRoute);
app.use("/api/doc", docRoute);
app.use("/api/profile", profileRoute);

app.get("/", (req: Request, res: Response) => {
  res.send(`<p>MiCred Backend!</p>`);
});

// Add the app.listen() to start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
