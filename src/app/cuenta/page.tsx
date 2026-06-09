"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import ScoreBadge from "@/components/ScoreBadge";
import type { PublicUser } from "@/lib/types";

interface PredVM {
  match_id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string | null;
  status: string;
  result: { home_score: number | null; away_score: number | null } | null;
  home_score: number;
  away_score: number;
  points_earned: number | null;
}

export default function CuentaPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [preds, setPreds] = useState<PredVM[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{ user: PublicUser }>("/auth/me"),
      apiGet<{ predictions: PredVM[]; total_points: number }>(
        "/predictions/me"
      ),
    ])
      .then(([u, p]) => {
        setUser(u.user);
        setPreds(p.predictions);
        setTotal(p.total_points);
      })
      .catch((e) => {
        if (String(e.message).includes("401")) router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="text-slate-400">Cargando…</p>;

  return (
    <div className="space-y-5">
      <div className="card flex items-center justify-between p-4">
        <div>
          <h1 className="text-lg font-bold">{user?.username}</h1>
          <p className="text-sm text-slate-400">{user?.email}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-pitch">{total}</div>
          <div className="text-xs text-slate-400">puntos totales</div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Mis pronósticos
        </h2>
        {preds.length === 0 ? (
          <p className="text-sm text-slate-400">
            Todavía no hiciste ningún pronóstico.
          </p>
        ) : (
          <div className="card divide-y divide-slate-100">
            {preds.map((p) => (
              <div
                key={p.match_id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {p.home_team} vs {p.away_team}
                  </div>
                  <div className="text-xs text-slate-400">
                    Pronóstico: {p.home_score}-{p.away_score}
                    {p.result && p.result.home_score != null && (
                      <>
                        {" · "}Resultado: {p.result.home_score}-
                        {p.result.away_score}
                      </>
                    )}
                  </div>
                </div>
                {p.status === "finished" && (
                  <ScoreBadge points={p.points_earned} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
