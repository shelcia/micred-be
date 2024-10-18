"use strict";
// import { MongoClient } from "mongodb";
// import dotenv from "dotenv";
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
exports.client = exports.connectToDatabase = void 0;
// dotenv.config();
// const connectionString: string = process.env.DB_CONNECT!;
// export async function connectToDatabase() {
//   const client = new MongoClient(connectionString, {
//     serverSelectionTimeoutMS: 60000, // 60 seconds
//     connectTimeoutMS: 60000, // 60 seconds
//     socketTimeoutMS: 60000, // 60 seconds
//     retryWrites: false, // Disable retries if you're experiencing multiple failures
//   });
//   try {
//     await client.connect();
//     console.log("Connected to Azure Cosmos DB");
//     const database = client.db("micred"); // Replace with your database name
//     const collection = database.collection("user"); // Replace with your collection name
//     // Perform actions on the collection here
//   } catch (error) {
//     console.error("Failed to connect to Azure Cosmos DB:", error);
//   } finally {
//     await client.close();
//   }
// }
// connectToDatabase().catch(console.error);
// db.ts
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectionString = process.env.DB_CONNECT; // Ensure this is set in your .env
const client = new mongodb_1.MongoClient(connectionString);
exports.client = client;
function connectToDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.connect();
            console.log("Connected to Azure Cosmos DB");
            return client.db("micred"); // Replace with your database name
        }
        catch (error) {
            console.error("Failed to connect to Azure Cosmos DB:", error);
            throw error;
        }
    });
}
exports.connectToDatabase = connectToDatabase;
