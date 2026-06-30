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
  const deadline = new Date(kickoff.getTime() - 1 * 60 * 1000);
  const status = STATUS_MAP[m.status] ?? "upcoming";

  // Resultado para el scoring: PREVIO a los penales.
  // OJO: en football-data, si hay penales, score.fullTime INCLUYE los penales
  // (ej: 4-5). El empate real está en regularTime + extraTime (ej: 1-1).
  const wentToPenalties = m.score?.duration === "PENALTY_SHOOTOUT";
  let homeScore: number | null;
  let awayScore: number | null;
  if (wentToPenalties && m.score?.regularTime?.home != null) {
    const rt = m.score.regularTime;
    const et = m.score.extraTime;
    homeScore = (rt.home ?? 0) + (et?.home ?? 0);
    awayScore = (rt.away ?? 0) + (et?.away ?? 0);
  } else {
    homeScore = m.score?.fullTime?.home ?? null;
    awayScore = m.score?.fullTime?.away ?? null;
  }
  // Quién clasificó por penales (para el bonus de eliminatorias)
  const penaltyWinner = wentToPenalties
    ? m.score?.winner === "HOME_TEAM"
      ? "home"
      : m.score?.winner === "AWAY_TEAM"
        ? "away"
        : null
    : null;

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
            penalty_winner: penaltyWinner,
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

  // Si el admin cargó el resultado a mano, NO pisarlo con el de la API.
  if ((prev as any)?.manual_result) {
    doc.status = prev!.status;
    doc.result = prev!.result;
  } else if (prev && STATUS_RANK[doc.status] < STATUS_RANK[prev.status]) {
    // Estado monótono: nunca retroceder (la API a veces devuelve datos viejos).
    doc.status = prev.status;
    doc.result = prev.result;
  }

  // No revertir equipos ya asignados a "Por definir" (la API de eliminatorias
  // a veces los manda vacíos aunque ya estaban definidos).
  if (prev) {
    if (doc.home_team === "Por definir" && prev.home_team !== "Por definir") {
      doc.home_team = prev.home_team;
      doc.home_logo = prev.home_logo;
    }
    if (doc.away_team === "Por definir" && prev.away_team !== "Por definir") {
      doc.away_team = prev.away_team;
      doc.away_logo = prev.away_logo;
    }
  }

  await db
    .collection<MatchDoc>("matches")
    .updateOne(
      { external_id: doc.external_id },
      { $set: doc },
      { upsert: true }
    );

  // Recalcular puntos si: el partido recién terminó, O ya estaba terminado pero
  // cambió el resultado (la API a veces corrige el score / agrega los penales).
  const justFinished = prev && prev.status !== "finished" && doc.status === "finished";
  const resultChanged =
    doc.status === "finished" &&
    JSON.stringify(prev?.result ?? null) !== JSON.stringify(doc.result ?? null);
  if (justFinished || resultChanged) {
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
