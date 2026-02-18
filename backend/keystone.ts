// Welcome to Keystone!
//
// This file is what Keystone uses as the entry-point to your headless backend
//
// Keystone imports the default export of this file, expecting a Keystone configuration object
//   you can find out more at https://keystonejs.com/docs/apis/config

import { config } from "@keystone-6/core";

// to keep this file tidy, we define our schema in a different file
import { lists } from "./schema";
import { recoveryHandler } from "./api/recovery";
// authentication is configured separately here too, but you might move this elsewhere
// when you write your list-level access control functions, as they typically rely on session data
import { withAuth, session } from "./auth";
import generateQR from "./api/generate-qr";
import { verifyOTPHandler } from "./api/verify";
import { authenticateHandler } from "./api/authenticate";
import { removeOTPHandler } from "./api/remove";
import { pinHandler } from "./api/pin";
import { biometricHandler } from './api/biometric';
import rateLimit from "express-rate-limit";
import cors from 'cors';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 5, // حداکثر ۵ درخواست
  message: {
    error: "تعداد تلاش‌های شما بیش از حد مجاز بود. لطفاً ۱۵ دقیقه صبر کنید.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 10, // حداکثر ۱۰ درخواست برای PIN
  message: {
    error: "تعداد تلاش‌های PIN شما بیش از حد مجاز بود. لطفاً ۱۵ دقیقه صبر کنید.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const scanLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // ۵ دقیقه
  max: 10,
  message: { error: "لطفاً کمی صبر کنید و دوباره اسکن کنید." },
});

export default withAuth(
  config({
    db: {
      provider: "postgresql",
      url:
        process.env.DATABASE_URL ||
        "postgresql://postgre:postgre123@localhost:5432/my-postgres",
      // اگر می‌خواهید در زمان استارت‌آپ، دیتابیس با مدل‌های شما هماهنگ شود:
      idField: { kind: "uuid" }, // یک پیشنهاد خوب برای امنیت و مقیاس‌پذیری
    },
    lists,
    session,
   server: {
     extendExpressApp: (app, context) => {
       app.use(
         cors({
           origin: "*", // برای تست لوکال این را بگذار، بعدا محدودش کن
           methods: ["GET", "POST", "PUT", "DELETE"],
           allowedHeaders: ["Content-Type", "Authorization"],
         }),
       );
       // اینجا به اکسپرس می‌گوییم که درخواست‌های JSON را بفهمد
       app.use(require("express").json());

       // PIN Management Routes
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

       app.post("/api/biometric/register", async (req, res) => {
         req.body.action = 'register';
         await biometricHandler(req, res, context);
       });

       app.post("/api/biometric/verify", async (req, res) => {
         req.body.action = 'verify';
         await biometricHandler(req, res, context);
       });

       app.post("/api/biometric/status", async (req, res) => {
         req.body.action = 'check-status';
         await biometricHandler(req, res, context);
       });

       app.post("/api/biometric/disable", async (req, res) => {
         req.body.action = 'disable';
         await biometricHandler(req, res, context);
       });

       app.post("/api/login", authLimiter, async (req, res) => {
         const { method } = req.body;

         if (method === 'pin') {
           req.body.action = 'verify';
           await pinHandler(req, res, context);
         } else if (method === 'biometric') {
           req.body.action = 'verify';
           await biometricHandler(req, res, context);
         } else if (method === 'otp') {
           await authenticateHandler(req, res, context);
         } else {
           // Auto-detect
           if (req.body.pin) {
             req.body.action = 'verify';
             await pinHandler(req, res, context);
           } else if (req.body.token && req.body.apiKey) {
             await authenticateHandler(req, res, context);
           } else if (req.body.biometricToken) {
             req.body.action = 'verify';
             await biometricHandler(req, res, context);
           } else {
             res.status(400).json({
               error: "Invalid login method. Specify 'method' field or provide appropriate credentials."
             });
           }
         }
       });


        // Existing routes
        app.post("/api/verify-otp", scanLimiter, async (req, res) => {
          await verifyOTPHandler(req, res, context);
        });

        app.get("/api/server-time", (req, res) => {
          // ارسال زمان دقیق سرور به صورت Timestamp
          // این به اپلیکیشن موبایل کمک می‌کند تا اختلاف ساعت گوشی را محاسبه کند
          res.json({ serverTime: Date.now() });
        });

        app.get("/api/generate-qr", async (req, res) => {
          await generateQR(req, res, context);
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
      },
    },
  }),
);