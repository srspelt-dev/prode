import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { LeagueDoc } from "@/lib/types";

// POST /api/leagues/join  → unirse a una liga con código. Body: { code }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Falta el código" }, { status: 400 });
  }

  const db = await getDb();
  const league = await db
    .collection<LeagueDoc>("leagues")
    .findOne({ code: String(code).toUpperCase().trim() });

  if (!league) {
    return NextResponse.json(
      { error: "No existe una liga con ese código" },
      { status: 404 }
    );
  }

  await db
    .collection<LeagueDoc>("leagues")
    .updateOne(
      { _id: league._id },
      { $addToSet: { members: new ObjectId(user.id) } }
    );

  return NextResponse.json({
    league: { id: league._id!.toString(), name: league.name },
  });
}
