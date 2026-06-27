import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { sendPush, PushSub } from "@/lib/push";
import { MatchDoc, PredictionDoc } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/reminders  → manda push a quienes NO pronosticaron partidos que
// arrancan en ~1h. Lo dispara un cron externo (cron-job.org) cada 15-30 min.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const db = await getDb();
  const now = Date.now();
  const from = new Date(now);
  const to = new Date(now + 70 * 60 * 1000); // arranca dentro de los próximos 70 min

  // Partidos por empezar pronto a los que aún no se mandó recordatorio
  const matches = await db
    .collection<MatchDoc>("matches")
    .find({
      status: "upcoming",
      kickoff_at: { $gte: from, $lte: to },
      reminder_sent: { $ne: true },
    } as any)
    .toArray();

  if (matches.length === 0) {
    return NextResponse.json({ reminded: 0, matches: 0 });
  }

  const subs = (await db
    .collection("push_subscriptions")
    .find({})
    .toArray()) as unknown as PushSub[];

  let sent = 0;
  for (const match of matches) {
    // Usuarios que YA pronosticaron este partido
    const preds = await db
      .collection<PredictionDoc>("predictions")
      .find({ match_id: match._id })
      .project({ user_id: 1 })
      .toArray();
    const predicted = new Set(preds.map((p: any) => p.user_id.toString()));

    const mins = Math.max(
      1,
      Math.round((new Date(match.kickoff_at).getTime() - now) / 60000)
    );
    const payload = {
      title: "⚽ No te olvides de pronosticar",
      body: `${match.home_team} vs ${match.away_team} arranca en ~${mins} min. ¡Cargá tu pronóstico!`,
      url: "/partidos",
    };

    for (const sub of subs) {
      if (predicted.has(sub.user_id.toString())) continue;
      const ok = await sendPush(db, sub, payload);
      if (ok) sent++;
    }

    await db
      .collection<MatchDoc>("matches")
      .updateOne({ _id: match._id }, { $set: { reminder_sent: true } as any });
  }

  return NextResponse.json({ reminded: sent, matches: matches.length });
}
