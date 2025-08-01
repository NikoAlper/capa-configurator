"use client";

import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import RoleGuard from "../../components/RoleGuard";
import Link from "next/link";
import { FaHome, FaClipboardList, FaCogs, FaUsers, FaSave, FaTrash, FaUndo } from "react-icons/fa";
import Toast, { ToastType } from "../../components/Toast";

interface TechnicalSpec {
  name: string;
  value: string;
}

interface DesignData {
  model: string;
  description: string;
  technicalSpecs: TechnicalSpec[];
}

interface Order {
  id: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  designData?: DesignData;
  status: string;
  rejectReason?: string;
}

interface Part {
  id: string;
  name: string;
  price: number;
  category?: string;
}

interface Dealer {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  discountRate: number;
}

const configCategories = {
  bacakSayisi: [
    { id: "5-bacak", name: "5 Bacak" },
    { id: "3-bacak", name: "3 Bacak" },
  ],
  yanAksesuar: [
    { id: "tava-1", name: "Tava 1" },
    { id: "tava-2", name: "Tava 2" },
    { id: "yildiz-disk", name: "Yıldız Disk" },
  ],
  arkaAksesuar: [
    { id: "arka1", name: "Arka Aksesuar 1" },
    { id: "arka2", name: "Arka Aksesuar 2" },
  ],
  bacakTipi: [
    { id: "yılan-dili", name: "İnce Bacak" },
    { id: "kalin", name: "Kalın Bacak" },
  ],
  bicakTipi: [
    { id: "düz", name: "Düz Bıçak" },
    { id: "eğri", name: "Eğri Bıçak" },
  ],
};

export default function BossDashboard() {
  const [activeTab, setActiveTab] = useState<"orders" | "pricing" | "dealers">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [deletedPart, setDeletedPart] = useState<Part | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showDealerModal, setShowDealerModal] = useState(false);
