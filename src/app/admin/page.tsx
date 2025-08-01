"use client";

import { useState, useEffect } from "react";
import { db, storage } from "../../lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";

interface TechnicalSpec {
  name: string;
  value: string;
}

export default function AdminPage() {
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<TechnicalSpec[]>([
    { name: "", value: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Admin kontrolü (localStorage üzerinden)
  useEffect(() => {
    const isAdmin = localStorage.getItem("is_admin") === "true";
    const username = localStorage.getItem("user_name") || localStorage.getItem("dealer_username");

    if (!isAdmin || (username !== "alper" && username !== "alperbey")) {
      alert("Admin yetkiniz yok!");
      router.push("/");
    }
  }, [router]);

  const handleSpecChange = (index: number, field: "name" | "value", value: string) => {
    const newSpecs = [...technicalDetails];
    newSpecs[index][field] = value;
    setTechnicalDetails(newSpecs);
  };

  const addNewSpec = () => {
    setTechnicalDetails([...technicalDetails, { name: "", value: "" }]);
  };

  const handleSave = async () => {
    if (!model || !description || !imageFile) {
      alert("Lütfen model, açıklama ve fotoğraf seçin!");
      return;
    }

    setLoading(true);

    try {
      // Görseli yükle
      const imageRef = ref(storage, `machines/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      // Firestore'a kaydet
      await addDoc(collection(db, "machines"), {
        model,
        description,
        imageUri: imageUrl,
        technicalDetails: technicalDetails.filter((s) => s.name && s.value),
      });

      alert("Makine başarıyla eklendi!");
      setModel("");
      setDescription("");
      setImageFile(null);
      setTechnicalDetails([{ name: "", value: "" }]);
    } catch (error) {
      console.error("Makine ekleme hatası:", error);
      alert("Hata: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Paneli - Makine Ekle</h1>

      <div className="flex flex-col gap-4 max-w-xl">
        <input
          type="text"
          placeholder="Makine Modeli"
          className="p-2 rounded text-black"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <textarea
          placeholder="Açıklama"
          className="p-2 rounded text-black"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />

        <h2 className="text-lg font-semibold mt-4">Teknik Özellikler</h2>
        {technicalDetails.map((spec, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Özellik Adı"
              className="p-2 rounded text-black flex-1"
              value={spec.name}
              onChange={(e) => handleSpecChange(index, "name", e.target.value)}
            />
            <input
              type="text"
              placeholder="Özellik Değeri"
              className="p-2 rounded text-black flex-1"
              value={spec.value}
              onChange={(e) => handleSpecChange(index, "value", e.target.value)}
            />
          </div>
        ))}
        <button onClick={addNewSpec} className="bg-blue-600 p-2 rounded">
          Özellik Ekle
        </button>

        <button
          onClick={handleSave}
          className="bg-green-600 p-3 rounded mt-4"
          disabled={loading}
        >
          {loading ? "Kaydediliyor..." : "Makineyi Kaydet"}
        </button>
      </div>
    </main>
  );
}
