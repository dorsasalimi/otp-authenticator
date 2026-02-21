import { config } from "@keystone-6/core";
import 'dotenv/config';
import { lists } from "./schema";
import { recoveryHandler } from "./api/recovery";
import { withAuth, session } from "./auth";
import generateQR from "./api/generate-qr";
import { verifyOTPHandler } from "./api/verify";
import { authenticateHandler } from "./api/authenticate";
import { removeOTPHandler } from "./api/remove";
import { pinHandler } from "./api/pin";
import rateLimit from "express-rate-limit";
import cors from 'cors';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "تعداد تلاش‌های شما بیش از حد مجاز بود. لطفاً ۱۵ دقیقه صبر کنید.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "تعداد تلاش‌های PIN شما بیش از حد مجاز بود. لطفاً ۱۵ دقیقه صبر کنید.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const scanLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10,
  message: { error: "لطفاً کمی صبر کنید و دوباره اسکن کنید." },
});

export default withAuth(
  config({
    db: {
      provider: "postgresql",
      url: process.env.DATABASE_URL!,
      idField: { kind: "uuid" },
    },
    lists,
    session,
    server: {
      extendExpressApp: (app, context) => {
        app.use(
          cors({
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"],
          }),
        );

        app.use(require("express").json());

        // PIN ROUTES

        app.post("/api/pin/set", pinLimiter, async (req, res) => {
          req.body.action = 'set';
          await pinHandler(req, res, context);
        });

        app.post("/api/pin/change", pinLimiter, async (req, res) => {
          req.body.action = 'change';
          await pinHandler(req, res, context);
        });

        app.post("/api/pin/disable", pinLimiter, async (req, res) => {
          req.body.action = 'disable';
          await pinHandler(req, res, context);
        });

        app.post("/api/pin/verify", pinLimiter, async (req, res) => {
          req.body.action = 'verify';
          await pinHandler(req, res, context);
        });

        app.get("/api/pin/status/:phoneNumber", async (req, res) => {
          req.body = {
            phoneNumber: req.params.phoneNumber,
            action: 'check-status'
          };
          await pinHandler(req, res, context);
        });

        // LOGIN ROUTE (PIN + OTP ONLY)

        app.post("/api/login", authLimiter, async (req, res) => {
          const { method } = req.body;

          if (method === 'pin') {
            req.body.action = 'verify';
            await pinHandler(req, res, context);
          } 
          else if (method === 'otp') {
            await authenticateHandler(req, res, context);
          } 
          else {
            if (req.body.pin) {
              req.body.action = 'verify';
              await pinHandler(req, res, context);
            } 
            else if (req.body.token && req.body.apiKey) {
              await authenticateHandler(req, res, context);
            } 
            else {
              res.status(400).json({
                error: "Invalid login method. Specify 'method' field or provide appropriate credentials."
              });
            }
          }
        });

        // OTP ROUTES

        app.post("/api/verify-otp", scanLimiter, async (req, res) => {
          await verifyOTPHandler(req, res, context);
        });

        app.post("/api/recovery", (req, res) =>
          recoveryHandler(req, res, context),
        );

        app.post("/api/authenticate", authLimiter, async (req, res) => {
          await authenticateHandler(req, res, context);
        });

        app.post("/api/remove-otp", authLimiter, async (req, res) => {
          await removeOTPHandler(req, res, context);
        });


        app.get("/api/generate-qr", async (req, res) => {
          await generateQR(req, res, context);
        });

      },
    },
  }),
);