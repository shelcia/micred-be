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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const passport_azure_ad_1 = require("passport-azure-ad");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const TENANT_NAME = process.env.TENANT_NAME;
const POLICY_NAME = process.env.POLICY_NAME;
const META_DATA_VERSION = process.env.META_DATA_VERSION;
const META_DATA_DISCOVERY = process.env.META_DATA_DISCOVERY;
const CLIENT_ID = String(process.env.CLIENT_ID);
const IS_B2C = process.env.IS_B2C;
const VALIDATE_ISSUER = process.env.VALIDATE_ISSUER;
const LOG_LEVEL = process.env.LOG_LEVEL;
const CALL_BACK = process.env.CALL_BACK;
const options = {
    identityMetadata: `https://${TENANT_NAME}.b2clogin.com/${TENANT_NAME}.onmicrosoft.com/${POLICY_NAME}/${META_DATA_VERSION}/${META_DATA_DISCOVERY}`,
    clientID: String(CLIENT_ID),
    audience: String(CLIENT_ID),
    policyName: POLICY_NAME,
    isB2C: Boolean(IS_B2C),
    validateIssuer: Boolean(VALIDATE_ISSUER),
    loggingLevel: 'info',
    passReqToCallback: false
};
const bearerStrategy = new passport_azure_ad_1.BearerStrategy(options, (token, done) => {
    const response = JSON.parse(JSON.stringify(token));
    const user = {};
    user.user_id = String(response.oid);
    user.email = response.emails[0];
    user.given_name = String(response.given_name);
    user.family_name = String(response.family_name);
    done(null, user, token);
});
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(passport_1.default.initialize());
passport_1.default.use(bearerStrategy);
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(options);
    try {
        passport_1.default.authenticate("oauth-bearer", function (err, user, info, status) {
            if (err || !user) {
                return res.status(401).json();
            }
            req.user = user;
            return next();
        })(req, res, next);
    }
    catch (error) {
        return res.status(401).json();
    }
});
exports.default = authenticate;
