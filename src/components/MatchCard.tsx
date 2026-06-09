"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api-client";
import ScoreBadge from "./ScoreBadge";

export interface MatchVM {
  id: string;
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

      <div className="mt-3 text-center text-xs text-slate-400">
        {fmtTime(match.kickoff_at)}
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
        {msg && (
          <p className="mt-2 text-center text-xs text-pitch">{msg}</p>
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
