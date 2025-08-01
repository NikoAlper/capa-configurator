"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";

export default function ForbiddenPage() {
  const router = useRouter();
  const totalSeconds = 10;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          router.push("/login");
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [router]);

  const progressPercentage = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-10 max-w-md text-center w-full">
        <h1 className="text-3xl font-extrabold text-yellow-400 drop-shadow mb-2">
          Tarım Öz Güvenlik Sistemi
        </h1>
        <h2 className="text-xl font-semibold mb-2 text-red-400">
          Erişim Reddedildi
        </h2>
        <p className="text-gray-300 mb-4">
          Bu sayfaya erişim yetkiniz bulunmamaktadır.
        </p>
        <p className="text-sm text-gray-400 mb-4">
          <span className="text-white font-semibold">{secondsLeft}</span> saniye içinde giriş ekranına yönlendirileceksiniz.
        </p>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-1000"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <Link href="/login">
          <button className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2 rounded-lg hover:scale-105 transition-transform shadow-md">
            <FaArrowLeft />
            Giriş Sayfasına Git
          </button>
        </Link>
      </div>
    </main>
  );
}
