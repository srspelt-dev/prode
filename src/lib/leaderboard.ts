import { Db, ObjectId } from "mongodb";
import { LeaderboardRow, UserDoc } from "./types";

interface LeaderboardOpts {
  userIds?: ObjectId[]; // restringir a estos usuarios (tabla de una liga)
  competition?: string; // contar solo partidos de esta competición
}

// Calcula el ranking sumando points_earned por usuario.
// - Con userIds: incluye a TODOS esos usuarios aunque tengan 0 puntos.
// - Con competition: solo suma puntos de partidos de esa competición.
export async function computeLeaderboard(
  db: Db,
  opts: LeaderboardOpts = {}
): Promise<LeaderboardRow[]> {
  const { userIds, competition } = opts;

  const predMatch: Record<string, unknown> = { points_earned: { $ne: null } };
  if (userIds) {
    predMatch.user_id = { $in: userIds };
  }

  // Si hay competición, limitar a los partidos de esa competición
  let matchFilter: Record<string, unknown> = {};
  if (competition) {
    const ids = await db
      .collection("matches")
      .find({ competition })
      .project({ _id: 1 })
      .toArray();
    const matchIds = ids.map((m: any) => m._id);
    predMatch.match_id = { $in: matchIds };
    matchFilter = { competition };
  }

  // Último partido terminado (para la columna "puntos del último partido")
  const lastFinished = await db
    .collection("matches")
    .find({ status: "finished", ...matchFilter })
    .sort({ kickoff_at: -1 })
    .limit(1)
    .toArray();
  const lastMatchId = lastFinished[0]?._id as ObjectId | undefined;

  const rows = await db
    .collection("predictions")
    .aggregate([
      { $match: predMatch },
      {
        $group: {
          _id: "$user_id",
          total_points: { $sum: "$points_earned" },
          predictions_count: { $sum: 1 },
          last_points: {
            $sum: {
              $cond: [
                lastMatchId ? { $eq: ["$match_id", lastMatchId] } : false,
                "$points_earned",
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { total_points: -1, predictions_count: -1 } },
    ])
    .toArray();

  const scored: LeaderboardRow[] = rows.map((r: any) => ({
    user_id: r._id.toString(),
    username: r.user.username,
    total_points: r.total_points,
    predictions_count: r.predictions_count,
    last_points: lastMatchId ? r.last_points : null,
  }));

  // Para una liga: incluir a todos los miembros, aun con 0 puntos.
  if (userIds) {
    const scoredById = new Map(scored.map((r) => [r.user_id, r]));
    const members = await db
      .collection<UserDoc>("users")
      .find({ _id: { $in: userIds } })
      .toArray();

    const all: LeaderboardRow[] = members.map((u) => {
      const id = u._id!.toString();
      return (
        scoredById.get(id) ?? {
          user_id: id,
          username: u.username,
          total_points: 0,
          predictions_count: 0,
          last_points: lastMatchId ? 0 : null,
        }
      );
    });

    all.sort(
      (a, b) =>
        b.total_points - a.total_points ||
        b.predictions_count - a.predictions_count ||
        a.username.localeCompare(b.username)
    );
    return all;
  }

  return scored;
}
