import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { signToken, setAuthCookie, toPublicUser } from "@/lib/auth";
import { UserDoc } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Faltan email o password" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const user = await db
    .collection<UserDoc>("users")
    .findOne({ email: String(email).toLowerCase().trim() });

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Email o contraseña incorrectos" },
      { status: 401 }
    );
  }

  const token = await signToken({
    sub: user._id!.toString(),
    email: user.email,
    is_admin: user.is_admin,
  });
  setAuthCookie(token);

  return NextResponse.json({ user: toPublicUser(user) });
}
