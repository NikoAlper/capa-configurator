"use client";

import { FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";

interface TechnicalSpec {
  name: string;
  value: string;
}

interface Machine {
  model: string;
  slug: string; // 🔥 Slug burada gerekli
  description: string;
  imageUri: string;
  technicalDetails?: TechnicalSpec[];
}

interface Props {
  machine: Machine;
  onClose: () => void;
}

export default function MachinePreview({ machine, onClose }: Props) {
  const router = useRouter();

  const handleDiscover = () => {
    router.push(`/machine/${machine.slug}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden max-w-4xl w-full relative p-6">
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-black"
          onClick={onClose}
        >
          <FaTimes size={20} />
        </button>

        <div className="flex flex-col md:flex-row gap-6 items-center">
          <img
            src={machine.imageUri}
            alt={machine.model}
            className="w-full md:w-1/2 h-auto object-contain"
          />
          <div className="flex-1 text-center md:text-left">
            <span className="uppercase text-sm font-medium text-gray-500">
              Tarım Makinesi
            </span>
            <h2 className="text-2xl font-bold mb-2">{machine.model}</h2>
            <p className="text-gray-600 mb-4">{machine.description}</p>

            <button
              onClick={handleDiscover}
              className="px-5 py-2 border border-gray-800 hover:bg-gray-900 hover:text-white transition rounded-md"
            >
              Keşfedin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
