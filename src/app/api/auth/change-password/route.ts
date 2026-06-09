import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { UserDoc } from "@/lib/types";

// POST /api/auth/change-password  → cambia la contraseña del usuario logueado.
// Body: { current_password, new_password }
export async function POST(req: NextRequest) {
  const me = await getCurrentUser(req);
  if (!me) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { current_password, new_password } = await req.json();
  if (!current_password || !new_password) {
    return NextResponse.json(
      { error: "Faltan la contraseña actual y la nueva" },
      { status: 400 }
    );
  }
  if (String(new_password).length < 6) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const user = await db
    .collection<UserDoc>("users")
    .findOne({ _id: new ObjectId(me.id) });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (!(await bcrypt.compare(current_password, user.password_hash))) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta" },
      { status: 401 }
    );
  }

  await db
    .collection<UserDoc>("users")
    .updateOne(
      { _id: user._id },
      { $set: { password_hash: await bcrypt.hash(new_password, 10) } }
    );

  return NextResponse.json({ ok: true });
}
