import express, { Application, Request, Response } from "express";
import morgan from "morgan";
import passport from "passport";
import {BearerStrategy,IBearerStrategyOptionWithRequest, ITokenPayload, VerifyCallback, IBearerStrategyOption} from "passport-azure-ad";

const app: Application = express();
app.use(express.json());

import dotenv from "dotenv";

dotenv.config();

const TENANT_NAME = process.env.TENANT_NAME;
const POLICY_NAME = process.env.POLICY_NAME;
const META_DATA_VERSION = process.env.META_DATA_VERSION;
const META_DATA_DISCOVERY = process.env.META_DATA_DISCOVERY;
const CLIENT_ID: String = String(process.env.CLIENT_ID);
const IS_B2C = process.env.IS_B2C;
const VALIDATE_ISSUER = process.env.VALIDATE_ISSUER;
const LOG_LEVEL = process.env.LOG_LEVEL;
const CALL_BACK = process.env.CALL_BACK;

export interface UserDetails {
    user_id: String
    given_name: string
    family_name: string
    email : String
  }
  

const options: IBearerStrategyOptionWithRequest = {
    identityMetadata: `https://${TENANT_NAME}.b2clogin.com/${TENANT_NAME}.onmicrosoft.com/${POLICY_NAME}/${META_DATA_VERSION}/${META_DATA_DISCOVERY}`,
    clientID: String(CLIENT_ID),
    audience: String(CLIENT_ID),
    policyName: POLICY_NAME,
    isB2C: Boolean(IS_B2C),
    validateIssuer: Boolean(VALIDATE_ISSUER),
    loggingLevel: 'info',
    passReqToCallback: false
  };
  
  const bearerStrategy = new BearerStrategy(
        options, 
        (token: ITokenPayload, done: VerifyCallback) =>{
            const response = JSON.parse(JSON.stringify(token));
            const user = {} as UserDetails;
            user.user_id = String(response.oid);
            user.email = response.emails[0];
            user.given_name = String(response.given_name);
            user.family_name = String(response.family_name);
            done(null, user, token);
          },
    );

app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header(
          "Access-Control-Allow-Headers",
          "Authorization, Origin, X-Requested-With, Content-Type, Accept"
        );
        next();
      });

app.use(passport.initialize());

passport.use(bearerStrategy);

const authenticate =  async (req: Request, res: Response, next: any) => {
    console.log(options);
        try{
            passport.authenticate("oauth-bearer", function(err:any, user:any, info:any, status:any) {
                if (err || !user) { return res.status(401).json(); }
               
                req.user = user;
                return next();
        })(req, res, next);
    }catch(error) {
        return res.status(401).json();
    }
   
}

export default authenticate;
