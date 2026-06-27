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

function labelDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const txt = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(y, m - 1, d));
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

type Tab = "ayer" | "hoy" | "proximos";

export default function PartidosPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("hoy");

  useEffect(() => {
    apiGet<{ matches: MatchVM[] }>("/matches")
      .then((d) => setMatches(d.matches))
      .catch((e) => {
        if (String(e.message).includes("401")) router.replace("/");
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Confetti al detectar un resultado exacto (6 pts) recién acertado
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

  function handleSaved(id: string, h: number, a: number) {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              my_prediction: {
                home_score: h,
                away_score: a,
                advances: m.my_prediction?.advances ?? null,
                points_earned: null,
              },
            }
          : m
      )
    );
  }

  const todayKey = dayKey(startOfToday());
  const yesterdayKey = dayKey(addDays(startOfToday(), -1));

  const sorted = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
      ),
    [matches]
  );

  const ayer = sorted.filter((m) => dayKey(m.kickoff_at) === yesterdayKey);
  const hoy = sorted.filter((m) => dayKey(m.kickoff_at) === todayKey);
  const proximos = sorted.filter((m) => dayKey(m.kickoff_at) > todayKey);

  // Próximos agrupados por día
  const proximosByDay = useMemo(() => {
    const map = new Map<string, MatchVM[]>();
    for (const m of proximos) {
      const k = dayKey(m.kickoff_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries());
  }, [proximos]);

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
  const pendingToday = hoy.filter(
    (m) =>
      m.status === "upcoming" &&
      new Date(m.deadline_at).getTime() > nowMs &&
      !m.my_prediction
  );
  const nextMatch = sorted.find(
    (m) => m.status === "upcoming" && new Date(m.kickoff_at).getTime() > nowMs
  );

  const headline =
    pendingToday.length > 0
      ? `Te faltan ${pendingToday.length} pronóstico${pendingToday.length > 1 ? "s" : ""} de hoy`
      : hoy.length > 0
        ? "Estás al día con los de hoy"
        : "No hay partidos hoy";

  const tabs: { k: Tab; label: string; count: number }[] = [
    { k: "ayer", label: "Ayer", count: ayer.length },
    { k: "hoy", label: "Hoy", count: hoy.length },
    { k: "proximos", label: "Próximos", count: proximos.length },
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Partidos</h1>

      {/* Dashboard: pendientes de hoy + próximo partido */}
      <button
        onClick={() =>
          setTab(pendingToday.length > 0 || hoy.length ? "hoy" : "proximos")
        }
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

      {/* Segmentos Ayer / Hoy / Próximos */}
      <div className="flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-white/5">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              tab === t.k
                ? "bg-white shadow-sm dark:bg-white/10"
                : "text-slate-500"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 text-xs text-slate-400">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido del segmento */}
      {tab === "ayer" && (
        <MatchList matches={ayer} onSaved={handleSaved} empty="No hubo partidos ayer." />
      )}
      {tab === "hoy" && (
        <MatchList matches={hoy} onSaved={handleSaved} empty="No hay partidos hoy." />
      )}
      {tab === "proximos" &&
        (proximosByDay.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No hay próximos partidos cargados.
          </p>
        ) : (
          <div className="space-y-5">
            {proximosByDay.map(([key, list]) => (
              <section key={key} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  {labelDay(key)}
                </h2>
                {list.map((m) => (
                  <MatchCard key={m.id} match={m} onSaved={handleSaved} />
                ))}
              </section>
            ))}
          </div>
        ))}
    </div>
  );
}

function MatchList({
  matches,
  onSaved,
  empty,
}: {
  matches: MatchVM[];
  onSaved: (id: string, h: number, a: number) => void;
  empty: string;
}) {
  if (matches.length === 0)
    return <p className="py-8 text-center text-sm text-slate-400">{empty}</p>;
  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} onSaved={onSaved} />
      ))}
    </div>
  );
}
