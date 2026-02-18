// api/pin.ts
import { KeystoneContext } from "@keystone-6/core/types";
import { Request, Response } from "express";
import bcrypt from 'bcryptjs';

interface PinRequest {
  phoneNumber: string;
  pin?: string;
  oldPin?: string;
  action: 'set' | 'change' | 'disable' | 'verify' | 'check-status';
}

// Maximum failed attempts before lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// In-memory store for failed attempts (in production, use Redis or database)
const failedAttempts = new Map<string, { count: number, lockUntil?: number }>();

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
  context: KeystoneContext
) => {
  try {
    const { phoneNumber, pin, oldPin, action } = req.body as PinRequest;
    const clientIp = req.ip || req.socket.remoteAddress || "";
    const rateLimitKey = `${clientIp}_${phoneNumber}`;

    // Check rate limit for verification attempts
    if (action === 'verify' && !checkRateLimit(rateLimitKey)) {
      return res.status(429).json({
        error: "Too many failed attempts. Please try again after 15 minutes."
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Find the user - Don't query the pin field directly
    const users = await context.query.OtpUser.findMany({
      where: {
        phoneNumber: { equals: phoneNumber },
      },
      query: "id phoneNumber isPhoneVerified pinEnabled pinLastChangedAt",
    });

    if (!users.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];

    // Check if phone is verified for sensitive operations
    if (!user.isPhoneVerified && ['set', 'change', 'disable'].includes(action)) {
      return res.status(403).json({
        error: "Phone number must be verified to manage PIN"
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
          },
        });

      case "set":
        // Check if PIN is already enabled
        if (user.pinEnabled) {
          return res.status(400).json({
            error: "PIN already exists. Use 'change' action instead."
          });
        }

        if (!pin || !/^\d{4,6}$/.test(pin)) {
          return res.status(400).json({
            error: "PIN must be 4-6 digits only"
          });
        }

        // IMPORTANT: Don't hash the PIN manually!
        // Let Keystone's password field handle the hashing
        // Just pass the raw PIN and Keystone will hash it automatically
        await context.query.OtpUser.updateOne({
          where: { id: user.id },
          data: {
            pin: pin, // Pass raw PIN, Keystone will hash it
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
          message: "PIN set successfully"
        });

      case "change":
        if (!user.pinEnabled) {
          return res.status(400).json({
            error: "PIN is not enabled for this user"
          });
        }

        if (!oldPin) {
          return res.status(400).json({
            error: "Old PIN is required to change PIN"
          });
        }

        if (!pin || !/^\d{4,6}$/.test(pin)) {
          return res.status(400).json({
            error: "New PIN must be 4-6 digits only"
          });
        }

        // To verify the old PIN, we need to use a different approach
        // We'll use the internal API to get the user with PIN
        try {
          // @ts-ignore - Internal API
          const userWithPin = await context.sudo().db.OtpUser.findOne({
            where: { id: user.id },
          });

          if (!userWithPin || !userWithPin.pin) {
            return res.status(400).json({
              error: "PIN not found"
            });
          }

          // Verify old PIN using bcrypt compare
          const isOldPinValid = await bcrypt.compare(oldPin, userWithPin.pin);

          if (!isOldPinValid) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            await context.query.AccessLog.createOne({
              data: {
                action: "PIN_CHANGE_FAILED",
                ipAddress: clientIp,
                userAgent: req.headers["user-agent"] || "",
              },
            });

            return res.status(401).json({
              error: "Invalid old PIN"
            });
          }

          // Update with new PIN (raw, Keystone will hash it)
          await context.query.OtpUser.updateOne({
            where: { id: user.id },
            data: {
              pin: pin, // Pass raw PIN
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
            message: "PIN changed successfully"
          });
        } catch (error) {
          console.error("Error accessing internal API:", error);
          return res.status(500).json({
            error: "Internal server error during PIN verification"
          });
        }

      case "disable":
        if (!user.pinEnabled) {
          return res.status(400).json({
            error: "PIN is already disabled"
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
          message: "PIN disabled successfully"
        });

      case "verify":
        if (!user.pinEnabled) {
          return res.status(400).json({
            error: "PIN login is not enabled for this user"
          });
        }

        if (!pin) {
          return res.status(400).json({
            error: "PIN is required"
          });
        }

        // Use internal API to get the PIN for verification
        try {
          // @ts-ignore - Internal API
          const userWithPin = await context.sudo().db.OtpUser.findOne({
            where: { id: user.id },
          });

          if (!userWithPin || !userWithPin.pin) {
            return res.status(400).json({
              error: "PIN not found"
            });
          }

          // Compare using bcrypt
          const isValid = await bcrypt.compare(pin, userWithPin.pin);

          if (!isValid) {
            // Record failed attempt
            recordFailedAttempt(rateLimitKey);

            // Add delay to prevent brute force
            await new Promise(resolve => setTimeout(resolve, 2000));

            await context.query.AccessLog.createOne({
              data: {
                action: "PIN_VERIFY_FAILED",
                ipAddress: clientIp,
                userAgent: req.headers["user-agent"] || "",
              },
            });

            return res.status(401).json({
              authenticated: false,
              error: "Invalid PIN"
            });
          }

          // Reset failed attempts on successful verification
          resetFailedAttempts(rateLimitKey);

          await context.query.AccessLog.createOne({
            data: {
              action: "PIN_VERIFY_SUCCESS",
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || "",
            },
          });

          // Get user data for response
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
            error: "Internal server error during PIN verification"
          });
        }

      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error: any) {
    console.error("PIN Handler Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};