"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface Question {
  key: string;
  label: string;
  type: "team" | "text";
  points: number;
}

interface SpecialData {
  questions: Question[];
  teams: string[];
  deadline: string | null;
  locked: boolean;
  my_answers: Record<string, string>;
  results: Record<string, string> | null;
  my_points: number | null;
}

export default function EspecialesPage() {
  const router = useRouter();
  const [data, setData] = useState<SpecialData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<SpecialData>("/special")
      .then((d) => {
        setData(d);
        setAnswers(d.my_answers || {});
      })
      .catch((e) => {
        if (String(e.message).includes("401")) router.replace("/");
      });
  }, [router]);

  async function save() {
    setSaving(true);
    try {
      await apiPost("/special", { answers });
      toast("Pronósticos especiales guardados");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (!data)
    return (
      <div className="space-y-4">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-40 w-full" />
      </div>
    );

  const deadlineTxt = data.deadline
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.deadline))
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold">
          <Award size={22} className="text-pitch" />
          Pronósticos especiales
        </h1>
        <p className="text-sm text-slate-400">
          Picks de bonus para todo el torneo.
          {data.locked
            ? " El plazo ya cerró."
            : deadlineTxt
              ? ` Editables hasta el ${deadlineTxt}.`
              : ""}
        </p>
      </div>

      {data.my_points != null && (
        <div className="card bg-pitch/5 p-4 text-center dark:bg-pitch/10">
          <div className="text-3xl font-bold text-pitch dark:text-pitch-light">
            +{data.my_points}
          </div>
          <div className="text-xs text-slate-400">puntos especiales sumados</div>
        </div>
      )}

      <div className="space-y-3">
        {data.questions.map((q) => {
          const correct = data.results?.[q.key];
          const mine = answers[q.key] || "";
          const acerto =
            correct && mine && correct.toLowerCase() === mine.toLowerCase();
          return (
            <div key={q.key} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="font-medium">{q.label}</label>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  +{q.points} pts
                </span>
              </div>

              {data.locked ? (
                <div className="text-sm">
                  <span className="text-slate-500">Tu respuesta: </span>
                  <strong>{mine || "—"}</strong>
                  {correct && (
                    <span
                      className={`ml-2 ${acerto ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {acerto ? "✓ acertaste" : `✗ (era ${correct})`}
                    </span>
                  )}
                </div>
              ) : q.type === "team" ? (
                <select
                  className="input"
                  value={mine}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.key]: e.target.value }))
                  }
                >
                  <option value="">Elegí un equipo…</option>
                  {data.teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  placeholder="Nombre del jugador"
                  value={mine}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.key]: e.target.value }))
                  }
                />
              )}
            </div>
          );
        })}
      </div>

      {!data.locked && (
        <button
          className="btn-primary w-full"
          onClick={save}
          disabled={saving}
        >
          {saving ? "..." : "Guardar pronósticos especiales"}
        </button>
      )}
    </div>
  );
}
