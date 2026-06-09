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
