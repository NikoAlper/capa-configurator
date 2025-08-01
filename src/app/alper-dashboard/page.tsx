"use client";

import { useState, useEffect } from "react";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import Toast, { ToastType } from "../../components/Toast";


interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

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
}

export default function AlperDashboard() {
  const [activeTab, setActiveTab] = useState<"users" | "orders" | "dealers">("users");

  // Kullanıcı verileri
  const [users, setUsers] = useState<UserData[]>([]);
  const [editData, setEditData] = useState<{ [key: string]: Partial<UserData> }>({});
  const [editDealerData, setEditDealerData] = useState<{ [id: string]: Partial<any> }>({});
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Sipariş verileri
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [dealers, setDealers] = useState<any[]>([]);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Kullanıcı ekleme modalı
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });

  // Kullanıcıları getir
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<UserData, "id">),
      })) as UserData[];
      setUsers(data);
    } catch (err) {
      console.error("Kullanıcılar alınamadı:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDealers = async () => {
  const snap = await getDocs(collection(db, "dealers"));
  setDealers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
};

  // Siparişleri getir
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const snapshot = await getDocs(collection(db, "orders"));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as object),
      })) as Order[];
      setOrders(data);
    } catch (err) {
      console.error("Siparişler alınamadı:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

useEffect(() => {
  fetchUsers();
  fetchOrders();
  fetchDealers();
}, []);

  // Kullanıcı ekleme
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      setToast({ message: "Lütfen tüm alanları doldurun!", type: "error" });
      return;
    }

    try {
      // Firebase Authentication'a ekle
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );
      const uid = userCredential.user.uid;

      // Firestore'a ekle
      await setDoc(doc(db, "users", uid), {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        password: newUser.password,
        role: newUser.role,
        createdAt: new Date(),
      });

      setToast({ message: "Kullanıcı başarıyla eklendi!", type: "success" });
      setShowAddModal(false);
      setNewUser({ name: "", email: "", phone: "", password: "", role: "" });
      fetchUsers();
    } catch (error: any) {
      console.error("Kullanıcı eklenemedi:", error);
      alert("Kullanıcı eklenirken hata oluştu: " + error.message);
    }
  };

  // Alan değiştirme
  const handleFieldChange = (userId: string, field: keyof UserData, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  const handleDealerFieldChange = (id: string, field: string, value: string) => {
  setEditDealerData((prev) => ({
    ...prev,
    [id]: { ...prev[id], [field]: value },
  }));
};

const handleDealerSave = async (id: string) => {
  const updated = editDealerData[id];
  if (!updated) return;

  try {
    await updateDoc(doc(db, "dealers", id), updated);
    setToast({ message: "Bayi başarıyla güncellendi!", type: "success" });
    setEditDealerData((prev) => ({ ...prev, [id]: {} }));
    fetchDealers(); // Güncel verileri tekrar çek
  } catch (err) {
    console.error("Bayi güncelleme hatası:", err);
    setToast({ message: "Güncelleme sırasında hata oluştu!", type: "error" });
  }
};

  // Güncelleme
const handleSave = async (userId: string) => {
  const updatedData = editData[userId];
  if (!updatedData) return;

  try {
    // Firestore güncelle
    await updateDoc(doc(db, "users", userId), updatedData);

    // Eğer şifre güncellendiyse Firebase Auth'ta da güncelle
if (updatedData.password) {
  console.log("Şifre güncellemesi isteniyor:", userId, updatedData.password); // <== BURAYA EKLE

  const response = await fetch("/api/updateUserPassword", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: userId, newPassword: updatedData.password }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Şifre güncellenemedi (Auth)");
  }
}

    setToast({ message: "Kullanıcı bilgileri güncellendi!", type: "success" });
    setEditData((prev) => ({ ...prev, [userId]: {} }));
    fetchUsers();
  } catch (err: any) {
    console.error("Kaydetme hatası:", err);
    alert("Kullanıcı güncelleme sırasında bir hata oluştu: " + err.message);
  }
};

  // Silme
