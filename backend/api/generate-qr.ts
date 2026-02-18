import { Request, Response } from 'express';
import { Context } from '.keystone/types';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

export default async function generateQR(req: Request, res: Response, context: Context) {
  try {
    const phoneNumber = req.query.phoneNumber as string;
    const appId = req.query.appId as string;

    if (!phoneNumber || !appId) return res.status(400).send('اطلاعات ناقص');

    const user = await context.query.OtpUser.findOne({ where: { phoneNumber }, query: 'id' });
    const app = await context.query.App.findOne({ where: { id: appId }, query: 'id issuer name apiKey' }); // apiKey را هم بگیریم

    if (!user || !app) return res.status(404).send('کاربر یا اپلیکیشن یافت نشد');

    // ۱. تولید سکرت خام و استاندارد
    const secret = speakeasy.generateSecret({ length: 20 });
    const rawSecret = secret.base32.replace(/\s+/g, "").toUpperCase(); // اطمینان از فرمت استاندارد

    // ۲. ذخیره در دیتابیس
    await context.query.OTPToken.createOne({
      data: {
        user: { connect: { id: user.id } },
        app: { connect: { id: app.id } },
        encryptedSecret: rawSecret, 
        isVerified: false,
      },
    });

    // ۳. ساخت دستی URL برای QR کد (بسیار مهم)
    // اضافه کردن apiKey به URL برای اینکه اسکنر گوشی بفهمد مربوط به کدام اپ است
    const label = encodeURIComponent(`قفلی:${app.name} (${phoneNumber})`);
    const issuer = encodeURIComponent(app.issuer || 'Ghofli');
    
    // ساخت رشته استاندارد otpauth با پارامترهای اختصاصی ما
    const otpauthUrl = `otpauth://totp/${label}?secret=${rawSecret}&issuer=${issuer}&apiKey=${app.apiKey}`;

    // ۴. تولید تصویر QR
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <div style="text-align:center; font-family:tahoma; padding:30px; background-color:#f4f7f6; min-height:100vh;">
        <div style="background:white; display:inline-block; padding:40px; border-radius:20px; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
          <h2 style="color:#2c3e50;">اسکن کد امنیتی</h2>
          <img src="${qrCodeDataUrl}" style="width:260px; margin:20px 0;" />
          <p style="color:#7f8c8d;">این کد را در اپلیکیشن <b>قفلی</b> اسکن کنید.</p>
          <div style="font-size:12px; color:#bdc3c7;">App ID: ${app.id}</div>
          <div style="margin-top:10px; font-family:monospace; font-size:10px; color:#ddd;">Secret: ${rawSecret}</div>
        </div>
      </div>
    `);

  } catch (error: any) {
    console.error("Critical Error:", error);
    return res.status(500).send(`خطای سیستمی: ${error.message}`);
  }
}