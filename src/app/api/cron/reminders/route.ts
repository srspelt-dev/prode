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
  const min = (n: number) => new Date(now + n * 60 * 1000);

  // Dos etapas:
  //  - 1h:  arranca dentro de [20, 75] min y no se mandó el de 1h
  //  - 15m: arranca dentro de [0, 20] min y no se mandó el de 15m
  const oneHour = await db
    .collection<MatchDoc>("matches")
    .find({
      status: "upcoming",
      kickoff_at: { $gte: min(20), $lte: min(75) },
      reminder_1h_sent: { $ne: true },
    } as any)
    .toArray();

  const fifteen = await db
    .collection<MatchDoc>("matches")
    .find({
      status: "upcoming",
      kickoff_at: { $gte: new Date(now), $lte: min(20) },
      reminder_15m_sent: { $ne: true },
    } as any)
    .toArray();

  const jobs = [
    ...oneHour.map((m) => ({ match: m, stage: "1h" as const })),
    ...fifteen.map((m) => ({ match: m, stage: "15m" as const })),
  ];

  if (jobs.length === 0) {
    return NextResponse.json({ reminded: 0, matches: 0 });
  }

  const subs = (await db
    .collection("push_subscriptions")
    .find({})
    .toArray()) as unknown as PushSub[];

  let sent = 0;
  for (const { match, stage } of jobs) {
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
    const payload =
      stage === "15m"
        ? {
            title: "⏰ Última chance",
            body: `${match.home_team} vs ${match.away_team} arranca en ~${mins} min. ¡Cargá ya tu pronóstico!`,
            url: "/partidos",
          }
        : {
            title: "⚽ No te olvides de pronosticar",
            body: `${match.home_team} vs ${match.away_team} arranca en ~${mins} min.`,
            url: "/partidos",
          };

    for (const sub of subs) {
      if (predicted.has(sub.user_id.toString())) continue;
      const ok = await sendPush(db, sub, payload);
      if (ok) sent++;
    }

    const flag =
      stage === "15m" ? { reminder_15m_sent: true } : { reminder_1h_sent: true };
    await db
      .collection<MatchDoc>("matches")
      .updateOne({ _id: match._id }, { $set: flag as any });
  }

  return NextResponse.json({ reminded: sent, jobs: jobs.length });
}
