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
        <ShareLeague name={league.name} code={league.code} />
      </div>
      <Leaderboard rows={rows} highlightUserId={me?.id} />
    </div>
  );
}

function ShareLeague({ name, code }: { name: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function buildMessage(): string {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return (
      `⚽ ¡Te invito al Prode Mundial 2026!\n\n` +
      `Sumate a mi liga "${name}".\n` +
      `1) Entrá a ${origin}\n` +
      `2) Creá tu cuenta\n` +
      `3) En "Ligas" → "Unirse con código" poné: ${code}\n\n` +
      `¡A ver quién la pega más! 🏆`
    );
  }

  function shareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank");
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(buildMessage());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        onClick={shareWhatsApp}
        className="btn px-3 py-1.5 text-sm font-medium text-white"
        style={{ backgroundColor: "#25D366" }}
      >
        Compartir por WhatsApp
      </button>
      <button onClick={copyMessage} className="btn-ghost px-3 py-1.5 text-sm">
        {copied ? "¡Copiado!" : "Copiar invitación"}
      </button>
    </div>
  );
}
