import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, ensureIndexes } from "@/lib/mongodb";
import { signToken, setAuthCookie, toPublicUser } from "@/lib/auth";
import { UserDoc } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { username, email, password } = await req.json();

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: "Faltan campos: username, email, password" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  await ensureIndexes();
  const db = await getDb();
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await db
    .collection<UserDoc>("users")
    .findOne({ email: normalizedEmail });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email" },
      { status: 409 }
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const user: UserDoc = {
    username: String(username).trim(),
    email: normalizedEmail,
    password_hash: await bcrypt.hash(password, 10),
    avatar_url: null,
    is_admin: normalizedEmail === adminEmail,
    created_at: new Date(),
  };

  const { insertedId } = await db
    .collection<UserDoc>("users")
    .insertOne(user);
  user._id = insertedId;

  const token = await signToken({
    sub: insertedId.toString(),
    email: user.email,
    is_admin: user.is_admin,
  });
  setAuthCookie(token);

  return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
}
