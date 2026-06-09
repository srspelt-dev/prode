import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb, ensureIndexes } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { MatchDoc, MatchPhase, PredictionDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_PHASES: MatchPhase[] = [
  "amistoso",
  "grupos",
  "treintaidosavos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_puesto",
  "final",
];

// POST /api/matches  → crea un partido a mano (solo admin).
// Útil para amistosos u otros partidos que no trae la API.
// Body: { home_team, away_team, kickoff_at (ISO), phase?, group?, home_logo?, away_logo? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const body = await req.json();
  const home_team = String(body.home_team || "").trim();
  const away_team = String(body.away_team || "").trim();
  const kickoffRaw = body.kickoff_at;

  if (!home_team || !away_team) {
    return NextResponse.json(
      { error: "Faltan los nombres de los equipos" },
      { status: 400 }
    );
  }
  const kickoff = new Date(kickoffRaw);
  if (isNaN(kickoff.getTime())) {
    return NextResponse.json(
      { error: "Fecha/hora inválida" },
      { status: 400 }
    );
  }

  const phase: MatchPhase = VALID_PHASES.includes(body.phase)
    ? body.phase
    : "amistoso";

  const competition =
    typeof body.competition === "string" && body.competition.trim()
      ? body.competition.trim()
      : "amistosos";

  await ensureIndexes();
  const db = await getDb();

  const doc: MatchDoc = {
    // external_id negativo para partidos manuales (no chocan con los de la API)
    external_id: -(Date.now() * 1000 + Math.floor(Math.random() * 1000)),
    competition,
    phase,
    group: body.group ? String(body.group).trim() : null,
    home_team,
    away_team,
    home_logo: body.home_logo ? String(body.home_logo) : null,
    away_logo: body.away_logo ? String(body.away_logo) : null,
    kickoff_at: kickoff,
    deadline_at: new Date(kickoff.getTime() - 5 * 60 * 1000),
    status: "upcoming",
    result: null,
    synced_at: new Date(),
  };

  const { insertedId } = await db
    .collection<MatchDoc>("matches")
    .insertOne(doc);

  return NextResponse.json(
    { ok: true, id: insertedId.toString() },
    { status: 201 }
  );
}

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
      competition: m.competition ?? "mundial",
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
      is_manual: m.external_id < 0,
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
