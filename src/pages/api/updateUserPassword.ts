import type { NextApiRequest, NextApiResponse } from "next";
import { admin } from "../../lib/firebaseAdmin";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  const { uid, newPassword } = req.body;

  console.log("🟡 API çağrısı: updateUserPassword");
  console.log("UID:", uid);
  console.log("New Password:", newPassword);

  // Gerekli alan kontrolü
  if (!uid || typeof newPassword !== "string" || newPassword.trim().length < 6) {
    return res.status(400).json({ message: "UID ve en az 6 karakterlik newPassword gereklidir." });
  }

  try {
    // Firebase Authentication şifresini güncelle
    await admin.auth().updateUser(uid, { password: newPassword });
    console.log("✅ Firebase Auth şifresi güncellendi.");

    // Firestore'daki users koleksiyonundaki şifreyi güncelle
    await updateDoc(doc(db, "users", uid), { password: newPassword });
    console.log("✅ Firestore users koleksiyonundaki şifre güncellendi.");

    return res.status(200).json({ message: "Şifre başarıyla güncellendi!" });
  } catch (err: any) {
    console.error("❌ Şifre güncelleme hatası:", err);
    return res.status(500).json({ message: err.message || "Sunucu hatası." });
  }
}
