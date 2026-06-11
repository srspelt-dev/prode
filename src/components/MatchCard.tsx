"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { countryFlag, teamInitials } from "@/lib/flags";
import { toast } from "@/lib/toast";
import ScoreBadge from "./ScoreBadge";
import Avatar from "./Avatar";

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
  } | null;
  can_predict: boolean;
  my_prediction: {
    home_score: number;
    away_score: number;
    points_earned: number | null;
  } | null;
}

interface OtherPrediction {
  username: string;
  home_score: number;
  away_score: number;
  points_earned: number | null;
}

interface LeagueGroup {
  league_id: string;
  league_name: string;
  predictions: OtherPrediction[];
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Por jugarse",
  live: "En vivo",
  finished: "Finalizado",
};

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<boolean>(!!match.my_prediction);

  // Modo espectador
  const [showOthers, setShowOthers] = useState(false);
  const [groups, setGroups] = useState<LeagueGroup[] | null>(null);
  const [hasLeague, setHasLeague] = useState(true);
  const [loadingOthers, setLoadingOthers] = useState(false);

  const deadlinePassed = new Date(match.deadline_at).getTime() <= Date.now();

  const [justSaved, setJustSaved] = useState(false);

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

  return (
    <div className="card animate-card-in p-4">
      <div className="mb-2 flex items-center justify-between text-xs capitalize text-slate-400">
        <span>
          {match.phase}
          {match.group ? ` · Grupo ${match.group}` : ""}
        </span>
        {match.status === "live" ? (
          <span className="flex items-center gap-1 font-semibold text-red-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            En vivo
          </span>
        ) : playing ? (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            Jugándose
          </span>
        ) : (
          <span>{STATUS_LABEL[match.status]}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <TeamSide name={match.home_team} logo={match.home_logo} />

        <div className="shrink-0 text-center">
          {match.status === "finished" && r ? (
            <div className="text-2xl font-bold">
              {r.home_score} - {r.away_score}
              {r.went_to_penalties && (
                <div className="text-[10px] font-normal text-slate-400">
                  (def. por penales)
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400">vs</div>
          )}
        </div>

        <TeamSide name={match.away_team} logo={match.away_logo} reverse />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
        <span>{fmtTime(match.kickoff_at)}</span>
        {match.status === "upcoming" && (
          <>
            <span>·</span>
            <Countdown deadline={match.deadline_at} />
          </>
        )}
      </div>

      {/* Zona de pronóstico */}
      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        {match.can_predict ? (
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
        ) : match.my_prediction ? (
          <div className="flex items-center justify-center gap-3 text-sm">
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
                                <span className="font-mono font-medium">
                                  {o.home_score}-{o.away_score}
                                </span>
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

function TeamSide({
  name,
  logo,
  reverse,
}: {
  name: string;
  logo: string | null;
  reverse?: boolean;
}) {
  const flag = countryFlag(name);
  return (
    <div
      className={`flex flex-1 items-center gap-2 ${
        reverse ? "flex-row-reverse text-right" : ""
      }`}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} className="h-7 w-7 object-contain" />
      ) : flag ? (
        <span className="text-2xl leading-none">{flag}</span>
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
          {teamInitials(name)}
        </span>
      )}
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}
