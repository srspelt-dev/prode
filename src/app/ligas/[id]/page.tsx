"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import Leaderboard from "@/components/Leaderboard";
import type { LeaderboardRow, PublicUser } from "@/lib/types";

interface LeagueInfo {
  id: string;
  name: string;
  code: string;
  members_count: number;
  is_owner: boolean;
}

export default function LigaDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiGet<{ league: LeagueInfo; leaderboard: LeaderboardRow[] }>(
        `/leagues/${params.id}`
      ),
      apiGet<{ user: PublicUser }>("/auth/me").catch(() => ({ user: null })),
    ])
      .then(([d, u]) => {
        setLeague(d.league);
        setRows(d.leaderboard);
        setMe((u as any).user);
      })
      .catch((e) => {
        if (String(e.message).includes("401")) router.replace("/");
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <p className="text-slate-400">Cargando…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!league) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{league.name}</h1>
        <p className="text-sm text-slate-400">
          {league.members_count} miembros · Compartí el código{" "}
          <span className="font-mono font-semibold text-slate-600">
            {league.code}
          </span>{" "}
          para que se unan.
        </p>
      </div>
      <Leaderboard rows={rows} highlightUserId={me?.id} />
    </div>
  );
}
