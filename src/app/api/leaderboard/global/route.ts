import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { computeLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

// GET /api/leaderboard/global  → ranking global del torneo.
export async function GET() {
  // El ranking global cuenta solo el Mundial (los amistosos suman únicamente
  // dentro de su propia liga de Amistosos).
  const db = await getDb();
  const rows = await computeLeaderboard(db, { competition: "mundial" });
  return NextResponse.json({ leaderboard: rows });
}
