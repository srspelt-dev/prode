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

// Puntos especiales de un set de respuestas contra el resultado correcto.
export function scoreSpecial(
  answers: Record<string, string> | undefined,
  results: Record<string, string> | undefined
): number {
  if (!answers || !results) return 0;
  let pts = 0;
  for (const q of SPECIAL_QUESTIONS) {
    if (results[q.key] && norm(answers[q.key]) === norm(results[q.key])) {
      pts += q.points;
    }
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
