import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { MatchDoc, PredictionDoc } from "@/lib/types";

// DELETE /api/matches/:id  → borra un partido (solo admin).
// Pensado para partidos cargados a mano. También borra sus pronósticos.
export async function DELETE(
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

  const db = await getDb();
  const _id = new ObjectId(params.id);

  const match = await db.collection<MatchDoc>("matches").findOne({ _id });
  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  await db.collection<PredictionDoc>("predictions").deleteMany({ match_id: _id });
  await db.collection<MatchDoc>("matches").deleteOne({ _id });

  return NextResponse.json({ ok: true });
}
