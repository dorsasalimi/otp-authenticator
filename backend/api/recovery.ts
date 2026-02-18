import { KeystoneContext } from "@keystone-6/core/types";
import { Request, Response } from "express";
import axios from "axios"; // برای فراخوانی API فراز اس‌ام‌اس
import { decrypt } from "./crypto";
const FARAZ_API_KEY = process.env.FARAZ_API_KEY;
const RECOVERY_PATTERN_CODE = "your-pattern-code"; // کد الگوی ثبت شده در پنل

export const recoveryHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext,
) => {
  const { phoneNumber, action, code } = req.body;

  if (action === "REQUEST_OTP") {
    // ۱. تولید کد تایید موقت (مثلاً ۵ رقمی)
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
    const expireTime = new Date(Date.now() + 5 * 60 * 1000); // ۵ دقیقه اعتبار
    // ۲. ذخیره موقت کد در دیتابیس یا کش (اینجا ساده‌سازی شده)
    // پیشنهاد: یک جدول برای VerificationCodes بساز یا از Redis استفاده کن
    const user = await context.db.OtpUser.findOne({ where: { phoneNumber } });

    if (user) {
      await context.db.OtpUser.updateOne({
        where: { phoneNumber },
        data: {
          verificationCode: otpCode,
          verificationExpire: expireTime,
        },
      });
    } else {
      await context.db.OtpUser.createOne({
        data: {
          phoneNumber,
          verificationCode: otpCode,
          verificationExpire: expireTime,
        },
      });
    }
    // ۳. ارسال پیامک از طریق متد Pattern فراز اس‌ام‌اس
    try {
      await axios.post("https://ippanel.com/api/select", {
        op: "pattern",
        user: "your_username",
        pass: "your_password",
        fromNum: "3000xxxxx",
        toNum: phoneNumber,
        patternCode: RECOVERY_PATTERN_CODE,
        inputData: [{ "verification-code": otpCode }],
      });
      return res.json({ success: true, message: "SMS Sent" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to send SMS" });
    }
  }

  if (action === "VERIFY_AND_SYNC") {
    const user = await context.query.OtpUser.findOne({
      where: { phoneNumber },
      query: `
      id
      verificationCode
      verificationExpire
      tokens {
        id
        encryptedSecret
        app {
          name
          issuer
          apiKey
        }
      }`,
    });

    if (!user || user.verificationCode !== code) {
      return res.status(400).json({ success: false, message: "کد اشتباه است" });
    }

    const now = new Date();
    if (user.verificationExpire && now > user.verificationExpire) {
      return res
        .status(400)
        .json({ success: false, message: "کد منقضی شده است" });
    }

    // اگر همه چیز درست بود: پاک کردن کد برای امنیت بیشتر و لاگین کردن
    await context.db.OtpUser.updateOne({
      where: { phoneNumber },
      data: {
        isPhoneVerified: true,
        verificationCode: "",
        verificationExpire: null,
      },
    });

    const recoveryData = user.tokens
      .map((t: any) => {
        try {
          // اینجا جادو اتفاق می‌افتد: دکریپت کردن سکرت
          const rawSecret = decrypt(t.encryptedSecret);

          return {
            id: t.id,
            secret: rawSecret, // حالا این سکرت خام (مثل JBSWY3D...) است
            label: t.app?.name || "Unknown",
            issuer: t.app?.issuer || "Ghofli",
            apiKey: t.app?.apiKey,
          };
        } catch (err) {
          console.error(`خطا در دکریپت کردن توکن ${t.id}:`, err);
          return null;
        }
      })
      .filter(Boolean); // حذف مواردی که با خطا مواجه شدند

    return res.json({
      success: true,
      tokens: recoveryData, // برگرداندن توکن‌های بک‌آپ شده
      message: "خوش آمدید",
    });
  }
};