"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { phaseLabel } from "@/lib/phases";

interface Detail {
  home_team: string;
  away_team: string;
  home_logo: string | null;
  away_logo: string | null;
  home_record: string;
  away_record: string;
  phase: string;
  group: string | null;
  kickoff_at: string;
  status: string;
  result: {
    home_score: number | null;
    away_score: number | null;
    went_to_penalties: boolean;
    penalty_winner?: "home" | "away" | null;
  } | null;
  half_time: { home: number; away: number } | null;
  venue: string | null;
  referee: string | null;
  is_manual: boolean;
}

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

interface StandRow {
  position: number;
  team: { name: string; crest: string | null };
  playedGames: number;
  points: number;
  goalDifference: number;
}

export default function MatchModal({
  matchId,
  onClose,
}: {
  matchId: string;
  onClose: () => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [groupTable, setGroupTable] = useState<StandRow[] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Bloquear el scroll de fondo mientras el popup está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    apiGet<Detail>(`/matches/${matchId}/detail`)
      .then(setD)
      .catch(() => onClose());
  }, [matchId, onClose]);

  // Tabla del grupo (solo para partidos de fase de grupos)
  useEffect(() => {
    if (!d?.group) return;
    apiGet<{ standings: { group: string | null; table: StandRow[] }[] }>(
      "/standings"
    )
      .then((s) => {
        const g = s.standings.find(
          (x) => (x.group || "").replace("GROUP_", "") === d.group
        );
        setGroupTable(g?.table ?? []);
      })
      .catch(() => setGroupTable([]));
  }, [d?.group]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-modal-in max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-white p-5 shadow-2xl dark:bg-[#0e1c44] sm:rounded-2xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {d ? phaseLabel(d.phase) : "Cargando…"}
            {d?.group ? ` · Grupo ${d.group}` : ""}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {!d ? (
          <div className="skeleton h-40 w-full" />
        ) : (
          <>
            {/* Marcador */}
            <div className="flex items-center justify-between gap-3">
              <TeamBig name={d.home_team} logo={d.home_logo} record={d.home_record} />
              <div className="shrink-0 text-center">
                {d.result && d.result.home_score != null ? (
                  <div className="text-3xl font-bold">
                    {d.result.home_score} - {d.result.away_score}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">vs</div>
                )}
              </div>
              <TeamBig name={d.away_team} logo={d.away_logo} record={d.away_record} reverse />
            </div>

            {/* Datos */}
            <div className="mt-5 space-y-2 text-sm">
              <Row label="Fecha" value={fmt(d.kickoff_at)} />
              {d.half_time && (
                <Row
                  label="Entretiempo"
                  value={`${d.half_time.home} - ${d.half_time.away}`}
                />
              )}
              {d.result?.went_to_penalties && (
                <Row
                  label="Definición"
                  value={
                    d.result.penalty_winner === "home"
                      ? `Por penales · pasó ${d.home_team}`
                      : d.result.penalty_winner === "away"
                        ? `Por penales · pasó ${d.away_team}`
                        : "Por penales"
                  }
                />
              )}
              {d.venue && <Row label="Estadio" value={d.venue} />}
              {d.referee && <Row label="Árbitro" value={d.referee} />}
              {d.is_manual && (
                <p className="pt-2 text-xs text-slate-400">
                  Partido amistoso cargado manualmente — sin datos adicionales.
                </p>
              )}
              {!d.is_manual &&
                !d.half_time &&
                !d.venue &&
                !d.referee &&
                d.status === "upcoming" && (
                  <p className="pt-2 text-xs text-slate-400">
                    Los datos del partido (entretiempo, estadio, árbitro)
                    aparecen una vez que se juega.
                  </p>
                )}
            </div>

            {/* Tabla del grupo */}
            {d.group && groupTable && groupTable.length > 0 && (
              <div className="mt-5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Grupo {d.group}
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-white/10">
                  <table className="w-full text-sm">
                    <tbody>
                      {groupTable.map((t) => {
                        const isHere =
                          t.team.name === d.home_team ||
                          t.team.name === d.away_team;
                        return (
                          <tr
                            key={t.team.name}
                            className={`border-b border-slate-100 last:border-0 dark:border-white/10 ${
                              isHere ? "bg-pitch/10 font-medium" : ""
                            }`}
                          >
                            <td className="px-2 py-1.5 text-slate-400">
                              {t.position}
                            </td>
                            <td className="flex items-center gap-2 px-1 py-1.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {t.team.crest && (
                                <img
                                  src={t.team.crest}
                                  alt=""
                                  className="h-4 w-4 object-contain"
                                />
                              )}
                              <span className="truncate">{t.team.name}</span>
                            </td>
                            <td className="px-2 py-1.5 text-center text-slate-400">
                              {t.playedGames}
                            </td>
                            <td className="px-2 py-1.5 text-right font-bold">
                              {t.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function TeamBig({
  name,
  logo,
  record,
}: {
  name: string;
  logo: string | null;
  record?: string;
  reverse?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logo ? (
        <img src={logo} alt="" className="h-10 w-10 object-contain" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" />
      )}
      <span className="text-sm font-medium leading-tight">{name}</span>
      {record && record !== "0-0-0" && (
        <span className="text-[11px] text-slate-400">{record}</span>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
