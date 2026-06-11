import { NextResponse } from "next/server";
import { getStandings, FdStandingGroup } from "@/lib/football-data";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Cache en memoria para no gastar la cuota de football-data (10 req/min).
let cache: { at: number; data: FdStandingGroup[] } | null = null;
const TTL_MS = 5 * 60 * 1000; // 5 minutos

// GET /api/standings  → tabla de posiciones de los grupos del Mundial.
export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return NextResponse.json({ standings: cache.data, cached: true });
    }
    const data = await getStandings();
    cache = { at: now, data };
    return NextResponse.json({ standings: data });
  } catch (e: any) {
    // Si falla la API pero hay cache viejo, devolverlo igual
    if (cache) {
      return NextResponse.json({ standings: cache.data, stale: true });
    }
    return NextResponse.json(
      { error: e?.message || "Error al traer posiciones" },
      { status: 500 }
    );
  }
}
