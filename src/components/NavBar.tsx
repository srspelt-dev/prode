"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import type { PublicUser } from "@/lib/types";

const links = [
  { href: "/partidos", label: "Partidos", icon: "⚽" },
  { href: "/tabla", label: "Tabla", icon: "📊" },
  { href: "/ligas", label: "Ligas", icon: "👥" },
  { href: "/reglas", label: "Reglas", icon: "📋" },
  { href: "/cuenta", label: "Cuenta", icon: "👤" },
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

  const navItems = [
    ...links,
    ...(user?.is_admin
      ? [{ href: "/admin", label: "Admin", icon: "⚙️" }]
      : []),
  ];

  return (
    <>
      {/* Barra superior */}
      <header
        className="sticky top-0 z-40 border-b border-slate-200 bg-white"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="whitespace-nowrap text-lg font-bold text-pitch"
          >
            🏆 Prode Mundial
          </Link>

          {loaded && user && (
            <div className="flex items-center gap-1 text-sm">
              {/* Links en desktop */}
              <div className="hidden items-center gap-1 sm:flex">
                {navItems.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-md px-2 py-1 ${
                      pathname.startsWith(l.href)
                        ? l.href === "/admin"
                          ? "bg-amber-100 font-semibold text-amber-700"
                          : "bg-pitch/10 font-semibold text-pitch"
                        : l.href === "/admin"
                          ? "text-amber-600 hover:text-amber-800"
                          : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
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

      {/* Barra inferior (solo mobile) */}
      {loaded && user && (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white sm:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex max-w-3xl">
            {navItems.map((l) => {
              const active = pathname.startsWith(l.href);
              const isAdmin = l.href === "/admin";
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                    active
                      ? isAdmin
                        ? "text-amber-600"
                        : "text-pitch"
                      : "text-slate-500"
                  }`}
                >
                  <span className="text-lg leading-none">{l.icon}</span>
                  <span className="font-medium">{l.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
