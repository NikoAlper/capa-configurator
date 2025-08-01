"use client";

import { useState } from "react";
import { db, auth } from "../../../../lib/firebase";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function CreateOrderPage() {
  // --- Makine seçimi için state
  const [step, setStep] = useState<"select" | "form">("select");

  // --- Sipariş formu için state
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [technicalSpecs, setTechnicalSpecs] = useState([{ name: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  const handleAddSpec = () => {
    setTechnicalSpecs([...technicalSpecs, { name: "", value: "" }]);
  };

  const handleSpecChange = (index: number, field: "name" | "value", value: string) => {
    const newSpecs = [...technicalSpecs];
    newSpecs[index][field] = value;
    setTechnicalSpecs(newSpecs);
  };

  const handleSave = async () => {
    if (!model || !description) {
      alert("Lütfen model ve açıklamayı giriniz.");
      return;
    }

    let customerId = "";
    let customerName = "";
    let customerEmail = "";
    let customerPhone = "";

    try {
      const role = localStorage.getItem("user_role");
      setUserRole(role);

      if (role === "dealer") {
        const dealerName = localStorage.getItem("dealer_username");
        if (!dealerName) {
          alert("Bayi bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
          return;
        }
        customerId = `dealer_${dealerName}`;
        customerName = dealerName;
        customerEmail = "bayi@firma.com";
        customerPhone = "";
      } else {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          alert("Lütfen giriş yapın!");
          return;
        }
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        customerId = currentUser.uid;
        customerName = currentUser.email || "Müşteri";
        customerEmail = currentUser.email || "";
        customerPhone = userDoc.exists() ? userDoc.data().phone || "" : "";
      }

      setLoading(true);

      await addDoc(collection(db, "orders"), {
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        userType: userRole || "customer",
        designData: { model, description, technicalSpecs },
        status: "pending_purchase",
        timestamps: {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        approvedBy: {
          purchase: null,
          rnd: null,
          production: null,
        },
      });

      alert("Sipariş başarıyla oluşturuldu!");
      router.push("/");
    } catch (error) {
      console.error("Sipariş oluşturma hatası:", error);
      alert("Sipariş kaydedilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // --- Eğer makine seçme adımındaysak
  if (step === "select") {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-6">Sipariş Oluştur</h1>
        <p className="text-gray-300 mb-6">Opsiyonu olan makineyi seçiniz.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sabit Çapa Makinesi Kartı */}
          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg">
            <img
              src="/images/capa.png"
              alt="Çapa Makinesi"
              className="w-full h-48 object-cover border-b border-gray-700"
            />
            <div className="p-4">
              <h2 className="text-lg font-bold">Çapa Makinesi</h2>
              <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                Opsiyonlu üretime uygun Çapa Makinesi.
              </p>
              <button
                onClick={() => router.push("/customer/orders/capa-configurator")}
                className="block text-center bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Konfigüre Et
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- Sipariş formu adımı
  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Yeni Sipariş Oluştur</h1>

      <input
        type="text"
        placeholder="Makine Modeli"
        className="w-full p-3 mb-3 rounded bg-white/10 border border-white/20 text-white"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      />

      <textarea
        placeholder="Açıklama"
        className="w-full p-3 mb-3 rounded bg-white/10 border border-white/20 text-white"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <h2 className="text-lg font-semibold mb-2">Teknik Özellikler</h2>
      {technicalSpecs.map((spec, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Özellik Adı"
            className="w-1/2 p-2 rounded bg-white/10 border border-white/20 text-white"
            value={spec.name}
            onChange={(e) => handleSpecChange(index, "name", e.target.value)}
          />
          <input
            type="text"
            placeholder="Özellik Değeri"
            className="w-1/2 p-2 rounded bg-white/10 border border-white/20 text-white"
            value={spec.value}
            onChange={(e) => handleSpecChange(index, "value", e.target.value)}
          />
        </div>
      ))}

      <button
        onClick={handleAddSpec}
        className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 mb-4"
      >
        Özellik Ekle
      </button>

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Kaydediliyor..." : "Siparişi Oluştur"}
      </button>
    </main>
  );
}
