import { KeystoneContext } from "@keystone-6/core/types";
import { Request, Response } from "express";
import speakeasy from "speakeasy"; // جایگزین otplib برای پایداری بیشتر
import { decrypt } from "./crypto";
import * as crypto from "crypto";
const APP_SECRET = process.env.APP_SECRET || "Ghofli_Private_Key_2024";
export const verifySignature = (req: Request) => {
  const signature = req.headers['x-signature'];
  console.log(signature)
  const timestamp = req.headers['x-timestamp'] as string;
  const { phoneNumber } = req.body;
  console.log(timestamp)
  console.log(APP_SECRET)
  console.log(phoneNumber)
  if (!signature || !timestamp) {
    return false;
  }
  // بازسازی امضا برای مقایسه
  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(timestamp + phoneNumber)
    .digest('hex');

  const isValid = signature === expectedSignature;
  return isValid;
};

export const verifyOTPHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext,
) => {
  try {
    console.log("AAAAAAA");
    const { phoneNumber, secret: rawSecretFromMobile, token } = req.body;
    // ۱. پیدا کردن اپلیکیشن بر اساس API Key
    console.log(rawSecretFromMobile)
    if (rawSecretFromMobile) {
      const isSigValid = verifySignature(req); // نتیجه را در یک متغیر بریز
      if (!isSigValid) {
        console.log("Blocking Request: Invalid Signature");
        return res.status(403).json({ error: "امضای دیجیتال نامعتبر است" });
      }
    }
    // ۲. پیدا کردن توکن کاربر برای این اپلیکیشن
    const userTokens = await context.query.OTPToken.findMany({
      where: {
        user: { phoneNumber: { equals: phoneNumber } }, // جستجو بر اساس شماره موبایل
      },
      query: "id encryptedSecret isVerified",
      orderBy: { createdAt: "desc" },
    });

    if (!userTokens.length)
      return res.status(404).json({ error: "سرویس برای این کاربر یافت نشد" });

    const targetToken = userTokens[0];
    const decryptedSecret = decrypt(targetToken.encryptedSecret);

    // ۳. سناریوی اول: تاییدِ اولین اسکن توسط موبایل
    if (rawSecretFromMobile) {
      if (rawSecretFromMobile === decryptedSecret) {
        await context.query.OTPToken.updateOne({
          where: { id: targetToken.id },
          data: { isVerified: true },
        });
        return res.json({ success: true, message: "اتصال با موفقیت تایید شد" });
      }
      return res.status(400).json({ error: "سکرت نامعتبر است" });
    }

    // ۴. سناریوی دوم: تاییدِ کد ۶ رقمی (Login)
    if (token) {
      const isValid = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: "base32",
        token: token,
        window: 1, // اجازه دادن به کد ۳۰ ثانیه قبل و بعد برای رفع اختلاف زمانی جزئی
      });

      // ۵. ثبت لاگ دسترسی
      await context.query.AccessLog.createOne({
        data: {
          token: { connect: { id: targetToken.id } },
          action: isValid ? "VERIFY_SUCCESS" : "VERIFY_FAILED",
          ipAddress: req.ip || "",
        },
      });

      return res.json({ success: isValid });
    }

    return res.status(400).json({ error: "Token or Secret is required" });
  } catch (error: any) {
    console.error("Verify Error:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};