const handleDelete = async (collectionName: string, id: string) => {
  if (!confirm("Bu veriyi silmek istediğinize emin misiniz?")) return;

  try {
    // Firestore'dan sil
    await deleteDoc(doc(db, collectionName, id));

    // Eğer users koleksiyonu ise, Auth'tan da sil
    if (collectionName === "users") {
      await fetch("/api/deleteUserAuth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: id }),
      });
    }

    setToast({ message: "Veri başarıyla silindi!", type: "success" });

    if (collectionName === "users") fetchUsers();
    else if (collectionName === "orders") fetchOrders();
    else if (collectionName === "dealers") fetchDealers();
  } catch (err) {
    console.error("Silme hatası:", err);
  }
};

  // Sipariş durumu metni
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
    <main className="min-h-screen bg-gray-900 text-white p-6">
      {/* Üst Kısım */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Developer Panel</h1>
        <Link href="/">
          <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">
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

      {/* Sekmeler */}
      <div className="flex gap-4 mb-6">

        <button onClick={() => setActiveTab("dealers")} className={`px-4 py-2 rounded ${activeTab === "dealers" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}>Bayiler</button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded ${activeTab === "users" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
        >
          Kullanıcılar
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded ${activeTab === "orders" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
        >
          Siparişler
        </button>
      </div>

      {/* Kullanıcılar Sekmesi */}
      {activeTab === "users" && (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Kullanıcı Yönetimi</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Yeni Kullanıcı Ekle
            </button>
          </div>
          {loadingUsers ? (
            <p>Yükleniyor...</p>
          ) : users.length === 0 ? (
            <p>Hiç kullanıcı yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-auto w-full border-collapse border border-gray-700 text-sm">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="border border-gray-700 p-2">İsim</th>
                    <th className="border border-gray-700 p-2">Email</th>
                    <th className="border border-gray-700 p-2">Telefon</th>
                    <th className="border border-gray-700 p-2">Şifre</th>
                    <th className="border border-gray-700 p-2">Rol</th>
                    <th className="border border-gray-700 p-2">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const edits = editData[user.id] || {};
                    return (
                      <tr key={user.id} className="text-center">
                        <td className="border border-gray-700 p-2">
                          <input
                            type="text"
                            className="bg-gray-700 p-1 rounded text-white w-32"
                            value={edits.name ?? user.name}
                            onChange={(e) =>
                              handleFieldChange(user.id, "name", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-gray-700 p-2">
                          <input
                            type="email"
                            className="bg-gray-700 p-1 rounded text-white w-40"
                            value={edits.email ?? user.email}
                            onChange={(e) =>
                              handleFieldChange(user.id, "email", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-gray-700 p-2">
                          <input
                            type="text"
                            className="bg-gray-700 p-1 rounded text-white w-32"
                            value={edits.phone ?? user.phone}
                            onChange={(e) =>
                              handleFieldChange(user.id, "phone", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-gray-700 p-2">
                          <input
                            type="text"
                            className="bg-gray-700 p-1 rounded text-white w-32"
                            value={edits.password ?? user.password}
                            onChange={(e) =>
                              handleFieldChange(user.id, "password", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-gray-700 p-2">
                          <input
                            type="text"
                            className="bg-gray-700 p-1 rounded text-white w-24"
                            value={edits.role ?? user.role}
                            onChange={(e) =>
                              handleFieldChange(user.id, "role", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-gray-700 p-2 flex justify-center gap-2">
                          <button
                            onClick={() => handleSave(user.id)}
                            className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Kaydet
                          </button>
<button
  onClick={() => handleDelete("users", user.id)}
  className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
>
  Sil
</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bayiler sekmesi */}

{activeTab === "dealers" && (
  <div>
    <h2 className="text-xl font-bold mb-4">Bayiler</h2>
    {dealers.map((dealer) => {
      const edits = editDealerData[dealer.id] || {};
      return (
        <div key={dealer.id} className="bg-gray-800 p-4 rounded mb-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              className="p-2 rounded bg-gray-700 text-white"
              value={edits.name ?? dealer.name ?? ""}
              onChange={(e) => handleDealerFieldChange(dealer.id, "name", e.target.value)}
              placeholder="İsim"
            />
            <input
              className="p-2 rounded bg-gray-700 text-white"
              value={edits.email ?? dealer.email ?? ""}
              onChange={(e) => handleDealerFieldChange(dealer.id, "email", e.target.value)}
              placeholder="Email"
            />
            <input
              className="p-2 rounded bg-gray-700 text-white"
              value={edits.phone ?? dealer.phone ?? ""}
              onChange={(e) => handleDealerFieldChange(dealer.id, "phone", e.target.value)}
              placeholder="Telefon"
            />
            <input
              className="p-2 rounded bg-gray-700 text-white"
              value={edits.address ?? dealer.address ?? ""}
              onChange={(e) => handleDealerFieldChange(dealer.id, "address", e.target.value)}
              placeholder="Adres"
            />
            <input
              className="p-2 rounded bg-gray-700 text-white"
              value={edits.password ?? dealer.password ?? ""}
              onChange={(e) => handleDealerFieldChange(dealer.id, "password", e.target.value)}
              placeholder="Şifre"
            />
            <input
              type="number"
              className="p-2 rounded bg-gray-700 text-white"
              value={edits.discountRate ?? dealer.discountRate ?? ""}
              onChange={(e) => handleDealerFieldChange(dealer.id, "discountRate", e.target.value)}
              placeholder="İskonto Oranı (%)"
            />
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleDealerSave(dealer.id)}
              className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
            >
              Kaydet
            </button>
            <button
              onClick={() => handleDelete("dealers", dealer.id)}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
            >
              Sil
            </button>
          </div>
        </div>
      );
    })}
  </div>
)}

      {/* Siparişler Sekmesi */}
      {activeTab === "orders" && (
        <div>
          <h2 className="text-xl font-bold mb-4">Siparişler</h2>
          {loadingOrders ? (
            <p>Yükleniyor...</p>
          ) : orders.length === 0 ? (
            <p>Henüz sipariş yok.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-gray-800 rounded-lg shadow-md"
                >
<h3 className="text-lg font-bold">{order.designData?.model ?? "Model Bilinmiyor"}</h3>
<p className="text-gray-300">{order.designData?.description ?? "Açıklama yok"}</p>
<ul className="mt-2 text-sm text-gray-400">
  {order.designData?.technicalSpecs && order.designData.technicalSpecs.length > 0 ? (
    order.designData.technicalSpecs.map((spec, i) => (
      <li key={i}>{spec.name}: {spec.value}</li>
    ))
  ) : (
    <li>Teknik özellik yok</li>
  )}
</ul>
                  <p className="mt-2 text-sm text-yellow-400">
                    <strong>Durum:</strong> {getStatusText(order.status)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kullanıcı Ekleme Modalı */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Yeni Kullanıcı Ekle</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="İsim"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
              <input
                type="text"
                placeholder="Telefon"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
              <input
                type="password"
                placeholder="Şifre"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
              <input
                type="text"
                placeholder="Rol (örn: customer)"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
              >
                İptal
              </button>
              <button
                onClick={handleAddUser}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
