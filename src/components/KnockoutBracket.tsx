"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { BRACKET_ORDER, PHASE_SHORT, phaseLabel } from "@/lib/phases";
import type { MatchVM } from "./MatchCard";

function abbr(name: string): string {
  if (!name || name === "Por definir") return "—";
  const w = name.trim().split(/\s+/);
  if (w.length === 1) return w[0].slice(0, 3).toUpperCase();
  return w
    .map((x) => x[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Sel = "todo" | string;

export default function KnockoutBracket() {
  const [matches, setMatches] = useState<MatchVM[] | null>(null);
  const [sel, setSel] = useState<Sel>("todo");

  useEffect(() => {
    apiGet<{ matches: MatchVM[] }>("/matches")
      .then((d) => setMatches(d.matches))
      .catch(() => setMatches([]));
  }, []);

  if (!matches)
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-40 w-full" />
        ))}
      </div>
    );

  const columns = BRACKET_ORDER.map((phase) => ({
    phase,
    matches: matches
      .filter((m) => m.phase === phase)
      .sort(
        (a, b) =>
          new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
      ),
  })).filter((c) => c.matches.length > 0);

  if (columns.length === 0)
    return (
      <div className="card p-8 text-center text-sm text-slate-400">
        Las eliminatorias todavía no están cargadas. Cuando se defina el cuadro
        de la fase final vas a ver acá las llaves, y se completan solas a medida
        que pasan de ronda.
      </div>
    );

  // Opciones del selector: Todo + las rondas que existan
  const roundOpts = columns.map((c) => c.phase);

  return (
    <div>
      {/* Selector de ronda */}
      <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
        <SelBtn active={sel === "todo"} onClick={() => setSel("todo")}>
          Todo
        </SelBtn>
        {roundOpts.map((p) => (
          <SelBtn key={p} active={sel === p} onClick={() => setSel(p)}>
            {PHASE_SHORT[p] ?? p}
          </SelBtn>
        ))}
      </div>

      <div key={sel} className="animate-card-in">
        {sel === "todo" ? (
          <SmallBracket columns={columns} onPick={setSel} />
        ) : (
          <BigRound
            matches={columns.find((c) => c.phase === sel)?.matches ?? []}
            phase={sel}
          />
        )}
      </div>
    </div>
  );
}

function SelBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-pitch text-white"
          : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

// Vista chica: bracket completo en columnas (deslizable). Tocás una ronda → grande.
function SmallBracket({
  columns,
  onPick,
}: {
  columns: { phase: string; matches: MatchVM[] }[];
  onPick: (p: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-center text-xs text-slate-400">
        Tocá una ronda arriba para verla grande · deslizá →
      </p>
      <div className="-mx-4 overflow-x-auto px-4 pb-3">
        <div className="flex items-stretch gap-3" style={{ minWidth: "min-content" }}>
          {columns.map((col) => (
            <button
              key={col.phase}
              onClick={() => onPick(col.phase)}
              className="flex w-28 shrink-0 flex-col text-left"
            >
              <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {PHASE_SHORT[col.phase] ?? col.phase}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-2">
                {col.matches.map((m) => {
                  const played = m.status === "finished" && !!m.result;
                  const hs = m.result?.home_score ?? null;
                  const as = m.result?.away_score ?? null;
                  const homeWin = played && hs != null && as != null && hs > as;
                  const awayWin = played && hs != null && as != null && as > hs;
                  return (
                    <div
                      key={m.id}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
                    >
                      <MiniRow
                        name={m.home_team}
                        logo={m.home_logo}
                        score={hs}
                        winner={homeWin}
                        played={played}
                      />
                      <div className="border-t border-slate-100 dark:border-white/10" />
                      <MiniRow
                        name={m.away_team}
                        logo={m.away_logo}
                        score={as}
                        winner={awayWin}
                        played={played}
                      />
                    </div>
                  );
                })}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniRow({
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
  return (
    <div
      className={`flex items-center justify-between gap-1 px-1.5 py-1 ${
        played && !winner ? "opacity-50" : ""
      }`}
    >
      <span className="flex min-w-0 items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? (
          <img src={logo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
        ) : (
          <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-slate-100 dark:bg-white/10" />
        )}
        <span className={`text-[11px] ${played && winner ? "font-bold" : ""}`}>
          {abbr(name)}
        </span>
      </span>
      {played && (
        <span className="text-[11px] font-bold tabular-nums">{score ?? "-"}</span>
      )}
    </div>
  );
}

// Vista grande: los partidos de una ronda, con banderas, nombres y fecha.
function BigRound({ matches, phase }: { matches: MatchVM[]; phase: string }) {
  return (
    <div className="space-y-3">
      <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
        {phaseLabel(phase)}
      </h2>
      {matches.map((m) => {
        const played = m.status === "finished" && !!m.result;
        const hs = m.result?.home_score ?? null;
        const as = m.result?.away_score ?? null;
        const homeWin = played && hs != null && as != null && hs > as;
        const awayWin = played && hs != null && as != null && as > hs;
        return (
          <div key={m.id} className="card p-4">
            <div className="mb-3 text-center text-[11px] text-slate-400">
              {m.status === "finished"
                ? "Finalizado"
                : m.status === "live"
                  ? "En vivo"
                  : fmtDay(m.kickoff_at)}
            </div>
            <div className="flex items-center justify-between gap-2">
              <BigTeam name={m.home_team} logo={m.home_logo} dim={played && !homeWin} />
              <div className="shrink-0 text-center">
                {played ? (
                  <div className="text-2xl font-bold">
                    {hs} - {as}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">vs</div>
                )}
                {m.result?.went_to_penalties && (
                  <div className="text-[10px] text-slate-400">(penales)</div>
                )}
              </div>
              <BigTeam name={m.away_team} logo={m.away_logo} dim={played && !awayWin} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BigTeam({
  name,
  logo,
  dim,
}: {
  name: string;
  logo: string | null;
  dim: boolean;
}) {
  const tbd = name === "Por definir";
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-1.5 text-center ${dim ? "opacity-50" : ""}`}
    >
      {logo ? (
        <span className="h-11 w-11 overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="h-full w-full object-cover" />
        </span>
      ) : (
        <span className="h-11 w-11 rounded-full bg-slate-100 dark:bg-white/10" />
      )}
      <span
        className={`text-xs font-medium leading-tight sm:text-sm ${tbd ? "italic text-slate-400" : ""}`}
      >
        {tbd ? "Por definir" : name}
      </span>
    </div>
  );
}
