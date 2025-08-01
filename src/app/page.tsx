"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import MachineCard from "../components/MachineCard";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  FaSignInAlt,
  FaSignOutAlt,
  FaUserPlus,
  FaCogs,
  FaClipboardList,
} from "react-icons/fa";

interface TechnicalSpec {
  name: string;
  value: string;
}

interface Machine {
  model: string;
  description: string;
  imageUri: string;
  technicalDetails: TechnicalSpec[];
}

export default function HomePage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const snapshot = await getDocs(collection(db, "machines"));
        const data = snapshot.docs.map((doc) => doc.data() as Machine);
        setMachines(data);
      } catch (error) {
        console.error("Makine verileri alınamadı:", error);
      }
    };
    fetchMachines();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const role = localStorage.getItem("user_role");
      setUserRole(role);
      setIsLoggedIn(!!user || !!role);
      setIsAdmin(role === "developer" || role === "boss" || role === "rnd");
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("user_role");
    localStorage.removeItem("is_admin");
    try {
      await signOut(auth);
    } catch {}
    setIsLoggedIn(false);
    setUserRole(null);
    setIsAdmin(false);
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Üst Toolbar */}
      <div className="relative z-10 w-full flex items-center justify-between px-6 py-4 bg-white/10 backdrop-blur-md shadow-lg">
        {/* Sol: Giriş/Çıkış */}
<div className="flex items-center gap-3">
  {isLoggedIn ? (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 border border-gray-600 text-sm font-medium transition"
      title="Çıkış Yap"
    >
      <FaSignOutAlt className="inline mr-1" /> Çıkış
    </button>
  ) : (
    <>
      <Link href="/login" title="Giriş Yap">
        <button className="px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 border border-gray-600 text-sm font-medium transition">
          <FaSignInAlt className="inline mr-1" /> Giriş
        </button>
      </Link>
      <Link href="/register" title="Kayıt Ol">
        <button className="px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 border border-gray-600 text-sm font-medium transition">
          <FaUserPlus className="inline mr-1" /> Kayıt
        </button>
      </Link>
    </>
  )}
</div>

        {/* Orta: Başlık */}
        <h1 className="ml-32 text-xl md:text-2xl font-extrabold tracking-wide text-center flex-1 drop-shadow-lg">
          Tarım Öz
        </h1>

        {/* Sağ: Rol Bazlı Butonlar */}
        <div className="flex gap-2">
          {(userRole === "customer" || userRole === "dealer") && (
            <>
              <Link href="/customer/orders/create">
                <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 hover:scale-105 transition-transform shadow-md text-sm">
                  <FaCogs />
                  <span>Sipariş Oluştur</span>
                </button>
              </Link>
              <Link href="/customer/orders">
                <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 hover:scale-105 transition-transform shadow-md text-sm">
                  <FaClipboardList />
                  <span>Siparişlerim</span>
                </button>
              </Link>
            </>
          )}

          {/* Admin Makine Ekle Butonu */}
          {isAdmin && (
            <Link href="/add-machine">
              <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-400 to-purple-700 hover:scale-105 transition-transform shadow-md text-sm">
                Makine Ekle
              </button>
            </Link>
          )}

          {userRole === "purchase" && (
            <Link href="/purchase">
              <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-400 to-green-700 hover:scale-105 transition-transform shadow-md text-sm">
                Satın Alım Paneli
              </button>
            </Link>
          )}

          {userRole === "rnd" && (
            <Link href="/rnd">
              <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 hover:scale-105 transition-transform shadow-md text-sm">
                AR-GE Paneli
              </button>
            </Link>
          )}

          {userRole === "production" && (
            <Link href="/production">
              <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-400 to-pink-600 hover:scale-105 transition-transform shadow-md text-sm">
                Üretim Paneli
              </button>
            </Link>
          )}

          {userRole === "developer" && (
            <Link href="/alper-dashboard">
              <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105 transition-transform shadow-md text-sm">
                Developer Panel
              </button>
            </Link>
          )}

          {userRole === "boss" && (
            <Link href="/boss-dashboard">
              <button className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-105 transition-transform shadow-md text-sm">
                Patron Paneli
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Makine Listesi */}
      <div className="relative z-10 flex-1 p-6">
        {machines.length === 0 ? (
          <p className="text-center text-gray-300 text-lg mt-10">Makine bulunamadı.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines.map((machine, index) => (
              <MachineCard
                key={index}
                model={machine.model}
                description={machine.description}
                imageUri={machine.imageUri}
                technicalDetails={machine.technicalDetails}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
