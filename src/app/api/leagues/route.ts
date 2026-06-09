import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb, ensureIndexes } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { LeagueDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

// Genera un código de 6 caracteres legible (sin 0/O, 1/I).
function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// GET /api/leagues  → ligas a las que pertenece el usuario.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const db = await getDb();
  const leagues = await db
    .collection<LeagueDoc>("leagues")
    .find({ members: new ObjectId(user.id) })
    .toArray();

  return NextResponse.json({
    leagues: leagues.map((l) => ({
      id: l._id!.toString(),
      name: l.name,
      code: l.code,
      members_count: l.members.length,
      is_owner: l.owner_id.toString() === user.id,
    })),
  });
}

// POST /api/leagues  → crea una liga privada. Body: { name }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || String(name).trim().length < 3) {
    return NextResponse.json(
      { error: "El nombre debe tener al menos 3 caracteres" },
      { status: 400 }
    );
  }

  await ensureIndexes();
  const db = await getDb();
  const ownerOid = new ObjectId(user.id);

  // Reintenta si hay colisión de código (índice único)
  for (let attempt = 0; attempt < 5; attempt++) {
    const league: LeagueDoc = {
      name: String(name).trim(),
      code: genCode(),
      owner_id: ownerOid,
      members: [ownerOid],
      created_at: new Date(),
    };
    try {
      const { insertedId } = await db
        .collection<LeagueDoc>("leagues")
        .insertOne(league);
      return NextResponse.json(
        {
          league: {
            id: insertedId.toString(),
            name: league.name,
            code: league.code,
          },
        },
        { status: 201 }
      );
    } catch (e: any) {
      if (e?.code === 11000) continue; // código duplicado → reintentar
      throw e;
    }
  }

  return NextResponse.json(
    { error: "No se pudo generar un código único, intentá de nuevo" },
    { status: 500 }
  );
}
