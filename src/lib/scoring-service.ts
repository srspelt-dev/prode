import { Db, ObjectId } from "mongodb";
import { calcularPuntos, advancingTeam, ADVANCE_BONUS } from "./scoring";
import { KNOCKOUT_PHASES } from "./phases";
import { MatchDoc, PredictionDoc } from "./types";

// Recalcula points_earned para TODOS los pronósticos de un partido terminado.
export async function recalcularPuntosPartido(
  db: Db,
  matchId: ObjectId
): Promise<number> {
  const match = await db
    .collection<MatchDoc>("matches")
    .findOne({ _id: matchId });

  if (
    !match?.result ||
    match.result.home_score == null ||
    match.result.away_score == null
  ) {
    return 0;
  }

  const { home_score, away_score, went_to_penalties, penalty_winner } =
    match.result;

  // Bonus "quién pasa": SOLO cuando el partido se define por penales.
  // Si hubo ganador en los 90'/alargue, el marcador ya premia acertar el ganador.
  const isKnockout = KNOCKOUT_PHASES.includes(match.phase as any);
  const advancer =
    isKnockout && went_to_penalties
      ? advancingTeam(home_score!, away_score!, true, penalty_winner)
      : null;

  const predictions = await db
    .collection<PredictionDoc>("predictions")
    .find({ match_id: matchId })
    .toArray();

  const ops = predictions.map((pred) => {
    let pts = calcularPuntos(
      home_score!,
      away_score!,
      pred.home_score,
      pred.away_score
    );
    // Bonus por acertar quién pasa de ronda
    if (advancer && pred.advances && pred.advances === advancer) {
      pts += ADVANCE_BONUS;
    }
    return db
      .collection<PredictionDoc>("predictions")
      .updateOne({ _id: pred._id }, { $set: { points_earned: pts } });
  });

  await Promise.all(ops);
  return predictions.length;
}
