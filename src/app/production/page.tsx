"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import RoleGuard from "../../components/RoleGuard";
import Link from "next/link";
import { FaHome, FaCheckCircle } from "react-icons/fa";
import Toast, {ToastType} from "../../components/Toast";

interface Order {
  id: string;
  customerName: string;
  designData: {
    model: string;
    description: string;
    technicalSpecs: { name: string; value: string }[];
  };
  status: string;
  rejectReason?: string;
}

export default function ProductionPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("status", "==", "approved_rnd")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Order[];
      setOrders(data);
    } catch (err) {
      console.error("Sipariş verileri alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleComplete = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "completed",
        "timestamps.updatedAt": new Date(),
      });
      setToast({message: "Sipariş üretimi tamamlandı!", type: "success"})
      fetchOrders();
    } catch (err) {
      console.error("Üretim tamamla hatası:", err);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!rejectReason.trim()) {
      setToast({message: "Lütfen reddetme nedeni giriniz!", type: "error"})
      return;
    }
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "rejected",
        rejectReason,
        "timestamps.updatedAt": new Date(),
      });
      setToast({message: "Sipariş reddedildi!", type: "success"})
      setRejectReason("");
      setActiveRejectId(null);
      fetchOrders();
    } catch (err) {
      console.error("Reddetme hatası:", err);
    }
  };

  return (
    <RoleGuard allowedRoles={["production", "boss"]}>
      <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
        {/* Başarılı işlem bildirimi */}
        {showSuccess && (
          <div className="fixed inset-0 flex items-center justify-center z-[9999]">
            <div className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-xl font-bold animate-fadeIn">
              <FaCheckCircle className="inline mr-2" /> {successMessage}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
            Üretim Paneli
          </h1>
          <Link href="/">
            <button className="px-4 py-2 rounded bg-gray-700 hover:bg-red-700 transition">
              Ana Sayfa
            </button>
          </Link>
        </div>

                              {/* Toast mesajı */}
                      {toast && (
                        <Toast
                          message={toast.message}
                          type={toast.type}
                          onClose={() => setToast(null)}
                        />
                      )}

        {loading ? (
          <p>Yükleniyor...</p>
        ) : orders.length === 0 ? (
          <p>Üretim bekleyen sipariş yok.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-6 bg-gray-800 rounded-2xl shadow-xl backdrop-blur-sm border border-gray-700"
              >
                <h2 className="text-2xl font-semibold text-green-400">
                  {order.designData.model}
                </h2>
                <p className="text-gray-300 italic mb-2">
                  {order.designData.description}
                </p>

                <h3 className="text-lg font-medium mt-4 text-white">
                  Seçilen Konfigürasyon:
                </h3>
                <ul className="mt-2 text-sm text-gray-400 space-y-1">
                  {order.designData.technicalSpecs.length > 0 ? (
                    order.designData.technicalSpecs.map((spec, i) => (
                      <li key={i}>
                        <span className="font-medium text-gray-200">
                          {spec.name}:
                        </span>{" "}
                        {spec.value}
                      </li>
                    ))
                  ) : (
                    <li>Bu sipariş için opsiyon bilgisi yok.</li>
                  )}
                </ul>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => handleComplete(order.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
                  >
                    Üretim Tamamlandı
                  </button>
                  <button
                    onClick={() => setActiveRejectId(order.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow"
                  >
                    Reddet
                  </button>
                </div>

                {activeRejectId === order.id && (
                  <div className="mt-4 p-4 bg-gray-700 rounded-xl">
                    <textarea
                      placeholder="Reddetme nedenini girin..."
                      className="w-full p-2 text-black rounded"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReject(order.id)}
                        className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                      >
                        Onayla
                      </button>
                      <button
                        onClick={() => setActiveRejectId(null)}
                        className="bg-gray-500 px-3 py-1 rounded hover:bg-gray-600"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </RoleGuard>
  );
}
