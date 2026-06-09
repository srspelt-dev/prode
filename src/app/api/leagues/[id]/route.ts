import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { computeLeaderboard } from "@/lib/leaderboard";
import { LeagueDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/leagues/:id  → info de la liga + su tabla de posiciones.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const db = await getDb();
  const league = await db
    .collection<LeagueDoc>("leagues")
    .findOne({ _id: new ObjectId(params.id) });

  if (!league) {
    return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
  }

  const isMember = league.members.some((m) => m.toString() === user.id);
  if (!isMember) {
    return NextResponse.json(
      { error: "No sos miembro de esta liga" },
      { status: 403 }
    );
  }

  const competition = league.competition ?? "mundial";
  const leaderboard = await computeLeaderboard(db, {
    userIds: league.members,
    competition,
  });

  return NextResponse.json({
    league: {
      id: league._id!.toString(),
      name: league.name,
      code: league.code,
      competition,
      members_count: league.members.length,
      is_owner: league.owner_id.toString() === user.id,
    },
    leaderboard,
  });
}
