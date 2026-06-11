"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import type { MatchVM } from "@/components/MatchCard";
import { COMPETITIONS, competitionLabel, type PublicUser } from "@/lib/types";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  predictions_count: number;
  total_points: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchVM[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  function load() {
    apiGet<{ matches: MatchVM[] }>("/matches")
      .then((d) => setMatches(d.matches))
      .finally(() => setLoading(false));
    apiGet<{ users: AdminUser[] }>("/admin/users")
      .then((d) => setUsers(d.users))
      .catch(() => {});
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

      {/* Crear partido a mano (amistosos, etc.) */}
      <CreateMatch onCreated={load} />

      {/* Resultados de pronósticos especiales */}
      <SpecialResults />

      {/* Usuarios registrados */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Usuarios registrados ({users.length})
        </h2>
        {users.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no hay usuarios.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2 text-center">Pronós.</th>
                  <th className="px-3 py-2 text-right">Puntos</th>
                  <th className="px-3 py-2 text-right">Alta</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">
                      {u.username}
                      {u.is_admin && (
                        <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
                          admin
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{u.email}</td>
                    <td className="px-3 py-2 text-center text-slate-500">
                      {u.predictions_count}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-pitch">
                      {u.total_points}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-slate-400">
                      {new Intl.DateTimeFormat("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                      }).format(new Date(u.created_at))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ResetPassword userId={u.id} username={u.username} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cargar resultados */}
      <ResultsSection matches={matches} loading={loading} onSaved={load} />
    </div>
  );
}

// Categoriza un partido: 0 = falta resultado, 1 = por jugarse, 2 = ya cargado
function matchCategory(m: MatchVM): 0 | 1 | 2 {
  if (m.status === "finished") return 2;
  if (new Date(m.kickoff_at).getTime() < Date.now()) return 0; // ya se jugó, sin resultado
  return 1;
}

function ResultsSection({
  matches,
  loading,
  onSaved,
}: {
  matches: MatchVM[];
  loading: boolean;
  onSaved: () => void;
}) {
  const [filter, setFilter] = useState<"pendientes" | "amistosos" | "todos">(
    "pendientes"
  );

  const pendingCount = matches.filter((m) => matchCategory(m) === 0).length;

  // Orden general: pendientes → próximos → cargados; dentro, lógica por categoría
  function ordered(list: MatchVM[]): MatchVM[] {
    return [...list].sort((a, b) => {
      const ca = matchCategory(a);
      const cb = matchCategory(b);
      if (ca !== cb) return ca - cb;
      const ka = new Date(a.kickoff_at).getTime();
      const kb = new Date(b.kickoff_at).getTime();
      // pendientes: más viejo primero (lo que más urge); resto: según corresponda
      if (ca === 0) return ka - kb;
      if (ca === 1) return ka - kb; // próximos: el más cercano primero
      return kb - ka; // cargados: el más reciente primero
    });
  }

  let list: MatchVM[];
  if (filter === "pendientes") list = matches.filter((m) => matchCategory(m) === 0);
  else if (filter === "amistosos") list = matches.filter((m) => m.is_manual);
  else list = matches;
  list = ordered(list);

  const TABS: { k: typeof filter; label: string }[] = [
    { k: "pendientes", label: `Pendientes${pendingCount ? ` (${pendingCount})` : ""}` },
    { k: "amistosos", label: "Amistosos" },
    { k: "todos", label: "Todos" },
  ];

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Cargar resultados
      </h2>

      <div className="flex rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setFilter(t.k)}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              filter === t.k
                ? "bg-white shadow-sm dark:bg-slate-700"
                : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400">Cargando…</p>
      ) : list.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">
          {filter === "pendientes"
            ? "No hay resultados pendientes 🎉"
            : "No hay partidos."}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((m) => (
            <AdminMatchRow key={m.id} match={m} onSaved={onSaved} />
          ))}
        </div>
      )}
    </section>
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

  async function remove() {
    if (
      !window.confirm(
        `¿Borrar ${match.home_team} vs ${match.away_team}? Se eliminan también sus pronósticos.`
      )
    )
      return;
    await apiDelete(`/matches/${match.id}`);
    onSaved();
  }

  const started = new Date(match.kickoff_at).getTime() < Date.now();
  const needsResult = match.status !== "finished" && started;
  const overdue =
    needsResult &&
    Date.now() - new Date(match.kickoff_at).getTime() > 6 * 3600 * 1000;

  return (
    <div
      className={`card flex flex-wrap items-center gap-2 p-3 text-sm ${
        needsResult ? "ring-1 ring-amber-300 dark:ring-amber-700/60" : ""
      }`}
    >
      <div className="min-w-[180px] flex-1 font-medium">
        {match.home_team} vs {match.away_team}
        {match.competition && (
          <span className="ml-2 rounded bg-slate-100 px-1 text-[10px] text-slate-500 dark:bg-slate-800">
            {competitionLabel(match.competition)}
          </span>
        )}
        {match.status === "finished" && (
          <span className="ml-2 text-xs text-emerald-600">✓ cargado</span>
        )}
        {needsResult && (
          <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            {overdue ? "⚠ falta resultado" : "⏳ falta resultado"}
          </span>
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
      {match.is_manual && (
        <button
          className="px-2 text-xs text-red-400 hover:text-red-600"
          onClick={remove}
          title="Borrar partido manual"
        >
          🗑
        </button>
      )}
    </div>
  );
}

function SpecialResults() {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<
    { key: string; label: string; type: string; points: number }[]
  >([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open || questions.length) return;
    apiGet<{
      questions: any[];
      teams: string[];
      results: Record<string, string> | null;
    }>("/special").then((d) => {
      setQuestions(d.questions);
      setTeams(d.teams);
      setAnswers(d.results || {});
    });
  }, [open, questions.length]);

  async function save() {
    setMsg("");
    try {
      await apiPost("/special/result", { answers });
      setMsg("Resultados guardados. Se recalculan los puntos especiales.");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <section className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        Resultados especiales (campeón, goleador…) {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="card space-y-3 p-4">
          {questions.map((q) => (
            <div key={q.key}>
              <label className="text-xs text-slate-500">{q.label}</label>
              {q.type === "team" ? (
                <select
                  className="input mt-1"
                  value={answers[q.key] || ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.key]: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input mt-1"
                  value={answers[q.key] || ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.key]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
          {msg && <p className="text-sm text-pitch">{msg}</p>}
          <button className="btn-primary" onClick={save}>
            Guardar resultados
          </button>
        </div>
      )}
    </section>
  );
}

function CreateMatch({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [datetime, setDatetime] = useState("");
  const [competition, setCompetition] = useState("amistosos");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!home || !away || !datetime) {
      setMsg("Completá equipos y fecha/hora");
      return;
    }
    setSaving(true);
    try {
      // El input datetime-local viene en hora local → lo convertimos a ISO (UTC)
      await apiPost("/matches", {
        home_team: home,
        away_team: away,
        kickoff_at: new Date(datetime).toISOString(),
        competition,
        phase: competition === "mundial" ? "grupos" : "amistoso",
      });
      setMsg("¡Partido creado!");
      setHome("");
      setAway("");
      setDatetime("");
      onCreated();
    } catch (e: any) {
      setMsg(e.message);
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
        Crear partido a mano (amistoso) {open ? "▲" : "▼"}
      </button>
      {open && (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Local (ej: Argentina)"
              value={home}
              onChange={(e) => setHome(e.target.value)}
            />
            <input
              className="input"
              placeholder="Visitante (ej: Brasil)"
              value={away}
              onChange={(e) => setAway(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex-1 text-xs text-slate-500">
              Fecha y hora
              <input
                type="datetime-local"
                className="input mt-1"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
              />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              Competición
              <select
                className="input mt-1"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
              >
                {COMPETITIONS.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {msg && <p className="text-sm text-pitch">{msg}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "..." : "Crear partido"}
          </button>
        </form>
      )}
    </section>
  );
}

function ResetPassword({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function reset() {
    const pwd = window.prompt(
      `Nueva contraseña para ${username} (mín. 6 caracteres):`
    );
    if (!pwd) return;
    if (pwd.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/admin/users/${userId}/reset-password`, {
        new_password: pwd,
      });
      setDone(true);
      alert(`Listo. La nueva contraseña de ${username} es: ${pwd}`);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={reset}
      disabled={busy}
      className="text-xs text-slate-400 hover:text-pitch"
      title="Resetear contraseña"
    >
      {busy ? "..." : done ? "✓" : "🔑"}
    </button>
  );
}
