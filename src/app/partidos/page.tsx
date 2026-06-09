"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import MatchCard, { MatchVM } from "@/components/MatchCard";

// Clave de día en zona horaria local (YYYY-MM-DD)
function dayKey(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("en-CA");
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function labelDay(d: Date): string {
  const txt = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export default function PartidosPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Date>(startOfToday());

  useEffect(() => {
    apiGet<{ matches: MatchVM[] }>("/matches")
      .then((d) => setMatches(d.matches))
      .catch((e) => {
        if (String(e.message).includes("401")) router.replace("/");
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Días que tienen partidos (ordenados)
  const matchDays = useMemo(() => {
    const set = new Set(matches.map((m) => dayKey(m.kickoff_at)));
    return Array.from(set).sort();
  }, [matches]);

  const todayKey = dayKey(startOfToday());
  const selKey = dayKey(selected);

  const matchesOfDay = useMemo(
    () => matches.filter((m) => dayKey(m.kickoff_at) === selKey),
    [matches, selKey]
  );

  // Próximo día con partidos a partir del seleccionado (estrictamente posterior)
  const nextMatchDay = matchDays.find((k) => k > selKey);
  // Primer día con partidos desde hoy en adelante
  const firstUpcomingDay = matchDays.find((k) => k >= todayKey);

  function goToKey(key: string) {
    const [y, m, d] = key.split("-").map(Number);
    setSelected(new Date(y, m - 1, d));
  }

  if (loading) return <p className="text-slate-400">Cargando partidos…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  if (matches.length === 0) {
    return (
      <div className="card p-6 text-center text-slate-500">
        <p className="font-medium">Todavía no hay partidos cargados.</p>
        <p className="mt-1 text-sm text-slate-400">
          El admin tiene que sincronizar el fixture (o esperar al cron diario).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Partidos</h1>

      {/* Navegador de fecha */}
      <div className="card flex items-center justify-between p-3">
        <button
          className="btn-ghost px-3 py-1.5 text-sm"
          onClick={() => setSelected(addDays(selected, -1))}
          aria-label="Día anterior"
        >
          ◀
        </button>
        <div className="text-center">
          <div className="font-semibold">{labelDay(selected)}</div>
          <div className="text-xs text-slate-400">
            {selKey === todayKey ? "Hoy" : ""}
            {matchesOfDay.length > 0
              ? `${selKey === todayKey ? " · " : ""}${matchesOfDay.length} partido${matchesOfDay.length > 1 ? "s" : ""}`
              : ""}
          </div>
        </div>
        <button
          className="btn-ghost px-3 py-1.5 text-sm"
          onClick={() => setSelected(addDays(selected, 1))}
          aria-label="Día siguiente"
        >
          ▶
        </button>
      </div>

      {/* Partidos del día o estado vacío */}
      {matchesOfDay.length > 0 ? (
        <div className="space-y-3">
          {matchesOfDay.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <div className="card space-y-3 p-6 text-center">
          <p className="text-slate-500">
            No hay partidos {selKey === todayKey ? "hoy" : "este día"}. ⚽
          </p>
          {nextMatchDay && (
            <button
              className="btn-primary text-sm"
              onClick={() => goToKey(nextMatchDay)}
            >
              Ir al próximo día con partidos →
            </button>
          )}
          {!nextMatchDay && firstUpcomingDay && firstUpcomingDay < selKey && (
            <button
              className="btn-ghost text-sm"
              onClick={() => goToKey(firstUpcomingDay)}
            >
              ← Volver al próximo partido
            </button>
          )}
        </div>
      )}

      {/* Acceso rápido al primer día del Mundial / próximos */}
      {selKey === todayKey && firstUpcomingDay && firstUpcomingDay !== todayKey && (
        <p className="text-center text-xs text-slate-400">
          El próximo día con partidos es{" "}
          <button
            className="text-pitch underline"
            onClick={() => goToKey(firstUpcomingDay)}
          >
            {labelDay(new Date(firstUpcomingDay + "T00:00:00"))}
          </button>
          .
        </p>
      )}
    </div>
  );
}
