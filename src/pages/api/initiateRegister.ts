import type { NextApiRequest, NextApiResponse } from "next";
import { sendMail } from "../../../utils/sendMail"; // 🔁 doğru modül yolu
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Sadece POST istekleri desteklenir" });
  }

  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ success: false, message: "Email ve isim zorunludur." });
  }

  // 1️⃣ Firestore'da bu e-posta var mı kontrol et
  const q = query(collection(db, "users"), where("email", "==", email));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return res.status(400).json({ success: false, message: "Bu e-posta zaten kayıtlı." });
  }

  // 2️⃣ Kod üret
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 3️⃣ Mail gönder
  try {
    await sendMail({
      to: email,
      subject: "Tarım Öz Hesap Doğrulama",
html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: rgba(255, 255, 255, 0.01); border-radius: 12px; overflow: hidden;">
    <div style="background: #b92118; color: #ffffff; padding: 24px; text-align: center;">
      <h2 style="margin: 0;">Tarım Öz</h2>
      <p style="margin: 4px 0 0;">Hesap Doğrulama Kodu</p>
    </div>
    <div style="padding: 30px; backdrop-filter: blur(5px); background: rgba(255, 255, 255, 0.1); color: #7c221a;">
      <p style="color: #1e293b;"> Merhaba <b style="color: #b92118">${name}</b>,</p>
      <p style="color: #1e293b;">Tarım Öz hesabınızı doğrulamak için aşağıdaki kodu kullanabilirsiniz:</p>
      <div style="margin: 30px 0; text-align: center;">
        <div style="
          display: inline-block;
          background: rgba(255, 255, 255, 0.05);
          color: #b92118;
          font-size: 28px;
          letter-spacing: 6px;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: bold;
          border: 1px solid rgba(185, 33, 24, 0.5);
          backdrop-filter: blur(3px);
        ">
          ${code}
        </div>
      </div>
      <p style="color: #334155;">Bu kod 10 dakika boyunca geçerlidir. Eğer bu işlemi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
    </div>
    <div style="background: #b92118; color: #e2e8f0; padding: 20px; text-align: center; font-size: 12px;">
      &copy; ${new Date().getFullYear()} Tarım Öz. Tüm hakları saklıdır.<br/>
      <span style="opacity: 0.6;">Developed by İbrahim Alper KAYA</span>
    </div>
  </div>
`,
    });

    // 4️⃣ Frontend'e kodu gönder (geçici bellekte saklayacak)
    return res.status(200).json({ success: true, code });
  } catch (err) {
    console.error("Doğrulama kodu gönderilemedi:", err);
    return res.status(500).json({ success: false, message: "Mail gönderimi sırasında hata oluştu." });
  }
}
