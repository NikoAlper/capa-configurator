"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FaUserPlus, FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";

type NotificationType = "success" | "error" | "info";
interface Notification {
  message: string;
  type: NotificationType;
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [generatedCode, setGeneratedCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [notification, setNotification] = useState<Notification | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const showNotification = (message: string, type: NotificationType = "info") => {
    setNotification({ message, type });
    setNotificationVisible(true);
    setTimeout(() => setNotificationVisible(false), 2500);
  };

  const handleRegister = async () => {
    if (!email || !password || !name || !phone) {
      showNotification("Lütfen tüm alanları doldurun", "error");
      return;
    }

    if (password.length < 6) {
      showNotification("Şifre en az 6 karakter olmalıdır", "error");
      return;
    }

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      showNotification("Telefon numaranız geçersiz", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/initiateRegister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showNotification(result.message || "Kod gönderilemedi", "error");
        return;
      }

      setGeneratedCode(result.code);
      setStep("verify");
      showNotification("Kod gönderildi. Lütfen e-posta kutunuzu kontrol edin.", "info");
    } catch (err) {
      console.error(err);
      showNotification("Mail gönderimi sırasında hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (verificationCode !== generatedCode) {
      showNotification("Kod hatalı, lütfen kontrol edin", "error");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        name,
        email,
        phone,
        role: "customer",
        password,
        verificationCode: generatedCode,
        verified: true,
        createdAt: new Date(),
      });

      showNotification("Hesap doğrulandı. Giriş yapabilirsiniz.", "success");
      router.push("/login");
    } catch (err: any) {
      console.error("Kayıt/Doğrulama hatası:", err);
      if (err.code === "auth/email-already-in-use") {
        showNotification("Bu e-posta zaten kayıtlı.", "error");
      } else {
        showNotification("Hesap oluşturulamadı.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {notification && (
        <div
          className={`fixed top-6 right-6 z-[9999] flex items-center space-x-2 px-5 py-3 rounded-xl shadow-2xl text-white font-medium transition-all duration-500
          ${notificationVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
          ${notification.type === "success" ? "bg-emerald-600"
            : notification.type === "error" ? "bg-rose-600"
              : "bg-sky-600"}`}
        >
          {notification.type === "success" && <FaCheckCircle />}
          {notification.type === "error" && <FaTimesCircle />}
          {notification.type === "info" && <FaInfoCircle />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/arkaplan.png')" }} />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center">
        <Image
          src="/images/tarimozlogo.png"
          alt="Logo"
          width={120}
          height={120}
          className="mb-6"
        />

        {step === "register" && (
          <>
            <input type="text" placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 mb-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300" />
            <input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300" />
            <input type="text" placeholder="Telefon Numarası" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 mb-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300" />
            <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-6 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300" />
            <div className="flex flex-col items-center mb-6">
              <button onClick={handleRegister} disabled={loading} className="bg-gradient-to-r px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 border border-gray-600 text-sm font-medium transition">
                <FaUserPlus size={28} />
              </button>
              <span className="mt-3 text-lg font-semibold">Kayıt Ol</span>
            </div>
          </>
        )}

        {step === "verify" && (
          <>
            <p className="mb-4 text-sm">E-posta adresinize gönderilen 6 haneli kodu girin:</p>
            <input type="text" placeholder="Doğrulama Kodu" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="w-full p-3 mb-6 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300" />
            <button onClick={handleVerification} disabled={loading} className="bg-gradient-to-r from-green-400 to-green-600 px-6 py-2 rounded-full hover:scale-105 transition-transform shadow-md">
              Doğrula ve Girişe Geç
            </button>
          </>
        )}

        <Link href="/login" className="text-sm text-gray-300 hover:text-white hover:underline transition">
          Zaten hesabınız var mı? Giriş Yap
        </Link>
      </div>
    </main>
  );
}
