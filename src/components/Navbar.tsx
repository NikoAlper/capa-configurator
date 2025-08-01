"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import MachineCard from "../components/MachineCard";
import Link from "next/link";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Machine {
  model: string;
  description: string;
  imageUri: string;
}

export default function HomePage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const snapshot = await getDocs(collection(db, "machines"));
        const data = snapshot.docs.map(doc => doc.data() as Machine);
        setMachines(data);
      } catch (error) {
        console.error("Makine verileri alınamadı:", error);
      }
    };
    fetchMachines();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white relative">
      {/* Navbar */}
      <div className="w-full bg-gray-800 text-white p-4 flex items-center justify-center shadow-md">
        <h1 className="text-lg font-bold">Tarım Makine Kataloğu</h1>
      </div>

      {/* Makine Listesi */}
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Makine Listesi</h2>
        {machines.length === 0 ? (
          <p>Makine bulunamadı.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines.map((machine, index) => (
              <MachineCard
                key={index}
                model={machine.model}
                description={machine.description}
                imageUri={machine.imageUri}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Butonlar */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4">
        {isLoggedIn ? (
          <>
            <Link href="/admin">
              <button className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition">
                A
              </button>
            </Link>
            <button
              onClick={() => auth.signOut()}
              className="bg-red-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
            >
              Ç
            </button>
          </>
        ) : (
          <>
            <Link href="/login">
              <button className="bg-green-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition">
                G
              </button>
            </Link>
            <Link href="/register">
              <button className="bg-yellow-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition">
                K
              </button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}