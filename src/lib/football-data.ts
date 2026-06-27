// Cliente HTTP para football-data.org (v4).
// Plan gratuito incluye la Copa del Mundo (competición WC). Límite: 10 req/min.
// Docs: https://www.football-data.org/documentation/quickstart

const BASE_URL =
  process.env.FOOTBALL_DATA_BASE || "https://api.football-data.org/v4";
const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION || "WC";

export interface FdTeam {
  id: number | null;
  name: string | null;
  crest: string | null;
}

export interface FdMatch {
  id: number;
  utcDate: string; // ISO
  status:
    | "SCHEDULED"
    | "TIMED"
    | "IN_PLAY"
    | "PAUSED"
    | "FINISHED"
    | "SUSPENDED"
    | "POSTPONED"
    | "CANCELLED"
    | "AWARDED";
  stage: string;
  group: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: {
    winner: string | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
}

async function get(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any> {
  if (!TOKEN) {
    throw new Error("Falta FOOTBALL_DATA_TOKEN en las variables de entorno");
  }
  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const resp = await fetch(url, {
    headers: { "X-Auth-Token": TOKEN },
    cache: "no-store",
  });

  if (resp.status === 429) {
    throw new Error("football-data.org: límite de requests alcanzado (10/min)");
  }
  if (!resp.ok) {
    throw new Error(`football-data.org HTTP ${resp.status}`);
  }

  const data = await resp.json();
  if (data?.errorCode) {
    throw new Error(`football-data.org error: ${data.message}`);
  }
  return data;
}

// Todos los partidos del Mundial (una sola request trae los 104).
export async function getMatches(status?: string): Promise<FdMatch[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const data = await get(`competitions/${COMPETITION}/matches`, params);
  return (data?.matches ?? []) as FdMatch[];
}

// Partidos en vivo (IN_PLAY + PAUSED). football-data.org acepta status=LIVE.
export async function getLiveMatches(): Promise<FdMatch[]> {
  const data = await get(`competitions/${COMPETITION}/matches`, {
    status: "LIVE",
  });
  return (data?.matches ?? []) as FdMatch[];
}

// Partidos recientes (ayer, hoy y mañana) — captura los EN VIVO y los que
// RECIÉN TERMINARON (que ya no aparecen como LIVE), para cerrar el resultado.
export async function getRecentMatches(): Promise<FdMatch[]> {
  const day = 24 * 3600 * 1000;
  const now = Date.now();
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const data = await get(`competitions/${COMPETITION}/matches`, {
    dateFrom: fmt(now - day),
    dateTo: fmt(now + day),
  });
  return (data?.matches ?? []) as FdMatch[];
}

export interface FdStandingRow {
  position: number;
  team: { name: string; crest: string | null };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalDifference: number;
}

export interface FdStandingGroup {
  group: string | null;
  table: FdStandingRow[];
}

// Detalle de un partido (entretiempo, estadio, árbitro, etc.).
export async function getMatchDetail(id: number): Promise<any> {
  return get(`matches/${id}`, {});
}

export interface FdScorer {
  name: string;
  team: string;
  team_crest: string | null;
  goals: number;
  assists: number | null;
}

// Tabla de goleadores del torneo.
export async function getScorers(limit = 30): Promise<FdScorer[]> {
  const data = await get(`competitions/${COMPETITION}/scorers`, {
    limit: String(limit),
  });
  return ((data?.scorers ?? []) as any[]).map((s) => ({
    name: s.player?.name ?? "?",
    team: s.team?.name ?? "",
    team_crest: s.team?.crest ?? null,
    goals: s.goals ?? 0,
    assists: s.assists ?? null,
  }));
}

// Tabla de posiciones (grupos del Mundial).
export async function getStandings(): Promise<FdStandingGroup[]> {
  const data = await get(`competitions/${COMPETITION}/standings`, {});
  const standings = (data?.standings ?? []) as any[];
  // Quedarnos con el tipo TOTAL de cada grupo
  return standings
    .filter((s) => s.type === "TOTAL")
    .map((s) => ({
      group: s.group,
      table: (s.table ?? []).map((t: any) => ({
        position: t.position,
        team: { name: t.team?.name ?? "?", crest: t.team?.crest ?? null },
        playedGames: t.playedGames,
        won: t.won,
        draw: t.draw,
        lost: t.lost,
        points: t.points,
        goalDifference: t.goalDifference,
      })),
    }));
}
