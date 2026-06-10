"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";

// Página de invitación: el link de WhatsApp lleva acá y une a la liga de una.
//  - Si estás logueado → te une y te lleva a la liga.
//  - Si no → recuerda el código, te manda a registrarte/ingresar, y al volver te une.
export default function UnirsePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = String(params.code || "").toUpperCase();
  const [msg, setMsg] = useState("Procesando invitación…");

  useEffect(() => {
    let cancel = false;

    async function run() {
      try {
        await apiGet("/auth/me"); // ¿logueado?
      } catch {
        // No logueado → guardar el código y mandar a ingresar
        if (typeof window !== "undefined") {
          localStorage.setItem("pending_join", code);
        }
        router.replace("/");
        return;
      }

      // Logueado → unirse
      try {
        const { league } = await apiPost<{ league: { id: string } }>(
          "/leagues/join",
          { code }
        );
        if (!cancel) router.replace(`/ligas/${league.id}`);
      } catch (e: any) {
        if (!cancel) setMsg(e.message || "No se pudo unir a la liga");
      }
    }

    run();
    return () => {
      cancel = true;
    };
  }, [code, router]);

  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <p className="text-slate-500">{msg}</p>
      <p className="mt-2 text-sm text-slate-400">
        Código: <span className="font-mono font-semibold">{code}</span>
      </p>
    </div>
  );
}
