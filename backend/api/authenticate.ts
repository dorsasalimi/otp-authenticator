// authenticate.ts
import { KeystoneContext } from "@keystone-6/core/types";
import { Request, Response } from "express";
import speakeasy from "speakeasy";
import { decrypt } from "./crypto";

export const authenticateHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext,
) => {
  try {
    const { apiKey, phoneNumber, token } = req.body;
    console.log(token);
    const application = await context.query.App.findOne({
      where: { apiKey },
      query: "id name",
    });

    if (!application)
      return res.status(401).json({ error: "API Key نامعتبر است" });

    const userTokens = await context.query.OTPToken.findMany({
      where: {
        user: { phoneNumber: { equals: phoneNumber } },
        app: { id: { equals: application.id } },
        isVerified: { equals: true },
      },
      query: "id encryptedSecret",
    });

    if (!userTokens.length) {
      return res
        .status(404)
        .json({ error: "این سرویس هنوز در اپلیکیشن قفلی فعال نشده است" });
    }

    const targetToken = userTokens[0];
    const decryptedSecret = decrypt(targetToken.encryptedSecret);
    const expectedServerCode = speakeasy.totp({
      secret: decryptedSecret,
      encoding: "base32",
    });
   
console.log(expectedServerCode);
    const isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: "base32",
      token: token,
      window: 1,
    });
 console.log(decryptedSecret);
    await context.query.AccessLog.createOne({
      data: {
        token: { connect: { id: targetToken.id } },
        action: isValid ? "VERIFY_SUCCESS" : "VERIFY_FAILED",
        ipAddress: req.ip || "",
      },
    });
    if (!isValid) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return res
        .status(400)
        .json({ authenticated: false, error: "اطلاعات وارد شده نامعتبر است" });
    }
    if (isValid) {
      return res.json({
        authenticated: true,
        message: `خوش آمدید، ورود به ${application.name} تایید شد.`,
        data: { phoneNumber, appName: application.name },
      });
    } else {
      return res
        .status(400)
        .json({ authenticated: false, error: "کد اشتباه است" });
    }
  } catch (error: any) {
    console.error("Auth Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
