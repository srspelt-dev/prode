"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import MatchCard, { MatchVM } from "@/components/MatchCard";
import JoinLeagueBanner from "@/components/JoinLeagueBanner";

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

  // 🎊 Confetti al detectar un resultado exacto (6 pts) recién acertado
  useEffect(() => {
    if (!matches.length) return;
    const exact = matches.filter(
      (m) => m.status === "finished" && m.my_prediction?.points_earned === 6
    );
    if (!exact.length) return;
    let celebrated: string[] = [];
    try {
      celebrated = JSON.parse(localStorage.getItem("celebrated") || "[]");
    } catch {}
    const fresh = exact.filter((m) => !celebrated.includes(m.id));
    if (fresh.length) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
      });
      localStorage.setItem(
        "celebrated",
        JSON.stringify([...celebrated, ...fresh.map((m) => m.id)])
      );
    }
  }, [matches]);

  // Al guardar un pronóstico, reflejarlo en la lista (sobrevive al cambiar de día)
  function handleSaved(id: string, h: number, a: number) {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              my_prediction: {
                home_score: h,
                away_score: a,
                points_earned: null,
              },
            }
          : m
      )
    );
  }

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

  if (loading)
    return (
      <div className="space-y-4">
        <div className="skeleton h-7 w-32" />
        <div className="skeleton h-16 w-full" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-32 w-full" />
        ))}
      </div>
    );
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

  const nowMs = Date.now();
  // Pendientes SOLO de hoy (día local)
  const pendingToday = matches.filter(
    (m) =>
      m.status === "upcoming" &&
      new Date(m.deadline_at).getTime() > nowMs &&
      !m.my_prediction &&
      dayKey(m.kickoff_at) === todayKey
  );
  const hasToday = matches.some((m) => dayKey(m.kickoff_at) === todayKey);
  const nextMatch = matches
    .filter(
      (m) =>
        m.status === "upcoming" && new Date(m.kickoff_at).getTime() > nowMs
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    )[0];

  const headline =
    pendingToday.length > 0
      ? `Te faltan ${pendingToday.length} pronóstico${pendingToday.length > 1 ? "s" : ""} de hoy 📝`
      : hasToday
        ? "¡Listo con los de hoy! ✅"
        : "No hay partidos hoy ⚽";

  // Si hay pendientes hoy, el botón lleva a hoy; si no, al próximo partido
  const target =
    pendingToday.length > 0
      ? todayKey
      : nextMatch
        ? dayKey(nextMatch.kickoff_at)
        : todayKey;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Partidos</h1>

      {/* Dashboard: pendientes de hoy + próximo partido */}
      <button
        onClick={() => goToKey(target)}
        className="card flex w-full items-center justify-between gap-3 p-4 text-left transition hover:shadow-md"
      >
        <div className="min-w-0">
          <div className="font-semibold text-pitch dark:text-pitch-light">
            {headline}
          </div>
          {nextMatch && (
            <div className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              Próximo: {nextMatch.home_team} vs {nextMatch.away_team}
            </div>
          )}
        </div>
        <span className="shrink-0 text-pitch">→</span>
      </button>

      <a
        href="/especiales"
        className="card flex items-center justify-between p-3 text-sm transition hover:shadow-md"
      >
        <span className="flex items-center gap-2 font-medium">
          <Award size={16} className="text-pitch" />
          Pronósticos especiales{" "}
          <span className="text-slate-400">(campeón, goleador…)</span>
        </span>
        <span className="text-pitch">→</span>
      </a>

      <JoinLeagueBanner />

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
            <MatchCard key={m.id} match={m} onSaved={handleSaved} />
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
