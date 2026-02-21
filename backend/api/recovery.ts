import { KeystoneContext } from "@keystone-6/core/types";
import { Request, Response } from "express";
import crypto from "crypto";

const verificationTokens = new Map<string, { phoneNumber: string, expires: number }>();

export const recoveryHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext
) => {
  try {
    const { phoneNumber, action, code, pin, verificationToken } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "شماره موبایل الزامی است",
      });
    }

    if (action === "REQUEST_OTP") {
      console.log("REQUEST_OTP for:", phoneNumber);

      const existingUser = await context.query.OtpUser.findOne({
        where: { phoneNumber },
        query: `id phoneNumber pinEnabled`,
      });

      const verificationCode = Math.floor(
        10000 + Math.random() * 90000
      ).toString();

      const expireTime = new Date(Date.now() + 5 * 60 * 1000);

      if (existingUser) {
        await context.query.OtpUser.updateOne({
          where: { id: existingUser.id },
          data: {
            verificationCode,
            verificationExpire: expireTime.toISOString(),
          },
        });
      } else {

        const tempOTPStore = (global as any).tempOTPStore = (global as any).tempOTPStore || new Map();
        tempOTPStore.set(phoneNumber, {
          code: verificationCode,
          expires: expireTime.getTime(),
        });
      }

      console.log("Generated OTP:", verificationCode);

      return res.json({
        success: true,
        message: "OTP generated",
        devCode: verificationCode,
      });
    }


    if (action === "VERIFY_OTP_ONLY") {
      console.log("VERIFY_OTP_ONLY for:", phoneNumber);

      const existingUser = await context.query.OtpUser.findOne({
        where: { phoneNumber },
        query: `id verificationCode verificationExpire`,
      });

      let isValid = false;

      if (existingUser) {
        if (!existingUser.verificationCode || existingUser.verificationCode !== code) {
          return res.status(400).json({
            success: false,
            error: "کد اشتباه است",
          });
        }

        if (
          existingUser.verificationExpire &&
          new Date(existingUser.verificationExpire) < new Date()
        ) {
          return res.status(400).json({
            success: false,
            error: "کد منقضی شده است",
          });
        }

        isValid = true;

        await context.query.OtpUser.updateOne({
          where: { id: existingUser.id },
          data: {
            isPhoneVerified: true,
            verificationCode: null,
            verificationExpire: null,
          },
        });
      } else {
        const tempOTPStore = (global as any).tempOTPStore || new Map();
        const tempData = tempOTPStore.get(phoneNumber);

        if (!tempData || tempData.code !== code) {
          return res.status(400).json({
            success: false,
            error: "کد اشتباه است",
          });
        }

        if (tempData.expires < Date.now()) {
          return res.status(400).json({
            success: false,
            error: "کد منقضی شده است",
          });
        }

        isValid = true;
        
        tempOTPStore.delete(phoneNumber);
      }

      if (isValid) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 30 * 60 * 1000;
        
        verificationTokens.set(token, {
          phoneNumber,
          expires,
        });

        return res.json({
          success: true,
          message: "شماره با موفقیت تایید شد",
          token: token,
        });
      }
    }

    if (action === "CREATE_USER_WITH_PIN") {
      console.log("CREATE_USER_WITH_PIN for:", phoneNumber);

      if (!verificationToken) {
        return res.status(400).json({
          success: false,
          error: "توکن تایید الزامی است",
        });
      }

      const tokenData = verificationTokens.get(verificationToken);
      
      if (!tokenData || tokenData.phoneNumber !== phoneNumber) {
        return res.status(400).json({
          success: false,
          error: "توکن نامعتبر است",
        });
      }

      if (tokenData.expires < Date.now()) {
        verificationTokens.delete(verificationToken);
        return res.status(400).json({
          success: false,
          error: "توکن منقضی شده است",
        });
      }

      if (!pin || !/^\d{4,6}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          error: "PIN باید ۴-۶ رقم باشد",
        });
      }

      let user = await context.query.OtpUser.findOne({
        where: { phoneNumber },
        query: `id`,
      });

      if (!user) {
        user = await context.query.OtpUser.createOne({
          data: {
            phoneNumber,
            pin: pin,
            pinEnabled: true,
            isPhoneVerified: true,
            pinLastChangedAt: new Date().toISOString(),
          },
          query: `id`,
        });

        console.log("User created with PIN:", user.id);
      } else {
        await context.query.OtpUser.updateOne({
          where: { id: user.id },
          data: {
            pin: pin,
            pinEnabled: true,
            pinLastChangedAt: new Date().toISOString(),
          },
        });

        console.log("User updated with PIN:", user.id);
      }

      verificationTokens.delete(verificationToken);

      await context.query.AccessLog.createOne({
        data: {
          action: "PIN_SET",
          ipAddress: req.ip || req.socket.remoteAddress || "",
          userAgent: req.headers["user-agent"] || "",
        },
      });

      return res.json({
        success: true,
        message: "حساب کاربری با موفقیت ایجاد شد",
      });
    }

    if (action === "VERIFY_AND_SYNC") {
      console.log("VERIFY_AND_SYNC for:", phoneNumber);

      const user = await context.query.OtpUser.findOne({
        where: { phoneNumber },
        query: `
          id
          verificationCode
          verificationExpire
          isPhoneVerified
        `,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "کاربر یافت نشد",
        });
      }

      if (!user.verificationCode || user.verificationCode !== code) {
        return res.status(400).json({
          success: false,
          error: "کد اشتباه است",
        });
      }

      if (
        user.verificationExpire &&
        new Date(user.verificationExpire) < new Date()
      ) {
        return res.status(400).json({
          success: false,
          error: "کد منقضی شده است",
        });
      }

      await context.query.OtpUser.updateOne({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          verificationCode: null,
          verificationExpire: null,
        },
      });

      return res.json({
        success: true,
        message: "شماره با موفقیت تایید شد",
      });
    }

    return res.status(400).json({
      success: false,
      error: "Action نامعتبر است",
    });

  } catch (error: any) {
    console.error("Recovery Handler Error:", error);

    return res.status(500).json({
      success: false,
      error: "خطای داخلی سرور",
      details: error.message,
    });
  }
};
