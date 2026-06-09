import { ObjectId } from "mongodb";

export type MatchPhase =
  | "amistoso"
  | "grupos"
  | "treintaidosavos"
  | "octavos"
  | "cuartos"
  | "semifinal"
  | "tercer_puesto"
  | "final";

export type MatchStatus = "upcoming" | "live" | "finished";

// Competiciones: una liga elige una y solo suma puntos de partidos de esa competición.
export const COMPETITIONS = [
  { slug: "mundial", label: "Mundial 2026" },
  { slug: "amistosos", label: "Amistosos" },
] as const;

export type CompetitionSlug = (typeof COMPETITIONS)[number]["slug"];

export function competitionLabel(slug: string): string {
  return COMPETITIONS.find((c) => c.slug === slug)?.label ?? slug;
}

export interface MatchResult {
  home_score: number | null;
  away_score: number | null;
  went_to_penalties: boolean;
}

export interface MatchDoc {
  _id?: ObjectId;
  external_id: number; // id de la API (negativo si es manual)
  competition: string; // "mundial" | "amistosos" | ...
  phase: MatchPhase;
  group: string | null;
  home_team: string;
  away_team: string;
  home_logo: string | null;
  away_logo: string | null;
  kickoff_at: Date;
  deadline_at: Date;
  status: MatchStatus;
  result: MatchResult | null;
  synced_at: Date;
}

export interface UserDoc {
  _id?: ObjectId;
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: Date;
}

export interface PredictionDoc {
  _id?: ObjectId;
  user_id: ObjectId;
  match_id: ObjectId;
  home_score: number;
  away_score: number;
  points_earned: number | null;
  submitted_at: Date;
}

export interface LeagueDoc {
  _id?: ObjectId;
  name: string;
  code: string;
  competition: string; // de qué es la liga: "mundial" | "amistosos" | ...
  owner_id: ObjectId;
  members: ObjectId[];
  created_at: Date;
}

// Lo que viaja al frontend (sin password_hash, ids como string)
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
}

export interface LeaderboardRow {
  user_id: string;
  username: string;
  total_points: number;
  predictions_count: number;
  last_points: number | null;
}
