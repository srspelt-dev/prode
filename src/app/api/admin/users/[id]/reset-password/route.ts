import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { UserDoc } from "@/lib/types";

// POST /api/admin/users/:id/reset-password  → el admin resetea la contraseña
// de cualquier usuario. Body: { new_password }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUser(req);
  if (!me?.is_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }
  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { new_password } = await req.json();
  if (!new_password || String(new_password).length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const result = await db
    .collection<UserDoc>("users")
    .updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { password_hash: await bcrypt.hash(new_password, 10) } }
    );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
