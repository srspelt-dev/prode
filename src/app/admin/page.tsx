"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import type { MatchVM } from "@/components/MatchCard";
import type { PublicUser } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  function load() {
    apiGet<{ matches: MatchVM[] }>("/matches")
      .then((d) => setMatches(d.matches))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    apiGet<{ user: PublicUser }>("/auth/me")
      .then((d) => {
        if (!d.user?.is_admin) router.replace("/partidos");
        else load();
      })
      .catch(() => router.replace("/"));
  }, [router]);

  async function forceSync(mode: "all" | "live") {
    setSyncing(true);
    setMsg("");
    try {
      const r = await apiPost("/matches/sync", { mode });
      setMsg(`Sync (${mode}): ${r.synced} partidos`);
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Panel de admin</h1>
        <div className="flex gap-2">
          <button
            className="btn-ghost text-xs"
            onClick={() => forceSync("all")}
            disabled={syncing}
          >
            Sync fixture
          </button>
          <button
            className="btn-ghost text-xs"
            onClick={() => forceSync("live")}
            disabled={syncing}
          >
            Sync en vivo
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-pitch">{msg}</p>}

      {loading ? (
        <p className="text-slate-400">Cargando…</p>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <AdminMatchRow key={m.id} match={m} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminMatchRow({
  match,
  onSaved,
}: {
  match: MatchVM;
  onSaved: () => void;
}) {
  const [home, setHome] = useState(
    match.result?.home_score != null ? String(match.result.home_score) : ""
  );
  const [away, setAway] = useState(
    match.result?.away_score != null ? String(match.result.away_score) : ""
  );
  const [pen, setPen] = useState(match.result?.went_to_penalties ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiPut(`/matches/${match.id}/result`, {
        home_score: parseInt(home, 10),
        away_score: parseInt(away, 10),
        went_to_penalties: pen,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-center gap-2 p-3 text-sm">
      <div className="min-w-[180px] flex-1 font-medium">
        {match.home_team} vs {match.away_team}
        {match.status === "finished" && (
          <span className="ml-2 text-xs text-emerald-600">✓ cargado</span>
        )}
      </div>
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
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={pen}
          onChange={(e) => setPen(e.target.checked)}
        />
        Penales
      </label>
      <button
        className="btn-primary px-3 py-1.5 text-xs"
        onClick={save}
        disabled={saving || home === "" || away === ""}
      >
        {saving ? "..." : "Cargar"}
      </button>
    </div>
  );
}
