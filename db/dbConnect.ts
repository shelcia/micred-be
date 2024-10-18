// import { MongoClient } from "mongodb";
// import dotenv from "dotenv";

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
import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const connectionString: string = process.env.DB_CONNECT!; // Ensure this is set in your .env
const client = new MongoClient(connectionString);

async function connectToDatabase(): Promise<Db> {
  try {
    await client.connect();
    console.log("Connected to Azure Cosmos DB");
    return client.db("micred"); // Replace with your database name
  } catch (error) {
    console.error("Failed to connect to Azure Cosmos DB:", error);
    throw error;
  }
}

export { connectToDatabase, client };
