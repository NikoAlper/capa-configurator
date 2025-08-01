"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const userRole = localStorage.getItem("user_role");

    if (!userRole) {
      router.push("/403"); // sadece 403'e yönlendir
      return;
    }

    if (allowedRoles.includes(userRole)) {
      setIsAuthorized(true);
    } else {
      router.push("/403");
    }
  }, [router, allowedRoles]);

  if (isAuthorized === null) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Yetki kontrol ediliyor...</p>
      </main>
    );
  }

  return <>{children}</>;
}
