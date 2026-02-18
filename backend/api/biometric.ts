// api/biometric.ts - Updated version
import { KeystoneContext } from "@keystone-6/core/types";
import { Request, Response } from "express";
import crypto from 'crypto';

interface BiometricRequest {
  phoneNumber: string;
  token?: string;
  action: 'register' | 'verify' | 'check-status' | 'disable';
  deviceId?: string;
  deviceType?: string;
  deviceName?: string;
}

// Maximum failed attempts before lockout
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

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

export const biometricHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext
) => {
  try {
    const { phoneNumber, token, action, deviceId, deviceType, deviceName } = req.body as BiometricRequest;
    const clientIp = req.ip || req.socket.remoteAddress || "";
    const rateLimitKey = `${clientIp}_${phoneNumber}`;

    console.log(`Biometric ${action} request for phone: ${phoneNumber}, device: ${deviceId}`);

    // Check rate limit for verification attempts
    if (action === 'verify' && !checkRateLimit(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        error: "Too many failed attempts. Please try again after 15 minutes.",
        locked: true,
        lockoutDuration: LOCKOUT_DURATION
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required"
      });
    }

    // Find or create the user
    let users = await context.query.OtpUser.findMany({
      where: {
        phoneNumber: { equals: phoneNumber },
      },
      query: "id phoneNumber isPhoneVerified",
    });

    let user;
    let isNewUser = false;

    if (!users.length) {
      console.log(`User not found: ${phoneNumber}, creating new user...`);

      // For registration, create the user if they don't exist
      if (action === 'register') {
        try {
          const newUser = await context.query.OtpUser.createOne({
            data: {
              phoneNumber: phoneNumber,
              isPhoneVerified: true, // Mark as verified since they're setting up biometrics
            },
            query: "id phoneNumber isPhoneVerified",
          });

          user = newUser;
          isNewUser = true;
          console.log(`Created new user: ${user.id}`);
        } catch (createError) {
          console.error("Error creating user:", createError);
          return res.status(500).json({
            success: false,
            error: "Failed to create user for biometric registration"
          });
        }
      } else {
        console.log(`User not found for action: ${action}`);
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }
    } else {
      user = users[0];
      console.log(`User found: ${user.id}`);
    }

    // For verify action, user must exist and be verified
    if (action === 'verify' && !user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        authenticated: false,
        error: "User phone number is not verified"
      });
    }

    switch (action) {
      case "check-status":
        // Check if user has biometric enabled
        const biometricData = await context.query.BiometricCredential.findMany({
          where: {
            user: { id: { equals: user.id } },
            isActive: { equals: true },
          },
          query: "id deviceId lastUsedAt createdAt deviceName deviceType",
        });

        return res.json({
          success: true,
          data: {
            biometricEnabled: biometricData.length > 0,
            credentials: biometricData.map(cred => ({
              deviceId: cred.deviceId,
              lastUsedAt: cred.lastUsedAt,
              registeredAt: cred.createdAt,
              deviceName: cred.deviceName,
              deviceType: cred.deviceType,
            })),
          },
        });

      case "register":
        if (!token) {
          return res.status(400).json({
            success: false,
            error: "Biometric token is required"
          });
        }

        if (!deviceId) {
          return res.status(400).json({
            success: false,
            error: "Device ID is required"
          });
        }

        console.log(`Registering biometric for user ${user.id}, device ${deviceId}`);

        // Check if this device is already registered
        const existingCredential = await context.query.BiometricCredential.findMany({
          where: {
            user: { id: { equals: user.id } },
            deviceId: { equals: deviceId },
            isActive: { equals: true },
          },
        });

        let result;
        if (existingCredential.length > 0) {
          // Update existing credential
          console.log(`Updating existing credential: ${existingCredential[0].id}`);
          result = await context.query.BiometricCredential.updateOne({
            where: { id: existingCredential[0].id },
            data: {
              token: token,
              lastUsedAt: new Date().toISOString(),
              deviceType: deviceType || 'unknown',
              deviceName: deviceName || null,
            },
          });
        } else {
          // Create new credential
          console.log(`Creating new credential for device ${deviceId}`);
          result = await context.query.BiometricCredential.createOne({
            data: {
              user: { connect: { id: user.id } },
              token: token,
              deviceId: deviceId,
              isActive: true,
              lastUsedAt: new Date().toISOString(),
              deviceType: deviceType || 'unknown',
              deviceName: deviceName || null,
            },
          });
        }

        console.log(`Biometric registration successful: ${result.id}`);

        // Log the action
        await context.query.AccessLog.createOne({
          data: {
            action: "BIOMETRIC_REGISTERED",
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"] || "",
            metadata: JSON.stringify({ deviceId, deviceType, deviceName, isNewUser }),
          },
        });

        return res.json({
          success: true,
          message: "Biometric authentication registered successfully",
          data: {
            credentialId: result.id,
            isNewUser: isNewUser
          }
        });

      case "verify":
        if (!token) {
          return res.status(400).json({
            success: false,
            authenticated: false,
            error: "Biometric token is required"
          });
        }

        if (!deviceId) {
          return res.status(400).json({
            success: false,
            authenticated: false,
            error: "Device ID is required"
          });
        }

        console.log(`Verifying biometric for user ${user.id}, device ${deviceId}`);

        // Find the biometric credential
        const credentials = await context.query.BiometricCredential.findMany({
          where: {
            user: { id: { equals: user.id } },
            deviceId: { equals: deviceId },
            isActive: { equals: true },
          },
          query: "id token",
        });

        if (!credentials.length) {
          console.log(`No biometric credential found for device ${deviceId}`);
          return res.status(404).json({
            success: false,
            authenticated: false,
            error: "No biometric credential found for this device"
          });
        }

        const credential = credentials[0];
        console.log(`Found credential: ${credential.id}`);

        // Verify the token
        const isValid = credential.token === token;
        console.log(`Token verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);

        if (!isValid) {
          // Record failed attempt
          recordFailedAttempt(rateLimitKey);

          // Add delay to prevent brute force
          await new Promise(resolve => setTimeout(resolve, 2000));

          await context.query.AccessLog.createOne({
            data: {
              action: "BIOMETRIC_VERIFY_FAILED",
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || "",
              metadata: JSON.stringify({ deviceId }),
            },
          });

          return res.status(401).json({
            success: false,
            authenticated: false,
            error: "Invalid biometric token"
          });
        }

        // Reset failed attempts on success
        resetFailedAttempts(rateLimitKey);

        // Update last used timestamp
        await context.query.BiometricCredential.updateOne({
          where: { id: credential.id },
          data: {
            lastUsedAt: new Date().toISOString(),
          },
        });

        // Log success
        await context.query.AccessLog.createOne({
          data: {
            action: "BIOMETRIC_VERIFY_SUCCESS",
            ipAddress: clientIp,
            userAgent: req.headers["user-agent"] || "",
            metadata: JSON.stringify({ deviceId }),
          },
        });

        // Get user data for response
        const userData = await context.query.OtpUser.findOne({
          where: { id: user.id },
          query: "id phoneNumber isPhoneVerified",
        });

        // Generate a session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        return res.json({
          success: true, // Added for compatibility
          authenticated: true,
          message: "Biometric authentication successful",
          token: sessionToken,
          data: {
            id: userData.id,
            phoneNumber: userData.phoneNumber,
            isPhoneVerified: userData.isPhoneVerified,
          },
        });

      case "disable":
        if (!deviceId) {
          // Disable all biometric credentials for this user
          const userCredentials = await context.query.BiometricCredential.findMany({
            where: {
              user: { id: { equals: user.id } },
              isActive: { equals: true },
            },
          });

          for (const cred of userCredentials) {
            await context.query.BiometricCredential.updateOne({
              where: { id: cred.id },
              data: {
                isActive: false,
              },
            });
          }

          await context.query.AccessLog.createOne({
            data: {
              action: "BIOMETRIC_DISABLED_ALL",
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || "",
              metadata: JSON.stringify({ count: userCredentials.length }),
            },
          });

          return res.json({
            success: true,
            message: "All biometric credentials disabled successfully",
          });
        } else {
          // Disable specific device
          const credential = await context.query.BiometricCredential.findMany({
            where: {
              user: { id: { equals: user.id } },
              deviceId: { equals: deviceId },
              isActive: { equals: true },
            },
          });

          if (!credential.length) {
            return res.status(404).json({
              success: false,
              error: "Biometric credential not found for this device"
            });
          }

          await context.query.BiometricCredential.updateOne({
            where: { id: credential[0].id },
            data: {
              isActive: false,
            },
          });

          await context.query.AccessLog.createOne({
            data: {
              action: "BIOMETRIC_DISABLED",
              ipAddress: clientIp,
              userAgent: req.headers["user-agent"] || "",
              metadata: JSON.stringify({ deviceId }),
            },
          });

          return res.json({
            success: true,
            message: "Biometric credential disabled successfully",
          });
        }

      default:
        return res.status(400).json({
          success: false,
          error: "Invalid action"
        });
    }
  } catch (error: any) {
    console.error("Biometric Handler Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};