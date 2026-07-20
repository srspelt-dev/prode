"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import Leaderboard from "@/components/Leaderboard";
import JoinLeagueBanner from "@/components/JoinLeagueBanner";
import GroupStandings from "@/components/GroupStandings";
import KnockoutBracket from "@/components/KnockoutBracket";
import Scorers from "@/components/Scorers";
import FinalHero from "@/components/FinalHero";
import type { LeaderboardRow, PublicUser } from "@/lib/types";

export default function TablaPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "prode" | "grupos" | "llaves" | "goleadores"
  >("prode");

  useEffect(() => {
    Promise.all([
      apiGet<{ leaderboard: LeaderboardRow[] }>("/leaderboard/global"),
      apiGet<{ user: PublicUser }>("/auth/me").catch(() => ({ user: null })),
    ])
      .then(([lb, u]) => {
        setRows(lb.leaderboard);
        setMe((u as any).user);
      })
      .catch((e) => {
        if (String(e.message).includes("401")) router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <div className="space-y-4">
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-64 w-full" />
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Tabla</h1>

      {/* Sub-tabs */}
      <div className="flex rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-800">
        {(
          [
            ["prode", "Ranking"],
            ["grupos", "Grupos"],
            ["llaves", "Llaves"],
            ["goleadores", "Goles"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              tab === k
                ? "bg-white shadow-sm dark:bg-slate-700"
                : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "prode" ? (
        <>
          <FinalHero
            winnerName={rows[0]?.username}
            winnerPoints={rows[0]?.total_points}
          />
          <JoinLeagueBanner />
          <Leaderboard rows={rows} highlightUserId={me?.id} />
          <p className="text-center text-xs text-slate-400">
            El ranking global suma solo los puntos del Mundial.{" "}
            <a href="/ligas" className="text-pitch underline">
              Creá o unite a una liga
            </a>
            .
          </p>
        </>
      ) : tab === "grupos" ? (
        <GroupStandings />
      ) : tab === "llaves" ? (
        <KnockoutBracket />
      ) : (
        <Scorers />
      )}
    </div>
  );
}
