"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { countryFlag, teamInitials } from "@/lib/flags";
import { phaseLabel, KNOCKOUT_PHASES } from "@/lib/phases";
import { toast } from "@/lib/toast";
import ScoreBadge from "./ScoreBadge";
import Avatar from "./Avatar";
import MatchModal from "./MatchModal";

export interface MatchVM {
  id: string;
  competition?: string;
  is_manual?: boolean;
  phase: string;
  group: string | null;
  home_team: string;
  away_team: string;
  home_logo: string | null;
  away_logo: string | null;
  kickoff_at: string;
  deadline_at: string;
  status: "upcoming" | "live" | "finished";
  result: {
    home_score: number | null;
    away_score: number | null;
    went_to_penalties: boolean;
    penalty_winner?: "home" | "away" | null;
    penalty_score?: { home: number; away: number } | null;
  } | null;
  can_predict: boolean;
  my_prediction: {
    home_score: number;
    away_score: number;
    advances?: "home" | "away" | null;
    points_earned: number | null;
  } | null;
}

interface OtherPrediction {
  username: string;
  home_score: number;
  away_score: number;
  advances?: "home" | "away" | null;
  points_earned: number | null;
}

interface LeagueGroup {
  league_id: string;
  league_name: string;
  predictions: OtherPrediction[];
}

function fmtClock(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtDayShort(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}


// Cuenta regresiva hasta el cierre del pronóstico
function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) {
    return (
      <span className="text-xs font-medium text-red-500">Plazo cerrado</span>
    );
  }
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  let txt: string;
  if (d > 0) txt = `${d}d ${h}h ${m}m`;
  else if (h > 0) txt = `${h}h ${m}m`;
  else txt = `${m}m ${s}s`;

  const urgent = ms < 30 * 60 * 1000; // menos de 30 min
  return (
    <span
      className={`text-xs font-medium ${urgent ? "text-amber-600" : "text-slate-400"}`}
    >
      Cierra en {txt}
    </span>
  );
}

