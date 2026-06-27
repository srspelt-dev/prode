"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { KNOCKOUT_PHASES, phaseLabel } from "@/lib/phases";
import type { MatchVM } from "./MatchCard";

function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function Team({
  name,
  logo,
  score,
  winner,
  played,
}: {
  name: string;
  logo: string | null;
  score: number | null;
  winner: boolean;
  played: boolean;
}) {
  const tbd = !name || name === "Por definir";
  return (
    <div
      className={`flex items-center justify-between gap-2 px-2 py-1.5 ${
        played && winner ? "font-bold" : ""
      } ${played && !winner ? "text-slate-400" : ""}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? (
          <img src={logo} alt="" className="h-4 w-4 object-contain" />
        ) : (
          <span className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700" />
        )}
        <span className={`truncate text-sm ${tbd ? "italic text-slate-400" : ""}`}>
          {tbd ? "Por definir" : name}
        </span>
      </span>
      {played && (
        <span className="text-sm tabular-nums">{score ?? "-"}</span>
      )}
    </div>
  );
}

export default function KnockoutBracket() {
  const [matches, setMatches] = useState<MatchVM[] | null>(null);

  useEffect(() => {
    apiGet<{ matches: MatchVM[] }>("/matches")
      .then((d) => setMatches(d.matches))
      .catch(() => setMatches([]));
  }, []);

  if (!matches)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-32 w-full" />
        ))}
      </div>
    );

  const rounds = KNOCKOUT_PHASES.map((phase) => ({
    phase,
    matches: matches
      .filter((m) => m.phase === phase)
      .sort(
        (a, b) =>
          new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
      ),
  })).filter((r) => r.matches.length > 0);

  if (rounds.length === 0)
    return (
      <div className="card p-8 text-center text-sm text-slate-400">
        Las eliminatorias todavía no están cargadas. Cuando se defina el fixture
        de la fase final vas a ver acá las llaves, y se completan solas a medida
        que pasan de ronda.
      </div>
    );

  return (
    <div className="space-y-5">
      <p className="text-center text-xs text-slate-400">
        Se completa solo a medida que avanza el torneo
      </p>
      {rounds.map((r) => (
        <section key={r.phase} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {phaseLabel(r.phase)}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {r.matches.map((m) => {
              const played = m.status === "finished" && !!m.result;
              const hs = m.result?.home_score ?? null;
              const as = m.result?.away_score ?? null;
              const homeWin = played && hs != null && as != null && hs > as;
              const awayWin = played && hs != null && as != null && as > hs;
              return (
                <div key={m.id} className="card overflow-hidden">
                  <Team
                    name={m.home_team}
                    logo={m.home_logo}
                    score={hs}
                    winner={homeWin}
                    played={played}
                  />
                  <div className="border-t border-slate-100 dark:border-slate-800" />
                  <Team
                    name={m.away_team}
                    logo={m.away_logo}
                    score={as}
                    winner={awayWin}
                    played={played}
                  />
                  <div className="bg-slate-50 px-2 py-1 text-[10px] text-slate-400 dark:bg-slate-800/50">
                    {m.status === "live"
                      ? "En vivo"
                      : m.result?.went_to_penalties
                        ? "Definido por penales"
                        : fmtDay(m.kickoff_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
