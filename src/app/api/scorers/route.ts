import { NextResponse } from "next/server";
import { getScorers, FdScorer } from "@/lib/football-data";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Cache en memoria (la cuota de football-data es 10 req/min).
let cache: { at: number; data: FdScorer[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

// GET /api/scorers  → tabla de goleadores del Mundial.
export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return NextResponse.json({ scorers: cache.data, cached: true });
    }
    const data = await getScorers(30);
    cache = { at: now, data };
    return NextResponse.json({ scorers: data });
  } catch (e: any) {
    if (cache) return NextResponse.json({ scorers: cache.data, stale: true });
    return NextResponse.json(
      { error: e?.message || "Error al traer goleadores" },
      { status: 500 }
    );
  }
}
