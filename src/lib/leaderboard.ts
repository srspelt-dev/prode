import { Db, ObjectId } from "mongodb";
import { LeaderboardRow } from "./types";

// Calcula el ranking sumando points_earned por usuario.
// Si se pasa userIds, restringe a esos usuarios (tabla de una liga).
export async function computeLeaderboard(
  db: Db,
  userIds?: ObjectId[]
): Promise<LeaderboardRow[]> {
  const predMatch: Record<string, unknown> = { points_earned: { $ne: null } };
  if (userIds) {
    predMatch.user_id = { $in: userIds };
  }

  // Último partido terminado (para la columna "puntos del último partido")
  const lastFinished = await db
    .collection("matches")
    .find({ status: "finished" })
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
                lastMatchId
                  ? { $eq: ["$match_id", lastMatchId] }
                  : false,
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

  return rows.map((r: any) => ({
    user_id: r._id.toString(),
    username: r.user.username,
    total_points: r.total_points,
    predictions_count: r.predictions_count,
    last_points: lastMatchId ? r.last_points : null,
  }));
}
