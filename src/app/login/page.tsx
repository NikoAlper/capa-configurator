"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  FaSignInAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { collection, getDocs } from "firebase/firestore";

type NotificationType = "success" | "error" | "info";

interface Notification {
  message: string;
  type: NotificationType;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const router = useRouter();

  const users = [
    { username: "alperdev", password: "alper123", role: "developer" },
    { username: "alperbey", password: "alperb1234", role: "boss" },
    { username: "hakan", password: "hakan123", role: "rnd" },
    { username: "satı", password: "sati123", role: "rnd" },
    { username: "samet", password: "samet123", role: "rnd" },
    { username: "üretimciler1", password: "uret1", role: "production" },
    { username: "üretimciler2", password: "uret2", role: "production" },
    { username: "kadirbey", password: "kadir123", role: "purchase" },
  ];

  const showNotification = (message: string, type: NotificationType = "info") => {
    setNotification({ message, type });
    setNotificationVisible(true);
    setTimeout(() => setNotificationVisible(false), 2000);
  };

  const startProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

const handleLogin = async () => {
  if (!email || !password) {
    setError("Lütfen tüm alanları doldurun");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const username = email.trim().toLowerCase();
    const foundUser = users.find((user) => user.username === username);

    const showWelcome = (name: string) => {
      setWelcomeMessage(`Hoşgeldin, ${name}!`);
      setShowWelcomeScreen(true);
      startProgress();
      setTimeout(() => {
        router.push("/");
      }, 5000);
    };

    // Admin kullanıcılar
    if (foundUser) {
      if (password !== foundUser.password) {
        throw new Error("Şifre hatalı!");
      }

      localStorage.setItem("user_role", foundUser.role);
      localStorage.setItem("user_name", foundUser.username);
      localStorage.setItem(
        "is_admin",
        ["developer", "boss", "rnd"].includes(foundUser.role) ? "true" : "false"
      );

      showWelcome(foundUser.username.toUpperCase());
      return;
    }

    // Bayi kullanıcılar
    const dealersSnapshot = await getDocs(collection(db, "dealers"));
    const dealers = dealersSnapshot.docs.map((docSnap) => docSnap.data()) as {
      username: string;
      password: string;
      name: string;
    }[];

    const foundDealer = dealers.find(
      (dealer) =>
        dealer.username.toLowerCase() === username && dealer.password === password
    );

    if (foundDealer) {
      localStorage.setItem("user_role", "dealer");
      localStorage.setItem("dealer_username", foundDealer.username);
      localStorage.setItem("dealer_name", foundDealer.name);
      localStorage.setItem("is_admin", "false");

      showWelcome(foundDealer.name);
      return;
    }

    // Firebase Authentication kullanıcıları (müşteri + dashboard'tan eklenen kullanıcılar)
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Firestore'dan UID ile kullanıcı bilgisi çek
    const usersSnapshot = await getDocs(collection(db, "users"));
    const userDoc = usersSnapshot.docs.find((doc) => doc.id === uid);
    const userData = userDoc?.data();

    if (!userData) throw new Error("Kullanıcı Firestore'da bulunamadı.");

    const role = userData.role || "customer";
    const name = userData.name || "Kullanıcı";

    localStorage.setItem("user_role", role);
    localStorage.setItem("user_name", name);
    localStorage.setItem("is_admin", ["developer", "boss", "rnd"].includes(role) ? "true" : "false");

    showWelcome(name);
  } catch (err: any) {
    setError(err.message);
    showNotification(err.message, "error");
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Hoşgeldin Kartı */}
      {showWelcomeScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-emerald-400 to-blue-500 p-10 rounded-2xl shadow-2xl text-center animate-fadeIn w-80">
            <div className="flex flex-col items-center">
              <Image
                src="/images/tarimozlogo.png"
                alt="Logo"
                width={100}
                height={100}
                className="mb-4 animate-spin-slow"
              />
              <h1 className="text-3xl font-bold text-white animate-pulse">{welcomeMessage}</h1>
              <p className="text-white mt-2 text-sm opacity-90">Yönlendiriliyorsunuz...</p>

              {/* Progress Bar */}
              <div className="w-full bg-white/30 rounded-full h-2 mt-4">
                <div
                  className="h-2 rounded-full bg-white transition-all duration-100"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arka plan */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/arkaplan.png')" }} />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Bildirim */}
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

      {/* Login Kartı */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center">
        <Image
          src="/images/tarimozlogo.png"
          alt="Logo"
          width={120}
          height={120}
          className="mb-6"
        />

        <input
          type="text"
          placeholder="Kullanıcı Adı / E-posta"
          className="w-full p-3 mb-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Şifre"
          className="w-full p-3 mb-6 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex flex-col items-center mb-6">
          <button
            onClick={handleLogin}
            className="bg-gradient-to-r px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 border border-gray-600 text-sm font-medium transition"
            disabled={loading}
          >
            <FaSignInAlt size={28} />
          </button>
          <span className="mt-3 text-lg font-semibold">Giriş Yap</span>
        </div>

        <Link
          href="/register"
          className="text-sm text-gray-300 hover:text-white hover:underline transition"
        >
          Hesabınız yok mu? Kayıt Ol
        </Link>

        {error && (
          <p className="mt-4 text-red-400 text-center bg-white/10 p-2 rounded">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
