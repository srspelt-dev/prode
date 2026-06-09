import { Db, ObjectId } from "mongodb";
import { calcularPuntos } from "./scoring";
import { MatchDoc, PredictionDoc } from "./types";

// Recalcula points_earned para TODOS los pronósticos de un partido terminado.
export async function recalcularPuntosPartido(
  db: Db,
  matchId: ObjectId
): Promise<number> {
  const match = await db
    .collection<MatchDoc>("matches")
    .findOne({ _id: matchId });

  if (!match?.result || match.result.home_score == null || match.result.away_score == null) {
    return 0;
  }

  const { home_score, away_score } = match.result;
  const predictions = await db
    .collection<PredictionDoc>("predictions")
    .find({ match_id: matchId })
    .toArray();

  const ops = predictions.map((pred) => {
    const pts = calcularPuntos(
      home_score!,
      away_score!,
      pred.home_score,
      pred.away_score
    );
    return db
      .collection<PredictionDoc>("predictions")
      .updateOne({ _id: pred._id }, { $set: { points_earned: pts } });
  });

  await Promise.all(ops);
  return predictions.length;
}
