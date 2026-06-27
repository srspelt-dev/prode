import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { recalcularPuntosPartido } from "@/lib/scoring-service";
import { MatchDoc } from "@/lib/types";

// PUT /api/matches/:id/result  → carga el resultado (solo admin) y recalcula puntos.
// Body: { home_score, away_score, went_to_penalties }
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { home_score, away_score, went_to_penalties, penalty_winner } =
    await req.json();
  if (typeof home_score !== "number" || typeof away_score !== "number") {
    return NextResponse.json(
      { error: "home_score y away_score deben ser números" },
      { status: 400 }
    );
  }

  const pen = Boolean(went_to_penalties);
  const winner =
    pen && (penalty_winner === "home" || penalty_winner === "away")
      ? penalty_winner
      : null;

  const db = await getDb();
  const _id = new ObjectId(params.id);

  const update = await db.collection<MatchDoc>("matches").updateOne(
    { _id },
    {
      $set: {
        status: "finished",
        // Marca de resultado manual: el sync de la API no lo pisa.
        manual_result: true,
        result: {
          home_score,
          away_score,
          went_to_penalties: pen,
          penalty_winner: winner,
        },
      },
    }
  );

  if (update.matchedCount === 0) {
    return NextResponse.json(
      { error: "Partido no encontrado" },
      { status: 404 }
    );
  }

  const scored = await recalcularPuntosPartido(db, _id);
  return NextResponse.json({ ok: true, predictions_scored: scored });
}
