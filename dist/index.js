"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const auth_1 = __importDefault(require("./routes/auth/auth"));
const document_1 = __importDefault(require("./routes/document/document"));
const profile_1 = __importDefault(require("./routes/profile/profile"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
// MIDDLEWARE
app.use(express_1.default.json(), (0, cors_1.default)());
app.use(body_parser_1.default.raw({ type: "application/octet-stream", limit: "50mb" }), (0, cors_1.default)());
// ROUTE MIDDLEWARE
app.use("/api/auth", auth_1.default);
app.use("/api/doc", document_1.default);
app.use("/api/profile", profile_1.default);
app.get("/", (req, res) => {
    res.send(`<p>MiCred Backend!</p>`);
});
// Add the app.listen() to start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
