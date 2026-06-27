import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe  → guarda la suscripción push del dispositivo.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("push_subscriptions").updateOne(
    { endpoint: sub.endpoint },
    {
      $set: {
        user_id: new ObjectId(user.id),
        endpoint: sub.endpoint,
        keys: sub.keys,
        created_at: new Date(),
      },
    },
    { upsert: true }
  );
  // Índice para buscar por usuario
  await db
    .collection("push_subscriptions")
    .createIndex({ user_id: 1 })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe  → baja la suscripción (body: { endpoint })
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { endpoint } = await req.json().catch(() => ({}));
  if (!endpoint) {
    return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
  }
  const db = await getDb();
  await db.collection("push_subscriptions").deleteOne({ endpoint });
  return NextResponse.json({ ok: true });
}
