"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import Leaderboard from "@/components/Leaderboard";
import JoinLeagueBanner from "@/components/JoinLeagueBanner";
import GroupStandings from "@/components/GroupStandings";
import type { LeaderboardRow, PublicUser } from "@/lib/types";

export default function TablaPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"prode" | "grupos">("prode");

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
      <div className="flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
        {(
          [
            ["prode", "Ranking del prode"],
            ["grupos", "Grupos del Mundial"],
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
          <JoinLeagueBanner />
          <Leaderboard rows={rows} highlightUserId={me?.id} />
          <p className="text-center text-xs text-slate-400">
            ¿Querés competir solo con tu grupo?{" "}
            <a href="/ligas" className="text-pitch underline">
              Creá o unite a una liga
            </a>
            .
          </p>
        </>
      ) : (
        <GroupStandings />
      )}
    </div>
  );
}
