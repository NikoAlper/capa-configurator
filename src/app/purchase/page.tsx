"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import RoleGuard from "../../components/RoleGuard";
import Link from "next/link";
import { FaHome } from "react-icons/fa";
import { FaCheckCircle } from "react-icons/fa";
import Toast, {ToastType} from "../../components/Toast";

interface Order {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  designData: {
    model: string;
    description: string;
    technicalSpecs: { name: string; value: string }[];
  };
  status: string;
  rejectReason?: string;
  customerId?: string;
}

interface Dealer {
  id: string;
  username: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  discountRate: number;
}

export default function PurchasePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), where("status", "==", "pending_purchase"));
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

  const fetchDealers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "dealers"));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Dealer[];
      setDealers(data);
    } catch (error) {
      console.error("Bayiler alınamadı:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDealers();
  }, []);

  const handleApprove = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: "approved_purchase",
        "timestamps.updatedAt": new Date(),
      });
      setToast({message:"Sipariş onaylandı!", type: "success"})
      fetchOrders();
    } catch (err) {
      console.error("Onay hatası:", err);
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
      setToast({message: "Sipariş reddedildi!", type: "error"})
      setRejectReason("");
      setActiveRejectId(null);
      fetchOrders();
    } catch (err) {
      console.error("Red hatası:", err);
    }
  };

  const getDealerForOrder = (order: Order) => {
    if (order.customerName?.startsWith("dealer_")) {
      const username = order.customerName.replace("dealer_", "");
      return dealers.find((d) => d.username === username);
    }
    return null;
  };

  return (
    <RoleGuard allowedRoles={["purchase", "boss"]}>
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 font-sans">
        {/* Başarılı işlem bildirimi */}
        {showSuccess && (
          <div className="fixed inset-0 flex items-center justify-center z-[9999]">
            <div className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-xl font-bold animate-fadeIn">
              <FaCheckCircle className="inline mr-2" /> {successMessage}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-lg">
            Satın Alım Paneli
          </h1>
          <Link href="/">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 transition-transform shadow-md">
              <FaHome /> Ana Sayfa
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

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg">
          {loading ? (
            <p>Yükleniyor...</p>
          ) : orders.length === 0 ? (
            <p>Onay bekleyen sipariş yok.</p>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const dealer = getDealerForOrder(order);
                return (
                  <div key={order.id} className="p-5 bg-white/10 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-yellow-300">{order.designData.model}</h2>
                    <p className="text-gray-300 mb-2">{order.designData.description}</p>

                    <p className="text-sm text-gray-400 mt-1">
                      <strong>Müşteri:</strong> {order.customerName}
                    </p>
                    <p className="text-sm text-gray-400">
                      <strong>E-Posta:</strong> {order.customerEmail || "Belirtilmedi"}
                    </p>
                    <p className="text-sm text-gray-400">
                      <strong>Telefon:</strong> {order.customerPhone || "Belirtilmedi"}
                    </p>

                    {dealer && (
                      <div className="mt-4 p-3 bg-white/10 rounded text-sm">
                        <h4 className="font-semibold mb-1">Bayi Bilgileri:</h4>
                        <p><strong>İsim:</strong> {dealer.name}</p>
                        <p><strong>Email:</strong> {dealer.email}</p>
                        <p><strong>Adres:</strong> {dealer.address}</p>
                        <p><strong>Telefon:</strong> {dealer.phone}</p>
                        <p><strong>İskonto Oranı:</strong> %{dealer.discountRate.toFixed(2)}</p>
                      </div>
                    )}

                    <h3 className="text-lg font-semibold mt-3">Seçilen Konfigürasyon:</h3>
                    <ul className="mt-2 text-sm text-gray-300 space-y-1">
                      {order.designData.technicalSpecs.length > 0 ? (
                        order.designData.technicalSpecs.map((spec, i) => (
                          <li key={i}>
                            <span className="font-medium text-gray-100">{spec.name}:</span> {spec.value}
                          </li>
                        ))
                      ) : (
                        <li>Bu sipariş için opsiyon bilgisi yok.</li>
                      )}
                    </ul>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        onClick={() => handleApprove(order.id)}
                        className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 transition"
                      >
                        Onayla
                      </button>
                      <button
                        onClick={() => setActiveRejectId(order.id)}
                        className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
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
                );
              })}
            </div>
          )}
        </div>
      </main>
    </RoleGuard>
  );
}