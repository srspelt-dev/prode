"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import Avatar from "./Avatar";

interface TournamentInfo {
  finished: boolean;
  champion: { name: string; logo: string | null } | null;
  runner_up: { name: string; logo: string | null } | null;
}

export default function FinalHero({
  winnerName,
  winnerPoints,
}: {
  winnerName?: string;
  winnerPoints?: number;
}) {
  const [info, setInfo] = useState<TournamentInfo | null>(null);

  useEffect(() => {
    apiGet<TournamentInfo>("/tournament")
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  useEffect(() => {
    if (!info?.finished) return;
    let done = false;
    try {
      done = localStorage.getItem("final_celebrated") === "1";
    } catch {}
    if (!done) {
      import("canvas-confetti").then(({ default: confetti }) => {
        const end = Date.now() + 1200;
        (function frame() {
          confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
          confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      });
      try {
        localStorage.setItem("final_celebrated", "1");
      } catch {}
    }
  }, [info?.finished]);

  if (!info?.finished) return null;

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-amber-500/20 to-violet-600/20 p-5 text-center">
        <Trophy size={40} className="mx-auto text-amber-400" strokeWidth={1.5} />
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Copa Mundial 2026 · Finalizada
        </div>

        {info.champion && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {info.champion.logo && (
              <img
                src={info.champion.logo}
                alt=""
                className="h-8 w-8 object-contain"
              />
            )}
            <div className="text-left">
              <div className="text-[11px] text-slate-400">Campeón del Mundial</div>
              <div className="text-lg font-bold">{info.champion.name}</div>
            </div>
          </div>
        )}
      </div>

      {winnerName && (
        <div className="flex items-center gap-3 border-t border-slate-100 p-4 dark:border-white/10">
          <Avatar name={winnerName} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-500">
              🏆 Ganador del prode
            </div>
            <div className="truncate font-bold">{winnerName}</div>
          </div>
          {winnerPoints != null && (
            <div className="text-right">
              <div className="text-xl font-bold text-pitch dark:text-pitch-light">
                {winnerPoints}
              </div>
              <div className="text-[11px] text-slate-400">puntos</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
