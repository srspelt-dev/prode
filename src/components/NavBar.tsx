"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Trophy,
  CalendarDays,
  BarChart3,
  Users,
  ClipboardList,
  User,
  Settings,
  Moon,
  Sun,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api-client";
import type { PublicUser } from "@/lib/types";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/partidos", label: "Partidos", icon: CalendarDays },
  { href: "/tabla", label: "Tabla", icon: BarChart3 },
  { href: "/ligas", label: "Ligas", icon: Users },
  { href: "/reglas", label: "Reglas", icon: ClipboardList },
  { href: "/cuenta", label: "Cuenta", icon: User },
];

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }
  return { dark, toggle };
}

export default function NavBar() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useDarkMode();

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
      ? [{ href: "/admin", label: "Admin", icon: Settings }]
      : []),
  ];

  const ThemeButton = (
    <button
      onClick={toggle}
      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label="Cambiar tema"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );

  return (
    <>
      {/* Barra superior */}
      <header
        className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 whitespace-nowrap font-display text-lg font-bold text-pitch"
          >
            <Trophy size={20} className="text-pitch" />
            Prode Mundial
          </Link>

          <div className="flex items-center gap-1 text-sm">
            {/* Links en desktop */}
            {loaded && user && (
              <div className="hidden items-center gap-1 sm:flex">
                {navItems.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-md px-2 py-1 ${
                      pathname.startsWith(l.href)
                        ? l.href === "/admin"
                          ? "bg-amber-100 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          : "bg-pitch/10 font-semibold text-pitch"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
            {ThemeButton}
            {loaded && user && (
              <button
                onClick={logout}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Barra inferior (solo mobile) */}
      {loaded && user && (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex max-w-3xl">
            {navItems.map((l) => {
              const active = pathname.startsWith(l.href);
              const isAdmin = l.href === "/admin";
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                    active
                      ? isAdmin
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-pitch"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
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
