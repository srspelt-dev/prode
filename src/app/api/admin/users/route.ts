import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { UserDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/admin/users  → lista de todos los usuarios registrados (solo admin).
export async function GET(req: NextRequest) {
  const me = await getCurrentUser(req);
  if (!me?.is_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const db = await getDb();
  const users = await db
    .collection<UserDoc>("users")
    .find({})
    .sort({ created_at: 1 })
    .toArray();

  // Puntos y cantidad de pronósticos por usuario (en una sola agregación)
  const stats = await db
    .collection("predictions")
    .aggregate([
      {
        $group: {
          _id: "$user_id",
          predictions_count: { $sum: 1 },
          total_points: {
            $sum: { $ifNull: ["$points_earned", 0] },
          },
        },
      },
    ])
    .toArray();
  const statById = new Map(stats.map((s: any) => [s._id.toString(), s]));

  const data = users.map((u) => {
    const s = statById.get(u._id!.toString());
    return {
      id: u._id!.toString(),
      username: u.username,
      email: u.email,
      is_admin: u.is_admin,
      created_at: u.created_at,
      predictions_count: s?.predictions_count ?? 0,
      total_points: s?.total_points ?? 0,
    };
  });

  return NextResponse.json({ users: data, total: data.length });
}