export default function MatchCard({
  match,
  onSaved,
}: {
  match: MatchVM;
  onSaved?: (id: string, home: number, away: number) => void;
}) {
  const [home, setHome] = useState<number | null>(
    match.my_prediction ? match.my_prediction.home_score : null
  );
  const [away, setAway] = useState<number | null>(
    match.my_prediction ? match.my_prediction.away_score : null
  );
  const [advances, setAdvances] = useState<"home" | "away" | null>(
    match.my_prediction?.advances ?? null
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<boolean>(!!match.my_prediction);

  const isKnockout = KNOCKOUT_PHASES.includes(match.phase as never);

  // Modo espectador
  const [showOthers, setShowOthers] = useState(false);
  const [groups, setGroups] = useState<LeagueGroup[] | null>(null);
  const [hasLeague, setHasLeague] = useState(true);
  const [loadingOthers, setLoadingOthers] = useState(false);

  const deadlinePassed = new Date(match.deadline_at).getTime() <= Date.now();

  const [justSaved, setJustSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function save() {
    if (home === null || away === null) {
      toast("Ingresá ambos marcadores", "error");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/predictions", {
        match_id: match.id,
        home_score: home,
        away_score: away,
        advances: isKnockout ? advances : null,
      });
      setSaved(true);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      // Avisar al padre para que actualice la lista (evita que se "pierda"
      // el pronóstico al navegar entre días y volver).
      onSaved?.(match.id, home, away);
      toast(
        `¡Pronóstico guardado! ${match.home_team} ${home}-${away} ${match.away_team}`
      );
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleOthers() {
    const next = !showOthers;
    setShowOthers(next);
    if (next && groups === null) {
      setLoadingOthers(true);
      try {
        const d = await apiGet<{
          groups: LeagueGroup[];
          has_league: boolean;
        }>(`/predictions/${match.id}`);
        setGroups(d.groups);
        setHasLeague(d.has_league);
      } catch {
        setGroups([]);
      } finally {
        setLoadingOthers(false);
      }
    }
  }

  const r = match.result;
  // Empezó (kickoff pasó) pero aún no tiene resultado cargado
  const playing =
    match.status !== "finished" &&
    new Date(match.kickoff_at).getTime() <= Date.now();

  const played = (match.status === "finished" || match.status === "live") && !!r;

  return (
    <div className="card animate-card-in p-4">
      <div className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {phaseLabel(match.phase)}
        {match.group ? ` · Grupo ${match.group}` : ""}
      </div>

      {/* Encabezado estilo Apple: equipo · marcador/estado · equipo */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="-mx-2 grid w-full grid-cols-[1fr_auto_1fr] items-start gap-1 rounded-xl px-2 py-1 transition hover:bg-black/5 dark:hover:bg-white/5"
        title="Ver detalle del partido"
      >
        <TeamCol name={match.home_team} logo={match.home_logo} />

        <div className="px-1 pt-1 text-center">
          {played ? (
            <div
              className={`text-3xl font-bold leading-none ${match.status === "live" ? "text-red-500" : ""}`}
            >
              {r!.home_score}
              <span className="px-1.5 text-slate-300 dark:text-slate-600">-</span>
              {r!.away_score}
            </div>
          ) : (
            <div className="text-xl font-bold leading-none">
              {fmtClock(match.kickoff_at)}
            </div>
          )}
          <div className="mt-1.5 text-[11px] font-semibold">
            {match.status === "live" ? (
              <span className="inline-flex items-center gap-1 text-red-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                En vivo
              </span>
            ) : playing ? (
              <span className="text-amber-500">Jugándose</span>
            ) : match.status === "finished" ? (
              <span className="text-slate-400">Fin</span>
            ) : (
              <span className="text-slate-400">{fmtDayShort(match.kickoff_at)}</span>
            )}
          </div>
          {r?.went_to_penalties && (
            <div className="mt-0.5 text-[10px] font-semibold text-violet-500">
              {r.penalty_score
                ? `P ${r.penalty_score.home}-${r.penalty_score.away}`
                : "Penales"}
            </div>
          )}
        </div>

        <TeamCol name={match.away_team} logo={match.away_logo} />
      </button>

      {showModal && (
        <MatchModal matchId={match.id} onClose={() => setShowModal(false)} />
      )}

      {match.status === "upcoming" && (
        <div className="mt-2 text-center text-xs">
          <Countdown deadline={match.deadline_at} />
        </div>
      )}

      {/* Zona de pronóstico */}
      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
        {match.can_predict ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="w-full text-center text-xs text-slate-500 sm:w-auto">
                Tu pronóstico:
              </span>
              <input
                className="score-input"
                inputMode="numeric"
                value={home === null ? "" : String(home)}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setHome(d === "" ? null : parseInt(d, 10));
                }}
                maxLength={2}
              />
              <span className="font-bold text-slate-400">-</span>
              <input
                className="score-input"
                inputMode="numeric"
                value={away === null ? "" : String(away)}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setAway(d === "" ? null : parseInt(d, 10));
                }}
                maxLength={2}
              />
              <button
                className="btn-primary ml-1 px-3 py-2 text-xs"
                onClick={save}
                disabled={saving}
              >
                {saving
                  ? "..."
                  : justSaved
                    ? "✓ Listo"
                    : saved
                      ? "Actualizar"
                      : "Guardar"}
              </button>
            </div>

            {/* Eliminatorias: ¿quién pasa? (+3 pts) */}
            {isKnockout && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-slate-500">
                  ¿Quién pasa?{" "}
                  <span className="text-pitch">+3 si hay penales</span>
                </span>
                <div className="flex gap-2">
                  {(["home", "away"] as const).map((side) => {
                    const name =
                      side === "home" ? match.home_team : match.away_team;
                    const active = advances === side;
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setAdvances(active ? null : side)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          active
                            ? "border-pitch bg-pitch text-white"
                            : "border-slate-300 text-slate-600 hover:border-pitch dark:border-white/15 dark:text-slate-300"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : match.my_prediction ? (
          <div className="space-y-1 text-center text-sm">
            <div className="flex items-center justify-center gap-3">
              <span className="text-slate-500">
                Pronosticaste{" "}
                <strong>
                  {match.my_prediction.home_score}-
                  {match.my_prediction.away_score}
                </strong>
              </span>
              {match.status === "finished" && (
                <ScoreBadge points={match.my_prediction.points_earned} />
              )}
            </div>
            {isKnockout && match.my_prediction.advances && (
              <div className="text-xs text-slate-400">
                Pasa:{" "}
                <strong>
                  {match.my_prediction.advances === "home"
                    ? match.home_team
                    : match.away_team}
                </strong>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-xs text-slate-400">
            {match.status === "upcoming"
              ? "Plazo de pronóstico cerrado"
              : "No pronosticaste este partido"}
          </div>
        )}

        {/* Modo espectador: ver pronósticos de todos (tras el cierre) */}
        {deadlinePassed && (
          <div className="mt-3 border-t border-slate-100 pt-2 text-center dark:border-slate-800">
            <button
              onClick={toggleOthers}
              className="text-xs font-medium text-pitch hover:underline"
            >
              {showOthers
                ? "Ocultar pronósticos"
                : "Ver pronósticos de mi grupo"}
            </button>
            {showOthers && (
              <div className="mt-2 space-y-3 text-left">
                {loadingOthers ? (
                  <p className="text-center text-xs text-slate-400">
                    Cargando…
                  </p>
                ) : !hasLeague ? (
                  <p className="text-center text-xs text-slate-400">
                    Unite a una liga para ver los pronósticos de tu grupo.{" "}
                    <a href="/ligas" className="text-pitch underline">
                      Ir a Ligas
                    </a>
                  </p>
                ) : (
                  groups?.map((g) => (
                    <div key={g.league_id}>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {g.league_name}
                      </div>
                      {g.predictions.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {g.predictions.map((o, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between py-1.5 text-sm"
                            >
                              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Avatar name={o.username} size={24} />
                                {o.username}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="font-mono font-medium">
                                    {o.home_score}-{o.away_score}
                                  </span>
                                  {isKnockout && o.advances && (
                                    <div className="text-[10px] text-slate-400">
                                      pasa:{" "}
                                      {o.advances === "home"
                                        ? match.home_team
                                        : match.away_team}
                                    </div>
                                  )}
                                </div>
                                {match.status === "finished" && (
                                  <ScoreBadge points={o.points_earned} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Nadie de esta liga pronosticó.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Flag({ name, logo }: { name: string; logo: string | null }) {
  if (logo) {
    return (
      <span className="h-12 w-12 overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  const emoji = countryFlag(name);
  if (emoji) return <span className="text-4xl leading-none">{emoji}</span>;
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
      {teamInitials(name)}
    </span>
  );
}

function TeamCol({ name, logo }: { name: string; logo: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Flag name={name} logo={logo} />
      <span className="line-clamp-2 text-xs font-medium leading-tight sm:text-sm">
        {name}
      </span>
    </div>
  );
}
