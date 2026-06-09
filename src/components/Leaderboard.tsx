import type { LeaderboardRow } from "@/lib/types";

export default function Leaderboard({
  rows,
  highlightUserId,
}: {
  rows: LeaderboardRow[];
  highlightUserId?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Todavía no hay puntos. ¡Cuando se jueguen los primeros partidos aparece
        el ranking!
      </p>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Jugador</th>
            <th className="px-3 py-2 text-center">PJ</th>
            <th className="px-3 py-2 text-center">Últ.</th>
            <th className="px-3 py-2 text-right">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.user_id}
              className={`border-t border-slate-100 ${
                r.user_id === highlightUserId ? "bg-pitch/5" : ""
              }`}
            >
              <td className="px-3 py-2 font-bold text-slate-400">{i + 1}</td>
              <td className="px-3 py-2 font-medium">{r.username}</td>
              <td className="px-3 py-2 text-center text-slate-500">
                {r.predictions_count}
              </td>
              <td className="px-3 py-2 text-center text-slate-500">
                {r.last_points != null ? `+${r.last_points}` : "–"}
              </td>
              <td className="px-3 py-2 text-right font-bold text-pitch">
                {r.total_points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
