'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db, storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaTrash, FaFilePdf, FaVideo, FaArrowLeft, FaHome } from 'react-icons/fa';
import RoleGuard from '../../../components/RoleGuard';

interface TechnicalSpec {
  name: string;
  value: string;
}

interface Machine {
  id?: string;
  model: string;
  description: string;
  imageUri: string;
  videoIntroUrl?: string;
  videoUsageUrl?: string;
  pdfSparePartUrl?: string;
  pdfDocumentsUrl?: string;
  technicalDetails: TechnicalSpec[];
}

export default function MachineDetailPage() {
const { id } = useParams() as { id: string };
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  const role = localStorage.getItem("user_role");
  setIsAdmin(role === "developer" || role === "boss" || role === "rnd");
}, []);

  useEffect(() => {
    const fetchMachine = async () => {
      try {
        const q = query(
          collection(db, 'machines'),
          where('model', '==', decodeURIComponent(id as string))
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setMachine({ id: docSnap.id, ...(docSnap.data() as Machine) });
        }
      } catch (error) {
        console.error('Makine detayları alınamadı:', error);
      }
    };
    fetchMachine();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Bu makineyi silmek istediğinize emin misiniz?')) return;
    if (!machine?.id) {
      alert('Makine ID bulunamadı.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'machines', machine.id));
      alert('Makine silindi.');
      router.push('/');
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Makine silinirken hata oluştu.');
    }
  };

  const handleUpload = async (file: File, field: string) => {
    if (!file || !machine || !machine.id) return;
    const path = `uploads/${machine.model}_${field}_${Date.now()}_${file.name}`;
    const fileRef = ref(storage, path);

    try {
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      const q = query(collection(db, 'machines'), where('model', '==', machine.model));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const machineDoc = snapshot.docs[0];
        await updateDoc(machineDoc.ref, { [field]: fileUrl });
        setMachine({ ...machine, [field]: fileUrl });
        alert(`${field} başarıyla eklendi/güncellendi!`);
      }
    } catch (error) {
      console.error(`${field} yükleme hatası:`, error);
      alert(`${field} yüklenirken hata oluştu.`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, field);
    }
  };

  if (!machine) {
    return <p className="p-6 text-white">Makine bulunamadı...</p>;
  }

  return (
    <main className="relative min-h-screen text-white bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Arka Plan Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-10 p-6 flex flex-col items-center max-w-3xl mx-auto space-y-6">
        {/* Üst Bar - Geri Butonu + Breadcrumb */}
        <div className="flex items-center justify-between w-full mb-4 bg-white/10 backdrop-blur-md p-3 rounded-lg shadow-lg">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition"
          >
            <FaArrowLeft />
            <span>Geri</span>
          </button>
          <nav className="text-sm text-gray-300 flex items-center gap-2">
            <Link href="/" className="hover:text-white flex items-center gap-1">
              <FaHome size={14} />
              Ana Sayfa
            </Link>
            <span>/</span>
            <Link href="/" className="hover:text-white">
              Makineler
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">{machine.model}</span>
          </nav>
        </div>

        {/* Makine Görseli */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-lg p-4 w-full max-w-lg">
          <img
            src={machine.imageUri}
            alt={machine.model}
            className="w-full h-auto max-h-[300px] rounded-xl object-contain mx-auto shadow-md"
          />
        </div>

        {/* Başlık */}
        <h1 className="text-4xl font-extrabold text-center text-white drop-shadow-lg">
          {machine.model}
        </h1>

        {/* Açıklama */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl shadow-md w-full">
          <p className="text-sm leading-relaxed text-gray-200">{machine.description}</p>
        </div>

        {/* Teknik Özellikler */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl shadow-md w-full">
          <h2 className="text-xl font-semibold mb-3 border-b border-white/20 pb-2">
            Teknik Özellikler
          </h2>
          {machine.technicalDetails?.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {machine.technicalDetails.map((spec, index) => (
                <li
                  key={index}
                  className="flex justify-between bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10 transition"
                >
                  <span>{spec.name}</span>
                  <span className="text-gray-300">{spec.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Teknik özellik bulunmuyor.</p>
          )}
        </div>

        {/* Video ve PDF Butonları */}
        <div className="grid grid-cols-2 gap-6 w-full text-center">
          {machine.videoIntroUrl && (
            <a
              href={machine.videoIntroUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                <FaVideo className="text-white" size={18} />
              </div>
              <span className="text-sm">Tanıtım Videosu</span>
            </a>
          )}
          {machine.videoUsageUrl && (
            <a
              href={machine.videoUsageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className="bg-gradient-to-br from-blue-500 to-sky-600 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                <FaVideo className="text-white" size={18} />
              </div>
              <span className="text-sm">Kullanım Videosu</span>
            </a>
          )}
          {machine.pdfSparePartUrl && (
            <a
              href={machine.pdfSparePartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                <FaFilePdf className="text-white" size={18} />
              </div>
              <span className="text-sm">Yedek Parça</span>
            </a>
          )}
          {machine.pdfDocumentsUrl && (
            <a
              href={machine.pdfDocumentsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                <FaFilePdf className="text-white" size={18} />
              </div>
              <span className="text-sm">Belgeler</span>
            </a>
          )}
        </div>

        {/* Admin Butonları */}
        {isAdmin && (
          <div className="grid grid-cols-3 gap-4 w-full text-center">
            <label className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                <FaFilePdf className="text-white" size={18} />
              </div>
              <span className="text-xs">Yedek Parça Ekle</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'pdfSparePartUrl')}
              />
            </label>

            <label className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform">
              <div className="bg-gradient-to-br from-blue-500 to-sky-600 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                <FaFilePdf className="text-white" size={18} />
              </div>
              <span className="text-xs">Belgeler Ekle</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'pdfDocumentsUrl')}
              />
            </label>

            <button
              onClick={handleDelete}
              className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-full w-14 h-14 flex items-center justify-center shadow-md">
                <FaTrash className="text-white" size={18} />
              </div>
              <span className="text-xs">Makineyi Sil</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
