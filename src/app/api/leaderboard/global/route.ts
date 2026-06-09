import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { computeLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

// GET /api/leaderboard/global  → ranking global del torneo.
export async function GET() {
  const db = await getDb();
  const rows = await computeLeaderboard(db);
  return NextResponse.json({ leaderboard: rows });
}
