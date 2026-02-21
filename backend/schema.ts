import { list } from "@keystone-6/core";
import { allowAll } from "@keystone-6/core/access";
import {
  text,
  relationship,
  password,
  timestamp,
  select,
  checkbox,
} from "@keystone-6/core/fields";
const { authenticator } = require("otplib");
import crypto from "crypto";
  process.env.MASTER_SECRET || "v-p-n-ir-auth-secret-key-32chars!!";
const IV_LENGTH = 16;
import { document } from "@keystone-6/fields-document";
import { type Lists } from ".keystone/types";
export const lists = {
  User: list({
    access: allowAll,

    fields: {
      name: text({ validation: { isRequired: false } }),

      email: text({
        validation: { isRequired: false },
        isIndexed: "unique",
      }),
      password: password({ validation: { isRequired: false } }),
      posts: relationship({ ref: "Post.author", many: true }),
      createdAt: timestamp({
        defaultValue: { kind: "now" },
      }),
    },
  }),

  Post: list({
    access: allowAll,
    fields: {
      title: text({ validation: { isRequired: true } }),

      content: document({
        formatting: true,
        layouts: [
          [1, 1],
          [1, 1, 1],
          [2, 1],
          [1, 2],
          [1, 2, 1],
        ],
        links: true,
        dividers: true,
      }),

      author: relationship({
        ref: "User.posts",

        ui: {
          displayMode: "cards",
          cardFields: ["name", "email"],
          inlineEdit: { fields: ["name", "email"] },
          linkToItem: true,
          inlineConnect: true,
        },


        many: false,
      }),

      tags: relationship({
        ref: "Tag.posts",

        many: true,

        ui: {
          displayMode: "cards",
          cardFields: ["name"],
          inlineEdit: { fields: ["name"] },
          linkToItem: true,
          inlineConnect: true,
          inlineCreate: { fields: ["name"] },
        },
      }),
    },
  }),

  Tag: list({

    access: allowAll,

    ui: {
      isHidden: true,
    },

    fields: {
      name: text(),
      posts: relationship({ ref: "Post.tags", many: true }),
    },
  }),
  OtpUser: list({
    access: allowAll,
    fields: {
      phoneNumber: text({
        isIndexed: "unique",
        validation: { isRequired: true },
      }),
      isPhoneVerified: checkbox({ defaultValue: false }),

      pin: password({
        validation: {
          isRequired: true,
          length: { min: 4, max: 6 },
        },
        ui: {
          description: "4-6 digit PIN for quick login",
          createView: { fieldMode: "hidden" },
        },
      }),
      pinEnabled: checkbox({
        defaultValue: false,
        ui: {
          description: "Enable PIN login",
        },
      }),
      pinLastChangedAt: timestamp(),
      tokens: relationship({ ref: "OTPToken.user", many: true }),
      verificationCode: text({ db: { isNullable: true } }),
      verificationExpire: timestamp({ db: { isNullable: true } }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    ui: { labelField: "phoneNumber" },
  }),

  App: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      slug: text({ isIndexed: "unique" }),
      apiKey: text({ isIndexed: "unique", db: { isNullable: false } }),
      issuer: text({ validation: { isRequired: true } }),
      tokens: relationship({ ref: "OTPToken.app", many: true }),
    },
  }),

  OTPToken: list({
    access: allowAll,
    fields: {
      user: relationship({ ref: "OtpUser.tokens" }),
      app: relationship({ ref: "App.tokens" }),
      encryptedSecret: text({ ui: { itemView: { fieldMode: "read" } } }),
      isVerified: checkbox({ defaultValue: false }),
      lastUsedAt: timestamp(),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    hooks: {
      resolveInput: async ({ operation, resolvedData }) => {
        if (operation === "create" && resolvedData.encryptedSecret) {
          const rawSecret = resolvedData.encryptedSecret;

          const IV_LENGTH = 16;
          const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
          console.log(ENCRYPTION_KEY);
          if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
            throw new Error(
              "ENCRYPTION_KEY must be exactly 32 characters long.",
            );
          }
          const iv = crypto.randomBytes(IV_LENGTH);
          const cipher = crypto.createCipheriv(
            "aes-256-cbc",
            Buffer.from(ENCRYPTION_KEY),
            iv,
          );

          let encrypted = cipher.update(rawSecret);
          encrypted = Buffer.concat([encrypted, cipher.final()]);

          resolvedData.encryptedSecret =
            iv.toString("hex") + ":" + encrypted.toString("hex");
        }
        return resolvedData;
      },
    },
  }),
  OTPTokenHistory: list({
    access: {
      operation: {
        query: ({ session }) => !!session?.data.isAdmin,
        create: () => true,
        update: () => false,
        delete: ({ session }) => !!session?.data.isAdmin,
      },
    },
    fields: {
      user: relationship({
        ref: "OtpUser",
        many: false,
        ui: { displayMode: "cards", cardFields: ["phoneNumber"] },
      }),

      app: relationship({
        ref: "App",
        many: false,
      }),

      appNameAtDeletion: text({
        label: "نام اپلیکیشن در زمان حذف",
      }),

      createdAtOriginal: timestamp({
        label: "زمان ساخت اولیه توکن",
      }),

      lastUsedAt: timestamp({
        label: "آخرین زمان استفاده (Verified)",
      }),

      deletedAt: timestamp({
        defaultValue: { kind: "now" },
        label: "زمان حذف و انتقال به آرشیو",
        ui: { createView: { fieldMode: "hidden" } },
      }),
    },
    ui: {
      labelField: "appNameAtDeletion",
      description:
        "تاریخچه توکن‌های ابطال شده توسط کاربران برای اهداف امنیتی و آنالیز",
      listView: {
        initialColumns: ["appNameAtDeletion", "user", "deletedAt"],
        initialSort: { field: "deletedAt", direction: "DESC" },
      },
    },
  }),
  AccessLog: list({
    access: allowAll,
    fields: {
      timestamp: timestamp({ defaultValue: { kind: "now" } }),
      token: relationship({ ref: "OTPToken" }),
      action: select({
        options: [
          { label: "Verify Success", value: "VERIFY_SUCCESS" },
          { label: "Verify Failed", value: "VERIFY_FAILED" },
          { label: "Recovery Initiated", value: "RECOVERY_INITIATED" },
          { label: "Token Deleted", value: "TOKEN_DELETED" },
          { label: "PIN Set", value: "PIN_SET" },
          { label: "PIN Changed", value: "PIN_CHANGED" },
          { label: "PIN Verify Success", value: "PIN_VERIFY_SUCCESS" },
          { label: "PIN Verify Failed", value: "PIN_VERIFY_FAILED" },
          { label: "PIN Disabled", value: "PIN_DISABLED" },
          { label: "PIN Disabled", value: "PIN_SETUP_SKIPPED" },
        ],
        ui: { displayMode: "segmented-control" },
      }),
      ipAddress: text(),
      userAgent: text(),
      metadata: text({ defaultValue: "" }),
    },
    ui: {
      labelField: "action",
      listView: { initialColumns: ["timestamp", "action", "token"] },
    },
  }),
} satisfies Lists;
