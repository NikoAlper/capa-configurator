"use client";

import { useEffect, useState } from "react";
import { db, storage } from "../lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Part {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

export default function BossPricing() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const [newImage, setNewImage] = useState<File | null>(null);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "parts"));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Part[];
      setParts(data);
    } catch (error) {
      console.error("Parçalar alınamadı:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const handleAddPart = async () => {
    if (!newName || newPrice === "" || !newImage) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    try {
      const imageRef = ref(storage, `parts/${Date.now()}_${newImage.name}`);
      await uploadBytes(imageRef, newImage);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, "parts"), {
        name: newName,
        price: Number(newPrice),
        imageUrl,
        createdAt: new Date(),
      });

      setNewName("");
      setNewPrice("");
      setNewImage(null);
      fetchParts();
      alert("Parça başarıyla eklendi!");
    } catch (error) {
      console.error("Parça ekleme hatası:", error);
      alert("Hata: " + (error as Error).message);
    }
  };

  const handleDeletePart = async (id: string) => {
    if (!confirm("Bu parçayı silmek istediğinize emin misiniz?")) return;

    try {
      await deleteDoc(doc(db, "parts", id));
      fetchParts();
      alert("Parça silindi.");
    } catch (error) {
      console.error("Silme hatası:", error);
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    try {
      await updateDoc(doc(db, "parts", id), { price: newPrice });
      fetchParts();
      alert("Fiyat güncellendi!");
    } catch (error) {
      console.error("Fiyat güncelleme hatası:", error);
    }
  };

  const handleUpdateImage = async (id: string, file: File) => {
    try {
      const imageRef = ref(storage, `parts/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, file);
      const newImageUrl = await getDownloadURL(imageRef);

      await updateDoc(doc(db, "parts", id), { imageUrl: newImageUrl });
      fetchParts();
      alert("Resim güncellendi!");
    } catch (error) {
      console.error("Resim güncelleme hatası:", error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Yedek Parça Yönetimi</h2>

      {/* Yeni Parça Ekleme */}
      <div className="bg-gray-800 p-4 rounded shadow-md space-y-3">
        <h3 className="text-lg font-semibold mb-2">Yeni Parça Ekle</h3>
        <input
          type="text"
          placeholder="Parça Adı"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
        />
        <input
          type="number"
          placeholder="Fiyat"
          value={newPrice}
          onChange={(e) => setNewPrice(Number(e.target.value))}
          className="w-full p-2 rounded bg-white/10 border border-white/20 text-white"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewImage(e.target.files?.[0] || null)}
          className="w-full text-gray-200"
        />
        <button
          onClick={handleAddPart}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          Ekle
        </button>
      </div>

      {/* Parça Listesi */}
      {loading ? (
        <p>Yükleniyor...</p>
      ) : parts.length === 0 ? (
        <p>Henüz parça eklenmedi.</p>
      ) : (
        <div className="space-y-4">
          {parts.map((part) => (
            <div
              key={part.id}
              className="p-4 bg-gray-700 rounded flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <img
                  src={part.imageUrl}
                  alt={part.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div>
                  <h3 className="font-bold">{part.name}</h3>
                  <p className="text-sm text-gray-300">{part.price} TL</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                {/* Fiyat Güncelleme */}
                <input
                  type="number"
                  defaultValue={part.price}
                  onBlur={(e) =>
                    handleUpdatePrice(part.id, Number(e.target.value))
                  }
                  className="p-2 rounded bg-white/10 border border-white/20 text-white"
                />
                {/* Resim Güncelleme */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files && handleUpdateImage(part.id, e.target.files[0])
                  }
                  className="text-gray-200"
                />
                <button
                  onClick={() => handleDeletePart(part.id)}
                  className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
