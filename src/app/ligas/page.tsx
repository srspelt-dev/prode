"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api-client";

interface LeagueVM {
  id: string;
  name: string;
  code: string;
  members_count: number;
  is_owner: boolean;
}

export default function LigasPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [msg, setMsg] = useState("");

  function load() {
    apiGet<{ leagues: LeagueVM[] }>("/leagues")
      .then((d) => setLeagues(d.leagues))
      .catch((e) => {
        if (String(e.message).includes("401")) router.replace("/");
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [router]);

  async function create() {
    setMsg("");
    try {
      const { league } = await apiPost("/leagues", { name: newName });
      setMsg(`Liga creada. Código: ${league.code}`);
      setNewName("");
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function join() {
    setMsg("");
    try {
      await apiPost("/leagues/join", { code: joinCode });
      setJoinCode("");
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Ligas privadas</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card space-y-2 p-4">
          <h2 className="font-semibold">Crear una liga</h2>
          <input
            className="input"
            placeholder="Nombre (ej: Liga de la oficina)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn-primary w-full" onClick={create}>
            Crear
          </button>
        </div>

        <div className="card space-y-2 p-4">
          <h2 className="font-semibold">Unirse con código</h2>
          <input
            className="input uppercase"
            placeholder="ABC123"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button className="btn-ghost w-full" onClick={join}>
            Unirme
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-pitch">{msg}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Mis ligas
        </h2>
        {loading ? (
          <p className="text-slate-400">Cargando…</p>
        ) : leagues.length === 0 ? (
          <p className="text-sm text-slate-400">
            Todavía no estás en ninguna liga.
          </p>
        ) : (
          <div className="space-y-2">
            {leagues.map((l) => (
              <Link
                key={l.id}
                href={`/ligas/${l.id}`}
                className="card flex items-center justify-between p-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-slate-400">
                    {l.members_count} miembros · código{" "}
                    <span className="font-mono">{l.code}</span>
                  </div>
                </div>
                <span className="text-pitch">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
