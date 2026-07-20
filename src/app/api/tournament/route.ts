import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { MatchDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/tournament  → estado del Mundial: si terminó y quién fue campeón.
export async function GET() {
  const db = await getDb();

  const total = await db
    .collection<MatchDoc>("matches")
    .countDocuments({ competition: "mundial" });
  const pending = await db
    .collection<MatchDoc>("matches")
    .countDocuments({ competition: "mundial", status: { $ne: "finished" } });

  const finalMatch = await db
    .collection<MatchDoc>("matches")
    .findOne({ competition: "mundial", phase: "final", status: "finished" });

  let champion = null;
  let runnerUp = null;
  if (finalMatch?.result) {
    const r = finalMatch.result;
    const homeWon =
      r.went_to_penalties && r.penalty_winner
        ? r.penalty_winner === "home"
        : (r.home_score ?? 0) > (r.away_score ?? 0);
    const home = { name: finalMatch.home_team, logo: finalMatch.home_logo };
    const away = { name: finalMatch.away_team, logo: finalMatch.away_logo };
    champion = homeWon ? home : away;
    runnerUp = homeWon ? away : home;
  }

  return NextResponse.json({
    finished: total > 0 && pending === 0,
    champion,
    runner_up: runnerUp,
    final: finalMatch
      ? {
          home_team: finalMatch.home_team,
          away_team: finalMatch.away_team,
          result: finalMatch.result,
        }
      : null,
  });
}
