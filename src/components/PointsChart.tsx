"use client";

interface PredVM {
  kickoff_at: string | null;
  status: string;
  points_earned: number | null;
}

export default function PointsChart({ preds }: { preds: PredVM[] }) {
  const finished = preds
    .filter(
      (p) =>
        p.status === "finished" && p.points_earned != null && p.kickoff_at
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff_at!).getTime() - new Date(b.kickoff_at!).getTime()
    );

  // Necesitamos al menos 2 partidos para una curva
  if (finished.length < 2) return null;

  let cum = 0;
  const cumulative = finished.map((p) => (cum += p.points_earned ?? 0));
  const total = cum;
  const max = Math.max(...cumulative, 1);

  const W = 320;
  const H = 96;
  const pad = 6;
  const stepX = (W - pad * 2) / (cumulative.length - 1);
  const coords = cumulative.map((v, i) => [
    pad + i * stepX,
    H - pad - (v / max) * (H - pad * 2),
  ]);
  const line = coords
    .map((c, i) => (i === 0 ? "M" : "L") + c[0].toFixed(1) + " " + c[1].toFixed(1))
    .join(" ");
  const area =
    line +
    ` L ${coords[coords.length - 1][0].toFixed(1)} ${H - pad} L ${coords[0][0].toFixed(1)} ${H - pad} Z`;

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Evolución de puntos
        </h2>
        <span className="text-lg font-bold text-pitch dark:text-pitch-light">
          {total}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-24 w-full text-pitch dark:text-pitch-light"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ptsGrad)" />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="mt-1 text-center text-[11px] text-slate-400">
        Puntos acumulados partido a partido
      </p>
    </div>
  );
}
