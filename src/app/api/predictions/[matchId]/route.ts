import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { MatchDoc, PredictionDoc, UserDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/predictions/:matchId  → pronósticos de TODOS para un partido.
// Solo visible una vez cerrado el deadline (modo espectador), para no espiar.
export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!ObjectId.isValid(params.matchId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const db = await getDb();
  const matchOid = new ObjectId(params.matchId);
  const match = await db
    .collection<MatchDoc>("matches")
    .findOne({ _id: matchOid });
  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  if (new Date(match.deadline_at).getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Los pronósticos se revelan al cerrar el plazo" },
      { status: 403 }
    );
  }

  const preds = await db
    .collection<PredictionDoc>("predictions")
    .find({ match_id: matchOid })
    .toArray();

  const users = await db
    .collection<UserDoc>("users")
    .find({ _id: { $in: preds.map((p) => p.user_id) } })
    .toArray();
  const nameById = new Map(users.map((u) => [u._id!.toString(), u.username]));

  const data = preds
    .map((p) => ({
      username: nameById.get(p.user_id.toString()) ?? "?",
      home_score: p.home_score,
      away_score: p.away_score,
      points_earned: p.points_earned,
    }))
    .sort((a, b) => (b.points_earned ?? 0) - (a.points_earned ?? 0));

  return NextResponse.json({ predictions: data });
}
