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
import Image from "next/image";
import Toast, { ToastType } from "../../components/Toast";

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

export default function RndPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("status", "==", "approved_purchase")
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

  const handleApprove = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "approved_rnd",
        "timestamps.updatedAt": new Date(),
      });
      setToast({ message: "Sipariş AR-GE tarafından onaylandı.", type: "success"})
      fetchOrders();
    } catch (err) {
      console.error("AR-GE onay hatası:", err);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!rejectReason.trim()) {
      setToast({ message: "Lütfen bir reddetme nedeni giriniz!", type: "error"})
      return;
    }
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "rejected",
        rejectReason,
        "timestamps.updatedAt": new Date(),
      });
      setToast({message: "Sipariş Arge tarafından reddedildi!", type: "success"})
      setRejectReason("");
      setActiveRejectId(null);
      fetchOrders();
    } catch (err) {
      console.error("AR-GE red hatası:", err);
    }
  };

  return (
    <RoleGuard allowedRoles={["rnd", "boss"]}>
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <div>
          <h1 className="text-2xl font-bold mb-6">AR-GE Paneli</h1>
          <Link href={"/"}>
            <button className="px-4 py-2 rounded bg-gray-600 hover:bg-red-700 transition">
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

        {showMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white px-8 py-6 rounded-xl shadow-2xl text-xl animate-fadeInOut">
              {messageContent}
            </div>
          </div>
        )}

        {loading ? (
          <p>Yükleniyor...</p>
        ) : orders.length === 0 ? (
          <p>AR-GE onayı bekleyen sipariş yok.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-gray-800 rounded-lg shadow-lg"
              >
                <h2 className="text-xl font-bold">{order.designData.model}</h2>
                <p className="text-gray-300 mb-2">
                  {order.designData.description}
                </p>

                <h3 className="text-lg font-semibold mt-2">
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

                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => handleApprove(order.id)}
                    className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => setActiveRejectId(order.id)}
                    className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                  >
                    Reddet
                  </button>
                </div>

                {activeRejectId === order.id && (
                  <div className="mt-4 p-3 bg-gray-700 rounded">
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