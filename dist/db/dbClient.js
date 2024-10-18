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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContainer = void 0;
const cosmos_1 = require("@azure/cosmos");
const endpoint = String(process.env.DB_END_POINT);
const key = String(process.env.DB_KEY);
const databaseId = String(process.env.DB_ID);
const options = {
    endpoint: endpoint,
    key: key,
    userAgentSuffix: "Micred cosmmo db",
};
const client = new cosmos_1.CosmosClient(options);
function getContainer(databaseId, containerId) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbResponse = yield client.databases.createIfNotExists({
            id: databaseId,
        });
        const db = dbResponse.database;
        return yield db.containers.createIfNotExists({ id: containerId });
    });
}
exports.getContainer = getContainer;
exports.default = client;
