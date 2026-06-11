import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { SPECIAL_COMPETITION } from "@/lib/special";

export const dynamic = "force-dynamic";

// POST /api/special/config  → el admin fija (o reabre) el plazo de los
// pronósticos especiales. Body: { deadline: ISO } (o null para volver al default)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const { deadline } = await req.json();
  const db = await getDb();

  if (deadline === null) {
    await db
      .collection("special_config")
      .deleteOne({ competition: SPECIAL_COMPETITION });
    return NextResponse.json({ ok: true, deadline: null });
  }

  const d = new Date(deadline);
  if (isNaN(d.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  await db
    .collection("special_config")
    .updateOne(
      { competition: SPECIAL_COMPETITION },
      { $set: { competition: SPECIAL_COMPETITION, deadline: d } },
      { upsert: true }
    );

  return NextResponse.json({ ok: true, deadline: d });
}
