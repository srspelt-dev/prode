import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncAllFixtures, syncLiveFixtures } from "@/lib/sync";

// POST /api/matches/sync  → fuerza sincronización (solo admin).
// Body opcional: { mode: "all" | "live" }  (default "all")
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  let mode = "all";
  try {
    const body = await req.json();
    if (body?.mode) mode = body.mode;
  } catch {
    // sin body → all
  }

  try {
    const count =
      mode === "live" ? await syncLiveFixtures() : await syncAllFixtures();
    return NextResponse.json({ mode, synced: count });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error en sync" },
      { status: 500 }
    );
  }
}
