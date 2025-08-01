import Link from "next/link";
import { FaBolt, FaWeightHanging, FaInfoCircle } from "react-icons/fa";

interface TechnicalSpec {
  name: string;
  value: string;
}

interface MachineCardProps {
  model: string;
  description: string;
  imageUri: string;
  technicalDetails?: TechnicalSpec[];
}

export default function MachineCard({
  model,
  description,
  imageUri,
  technicalDetails = [],
}: MachineCardProps) {
  const slug = encodeURIComponent(model);

  // Güç ve Ağırlık bilgilerini teknik detaylardan çek
  const powerSpec = technicalDetails.find((spec) =>
    spec.name.toLowerCase().includes("güç")
  );
  const weightSpec = technicalDetails.find((spec) =>
    spec.name.toLowerCase().includes("ağırlık")
  );

  return (
    <Link href={`/machine/${slug}`}>
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:scale-105 transition cursor-pointer relative">
        {/* Makine Görseli */}
        <div className="relative">
          <img
            src={imageUri}
            alt={model}
            className="w-full h-48 object-cover border-b border-gray-600"
          />
          {/* Detay Butonu (üst sağ köşe) */}
          <div className="absolute top-3 right-3 bg-black/60 p-2 rounded-full hover:bg-black/80 transition">
            <FaInfoCircle size={18} className="text-white" />
          </div>
        </div>

        {/* Bilgi Alanı */}
        <div className="p-4 bg-black/40">
          {/* Model */}
          <h2 className="text-lg font-bold text-white">{model}</h2>

          {/* Açıklama */}
          <p className="text-sm text-gray-300 line-clamp-2">{description}</p>

          {/* Güç ve Ağırlık */}
          <div className="flex justify-between items-center mt-3 text-sm text-gray-200">
            <div className="flex items-center gap-1">
              <FaBolt size={14} /> <span>{powerSpec?.value || "Veri Yok"}</span>
            </div>
            <div className="flex items-center gap-1">
              <FaWeightHanging size={14} /> <span>{weightSpec?.value || "Veri Yok"}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
