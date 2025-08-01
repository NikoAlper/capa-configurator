"use client";

import { useState } from "react";
import { db, storage } from "../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaPlus, FaSave, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import RoleGuard from "../../components/RoleGuard"; // ✅ RoleGuard eklendi

interface TechnicalSpec {
  name: string;
  value: string;
}

function AddMachineForm() {
  const [step, setStep] = useState(1);
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [usageVideo, setUsageVideo] = useState<File | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<TechnicalSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddSpec = () => {
    setTechnicalDetails([...technicalDetails, { name: "", value: "" }]);
  };

  const handleSpecChange = (index: number, field: "name" | "value", value: string) => {
    const newSpecs = [...technicalDetails];
    newSpecs[index][field] = value;
    setTechnicalDetails(newSpecs);
  };

  const uploadFile = async (path: string, file: File): Promise<string> => {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  const handleSave = async () => {
    if (!model || !description || !imageFile) {
      alert("Lütfen model, açıklama ve fotoğraf seçin!");
      return;
    }
    if (technicalDetails.length === 0) {
      alert("En az bir teknik özellik girin!");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadFile(`machines/${Date.now()}_${imageFile.name}`, imageFile);
      let introVideoUrl = "";
      let usageVideoUrl = "";

      if (introVideo) {
        introVideoUrl = await uploadFile(`videos/intro_${Date.now()}_${introVideo.name}`, introVideo);
      }
      if (usageVideo) {
        usageVideoUrl = await uploadFile(`videos/usage_${Date.now()}_${usageVideo.name}`, usageVideo);
      }

      await addDoc(collection(db, "machines"), {
        model,
        description,
        imageUri: imageUrl,
        videoIntroUrl: introVideoUrl || null,
        videoUsageUrl: usageVideoUrl || null,
        technicalDetails,
      });

      alert("Makine başarıyla eklendi!");
      router.push("/");
    } catch (error) {
      console.error("Makine eklenirken hata oluştu:", error);
      alert("Hata: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/arkaplan.png')" }} />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-lg bg-gray-800/90 p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Makine Ekle</h1>

        {step === 1 && (
          <>
            <input
              type="text"
              placeholder="Makine Modeli"
              className="w-full p-3 mb-3 rounded bg-white/10 border border-white/20 text-white placeholder-gray-300"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <textarea
              placeholder="Açıklama"
              className="w-full p-3 mb-3 rounded bg-white/10 border border-white/20 text-white placeholder-gray-300"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              onClick={() => setStep(2)}
              className="bg-blue-600 w-full py-2 rounded hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              İleri <FaArrowRight />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <label className="block mb-3">
              Fotoğraf Seç:
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </label>
            {imageFile && (
              <Image
                src={URL.createObjectURL(imageFile)}
                alt="Seçilen Görsel"
                width={300}
                height={200}
                className="rounded mb-3 mx-auto"
              />
            )}

            <label className="block mb-3">
              Tanıtım Videosu:
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setIntroVideo(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </label>

            <label className="block mb-3">
              Kullanım Videosu:
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setUsageVideo(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </label>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="bg-gray-600 py-2 px-4 rounded hover:bg-gray-700 flex items-center gap-2"
              >
                <FaArrowLeft /> Geri
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-blue-600 py-2 px-4 rounded hover:bg-blue-700 flex items-center gap-2"
              >
                İleri <FaArrowRight />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {technicalDetails.map((spec, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Özellik Adı"
                  className="w-1/2 p-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-300"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(index, "name", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Özellik Değeri"
                  className="w-1/2 p-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-300"
                  value={spec.value}
                  onChange={(e) => handleSpecChange(index, "value", e.target.value)}
                />
              </div>
            ))}
            <button
              onClick={handleAddSpec}
              className="bg-green-600 w-full py-2 mb-3 rounded hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <FaPlus /> Özellik Ekle
            </button>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="bg-gray-600 py-2 px-4 rounded hover:bg-gray-700 flex items-center gap-2"
              >
                <FaArrowLeft /> Geri
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 py-2 px-4 rounded hover:bg-blue-700 flex items-center gap-2"
                disabled={loading}
              >
                {loading ? "Kaydediliyor..." : <>Kaydet <FaSave /></>}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ✅ Sayfayı RoleGuard ile sarıyoruz
export default function ProtectedAddMachinePage() {
  return (
    <RoleGuard allowedRoles={["developer", "boss", "rnd"]}>
      <AddMachineForm />
    </RoleGuard>
  );
}
