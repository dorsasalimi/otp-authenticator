-- AlterTable
ALTER TABLE "OtpUser" ADD COLUMN     "verificationCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "verificationExpire" TIMESTAMP(3);
