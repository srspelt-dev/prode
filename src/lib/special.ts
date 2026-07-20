import { Db, ObjectId } from "mongodb";

// Pronósticos especiales (bonus) para el Mundial.
export interface SpecialQuestion {
  key: string;
  label: string;
  type: "team" | "text";
  points: number;
}

export const SPECIAL_QUESTIONS: SpecialQuestion[] = [
  { key: "campeon", label: "¿Quién sale campeón?", type: "team", points: 10 },
  { key: "finalista", label: "¿Quién es el otro finalista?", type: "team", points: 5 },
  { key: "goleador", label: "¿Quién es el goleador del torneo?", type: "text", points: 5 },
];

// Solo el Mundial tiene pronósticos especiales (por ahora).
export const SPECIAL_COMPETITION = "mundial";

function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

// Normaliza texto: sin acentos, minúsculas, sin espacios extra.
function normText(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Match flexible para respuestas de texto (goleador): tolera acentos, nombre de
// pila y variantes, comparando por apellido. Ej: "Mbappe" / "Kilian Mbappé" ✓.
function textMatch(answer: unknown, correct: unknown): boolean {
  const a = normText(answer);
  const c = normText(correct);
  if (!a || !c) return false;
  if (a === c) return true;
  const surname = c.split(/\s+/).pop() || "";
  if (surname.length >= 3 && a.includes(surname)) return true;
  const aSurname = a.split(/\s+/).pop() || "";
  return aSurname.length >= 3 && c.includes(aSurname);
}

// Puntos especiales de un set de respuestas contra el resultado correcto.
export function scoreSpecial(
  answers: Record<string, string> | undefined,
  results: Record<string, string> | undefined
): number {
  if (!answers || !results) return 0;
  let pts = 0;
  for (const q of SPECIAL_QUESTIONS) {
    if (!results[q.key]) continue;

    let ok: boolean;
    if (q.key === "finalista") {
      // El subcampeón cuenta si lo nombraste como finalista O como campeón
      // (le acertaste a que llegaba a la final, aunque erraras quién gana).
      const sub = results.finalista;
      ok =
        norm(answers.finalista) === norm(sub) ||
        norm(answers.campeon) === norm(sub);
    } else if (q.type === "text") {
      ok = textMatch(answers[q.key], results[q.key]);
    } else {
      ok = norm(answers[q.key]) === norm(results[q.key]);
    }

    if (ok) pts += q.points;
  }
  return pts;
}

// Mapa user_id(string) -> puntos especiales.
export async function computeSpecialPoints(
  db: Db,
  opts: { userIds?: ObjectId[]; competition?: string } = {}
): Promise<Map<string, number>> {
  const { userIds, competition } = opts;
  const map = new Map<string, number>();

  // Resultados por competición
  const resultQuery: Record<string, unknown> = {};
  if (competition) resultQuery.competition = competition;
  const results = await db
    .collection("special_results")
    .find(resultQuery)
    .toArray();
  if (results.length === 0) return map;
  const resultByComp = new Map(
    results.map((r: any) => [r.competition, r.answers])
  );

  const predQuery: Record<string, unknown> = {};
  if (competition) predQuery.competition = competition;
  if (userIds) predQuery.user_id = { $in: userIds };
  const preds = await db
    .collection("special_predictions")
    .find(predQuery)
    .toArray();

  for (const p of preds as any[]) {
    const res = resultByComp.get(p.competition);
    const pts = scoreSpecial(p.answers, res);
    if (pts > 0) {
      const id = p.user_id.toString();
      map.set(id, (map.get(id) ?? 0) + pts);
    }
  }
  return map;
}
