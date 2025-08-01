// utils/sendMail.ts
import nodemailer from "nodemailer";
import { promises as dns } from "dns";

export async function sendMail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  // E-posta doğrulama (MX kaydı)
  const domain = to.split("@")[1];
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      throw new Error("Geçersiz e-posta adresi (MX kaydı bulunamadı)");
    }
  } catch {
    throw new Error("Geçersiz e-posta adresi (DNS kontrolü başarısız)");
  }

  // Mail gönderme
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"Tarım Öz Doğrulama" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });

  if (!info.messageId) {
    throw new Error("Mail gönderimi onaylanmadı");
  }

  return info;
}
