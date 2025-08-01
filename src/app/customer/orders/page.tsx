"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../../lib/firebase";
import { collection, getDocs, query, where, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import RoleGuard from "../../../components/RoleGuard";
import { generateOrderPDF, downloadPDF } from "../../../../utils/pdfGenerator";
import Link from "next/link";

interface TechnicalSpec {
  name: string;
  value: string;
}

interface Order {
  id: string;
  customerName?: string;
  designData: {
    model: string;
    description: string;
    technicalSpecs: TechnicalSpec[];
  };
  status: string;
  rejectReason?: string;
  timestamps?: {
    createdAt?: Timestamp;
  };
}

interface Part {
  name: string;
  price: number;
}

const statusSteps = [
  { key: "pending_purchase", label: "Satın Alım Onayı Bekliyor" },
  { key: "approved_purchase", label: "AR-GE Onayı Bekliyor" },
  { key: "approved_rnd", label: "Üretimde" },
  { key: "completed", label: "Tamamlandı" },
  { key: "rejected", label: "Reddedildi!" }
];

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        const role = localStorage.getItem("user_role");
        setUserRole(role);
      } else {
        setUserId(localStorage.getItem("dealer_username") ? "dealer" : null);
        setUserRole(localStorage.getItem("user_role"));
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchOrders = async (uid: string) => {
    setLoading(true);
    try {
      let q;
      if (userRole === "dealer") {
        const dealerName = localStorage.getItem("dealer_username");
        q = query(collection(db, "orders"), where("customerId", "==", `dealer_${dealerName}`));
      } else {
        q = query(collection(db, "orders"), where("customerId", "==", uid));
      }
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => {
        return {
          id: docSnap.id,
          ...(docSnap.data() as object),
        } as Order;
      });
      setOrders(data);
    } catch (err) {
      console.error("Sipariş verileri alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchOrders(userId);
  }, [userId]);

  // REDDEDİLEN SİPARİŞLERİ 15 SANİYE SONRA SİL
  useEffect(() => {
    orders
      .filter((order) => order.status === "rejected")
      .forEach((order) => {
        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, "orders", order.id));
            setOrders((prev) => prev.filter((o) => o.id !== order.id));
            console.log(`Reddedilen sipariş silindi: ${order.id}`);
          } catch (error) {
            console.error("Reddedilen sipariş silinemedi:", error);
          }
        }, 15000); // 15 saniye
      });
  }, [orders]);

  const getActiveStep = (status: string) => {
    if (status === "rejected") return -1;
    const index = statusSteps.findIndex((step) => step.key === status);
    return index === -1 ? 0 : index;
  };

  const handleDownloadPDF = async (order: Order, includePriceList: boolean) => {
    try {
      let priceList: Part[] | undefined = undefined;

      if (includePriceList && userRole === "dealer") {
        const partsSnap = await getDocs(collection(db, "parts"));
        priceList = partsSnap.docs.map((docSnap) => {
          const data = docSnap.data() as Part;
          return { name: data.name, price: data.price };
        });
      }

      const orderDate = order.timestamps?.createdAt
        ? new Date(order.timestamps.createdAt.seconds * 1000).toLocaleDateString("tr-TR")
        : new Date().toLocaleDateString("tr-TR");

      const pdfBytes = await generateOrderPDF(
        {
          model: order.designData.model,
          description: order.designData.description,
          technicalSpecs: order.designData.technicalSpecs,
          customerName: order.customerName || (userRole === "dealer" ? "Bayi" : "Müşteri"),
          orderDate,
          priceList,
        },
        includePriceList && userRole === "dealer"
      );

      const fileName = includePriceList
        ? `bayi_pdf_${order.designData.model}.pdf`
        : `musteri_pdf_${order.designData.model}.pdf`;

      downloadPDF(pdfBytes, fileName);
    } catch (err) {
      console.error("PDF oluşturulamadı:", err);
    }
  };

  return (
    <RoleGuard allowedRoles={["customer", "dealer"]}>
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Siparişlerim</h1>
          <Link href="/">
            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform shadow-md hover:shadow-lg">
              Ana Menü
            </button>
          </Link>
        </div>

        {loading ? (
          <p>Yükleniyor...</p>
        ) : orders.length === 0 ? (
          <p>Henüz siparişiniz yok.</p>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-5 bg-white/10 backdrop-blur-md rounded-xl shadow-lg transition hover:scale-[1.01]"
              >
                <h2 className="text-2xl font-semibold mb-1">{order.designData.model}</h2>
                <p className="text-gray-300 mb-4">{order.designData.description}</p>

                {/* Sipariş Detayları */}
                <div className="bg-white/5 p-4 rounded-lg shadow-inner">
                  <h3 className="text-lg font-semibold text-white mb-3">Sipariş Detayları</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                    {order.designData.technicalSpecs.map((spec, i) => {
                      const isExtra = spec.name.toLowerCase().includes("ekstra");
                      return (
                        <div
                          key={i}
                          className={`flex justify-between items-center bg-white/5 p-2 rounded-lg ${
                            isExtra ? "border-l-4 border-emerald-400" : ""
                          }`}
                        >
                          <span className="font-medium flex items-center space-x-1">
                            {isExtra ? (
                              <>
                                <span className="text-emerald-400">➕</span>
                                <span>{spec.name}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-sky-400">✔</span>
                                <span>{spec.name}</span>
                              </>
                            )}
                          </span>
                          <span className="text-gray-200">{spec.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline */}
                <div className="mt-5">
                  {order.status === "rejected" ? (
                    <div>
                      <p className="text-red-500 font-bold text-lg">Sipariş Reddedildi</p>
                      {order.rejectReason && (
                        <p className="text-red-400 text-sm mt-1">
                          <strong>Red Nedeni:</strong> {order.rejectReason}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        *Bu sipariş 15 saniye içinde otomatik silinecek.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs text-gray-300 mb-2">
                        {statusSteps.map((step, index) => (
                          <span
                            key={index}
                            className={
                              getActiveStep(order.status) >= index
                                ? "text-emerald-400 font-semibold"
                                : "text-gray-400"
                            }
                          >
                            {step.label}
                          </span>
                        ))}
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2 relative">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${((getActiveStep(order.status) + 1) / statusSteps.length) * 100}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* PDF İndirme Butonları */}
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => handleDownloadPDF(order, false)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-2 rounded-lg shadow hover:scale-105 transition"
                  >
                    {userRole === "dealer" ? "Müşteri PDF'i" : "PDF İndir"}
                  </button>
                  {userRole === "dealer" && (
                    <button
                      onClick={() => handleDownloadPDF(order, true)}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 rounded-lg shadow hover:scale-105 transition"
                    >
                      Bayi PDF'i
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </RoleGuard>
  );
}
