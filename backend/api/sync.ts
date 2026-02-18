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

    // ۱. درخواست تولید توکن جدید از سمت سرور
    if (action === 'CREATE_NEW_TOKEN') {
      if (!appId) return res.status(400).json({ error: 'انتخاب اپلیکیشن الزامی است' });

      // تولید سکرت خام
      const rawSecret = authenticator.generateSecret();

      // ایجاد رکورد در OTPToken
      // نکته: هوک resolveInput در اسکیما، این rawSecret را رمزنگاری کرده و در encryptedSecret ذخیره می‌کند
      const newToken = await context.query.OTPToken.createOne({
        data: {
          user: { connect: { id: user.id } },
          app: { connect: { id: appId } },
          // ما سکرت خام را می‌فرستیم، هوک اسکیما آن را تبدیل به encryptedSecret می‌کند
          encryptedSecret: rawSecret, 
          isVerified: true,
        },
        query: 'id app { issuer name }',
      });

      // برگرداندن سکرت خام به موبایل (فقط در همین لحظه)
      return res.json({
        success: true,
        newToken: {
          id: newToken.id,
          secret: rawSecret, // موبایل این را برای تولید کد نیاز دارد
          issuer: newToken.app.issuer,
          label: newToken.app.name,
        }
      });
    }

    // ۲. عملیات حذف
    else if (action === 'DELETE_ACCOUNT') {
      if (accountId) {
        await context.query.OTPToken.deleteOne({ where: { id: accountId } });
      }
    }

    // ۳. دریافت لیست برای همگام‌سازی (Sync)
    // نکته امنیتی: در این مرحله باید سکرت‌ها را دکریپت کنید و بفرستید یا فقط لیست را بفرستید
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