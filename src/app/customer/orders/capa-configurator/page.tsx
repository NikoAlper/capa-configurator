"use client";

import { useState } from "react";
import { db, auth } from "../../../../lib/firebase";
import { addDoc, collection, serverTimestamp, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaSyncAlt, FaPlus, FaTimes, FaTrash, FaCheck, FaShoppingCart, FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";

interface Option {
  id: string;
  name: string;
  image: string;
  description: string;
}

interface Part {
  name: string;
  price: number;
}

type NotificationType = "success" | "info" | "error";

interface Notification {
  message: string;
  type: NotificationType;
}

const configCategories = {
  bacakSayisi: [
    { id: "5-bacak", name: "5 Bacak", image: "/images/2bacak.png", description: "2 bacaklı çapa makinesi." },
    { id: "3-bacak", name: "3 Bacak", image: "/images/3bacak.png", description: "3 bacaklı çapa makinesi." },
  ],
  yanAksesuar: [
    { id: "tava-1", name: "Tava 1", image: "/images/capa/yan1.png", description: "Standart yan aksesuar." },
    { id: "yildiz-disk", name: "Yıldız Disk", image: "/images/capa/yan2.png", description: "Gelişmiş yan aksesuar." },
  ],
  arkaAksesuar: [
    { id: "arka1", name: "Arka Aksesuar 1", image: "/images/capa/arka1.png", description: "Standart arka aksesuar." },
    { id: "arka2", name: "Arka Aksesuar 2", image: "/images/capa/arka2.png", description: "Gelişmiş arka aksesuar." },
  ],
  bacakTipi: [
    { id: "yılan-dili", name: "İnce Bacak", image: "/images/capa/ince.png", description: "Hafif kullanım için." },
    { id: "kalin", name: "Kalın Bacak", image: "/images/capa/kalin.png", description: "Ağır kullanım için." },
  ],
  bicakTipi: [
    { id: "düz", name: "Düz Bıçak", image: "/images/capa/duz.png", description: "Genel amaçlı." },
    { id: "eğri", name: "Eğri Bıçak", image: "/images/capa/egri.png", description: "Özel işlemler için." },
  ],
};

const formatCategoryName = (name: string) => {
  switch (name) {
    case "bacakSayisi": return "Bacak Sayısı";
    case "yanAksesuar": return "Yan Aksesuar";
    case "arkaAksesuar": return "Arka Aksesuar";
    case "bacakTipi": return "Bacak Tipi";
    case "bicakTipi": return "Bıçak Tipi";
    default: return name;
  }
};

export default function CapaConfigurator() {
  const categories = Object.keys(configCategories);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: Option | null }>({});
  const [extraOptions, setExtraOptions] = useState<{ [key: string]: { option: Option; discountedPrice: number }[] }>({});
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [pendingOption, setPendingOption] = useState<Option | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const showNotification = (message: string, type: NotificationType = "info") => {
    setNotification({ message, type });
    setNotificationVisible(true);
    setTimeout(() => setNotificationVisible(false), 2000);
  };

  const getPartPrice = async (partName: string): Promise<number | null> => {
    const snapshot = await getDocs(query(collection(db, "parts"), where("name", "==", partName)));
    const part = snapshot.docs[0]?.data() as Part;
    return part?.price ?? null;
  };

  const handleOptionClick = (option: Option) => {
    if (selectedCategory !== "bacakSayisi" && selectedOptions[selectedCategory] && selectedOptions[selectedCategory]!.id !== option.id) {
      setPendingOption(option);
      setPendingCategory(selectedCategory);
      setShowModal(true);
    } else {
      setSelectedOption(option);
    }
  };

  const handleSaveOption = () => {
    if (!selectedOption) {
      showNotification("Lütfen bir seçenek seçin.", "error");
      return;
    }
    setSelectedOptions((prev) => ({
      ...prev,
      [selectedCategory]: selectedOption,
    }));
    showNotification(`${formatCategoryName(selectedCategory)} kaydedildi!`, "success");
  };

  const handleAddAsExtra = async () => {
    if (!pendingOption || !pendingCategory) return;
    const price = await getPartPrice(pendingOption.name);
    if (price === null) {
      showNotification("Fiyat bilgisi alınamadı.", "error");
      setShowModal(false);
      return;
    }
    const discounted = price * 0.5;

    setExtraOptions((prev) => {
      const current = prev[pendingCategory] || [];
      return { ...prev, [pendingCategory]: [...current, { option: pendingOption, discountedPrice: discounted }] };
    });
    setShowModal(false);
    showNotification("Ekstra ürün sepete eklendi (%50 indirimli).", "success");
  };

  const handleReplaceOption = () => {
    if (!pendingOption || !pendingCategory) return;
    setSelectedOptions((prev) => ({
      ...prev,
      [pendingCategory]: pendingOption,
    }));
    setSelectedOption(pendingOption);
    setShowModal(false);
    showNotification("Ürün değiştirildi.", "info");
  };

  const handleRemoveOption = (category: string) => {
    setSelectedOptions((prev) => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
    showNotification(`${formatCategoryName(category)} kaldırıldı.`, "info");
  };

  const handleRemoveExtraOption = (category: string, index: number) => {
    setExtraOptions((prev) => {
      const updated = { ...prev };
      updated[category].splice(index, 1);
      if (updated[category].length === 0) delete updated[category];
      return updated;
    });
    showNotification(`Ekstra ürün kaldırıldı.`, "info");
  };

  const allCategoriesSelected = categories.every((cat) => selectedOptions[cat]);

  const handleSaveOrder = async () => {
    const technicalSpecs = categories.flatMap((cat) => {
      const main = selectedOptions[cat]
        ? [{ name: formatCategoryName(cat), value: selectedOptions[cat]!.name }]
        : [];
      const extras = extraOptions[cat]?.map((extra, index) => ({
        name: `${formatCategoryName(cat)} Ekstra ${index + 1} (%50)`,
        value: `${extra.option.name} (₺${extra.discountedPrice.toFixed(2)})`,
      })) || [];
      return [...main, ...extras];
    });

    let customerId = "";
    let customerName = "";
    let customerEmail = "";
    let customerPhone = "";
    const userRole = localStorage.getItem("user_role");

    try {
      setLoading(true);
      if (userRole === "dealer") {
        const dealerName = localStorage.getItem("dealer_username");
        if (!dealerName) {
          showNotification("Bayi bilgisi bulunamadı. Lütfen tekrar giriş yapın.", "error");
          return;
        }
        customerId = `dealer_${dealerName}`;
        customerName = dealerName;
        customerEmail = "bayi@firma.com";
        customerPhone = "";
      } else {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          showNotification("Lütfen giriş yapın!", "error");
          return;
        }
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        customerId = currentUser.uid;
        customerName = currentUser.email || "Müşteri";
        customerEmail = currentUser.email || "";
        customerPhone = userDoc.exists() ? userDoc.data().phone || "" : "";
      }

      await addDoc(collection(db, "orders"), {
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        userType: userRole || "customer",
        designData: {
          model: "Çapa Makinesi",
          description: "Konfigüre edilmiş çapa makinesi siparişi",
          technicalSpecs,
        },
        status: "pending_purchase",
        timestamps: {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        approvedBy: { purchase: null, rnd: null, production: null },
      });

      showNotification("Sipariş başarıyla oluşturuldu!", "success");
      router.push("/customer/orders");
    } catch (error) {
      console.error(error);
      showNotification("Sipariş kaydedilirken hata oluştu.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex font-sans">
      {/* Bildirim */}
{notification && (
  <div
    className={`fixed top-6 right-6 z-[9999] flex items-center space-x-2 px-5 py-3 rounded-xl shadow-2xl text-white font-medium transition-all duration-500
      ${notificationVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
      ${notification.type === "success" ? "bg-emerald-600" 
        : notification.type === "error" ? "bg-rose-600" 
        : "bg-sky-600"}`}
  >
    {notification.type === "success" && <FaCheckCircle />}
    {notification.type === "error" && <FaTimesCircle />}
    {notification.type === "info" && <FaInfoCircle />}
    <span>{notification.message}</span>
  </div>
)}

      {/* Modal */}
      {showModal && pendingOption && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl text-white p-8 rounded-2xl w-96 text-center space-y-5 animate-fadeIn">
            <p className="text-lg font-semibold flex items-center justify-center space-x-2">
              <FaSyncAlt className="text-sky-300 text-xl" />
              <span>{selectedOptions[pendingCategory!]?.name} seçili.</span>
            </p>
            <p className="text-sm opacity-90">
              <strong>{pendingOption.name}</strong> ürününü ekstra sepete eklemek ister misiniz
              yoksa <strong>{selectedOptions[pendingCategory!]?.name}</strong> yerine bunu mu seçmek istersiniz?
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleReplaceOption}
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform shadow-md hover:shadow-lg"
              >
                <FaSyncAlt />
                <span>Yerine Seç</span>
              </button>
              <button
                onClick={handleAddAsExtra}
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 hover:scale-105 transition-transform shadow-md hover:shadow-lg"
              >
                <FaPlus />
                <span>Ekstra Ekle (%50)</span>
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-400 to-red-500 hover:scale-105 transition-transform shadow-md hover:shadow-lg"
              >
                <FaTimes />
                <span>İptal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sol Menü */}
      <div className="w-1/4 bg-white/10 backdrop-blur-lg p-4 rounded-r-2xl shadow-lg space-y-3 flex flex-col">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category);
              setSelectedOption(null);
            }}
            className={`w-full text-left p-3 rounded-lg transition hover:bg-white/20 ${selectedCategory === category ? "bg-white/20 font-bold" : ""}`}
          >
            {formatCategoryName(category)}
          </button>
        ))}
        <button className="mb-1 space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-gray-400 to-gray-600 hover:scale-105 transition-transform shadow-md hover:shadow-lg">
  ana menü
