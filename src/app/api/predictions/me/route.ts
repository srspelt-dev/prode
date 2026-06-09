import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { MatchDoc, PredictionDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/predictions/me  → mis pronósticos con datos del partido.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const db = await getDb();
  const preds = await db
    .collection<PredictionDoc>("predictions")
    .find({ user_id: new ObjectId(user.id) })
    .sort({ submitted_at: -1 })
    .toArray();

  const matchIds = preds.map((p) => p.match_id);
  const matches = await db
    .collection<MatchDoc>("matches")
    .find({ _id: { $in: matchIds } })
    .toArray();
  const matchById = new Map(matches.map((m) => [m._id!.toString(), m]));

  const data = preds.map((p) => {
    const m = matchById.get(p.match_id.toString());
    return {
      match_id: p.match_id.toString(),
      home_team: m?.home_team ?? "?",
      away_team: m?.away_team ?? "?",
      kickoff_at: m?.kickoff_at ?? null,
      status: m?.status ?? "upcoming",
      result: m?.result ?? null,
      home_score: p.home_score,
      away_score: p.away_score,
      points_earned: p.points_earned,
    };
  });

  const total = data.reduce((s, d) => s + (d.points_earned ?? 0), 0);
  return NextResponse.json({ predictions: data, total_points: total });
}
