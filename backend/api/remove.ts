// remove.ts
import { KeystoneContext } from "@keystone-6/core/types";
import { Request, Response } from "express";
import { verifySignature } from "./verify";

export const removeOTPHandler = async (req: Request, res: Response, context: KeystoneContext) => {
  try {
    const isSigValid = verifySignature(req);
    if (!isSigValid) return res.status(403).json({ error: "Unauthorized request" });

    const { phoneNumber, apiKey } = req.body;

    const user = await context.query.OtpUser.findOne({
      where: { phoneNumber: phoneNumber },
      query: `id`
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const app = await context.query.App.findOne({
      where: { apiKey: apiKey },
      query: `id name`
    });

    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }

    const tokens = await context.query.OTPToken.findMany({
      where: {
        user: { id: { equals: user.id } },
        app: { id: { equals: app.id } }
      },
      query: `
        id
        createdAt
        lastUsedAt
        isVerified
        user {
          id
          phoneNumber
        }
        app {
          id
          name
        }
      `
    });

    if (tokens.length === 0) {
      return res.status(404).json({ error: "Service with these specifications not found" });
    }

    const token = tokens[0]; 

    await context.query.OTPTokenHistory.createOne({
      data: {
        user: { connect: { id: token.user.id } },
        app: { connect: { id: token.app.id } },
        appNameAtDeletion: token.app?.name || "Unknown",
        createdAtOriginal: token.createdAt,
        lastUsedAt: token.lastUsedAt,
        deletedAt: new Date().toISOString()
      }
    });

    await context.query.AccessLog.createOne({
      data: {
        token: { connect: { id: token.id } },
        action: "TOKEN_DELETED",
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || "unknown",
        userAgent: req.headers['user-agent'] || "unknown"
      }
    });

    await context.query.OTPToken.deleteOne({
      where: { id: token.id }
    });

    return res.json({
      success: true,
      message: "Token successfully deleted and stored in history"
    });

  } catch (error: any) {
    console.error("Remove OTP Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};