import crypto from 'crypto';

// ۱. کلید حتما باید ۳۲ کاراکتر باشد
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; 

// ۲. برای AES-CBC مقدار IV همیشه ۱۶ است
const IV_LENGTH = 16; 

export function decrypt(text: string) {
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) throw new Error('فرمت متن رمزنگاری شده اشتباه است');

    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

    // بررسی طول کلید قبل از شروع برای جلوگیری از کرش سرور
    const keyBuffer = Buffer.from(ENCRYPTION_KEY);
    if (keyBuffer.length !== 32) {
      throw new Error(`طول کلید باید ۳۲ بایت باشد، اما الان ${keyBuffer.length} بایت است.`);
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
   
    return decrypted.toString();
  } catch (error: any) {
    console.error("Error in Decrypt function:", error.message);
    throw error;
  }
}