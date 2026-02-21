import { KeystoneContext } from "@keystone-6/core/types";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";

type PinAction =
  | "set"
  | "change"
  | "disable"
  | "verify"
  | "check-status"
  | "mark-skipped";

interface PinRequest {
  phoneNumber: string;
  pin?: string;
  oldPin?: string;
  action: PinAction;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

const failedAttempts = new Map<string, { count: number; lockUntil?: number }>();

const checkRateLimit = (identifier: string): boolean => {
  const record = failedAttempts.get(identifier);
  if (record) {
    if (record.lockUntil && record.lockUntil > Date.now()) {
      return false; // Still locked
    }
    if (record.lockUntil && record.lockUntil <= Date.now()) {
      // Lock expired, reset
      failedAttempts.delete(identifier);
    }
  }
  return true;
};

const recordFailedAttempt = (identifier: string) => {
  const record = failedAttempts.get(identifier) || { count: 0 };
  record.count += 1;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockUntil = Date.now() + LOCKOUT_DURATION;
  }

  failedAttempts.set(identifier, record);
};

const resetFailedAttempts = (identifier: string) => {
  failedAttempts.delete(identifier);
};

export const pinHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext,
) => {
  try {
    const { phoneNumber, pin, oldPin, action } = req.body as PinRequest;
    const clientIp = req.ip || req.socket.remoteAddress || "";
    const rateLimitKey = `${clientIp}_${phoneNumber}`;

    if (action === "verify" && !checkRateLimit(rateLimitKey)) {
      return res.status(429).json({
        error: "Too many failed attempts. Please try again after 15 minutes.",
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Finding user
    const users = await context.query.OtpUser.findMany({
      where: {
        phoneNumber: { equals: phoneNumber },
      },
      query: "id phoneNumber isPhoneVerified pinEnabled pinLastChangedAt",
    });

    if (!users.length) {
      if (action === "check-status") {
        return res.json({
          success: true,
          data: {
            pinEnabled: false,
            hasPin: false,
            pinLastChangedAt: null,
            userExists: false,
          },
        });
      }
      return res.status(404).json({ error: "User not found" });
    }
    const user = users[0];

    if (
      !user.isPhoneVerified &&
      ["set", "change", "disable"].includes(action)
    ) {
      return res.status(403).json({
        error: "Phone number must be verified to manage PIN",
      });
    }

    switch (action) {
      case "check-status":
        return res.json({
          success: true,
          data: {
            pinEnabled: user.pinEnabled || false,
            hasPin: user.pinEnabled,
            pinLastChangedAt: user.pinLastChangedAt,
            userExists: true,
          },
        });

      case "set":
        if (user.pinEnabled) {
          return res.status(400).json({
            error: "PIN already exists. Use 'change' action instead.",
          });
        }

        if (!pin || !/^\d{4,6}$/.test(pin)) {
          return res.status(400).json({
            error: "PIN must be 4-6 digits only",
          });
        }

        await context.query.OtpUser.updateOne({
          where: { id: user.id },
          data: {
            pin: pin,
            pinEnabled: true,
            pinLastChangedAt: new Date().toISOString(),
          },
        });

        await context.query.AccessLog.createOne({
          data: {
            action: "PIN_SET",
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"] || "",
          },
        });

        return res.json({
          success: true,
          message: "PIN set successfully",
        });

      case "change":
        if (!user.pinEnabled) {
          return res.status(400).json({
            error: "PIN is not enabled for this user",
          });
        }

        if (!oldPin) {
          return res.status(400).json({
            error: "Old PIN is required to change PIN",
          });
        }

        if (!pin || !/^\d{4,6}$/.test(pin)) {
          return res.status(400).json({
            error: "New PIN must be 4-6 digits only",
          });
        }

        try {
          const userWithPin = await context.sudo().db.OtpUser.findOne({
            where: { id: user.id },
          });

          if (!userWithPin || !userWithPin.pin) {
            return res.status(400).json({
              error: "PIN not found",
            });
          }

          const isOldPinValid = await bcrypt.compare(oldPin, userWithPin.pin);

          if (!isOldPinValid) {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            await context.query.AccessLog.createOne({
              data: {
                action: "PIN_CHANGE_FAILED",
                ipAddress: clientIp,
                userAgent: req.headers["user-agent"] || "",
              },
            });

            return res.status(401).json({
              error: "Invalid old PIN",
            });
          }

          await context.query.OtpUser.updateOne({
            where: { id: user.id },
            data: {
              pin: pin,
              pinLastChangedAt: new Date().toISOString(),
            },
          });

          await context.query.AccessLog.createOne({
            data: {
              action: "PIN_CHANGED",
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || "",
            },
          });

          return res.json({
            success: true,
            message: "PIN changed successfully",
          });
        } catch (error) {
          console.error("Error accessing internal API:", error);
          return res.status(500).json({
            error: "Internal server error during PIN verification",
          });
        }

      case "disable":
        if (!user.pinEnabled) {
          return res.status(400).json({
            error: "PIN is already disabled",
          });
        }

        await context.query.OtpUser.updateOne({
          where: { id: user.id },
          data: {
            pinEnabled: false,
          },
        });

        await context.query.AccessLog.createOne({
          data: {
            action: "PIN_DISABLED",
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"] || "",
          },
        });

        return res.json({
          success: true,
          message: "PIN disabled successfully",
        });

      case "verify":
        if (!user.pinEnabled) {
          return res.status(400).json({
            error: "PIN login is not enabled for this user",
          });
        }

        if (!pin) {
          return res.status(400).json({
            error: "PIN is required",
          });
        }

        try {
          const userWithPin = await context.sudo().db.OtpUser.findOne({
            where: { id: user.id },
          });

          if (!userWithPin || !userWithPin.pin) {
            return res.status(400).json({
              error: "PIN not found",
            });
          }

          const isValid = await bcrypt.compare(pin, userWithPin.pin);

          if (!isValid) {
            recordFailedAttempt(rateLimitKey);

            await new Promise((resolve) => setTimeout(resolve, 2000));

            await context.query.AccessLog.createOne({
              data: {
                action: "PIN_VERIFY_FAILED",
                ipAddress: clientIp,
                userAgent: req.headers["user-agent"] || "",
              },
            });

            return res.status(401).json({
              authenticated: false,
              error: "Invalid PIN",
            });
          }

          resetFailedAttempts(rateLimitKey);

          await context.query.AccessLog.createOne({
            data: {
              action: "PIN_VERIFY_SUCCESS",
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || "",
            },
          });

          const userData = await context.query.OtpUser.findOne({
            where: { id: user.id },
            query: "id phoneNumber isPhoneVerified",
          });

          return res.json({
            authenticated: true,
            message: "PIN verified successfully",
            data: {
              id: userData.id,
              phoneNumber: userData.phoneNumber,
              isPhoneVerified: userData.isPhoneVerified,
            },
          });
        } catch (error) {
          console.error("Error accessing internal API:", error);
          return res.status(500).json({
            error: "Internal server error during PIN verification",
          });
        }

      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error: any) {
    console.error("PIN Handler Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
