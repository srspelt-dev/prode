"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import ScoreBadge from "./ScoreBadge";

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
  live: "🔴 En vivo",
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

export default function MatchCard({ match }: { match: MatchVM }) {
  const [home, setHome] = useState<string>(
    match.my_prediction ? String(match.my_prediction.home_score) : ""
  );
  const [away, setAway] = useState<string>(
    match.my_prediction ? String(match.my_prediction.away_score) : ""
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [saved, setSaved] = useState<boolean>(!!match.my_prediction);

  // Modo espectador
  const [showOthers, setShowOthers] = useState(false);
  const [others, setOthers] = useState<OtherPrediction[] | null>(null);
  const [hasLeague, setHasLeague] = useState(true);
  const [loadingOthers, setLoadingOthers] = useState(false);

  const deadlinePassed = new Date(match.deadline_at).getTime() <= Date.now();

  async function save() {
    setMsg("");
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (Number.isNaN(h) || Number.isNaN(a)) {
      setMsg("Ingresá ambos marcadores");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/predictions", {
        match_id: match.id,
        home_score: h,
        away_score: a,
      });
      setSaved(true);
      setMsg("¡Pronóstico guardado!");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleOthers() {
    const next = !showOthers;
    setShowOthers(next);
    if (next && others === null) {
      setLoadingOthers(true);
      try {
        const d = await apiGet<{
          predictions: OtherPrediction[];
          has_league: boolean;
        }>(`/predictions/${match.id}`);
        setOthers(d.predictions);
        setHasLeague(d.has_league);
      } catch {
        setOthers([]);
      } finally {
        setLoadingOthers(false);
      }
    }
  }

  const r = match.result;

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {match.phase}
          {match.group ? ` · Grupo ${match.group}` : ""}
        </span>
        <span>{STATUS_LABEL[match.status]}</span>
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
      <div className="mt-3 border-t border-slate-100 pt-3">
        {match.can_predict ? (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-slate-500">Tu pronóstico:</span>
            <input
              className="score-input"
              inputMode="numeric"
              value={home}
              onChange={(e) => setHome(e.target.value.replace(/\D/g, ""))}
              maxLength={2}
            />
            <span className="font-bold text-slate-400">-</span>
            <input
              className="score-input"
              inputMode="numeric"
              value={away}
              onChange={(e) => setAway(e.target.value.replace(/\D/g, ""))}
              maxLength={2}
            />
            <button
              className="btn-primary ml-2 px-3 py-1.5 text-xs"
              onClick={save}
              disabled={saving}
            >
              {saving ? "..." : saved ? "Actualizar" : "Guardar"}
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
        {msg && <p className="mt-2 text-center text-xs text-pitch">{msg}</p>}

        {/* Modo espectador: ver pronósticos de todos (tras el cierre) */}
        {deadlinePassed && (
          <div className="mt-3 border-t border-slate-100 pt-2 text-center">
            <button
              onClick={toggleOthers}
              className="text-xs font-medium text-pitch hover:underline"
            >
              {showOthers
                ? "Ocultar pronósticos"
                : "👀 Ver pronósticos de mi grupo"}
            </button>
            {showOthers && (
              <div className="mt-2 text-left">
                {loadingOthers ? (
                  <p className="text-center text-xs text-slate-400">
                    Cargando…
                  </p>
                ) : others && others.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {others.map((o, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <span className="text-slate-600">{o.username}</span>
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
                ) : !hasLeague ? (
                  <p className="text-center text-xs text-slate-400">
                    Unite a una liga para ver los pronósticos de tu grupo.{" "}
                    <a href="/ligas" className="text-pitch underline">
                      Ir a Ligas
                    </a>
                  </p>
                ) : (
                  <p className="text-center text-xs text-slate-400">
                    Nadie de tu grupo pronosticó este partido.
                  </p>
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
  return (
    <div
      className={`flex flex-1 items-center gap-2 ${
        reverse ? "flex-row-reverse text-right" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logo ? (
        <img src={logo} alt={name} className="h-7 w-7 object-contain" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-slate-100" />
      )}
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}
