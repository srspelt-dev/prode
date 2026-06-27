"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Check, Crosshair, Flame, type LucideIcon } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api-client";
import ScoreBadge from "@/components/ScoreBadge";
import Avatar from "@/components/Avatar";
import PushToggle from "@/components/PushToggle";
import PointsChart from "@/components/PointsChart";
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

  const stats = computeStats(preds);

  return (
    <div className="space-y-5">
      <div className="card flex items-center gap-4 p-4">
        <Avatar name={user?.username ?? "?"} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{user?.username}</h1>
          <p className="truncate text-sm text-slate-400">{user?.email}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-pitch dark:text-pitch-light">
            {total}
          </div>
          <div className="text-xs text-slate-400">puntos</div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Precisión" value={`${stats.precision}%`} icon={Target} />
        <Stat
          label="Aciertos"
          value={`${stats.aciertos}/${stats.finished}`}
          icon={Check}
        />
        <Stat label="Exactos" value={stats.exactos} icon={Crosshair} />
        <Stat label="Racha" value={stats.racha} icon={Flame} />
      </div>

      {/* Evolución de puntos */}
      <PointsChart preds={preds} />

      {/* Recordatorios push */}
      <PushToggle />

      <ChangePassword />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Mis pronósticos
        </h2>
        {preds.length === 0 ? (
          <p className="text-sm text-slate-400">
            Todavía no hiciste ningún pronóstico.
          </p>
        ) : (
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
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

function computeStats(preds: PredVM[]) {
  const finished = preds.filter(
    (p) => p.status === "finished" && p.points_earned != null
  );
  const aciertos = finished.filter((p) => (p.points_earned ?? 0) > 0).length;
  const exactos = finished.filter((p) => p.points_earned === 6).length;
  const precision = finished.length
    ? Math.round((aciertos / finished.length) * 100)
    : 0;

  // Racha: aciertos consecutivos más recientes (orden cronológico por kickoff)
  const chrono = [...finished].sort(
    (a, b) =>
      new Date(a.kickoff_at ?? 0).getTime() -
      new Date(b.kickoff_at ?? 0).getTime()
  );
  let racha = 0;
  for (let i = chrono.length - 1; i >= 0; i--) {
    if ((chrono[i].points_earned ?? 0) > 0) racha++;
    else break;
  }

  return { precision, aciertos, finished: finished.length, exactos, racha };
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="card p-3 text-center">
      <Icon size={20} className="mx-auto text-pitch" />
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}

function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setSaving(true);
    try {
      await apiPost("/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      setMsg("Contraseña actualizada");
      setCurrent("");
      setNext("");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        Cambiar contraseña {open ? "▲" : "▼"}
      </button>
      {open && (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <input
            className="input"
            type="password"
            placeholder="Contraseña actual"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Nueva contraseña (mín. 6)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-pitch">{msg}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "..." : "Actualizar contraseña"}
          </button>
        </form>
      )}
    </section>
  );
}
