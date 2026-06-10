import type { LeaderboardRow } from "@/lib/types";

const MEDAL = ["🥇", "🥈", "🥉"];

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
      {rows.map((r, i) => {
        const isMe = r.user_id === highlightUserId;
        const medal = MEDAL[i];
        return (
          <div
            key={r.user_id}
            className={`flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 ${
              isMe ? "bg-pitch/5" : ""
            }`}
          >
            {/* Posición / medalla */}
            <div className="flex w-7 shrink-0 justify-center">
              {medal ? (
                <span className="text-xl leading-none">{medal}</span>
              ) : (
                <span className="text-sm font-bold text-slate-400">
                  {i + 1}
                </span>
              )}
            </div>

            {/* Nombre */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`truncate font-medium ${i < 3 ? "text-slate-900" : "text-slate-700"}`}
                >
                  {r.username}
                </span>
                {isMe && (
                  <span className="rounded bg-pitch px-1 text-[9px] font-bold uppercase text-white">
                    vos
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {r.predictions_count} pronós.
                {r.last_points != null && r.last_points > 0
                  ? ` · +${r.last_points} en el último`
                  : ""}
              </div>
            </div>

            {/* Puntos */}
            <div className="shrink-0 text-right">
              <span className="text-lg font-bold text-pitch">
                {r.total_points}
              </span>
              <span className="ml-0.5 text-[11px] text-slate-400">pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
