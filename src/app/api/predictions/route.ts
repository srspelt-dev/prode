import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { MatchDoc, PredictionDoc } from "@/lib/types";

// POST /api/predictions  → crea o actualiza un pronóstico (idempotente, upsert).
// Body: { match_id, home_score, away_score }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { match_id, home_score, away_score } = await req.json();

  if (!match_id || !ObjectId.isValid(match_id)) {
    return NextResponse.json({ error: "match_id inválido" }, { status: 400 });
  }
  if (
    typeof home_score !== "number" ||
    typeof away_score !== "number" ||
    home_score < 0 ||
    away_score < 0 ||
    home_score > 99 ||
    away_score > 99
  ) {
    return NextResponse.json(
      { error: "Marcador inválido" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const matchOid = new ObjectId(match_id);
  const match = await db
    .collection<MatchDoc>("matches")
    .findOne({ _id: matchOid });

  if (!match) {
    return NextResponse.json(
      { error: "Partido no encontrado" },
      { status: 404 }
    );
  }

  // Validar deadline (5 min antes del kickoff)
  if (new Date(match.deadline_at).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "El plazo para pronosticar este partido ya cerró" },
      { status: 422 }
    );
  }

  const userOid = new ObjectId(user.id);
  await db.collection<PredictionDoc>("predictions").updateOne(
    { user_id: userOid, match_id: matchOid },
    {
      $set: {
        home_score,
        away_score,
        submitted_at: new Date(),
        points_earned: null,
      },
      $setOnInsert: { user_id: userOid, match_id: matchOid },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, home_score, away_score });
}
