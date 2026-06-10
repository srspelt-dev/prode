// Muestra los puntos ganados con un color según el valor.
const COLORS: Record<number, string> = {
  6: "bg-emerald-600 text-white",
  4: "bg-emerald-500 text-white",
  3: "bg-amber-500 text-white",
  0: "bg-slate-300 text-slate-700",
};

export default function ScoreBadge({ points }: { points: number | null }) {
  if (points === null || points === undefined) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
        sin calcular
      </span>
    );
  }
  const color = COLORS[points] ?? "bg-slate-300 text-slate-700";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${color}`}
    >
      +{points} pts
    </span>
  );
}
