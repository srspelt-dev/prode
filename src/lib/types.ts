import { ObjectId } from "mongodb";

export type MatchPhase =
  | "grupos"
  | "treintaidosavos"
  | "octavos"
  | "cuartos"
  | "semifinal"
  | "tercer_puesto"
  | "final";

export type MatchStatus = "upcoming" | "live" | "finished";

export interface MatchResult {
  home_score: number | null;
  away_score: number | null;
  went_to_penalties: boolean;
}

export interface MatchDoc {
  _id?: ObjectId;
  external_id: number; // id de API-Football
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
