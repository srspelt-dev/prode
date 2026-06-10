import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { LeagueDoc, MatchDoc, PredictionDoc, UserDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/predictions/:matchId  → pronósticos del partido, SEPARADOS por cada
// liga del usuario (de la competición de ese partido). Modo espectador.
// Visible solo tras cerrar el deadline.
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

  // Ligas del usuario en la misma competición que el partido
  const leagues = await db
    .collection<LeagueDoc>("leagues")
    .find({ members: userOid, competition })
    .toArray();

  if (leagues.length === 0) {
    return NextResponse.json({ groups: [], has_league: false });
  }

  // Todos los miembros involucrados (para traer predicciones y nombres de una)
  const allMemberIds = new Map<string, ObjectId>();
  for (const lg of leagues) {
    for (const m of lg.members) allMemberIds.set(m.toString(), m);
  }
  const memberList = Array.from(allMemberIds.values());

  const preds = await db
    .collection<PredictionDoc>("predictions")
    .find({ match_id: matchOid, user_id: { $in: memberList } })
    .toArray();
  const predByUser = new Map(preds.map((p) => [p.user_id.toString(), p]));

  const users = await db
    .collection<UserDoc>("users")
    .find({ _id: { $in: memberList } })
    .toArray();
  const nameById = new Map(users.map((u) => [u._id!.toString(), u.username]));

  // Una sección por liga, con los pronósticos de sus miembros
  const groups = leagues.map((lg) => {
    const predictions = lg.members
      .map((m) => {
        const p = predByUser.get(m.toString());
        if (!p) return null;
        return {
          username: nameById.get(m.toString()) ?? "?",
          home_score: p.home_score,
          away_score: p.away_score,
          points_earned: p.points_earned,
        };
      })
      .filter(Boolean)
      .sort(
        (a: any, b: any) => (b.points_earned ?? 0) - (a.points_earned ?? 0)
      );
    return {
      league_id: lg._id!.toString(),
      league_name: lg.name,
      predictions,
    };
  });

  return NextResponse.json({ groups, has_league: true });
}
