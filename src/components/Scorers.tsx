"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

interface Scorer {
  name: string;
  team: string;
  team_crest: string | null;
  goals: number;
  assists: number | null;
}

export default function Scorers() {
  const [scorers, setScorers] = useState<Scorer[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ scorers: Scorer[] }>("/scorers")
      .then((d) => setScorers(d.scorers))
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        No se pudieron cargar los goleadores. Probá de nuevo en un rato.
      </p>
    );

  if (!scorers)
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    );

  if (scorers.length === 0)
    return (
      <div className="card p-8 text-center text-sm text-slate-400">
        Todavía no hay goles. Cuando empiece a rodar la pelota vas a ver acá la
        tabla de goleadores.
      </div>
    );

  return (
    <div className="card overflow-hidden">
      {scorers.map((s, i) => (
        <div
          key={`${s.name}-${i}`}
          className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 dark:border-white/10"
        >
          <span className="w-5 text-center text-sm font-bold text-slate-400">
            {i + 1}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.team_crest ? (
            <img src={s.team_crest} alt="" className="h-6 w-6 object-contain" />
          ) : (
            <span className="h-6 w-6 rounded-full bg-slate-100 dark:bg-white/10" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{s.name}</div>
            <div className="truncate text-[11px] text-slate-400">{s.team}</div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-lg font-bold text-pitch dark:text-pitch-light">
              {s.goals}
            </span>
            <span className="ml-0.5 text-[11px] text-slate-400">
              {s.goals === 1 ? "gol" : "goles"}
            </span>
            {s.assists != null && s.assists > 0 && (
              <div className="text-[10px] text-slate-400">
                {s.assists} asist.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
