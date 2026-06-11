import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { SPECIAL_QUESTIONS, SPECIAL_COMPETITION } from "@/lib/special";

export const dynamic = "force-dynamic";

// POST /api/special/result  → el admin carga las respuestas correctas (bonus).
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const { answers } = await req.json();
  const clean: Record<string, string> = {};
  for (const q of SPECIAL_QUESTIONS) {
    if (answers?.[q.key]) clean[q.key] = String(answers[q.key]).trim();
  }

  const db = await getDb();
  await db
    .collection("special_results")
    .updateOne(
      { competition: SPECIAL_COMPETITION },
      { $set: { competition: SPECIAL_COMPETITION, answers: clean } },
      { upsert: true }
    );

  return NextResponse.json({ ok: true, answers: clean });
}
