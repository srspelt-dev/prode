import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Db } from "mongodb";
import { getDb, ensureIndexes } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import {
  SPECIAL_QUESTIONS,
  SPECIAL_COMPETITION,
  scoreSpecial,
} from "@/lib/special";
import { MatchDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

const COMP = SPECIAL_COMPETITION;

// Deadline: si el admin fijó uno en special_config, se usa ese; si no, el
// kickoff del primer partido de la competición.
async function getDeadline(db: Db): Promise<Date | null> {
  const cfg = await db
    .collection("special_config")
    .findOne({ competition: COMP });
  if (cfg?.deadline) return new Date(cfg.deadline);

  const first = await db
    .collection<MatchDoc>("matches")
    .find({ competition: COMP })
    .sort({ kickoff_at: 1 })
    .limit(1)
    .toArray();
  return first[0]?.kickoff_at ?? null;
}

// GET /api/special  → preguntas, equipos, mis respuestas, deadline, resultados.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const db = await getDb();

  const matches = await db
    .collection<MatchDoc>("matches")
    .find({ competition: COMP })
    .toArray();
  const teamSet = new Set<string>();
  for (const m of matches) {
    if (m.home_team && m.home_team !== "Por definir") teamSet.add(m.home_team);
    if (m.away_team && m.away_team !== "Por definir") teamSet.add(m.away_team);
  }
  const teams = Array.from(teamSet).sort();

  const deadline = await getDeadline(db);
  const locked = deadline ? Date.now() >= new Date(deadline).getTime() : false;

  const mine = await db
    .collection("special_predictions")
    .findOne({ user_id: new ObjectId(user.id), competition: COMP });

  const resultDoc = await db
    .collection("special_results")
    .findOne({ competition: COMP });

  return NextResponse.json({
    questions: SPECIAL_QUESTIONS,
    teams,
    deadline,
    locked,
    my_answers: mine?.answers ?? {},
    results: resultDoc?.answers ?? null,
    my_points: resultDoc?.answers
      ? scoreSpecial(mine?.answers, resultDoc.answers)
      : null,
    is_admin: user.is_admin,
  });
}

// POST /api/special  → guardar mis respuestas (si no cerró el plazo).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const db = await getDb();

  const deadline = await getDeadline(db);
  if (deadline && Date.now() >= new Date(deadline).getTime()) {
    return NextResponse.json(
      { error: "El plazo para los pronósticos especiales ya cerró" },
      { status: 422 }
    );
  }

  const { answers } = await req.json();
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "Respuestas inválidas" }, { status: 400 });
  }
  // Quedarnos solo con las keys válidas
  const clean: Record<string, string> = {};
  for (const q of SPECIAL_QUESTIONS) {
    if (answers[q.key]) clean[q.key] = String(answers[q.key]).trim();
  }

  await ensureIndexes();
  await db.collection("special_predictions").updateOne(
    { user_id: new ObjectId(user.id), competition: COMP },
    {
      $set: { answers: clean, updated_at: new Date() },
      $setOnInsert: { user_id: new ObjectId(user.id), competition: COMP },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, answers: clean });
}
