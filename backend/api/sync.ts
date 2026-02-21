// sync.ts
import { Request, Response } from 'express';
import { Context } from '.keystone/types';
const { authenticator } = require('otplib');

export default async function syncHandler(req: Request, res: Response, context: Context) {
  const { phoneNumber, action, appId, accountId } = req.body;

  if (!phoneNumber) return res.status(400).json({ error: 'شماره موبایل الزامی است' });

  try {
    const user = await context.query.OtpUser.findOne({
      where: { phoneNumber },
      query: 'id',
    });

    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });

    if (action === 'CREATE_NEW_TOKEN') {
      if (!appId) return res.status(400).json({ error: 'انتخاب اپلیکیشن الزامی است' });

      const rawSecret = authenticator.generateSecret();

      const newToken = await context.query.OTPToken.createOne({
        data: {
          user: { connect: { id: user.id } },
          app: { connect: { id: appId } },
          encryptedSecret: rawSecret, 
          isVerified: true,
        },
        query: 'id app { issuer name }',
      });

      return res.json({
        success: true,
        newToken: {
          id: newToken.id,
          secret: rawSecret,
          issuer: newToken.app.issuer,
          label: newToken.app.name,
        }
      });
    }

    else if (action === 'DELETE_ACCOUNT') {
      if (accountId) {
        await context.query.OTPToken.deleteOne({ where: { id: accountId } });
      }
    }

    const userData = await context.query.OtpUser.findOne({
      where: { id: user.id },
      query: 'tokens { id encryptedSecret app { issuer name } }',
    });

    return res.json({ 
      success: true, 
      tokens: userData.tokens 
    });

  } catch (error: any) {
    console.error('Sync Error:', error);
    return res.status(500).json({ error: 'خطا در مدیریت توکن‌ها' });
  }
}