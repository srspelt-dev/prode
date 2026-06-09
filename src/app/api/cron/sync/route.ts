import { NextRequest, NextResponse } from "next/server";
import { syncAllFixtures, syncLiveFixtures } from "@/lib/sync";

// Este endpoint lo dispara Vercel Cron (ver vercel.json) o un cron externo.
// Protegido por CRON_SECRET: Vercel manda `Authorization: Bearer <CRON_SECRET>`.
//
//   /api/cron/sync?mode=live  → solo partidos en vivo (frecuente)
//   /api/cron/sync?mode=all   → fixture completo (1 vez/día)

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const mode = req.nextUrl.searchParams.get("mode") || "live";

  try {
    if (mode === "all") {
      const count = await syncAllFixtures();
      return NextResponse.json({ mode, synced: count });
    }

    // mode=live → antes de gastar un request, chequear si hay partidos próximos
    const { getDb } = await import("@/lib/mongodb");
    const db = await getDb();
    const now = new Date();
    const soon = new Date(now.getTime() + 2 * 3600 * 1000);
    const upcomingSoon = await db.collection("matches").countDocuments({
      kickoff_at: { $gte: now, $lte: soon },
      status: { $in: ["upcoming", "live"] },
    });

    if (upcomingSoon === 0) {
      return NextResponse.json({ mode, synced: 0, skipped: true });
    }

    const count = await syncLiveFixtures();
    return NextResponse.json({ mode, synced: count });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error en sync" },
      { status: 500 }
    );
  }
}
