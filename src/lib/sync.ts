import { Db } from "mongodb";
import { getDb, ensureIndexes } from "./mongodb";
import {
  FdMatch,
  getMatches,
  getRecentMatches,
  getLiveMatches,
} from "./football-data";
import { recalcularPuntosPartido } from "./scoring-service";
import { MatchDoc, MatchPhase, MatchStatus } from "./types";

// football-data.org status → status interno
const STATUS_MAP: Record<string, MatchStatus> = {
  SCHEDULED: "upcoming",
  TIMED: "upcoming",
  POSTPONED: "upcoming",
  CANCELLED: "upcoming",
  IN_PLAY: "live",
  PAUSED: "live",
  SUSPENDED: "live",
  FINISHED: "finished",
  AWARDED: "finished",
};

// football-data.org stage → fase interna
const STAGE_MAP: Record<string, MatchPhase> = {
  GROUP_STAGE: "grupos",
  LAST_32: "treintaidosavos",
  LAST_16: "octavos",
  QUARTER_FINALS: "cuartos",
  SEMI_FINALS: "semifinal",
  THIRD_PLACE: "tercer_puesto",
  FINAL: "final",
};

function parseMatch(m: FdMatch): MatchDoc {
  const kickoff = new Date(m.utcDate);
  const deadline = new Date(kickoff.getTime() - 5 * 60 * 1000);
  const status = STATUS_MAP[m.status] ?? "upcoming";

  // En football-data.org, score.fullTime es el resultado tras 90'+alargue
  // (PREVIO a los penales). Justo lo que usamos para el scoring.
  const wentToPenalties = m.score?.duration === "PENALTY_SHOOTOUT";
  const homeScore = m.score?.fullTime?.home ?? null;
  const awayScore = m.score?.fullTime?.away ?? null;

  const phase = STAGE_MAP[m.stage] ?? "grupos";
  // "GROUP_A" → "A"
  const group = m.group ? m.group.replace(/^GROUP[_ ]?/i, "") : null;

  return {
    external_id: m.id,
    competition: "mundial",
    phase,
    group,
    home_team: m.homeTeam?.name ?? "Por definir",
    away_team: m.awayTeam?.name ?? "Por definir",
    home_logo: m.homeTeam?.crest ?? null,
    away_logo: m.awayTeam?.crest ?? null,
    kickoff_at: kickoff,
    deadline_at: deadline,
    status,
    // Guardamos el marcador tanto en vivo como al finalizar (para mostrarlo).
    result:
      (status === "finished" || status === "live") &&
      homeScore != null &&
      awayScore != null
        ? {
            home_score: homeScore,
            away_score: awayScore,
            went_to_penalties: wentToPenalties,
          }
        : null,
    synced_at: new Date(),
  };
}

const STATUS_RANK: Record<MatchStatus, number> = {
  upcoming: 0,
  live: 1,
  finished: 2,
};

async function upsertMatch(db: Db, m: FdMatch): Promise<void> {
  const doc = parseMatch(m);
  const prev = await db
    .collection<MatchDoc>("matches")
    .findOne({ external_id: doc.external_id });

  // Estado monótono: nunca retroceder (la API a veces devuelve datos viejos).
  // Si lo que llega es "menos avanzado" que lo guardado, conservar estado y
  // resultado anteriores para no borrar un partido en vivo / terminado.
  if (prev && STATUS_RANK[doc.status] < STATUS_RANK[prev.status]) {
    doc.status = prev.status;
    doc.result = prev.result;
  }

  await db
    .collection<MatchDoc>("matches")
    .updateOne(
      { external_id: doc.external_id },
      { $set: doc },
      { upsert: true }
    );

  // Si el partido recién terminó → calcular puntos automáticamente
  if (prev && prev.status !== "finished" && doc.status === "finished") {
    const match = await db
      .collection<MatchDoc>("matches")
      .findOne({ external_id: doc.external_id });
    if (match?._id) {
      await recalcularPuntosPartido(db, match._id);
    }
  }
}

// Sincroniza TODOS los partidos del torneo (arranque inicial o 1 vez/día).
export async function syncAllFixtures(): Promise<number> {
  const db = await getDb();
  await ensureIndexes();
  const matches = await getMatches();
  for (const m of matches) {
    await upsertMatch(db, m);
  }
  return matches.length;
}

// Sincroniza los partidos en vivo + recién terminados (cada 1-2 min).
// Combina el endpoint LIVE (score real en vivo) con el de fecha (para los
// que recién terminaron). LIVE tiene prioridad si un partido está en ambos.
export async function syncLiveFixtures(): Promise<number> {
  const db = await getDb();
  const [recent, live] = await Promise.all([
    getRecentMatches().catch(() => [] as FdMatch[]),
    getLiveMatches().catch(() => [] as FdMatch[]),
  ]);

  const byId = new Map<number, FdMatch>();
  for (const m of recent) byId.set(m.id, m);
  for (const m of live) byId.set(m.id, m); // LIVE pisa al de fecha

  for (const m of byId.values()) {
    await upsertMatch(db, m);
  }
  return byId.size;
}
