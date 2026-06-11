import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { MatchDoc, PredictionDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/predictions/pending  → cuántos partidos abiertos te faltan pronosticar.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const db = await getDb();
  const now = new Date();

  // Partidos abiertos (deadline futuro, no terminados)
  const openMatches = await db
    .collection<MatchDoc>("matches")
    .find({ status: "upcoming", deadline_at: { $gt: now } })
    .project({ _id: 1 })
    .toArray();
  const openIds = openMatches.map((m: any) => m._id.toString());

  if (openIds.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const predicted = await db
    .collection<PredictionDoc>("predictions")
    .find({ user_id: new ObjectId(user.id) })
    .project({ match_id: 1 })
    .toArray();
  const predictedSet = new Set(predicted.map((p: any) => p.match_id.toString()));

  const count = openIds.filter((id) => !predictedSet.has(id)).length;
  return NextResponse.json({ count });
}
