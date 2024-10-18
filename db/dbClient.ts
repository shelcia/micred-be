import { CosmosClient, CosmosClientOptions, Database } from "@azure/cosmos";

const endpoint: string = String(process.env.DB_END_POINT);
const key: string = String(process.env.DB_KEY);

const databaseId: string = String(process.env.DB_ID);

const options: CosmosClientOptions = {
  endpoint: endpoint,
  key: key,
  userAgentSuffix: "Micred cosmmo db",
};

const client: CosmosClient = new CosmosClient(options);

export async function getContainer(databaseId: string, containerId: string) {
  const dbResponse = await client.databases.createIfNotExists({
    id: databaseId,
  });
  const db = dbResponse.database;
  return await db.containers.createIfNotExists({ id: containerId });
}

export default client;
