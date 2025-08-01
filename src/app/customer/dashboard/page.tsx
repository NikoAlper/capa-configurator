import Link from "next/link";
import RoleGuard from "../../../components/RoleGuard";

export default function CustomerDashboard() {
  return (
    <RoleGuard allowedRoles={["customer"]}>
      <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-6">Müşteri Paneline Hoşgeldiniz</h1>
        <Link
          href="/customer/orders/create"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Yeni Sipariş Oluştur
        </Link>
      </main>
    </RoleGuard>
  );
}
