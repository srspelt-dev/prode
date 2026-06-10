"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";

// Banner que invita a unirse/crear una liga. Se muestra solo si el usuario
// todavía no está en ninguna liga.
export default function JoinLeagueBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    apiGet<{ leagues: unknown[] }>("/leagues")
      .then((d) => setShow((d.leagues?.length ?? 0) === 0))
      .catch(() => setShow(false));
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-xl border border-pitch/30 bg-pitch/5 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🏆</span>
        <div className="flex-1">
          <p className="font-semibold text-slate-800">
            Sumate a una liga para competir
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            Creá tu propia liga o unite con el código de un amigo para ver la
            tabla de tu grupo.
          </p>
          <Link
            href="/ligas"
            className="btn-primary mt-3 inline-flex px-4 py-1.5 text-sm"
          >
            Ir a Ligas →
          </Link>
        </div>
      </div>
    </div>
  );
}
