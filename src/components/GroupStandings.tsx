"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

interface Row {
  position: number;
  team: { name: string; crest: string | null };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalDifference: number;
}
interface Group {
  group: string | null;
  table: Row[];
}

export default function GroupStandings() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ standings: Group[] }>("/standings")
      .then((d) => setGroups(d.standings))
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        No se pudieron cargar las posiciones. Probá de nuevo en un rato.
      </p>
    );

  if (!groups)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-40 w-full" />
        ))}
      </div>
    );

  if (groups.length === 0)
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl">🏟️</div>
        <p className="mt-2 text-sm text-slate-400">
          Todavía no hay partidos jugados. Cuando arranque el Mundial vas a ver
          acá las posiciones reales de cada grupo.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-slate-400">
        Posiciones reales del Mundial · los 2 primeros de cada grupo clasifican
      </p>
      {groups.map((g) => (
        <div key={g.group} className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
            {g.group?.replace("GROUP_", "Grupo ") ?? "Grupo"}
          </div>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-slate-400">
              <tr>
                <th className="px-2 py-1 text-left font-medium">#</th>
                <th className="px-2 py-1 text-left font-medium">Equipo</th>
                <th className="px-1 py-1 text-center font-medium">PJ</th>
                <th className="px-1 py-1 text-center font-medium">DG</th>
                <th className="px-2 py-1 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {g.table.map((r) => {
                const classifies = r.position <= 2;
                return (
                  <tr
                    key={r.team.name}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${
                          classifies
                            ? "bg-pitch/15 text-pitch dark:text-pitch-light"
                            : "text-slate-400"
                        }`}
                      >
                        {r.position}
                      </span>
                    </td>
                    <td className="flex items-center gap-2 px-2 py-1.5 font-medium">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {r.team.crest && (
                        <img
                          src={r.team.crest}
                          alt=""
                          className="h-4 w-4 object-contain"
                        />
                      )}
                      <span className="truncate">{r.team.name}</span>
                    </td>
                    <td className="px-1 py-1.5 text-center text-slate-500">
                      {r.playedGames}
                    </td>
                    <td className="px-1 py-1.5 text-center text-slate-500">
                      {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold">
                      {r.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
