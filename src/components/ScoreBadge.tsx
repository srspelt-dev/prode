// Color del badge según los puntos ganados.
function badgeColor(p: number): string {
  if (p >= 7) return "bg-violet-600 text-white"; // máximo (exacto + bonus)
  if (p === 6) return "bg-emerald-600 text-white";
  if (p === 4) return "bg-emerald-500 text-white";
  if (p === 3) return "bg-amber-500 text-white";
  return "bg-slate-300 text-slate-700";
}

export default function ScoreBadge({ points }: { points: number | null }) {
  if (points === null || points === undefined) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
        sin calcular
      </span>
    );
  }
  const color = badgeColor(points);
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${color}`}
    >
      +{points} pts
    </span>
  );
}
