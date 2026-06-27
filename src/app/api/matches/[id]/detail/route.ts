import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { getMatchDetail } from "@/lib/football-data";
import { MatchDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// Cache en memoria para no gastar la cuota de la API (10 req/min).
const cache = new Map<number, { at: number; data: any }>();
const TTL_MS = 5 * 60 * 1000;

// GET /api/matches/:id/detail  → info extra del partido (entretiempo, estadio,
// árbitro). Para amistosos (sin API) devuelve solo lo que tenemos guardado.
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
  const match = await db
    .collection<MatchDoc>("matches")
    .findOne({ _id: new ObjectId(params.id) });
  if (!match) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Récord (PG-PE-PP) de un equipo en la competición, según partidos jugados
  async function record(team: string): Promise<string> {
    const played = await db
      .collection<MatchDoc>("matches")
      .find({
        competition: match!.competition,
        status: "finished",
        $or: [{ home_team: team }, { away_team: team }],
      })
      .toArray();
    let w = 0,
      d = 0,
      l = 0;
    for (const p of played) {
      if (!p.result || p.result.home_score == null) continue;
      const isHome = p.home_team === team;
      const gf = isHome ? p.result.home_score : p.result.away_score!;
      const ga = isHome ? p.result.away_score! : p.result.home_score;
      if (gf > ga) w++;
      else if (gf === ga) d++;
      else l++;
    }
    return `${w}-${d}-${l}`;
  }

  const base = {
    home_team: match.home_team,
    away_team: match.away_team,
    home_logo: match.home_logo,
    away_logo: match.away_logo,
    home_record: await record(match.home_team),
    away_record: await record(match.away_team),
    phase: match.phase,
    group: match.group,
    kickoff_at: match.kickoff_at,
    status: match.status,
    result: match.result,
    is_manual: match.external_id < 0,
  };

  // Amistoso / manual → no hay datos de API
  if (match.external_id < 0) {
    return NextResponse.json({ ...base, half_time: null, venue: null, referee: null });
  }

  // Mundial → traer detalle de la API (con cache)
  try {
    const now = Date.now();
    let data = cache.get(match.external_id)?.data;
    if (!data || now - (cache.get(match.external_id)?.at ?? 0) >= TTL_MS) {
      data = await getMatchDetail(match.external_id);
      cache.set(match.external_id, { at: now, data });
    }
    const ht = data?.score?.halfTime;
    const ref = (data?.referees ?? []).find((r: any) => r?.name)?.name ?? null;
    return NextResponse.json({
      ...base,
      half_time:
        ht && ht.home != null ? { home: ht.home, away: ht.away } : null,
      venue: data?.venue ?? null,
      referee: ref,
      duration: data?.score?.duration ?? null,
    });
  } catch {
    return NextResponse.json({ ...base, half_time: null, venue: null, referee: null });
  }
}