</button>

        <button
          onClick={handleSaveOrder}
          disabled={!allCategoriesSelected || loading}
          className={`mt-auto flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-400 to-green-600 hover:scale-105 transition-transform shadow-md hover:shadow-lg ${!allCategoriesSelected ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <FaShoppingCart />
          <span>{loading ? "Kaydediliyor..." : "Siparişi Tamamla"}</span>
        </button>
      </div>

      {/* Orta Panel */}
      <div className="w-1/4 bg-white/10 backdrop-blur-lg p-4 shadow-lg space-y-3">
        {configCategories[selectedCategory].map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option)}
            className={`block w-full text-left p-3 rounded-lg transition hover:bg-white/20 ${selectedOption?.id === option.id ? "bg-white/20 font-semibold" : ""}`}
          >
            {option.name}
          </button>
        ))}
      </div>

      {/* Sağ Panel */}
      <div className="flex-1 p-6 bg-white/5 backdrop-blur-lg rounded-l-2xl shadow-inner space-y-6">
        {selectedOption ? (
          <div className="mb-6">
            <Image
              src={selectedOption.image}
              alt={selectedOption.name}
              width={400}
              height={400}
              className="object-cover mb-4 mx-auto rounded-lg shadow-lg"
            />
            <h2 className="text-xl font-bold text-center">{selectedOption.name}</h2>
            <p className="mt-2 text-gray-200 text-center">{selectedOption.description}</p>
            <div className="text-center">
              <button
                onClick={handleSaveOption}
                className="mt-4 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition-transform shadow-md hover:shadow-lg"
              >
                <FaCheck />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-300">Lütfen bir seçenek seçin.</p>
        )}

        {/* Seçilen Ürünler Listesi */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Seçilen Ürünler</h3>
          {Object.keys(selectedOptions).length === 0 ? (
            <p className="text-gray-400 text-sm">Henüz ürün seçilmedi.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(selectedOptions).map(([category, option]) =>
                option ? (
                  <li key={category} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                    <span>{formatCategoryName(category)}: {option.name}</span>
                    <button
                      onClick={() => handleRemoveOption(category)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm bg-gradient-to-r from-rose-400 to-red-500 rounded hover:scale-105 transition-transform shadow-md"
                    >
                      <FaTrash />
                      <span>Kaldır</span>
                    </button>
                  </li>
                ) : null
              )}
            </ul>
          )}

          {/* Ekstra Ürünler */}
          {Object.keys(extraOptions).length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Ekstra Ürünler (%50 İndirimli)</h3>
              {Object.entries(extraOptions).flatMap(([cat, extras]) =>
                extras.map((extra, idx) => (
                  <div key={`${cat}-${idx}`} className="flex justify-between items-center bg-white/5 p-2 rounded-lg mb-2">
                    <span>{formatCategoryName(cat)} - {extra.option.name}</span>
                    <button
                      onClick={() => handleRemoveExtraOption(cat, idx)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm bg-gradient-to-r from-rose-400 to-red-500 rounded hover:scale-105 transition-transform shadow-md"
                    >
                      <FaTrash />
                      <span>Kaldır</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
