// pages/api/sendEmail.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sendMail } from "../../../utils/sendMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Sadece POST istekleri desteklenir" });
  }

  const { to, subject, text, html } = req.body;

  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ success: false, message: "Eksik parametreler var." });
  }

  try {
    const info = await sendMail({ to, subject, text, html });
    res.status(200).json({ success: true, message: "Mail başarıyla gönderildi", id: info.messageId });
  } catch (error: any) {
    console.error("Mail gönderim hatası:", error);
    res.status(500).json({ success: false, message: error.message || "Mail gönderilemedi" });
  }
}
