"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Destino tras autenticarse: si hay invitación pendiente, ir a unirse.
  function nextDestination(): string {
    if (typeof window !== "undefined") {
      const code = localStorage.getItem("pending_join");
      if (code) {
        localStorage.removeItem("pending_join");
        return `/unirse/${code}`;
      }
    }
    return "/partidos";
  }

  // Si ya está logueado, seguir (a la invitación pendiente o a partidos)
  useEffect(() => {
    apiGet("/auth/me")
      .then(() => router.replace(nextDestination()))
      .catch(() => {});
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await apiPost("/auth/register", { username, email, password });
      } else {
        await apiPost("/auth/login", { email, password });
      }
      router.push(nextDestination());
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="mb-6 text-center">
        <div className="text-5xl">🏆</div>
        <h1 className="mt-2 text-2xl font-bold">Prode Mundial 2026</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pronosticá los partidos y competí con tus amigos
        </p>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`flex-1 rounded-md py-1.5 font-medium ${
                mode === m ? "bg-white shadow-sm" : "text-slate-500"
              }`}
            >
              {m === "login" ? "Ingresar" : "Crear cuenta"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <input
              className="input"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading
              ? "..."
              : mode === "login"
                ? "Ingresar"
                : "Crear cuenta"}
          </button>
        </form>
      </div>

      {/* Beneficios */}
      <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
        <div className="card p-3">
          <div className="text-xl">⚽</div>
          <div className="mt-1">Pronosticá cada partido</div>
        </div>
        <div className="card p-3">
          <div className="text-xl">👥</div>
          <div className="mt-1">Ligas con amigos</div>
        </div>
        <div className="card p-3">
          <div className="text-xl">🏆</div>
          <div className="mt-1">Tabla en vivo</div>
        </div>
      </div>
    </div>
  );
}
