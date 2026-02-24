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
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const failedAttempts = new Map<string, { count: number; lockUntil?: number }>();

const checkRateLimit = (identifier: string): boolean => {
  const record = failedAttempts.get(identifier);
  if (record) {
    if (record.lockUntil && record.lockUntil > Date.now()) {
      return false;
    }
    if (record.lockUntil && record.lockUntil <= Date.now()) {
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

    // Rate limiting for verify action
    if (action === "verify" && !checkRateLimit(rateLimitKey)) {
      return res.status(429).json({
        error: "Too many failed attempts. Please try again after 15 minutes.",
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Find user
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

    // Check phone verification for PIN management
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

        // Hash the PIN before storing
        const hashedPin = await bcrypt.hash(pin, 10);

        await context.query.OtpUser.updateOne({
          where: { id: user.id },
          data: {
            pin: hashedPin,
            pinEnabled: true,
            pinLastChangedAt: new Date().toISOString(),
          },
        });

        await context.query.AccessLog.createOne({
          data: {
            action: "PIN_SET",
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"] || "",
            // Removed userId field
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
          // Get the user with PIN from database using sudo for full access
          const userWithPin = await context.sudo().db.OtpUser.findOne({
            where: { id: user.id },
          });

          if (!userWithPin || !userWithPin.pin) {
            return res.status(400).json({
              error: "PIN not found",
            });
          }

          // Debug logging (remove in production)
          console.log("Verifying old PIN...");
          
          // Verify old PIN
          const isOldPinValid = await bcrypt.compare(oldPin, userWithPin.pin);
          console.log("Old PIN valid:", isOldPinValid);

          if (!isOldPinValid) {
            // Add artificial delay to prevent brute force
            await new Promise((resolve) => setTimeout(resolve, 1000));

            await context.query.AccessLog.createOne({
              data: {
                action: "PIN_CHANGE_FAILED",
                ipAddress: clientIp,
                userAgent: req.headers["user-agent"] || "",
                // Removed userId field
              },
            });

            return res.status(401).json({
              error: "Invalid old PIN",
            });
          }

          // Hash the new PIN
          const hashedNewPin = await bcrypt.hash(pin, 10);

          // Update with new PIN
          await context.query.OtpUser.updateOne({
            where: { id: user.id },
            data: {
              pin: hashedNewPin,
              pinLastChangedAt: new Date().toISOString(),
            },
          });

          await context.query.AccessLog.createOne({
            data: {
              action: "PIN_CHANGED",
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || "",
              // Removed userId field
            },
          });

          return res.json({
            success: true,
            message: "PIN changed successfully",
          });
        } catch (error) {
          console.error("Error changing PIN:", error);
          return res.status(500).json({
            error: "Internal server error during PIN change",
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
            pin: null,
          },
        });

        await context.query.AccessLog.createOne({
          data: {
            action: "PIN_DISABLED",
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"] || "",
            // Removed userId field
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
          // Get the user with PIN from database
          const userWithPin = await context.sudo().db.OtpUser.findOne({
            where: { id: user.id },
          });

          if (!userWithPin || !userWithPin.pin) {
            return res.status(400).json({
              error: "PIN not found",
            });
          }

          // Debug logging (remove in production)
          console.log("Verifying PIN for login...");
          console.log("Input PIN:", pin);
          
          const isValid = await bcrypt.compare(pin, userWithPin.pin);
          console.log("PIN valid:", isValid);

          if (!isValid) {
            recordFailedAttempt(rateLimitKey);

            // Add artificial delay to prevent brute force
            await new Promise((resolve) => setTimeout(resolve, 2000));

            await context.query.AccessLog.createOne({
              data: {
                action: "PIN_VERIFY_FAILED",
                ipAddress: clientIp,
                userAgent: req.headers["user-agent"] || "",
                // Removed userId field
              },
            });

            return res.status(401).json({
              authenticated: false,
              error: "پین فعلی اشتباه است",
            });
          }

          resetFailedAttempts(rateLimitKey);

          await context.query.AccessLog.createOne({
            data: {
              action: "PIN_VERIFY_SUCCESS",
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || "",
              // Removed userId field
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
          console.error("Error verifying PIN:", error);
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