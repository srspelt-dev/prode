import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { LeagueDoc, MatchDoc, PredictionDoc, UserDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/predictions/:matchId  → pronósticos para un partido, pero SOLO de
// tus "pares": los miembros de tus ligas de la competición de ese partido.
// Visible únicamente tras cerrar el deadline (modo espectador).
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

  const userOid = new ObjectId(user.id);
  const competition = match.competition ?? "mundial";

  // Ligas del usuario en la MISMA competición que el partido
  const leagues = await db
    .collection<LeagueDoc>("leagues")
    .find({ members: userOid, competition })
    .toArray();

  // Conjunto de "pares": todos los miembros de esas ligas (+ uno mismo)
  const peerIds = new Map<string, ObjectId>();
  peerIds.set(user.id, userOid);
  for (const lg of leagues) {
    for (const m of lg.members) peerIds.set(m.toString(), m);
  }
  const peerList = Array.from(peerIds.values());

  const preds = await db
    .collection<PredictionDoc>("predictions")
    .find({ match_id: matchOid, user_id: { $in: peerList } })
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

  return NextResponse.json({
    predictions: data,
    has_league: leagues.length > 0,
  });
}
