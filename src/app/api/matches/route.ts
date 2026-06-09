import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { MatchDoc, PredictionDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/matches  → lista de partidos (ordenados por kickoff).
// Si el usuario está logueado, incluye su pronóstico en cada partido.
export async function GET(req: NextRequest) {
  const db = await getDb();
  const matches = await db
    .collection<MatchDoc>("matches")
    .find({})
    .sort({ kickoff_at: 1 })
    .toArray();

  const user = await getCurrentUser(req);
  let predsByMatch = new Map<string, PredictionDoc>();
  if (user) {
    const preds = await db
      .collection<PredictionDoc>("predictions")
      .find({ user_id: new ObjectId(user.id) })
      .toArray();
    predsByMatch = new Map(preds.map((p) => [p.match_id.toString(), p]));
  }

  const now = Date.now();
  const data = matches.map((m) => {
    const id = m._id!.toString();
    const pred = predsByMatch.get(id);
    return {
      id,
      phase: m.phase,
      group: m.group,
      home_team: m.home_team,
      away_team: m.away_team,
      home_logo: m.home_logo,
      away_logo: m.away_logo,
      kickoff_at: m.kickoff_at,
      deadline_at: m.deadline_at,
      status: m.status,
      result: m.result,
      can_predict:
        m.status === "upcoming" && new Date(m.deadline_at).getTime() > now,
      my_prediction: pred
        ? {
            home_score: pred.home_score,
            away_score: pred.away_score,
            points_earned: pred.points_earned,
          }
        : null,
    };
  });

  return NextResponse.json({ matches: data });
}
