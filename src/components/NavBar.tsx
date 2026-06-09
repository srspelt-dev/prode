"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import type { PublicUser } from "@/lib/types";

const links = [
  { href: "/partidos", label: "Partidos" },
  { href: "/tabla", label: "Tabla" },
  { href: "/ligas", label: "Ligas" },
  { href: "/reglas", label: "Reglas" },
  { href: "/cuenta", label: "Mi cuenta" },
];

export default function NavBar() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    apiGet<{ user: PublicUser | null }>("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, [pathname]);

  async function logout() {
    await apiPost("/auth/logout");
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-pitch">
          🏆 Prode Mundial
        </Link>

        {loaded && user && (
          <div className="flex items-center gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-2 py-1 ${
                  pathname.startsWith(l.href)
                    ? "bg-pitch/10 font-semibold text-pitch"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user.is_admin && (
              <Link
                href="/admin"
                className={`rounded-md px-2 py-1 ${
                  pathname.startsWith("/admin")
                    ? "bg-amber-100 font-semibold text-amber-700"
                    : "text-amber-600 hover:text-amber-800"
                }`}
              >
                Admin
              </Link>
            )}
            <button
              onClick={logout}
              className="ml-2 text-slate-400 hover:text-slate-700"
            >
              Salir
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
