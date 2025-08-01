import type { NextApiRequest, NextApiResponse } from "next";
import { admin } from "../../lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Sadece POST istekleri desteklenir" });
  }

  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ success: false, message: "UID gerekli" });
  }

  try {
    await admin.auth().deleteUser(uid);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Auth silme hatası:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