const [editDealer, setEditDealer] = useState<Dealer | null>(null);

  const [newDealer, setNewDealer] = useState<Omit<Dealer, "id">>({
    username: "",
    password: "",
    name: "",
    email: "",
    address: "",
    phone: "",
    discountRate: 0,
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "orders"));
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

  const fetchParts = async () => {
    try {
      const snapshot = await getDocs(collection(db, "parts"));
      const data = snapshot.docs.map((docSnap) => {
        const docData = docSnap.data() as Omit<Part, "id">;
        return { ...docData, id: docSnap.id };
      });
      setParts(data);
    } catch (error) {
      console.error("Parçalar alınamadı:", error);
    }
  };

  const fetchDealers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "dealers"));
      const data = snapshot.docs.map((docSnap) => {
        return { id: docSnap.id, ...docSnap.data() } as Dealer;
      });
      setDealers(data);
    } catch (error) {
      console.error("Bayiler alınamadı:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchParts();
    fetchDealers();
  }, []);

  const handleAddDealer = async () => {
    try {
      if (!newDealer.username || !newDealer.password) {
        setToast({ message: "Lütfen kullanıcı adı ve şifre giriniz!", type: "success" });
        return;
      }
      await setDoc(doc(collection(db, "dealers")), newDealer);
      setToast({ message: "Bayi eklendi!!", type: "success" });
      setNewDealer({ username: "", password: "", name: "", email: "", address: "", phone: "", discountRate: 0 });
      fetchDealers();
    } catch (error) {
      console.error("Bayi eklenemedi:", error);
    }
  };

  const handleDeleteDealer = async (id: string) => {
    try {
      await deleteDoc(doc(db, "dealers", id));
      setToast({ message: "Bayi silindi", type: "success" });
      fetchDealers();
    } catch (error) {
      console.error("Bayi silinemedi:", error);
    }
  };

  const handleUpdateDealer = async (dealer: Dealer) => {
    try {
      const { id, ...dealerData } = dealer;
      await updateDoc(doc(db, "dealers", id), dealerData);
      setToast({ message: "Bayi bilgisi güncellendi", type: "success" });
      fetchDealers();
    } catch (error) {
      console.error("Bayi güncellenemedi:", error);
    }
  };

  const syncParts = async () => {
    try {
      for (const category in configCategories) {
        const options = (configCategories as any)[category];
        for (const part of options) {
          await setDoc(doc(db, "parts", part.id), {
            name: part.name,
            price: 0,
            category,
          });
        }
      }
      setToast({ message: "Parçalar Firestore'a eklendi!", type: "success"})
      fetchParts();
    } catch (error) {
      console.error("Parça ekleme hatası:", error);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      if (newStatus === "rejected") {
        if (!rejectReason.trim()) {
          setToast({ message: "Lütfen reddetme sebebi giriniz", type: "error" });
          return;
        }
        await updateDoc(doc(db, "orders", orderId), {
          status: newStatus,
          rejectReason,
          "timestamps.updatedAt": new Date(),
        });
        setToast({ message: `Sipariş reddedildi: ${rejectReason}`, type: "error" });
        setRejectReason("");
        setActiveRejectId(null);
      } else {
        await updateDoc(doc(db, "orders", orderId), {
          status: newStatus,
          "timestamps.updatedAt": new Date(),
        });
        setToast({ message: `Sipariş durumu '${newStatus}' olarak güncellendi`, type: "success" });
      }
      fetchOrders();
    } catch (err) {
      console.error("Durum güncelleme hatası:", err);
    }
  };


  const handlePriceChange = (id: string, value: string) => {
    setParts((prev) =>
      prev.map((part) =>
        part.id === id ? { ...part, price: parseFloat(value) || 0 } : part
      )
    );
  };

  const handleSavePrice = async (id: string, price: number) => {
    try {
      await updateDoc(doc(db, "parts", id), { price });
      setToast({ message: "Fiyat güncellendi", type: "success"})
    } catch (error) {
      console.error("Fiyat güncellenemedi:", error);
    }
  };

  const handleDeletePart = (part: Part) => {
    setDeletedPart(part);
    setParts((prev) => prev.filter((p) => p.id !== part.id));
    const timer = setTimeout(async () => {
      try {
        await deleteDoc(doc(db, "parts", part.id));
        setToast({ message: ` ${part.name} kalıcı olarak silindi`, type: "success"})
        setDeletedPart(null);
      } catch (error) {
        console.error("Parça silinemedi:", error);
      }
    }, 5000);
    setUndoTimer(timer);
  };

  const handleUndoDelete = () => {
    if (undoTimer) clearTimeout(undoTimer);
    if (deletedPart) setParts((prev) => [...prev, deletedPart]);
    setDeletedPart(null);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending_purchase":
        return "Satın Alım Onayı Bekliyor";
      case "approved_purchase":
        return "AR-GE Onayı Bekliyor";
      case "approved_rnd":
        return "Üretim Bekliyor";
      case "completed":
        return "Tamamlandı";
      case "rejected":
        return "Reddedildi";
      default:
        return "Bilinmeyen Durum";
    }
  };

  return (
    <RoleGuard allowedRoles={["boss"]}>
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 font-sans">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-lg">
            Patron Yönetim Paneli
          </h1>
          <Link href="/">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 transition-transform shadow-md">
              <FaHome />
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

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === "orders"
                ? "bg-gradient-to-r from-blue-400 to-blue-600 shadow-md"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            <FaClipboardList /> Siparişler
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === "pricing"
                ? "bg-gradient-to-r from-green-400 to-green-600 shadow-md"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            <FaCogs /> Parça Fiyatları
          </button>
          <button
            onClick={() => setActiveTab("dealers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === "dealers"
                ? "bg-gradient-to-r from-purple-400 to-purple-600 shadow-md"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            <FaUsers /> Bayiler
          </button>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg">
{/* Bayiler Sekmesi */}
{activeTab === "dealers" && (
  <section>
    <h2 className="text-2xl font-bold mb-4">Bayiler</h2>

    {/* Yeni Bayi Ekle */}
    <div className="bg-white/10 p-4 rounded-lg mb-6 shadow-md">
      <h3 className="text-lg font-semibold mb-2">Yeni Bayi Ekle</h3>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Kullanıcı Adı"
          className="p-2 rounded bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={newDealer.username}
          onChange={(e) => setNewDealer({ ...newDealer, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Şifre"
          className="p-2 rounded bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={newDealer.password}
          onChange={(e) => setNewDealer({ ...newDealer, password: e.target.value })}
        />
        <input
          type="text"
          placeholder="İsim"
          className="p-2 rounded bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={newDealer.name}
          onChange={(e) => setNewDealer({ ...newDealer, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          className="p-2 rounded bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={newDealer.email}
          onChange={(e) => setNewDealer({ ...newDealer, email: e.target.value })}
        />
        <input
          type="text"
          placeholder="Adres"
          className="p-2 rounded bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={newDealer.address}
          onChange={(e) => setNewDealer({ ...newDealer, address: e.target.value })}
        />
        <input
          type="text"
          placeholder="Telefon"
          className="p-2 rounded bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={newDealer.phone}
          onChange={(e) => setNewDealer({ ...newDealer, phone: e.target.value })}
        />
        <input
          type="number"
          placeholder="İskonto Oranı (%)"
          className="p-2 rounded bg-white/10 border border-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={newDealer.discountRate}
          onChange={(e) => setNewDealer({ ...newDealer, discountRate: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <button
        onClick={handleAddDealer}
        className="mt-4 bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-2 rounded hover:scale-105 transition-transform shadow-md"
      >
        Ekle
      </button>
    </div>

    {/* Bayi Listesi */}
    <div className="space-y-4">
      {dealers.map((dealer) => (
        <div key={dealer.id} className="bg-white/10 p-4 rounded-lg shadow-md">
          <p><strong>Kullanıcı Adı:</strong> {dealer.username}</p>
          <p><strong>Şifre:</strong> {dealer.password}</p>
          <p><strong>İsim:</strong> {dealer.name}</p>
          <p><strong>Email:</strong> {dealer.email}</p>
          <p><strong>Adres:</strong> {dealer.address}</p>
          <p><strong>Telefon:</strong> {dealer.phone}</p>
          <p><strong>İskonto Oranı:</strong> %{dealer.discountRate}</p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setEditDealer({ ...dealer });
                setShowDealerModal(true);
              }}
              className="bg-gradient-to-r from-blue-400 to-blue-600 px-3 py-1 rounded hover:scale-105 transition-transform shadow-md"
            >
              Düzenle
            </button>
            <button
              onClick={() => handleDeleteDealer(dealer.id)}
              className="bg-gradient-to-r from-red-500 to-rose-600 px-3 py-1 rounded hover:scale-105 transition-transform shadow-md"
            >
              Sil
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* Düzenleme Modalı */}
    {showDealerModal && editDealer && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl text-white p-6 rounded-lg w-96 space-y-4">
          <h3 className="text-lg font-bold">Bayi Düzenle</h3>
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={editDealer.username}
            onChange={(e) => setEditDealer({ ...editDealer, username: e.target.value })}
            placeholder="Kullanıcı Adı"
          />
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={editDealer.password}
            onChange={(e) => setEditDealer({ ...editDealer, password: e.target.value })}
            placeholder="Şifre"
          />
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={editDealer.name}
            onChange={(e) => setEditDealer({ ...editDealer, name: e.target.value })}
            placeholder="İsim"
          />
          <input
            type="email"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={editDealer.email}
            onChange={(e) => setEditDealer({ ...editDealer, email: e.target.value })}
            placeholder="Email"
          />
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={editDealer.address}
            onChange={(e) => setEditDealer({ ...editDealer, address: e.target.value })}
            placeholder="Adres"
          />
          <input
            type="text"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={editDealer.phone}
            onChange={(e) => setEditDealer({ ...editDealer, phone: e.target.value })}
            placeholder="Telefon"
          />
          <input
            type="number"
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            value={editDealer.discountRate}
            onChange={(e) =>
              setEditDealer({ ...editDealer, discountRate: parseFloat(e.target.value) || 0 })
            }
            placeholder="İskonto Oranı (%)"
          />
          <div className="flex justify-between gap-2">
            <button
              onClick={() => {
                handleUpdateDealer(editDealer);
                setShowDealerModal(false);
              }}
              className="flex-1 bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            >
              Kaydet
            </button>
            <button
              onClick={() => setShowDealerModal(false)}
              className="flex-1 bg-red-500 px-4 py-2 rounded hover:bg-red-600"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    )}
  </section>
)}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <section>
              {loading ? (
                <p>Yükleniyor...</p>
              ) : orders.length === 0 ? (
                <p>Henüz sipariş yok.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const design = order.designData || {
                      model: "Bilinmiyor",
                      description: "",
                      technicalSpecs: [],
                    };

                    const dealer = dealers.find((d) =>
                      order.customerName?.startsWith("dealer_")
                        ? d.username === order.customerName.replace("dealer_", "")
                        : false
                    );

                    return (
                      <div key={order.id} className="p-4 bg-white/10 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-amber-300">{design.model}</h2>
                        <p className="text-gray-200 mb-2">{design.description}</p>
                        <p className="text-sm text-gray-400 mt-2">
                          <strong>Müşteri:</strong> {order.customerName || "Bilinmiyor"}
                        </p>
                        <p className="text-sm text-yellow-400 mt-1">
                          <strong>Durum:</strong> {getStatusText(order.status)}
                        </p>

                        {dealer && (
                          <div className="mt-2 p-3 bg-white/10 rounded text-sm">
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
                          {Array.isArray(design.technicalSpecs) && design.technicalSpecs.length > 0 ? (
                            design.technicalSpecs.map((spec, i) => (
                              <li key={i}>
                                <span className="font-medium text-gray-100">{spec.name}:</span>{" "}
                                {spec.value}
                              </li>
                            ))
                          ) : (
                            <li>Bu sipariş için opsiyon bilgisi yok.</li>
                          )}
                        </ul>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            onClick={() => updateStatus(order.id, "pending_purchase")}
                            className="bg-gray-500 px-3 py-1 rounded hover:bg-gray-600"
                          >
                            Satın Alım Beklemede
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, "approved_purchase")}
                            className="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
                          >
                            Satın Alım Onayla
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, "approved_rnd")}
                            className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                          >
                            AR-GE Onayla
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, "completed")}
                            className="bg-purple-600 px-3 py-1 rounded hover:bg-purple-700"
                          >
                            Tamamlandı
                          </button>
                          <button
                            onClick={() => setActiveRejectId(order.id)}
                            className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
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
                                onClick={() => updateStatus(order.id, "rejected")}
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
            </section>
          )}

          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <section>
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">Parça Fiyatları</h2>
                <button
                  onClick={syncParts}
                  className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
                >
                  Parça Eksikse Güncelle
                </button>
              </div>
              {deletedPart && (
                <div className="bg-yellow-500 text-black p-2 rounded flex justify-between items-center mb-4">
                  <span>{deletedPart.name} silindi. Geri almak için tıklayın.</span>
                  <button
                    onClick={handleUndoDelete}
                    className="px-3 py-1 bg-black text-white rounded hover:bg-gray-800"
                  >
                    <FaUndo /> Geri Al
                  </button>
                </div>
              )}
              {parts.length === 0 ? (
                <p>Parça bulunamadı. Sync Parts butonuna tıklayın.</p>
              ) : (
                <div className="space-y-3">
                  {parts.map((part) => (
                    <div
                      key={part.id}
                      className="bg-white/10 p-3 rounded flex justify-between items-center shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeletePart(part)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          <FaTrash />
                        </button>
                        <span>{part.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          className="w-24 p-1 rounded text-black"
                          value={part.price}
                          onChange={(e) => handlePriceChange(part.id, e.target.value)}
                        />
                        <button
                          onClick={() => handleSavePrice(part.id, part.price)}
                          className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
                        >
                          <FaSave /> Kaydet
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </RoleGuard>
  );
}
