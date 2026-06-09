import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { PublicUser, UserDoc } from "./types";

const COOKIE_NAME = "prode_token";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev_insecure_secret_change_me"
);
const expiryHours = Number(process.env.JWT_EXPIRY_HOURS || 72);

export interface TokenPayload {
  sub: string; // user id
  email: string;
  is_admin: boolean;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, is_admin: payload.is_admin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${expiryHours}h`)
    .sign(secret);
}

export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      is_admin: Boolean(payload.is_admin),
    };
  } catch {
    return null;
  }
}

// Setea la cookie httpOnly con el JWT (llamar desde un Route Handler).
export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiryHours * 3600,
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

// Lee el token de la cookie (o del header Authorization como fallback).
function readToken(req?: NextRequest): string | undefined {
  if (req) {
    const header = req.headers.get("authorization");
    if (header?.startsWith("Bearer ")) return header.slice(7);
  }
  return cookies().get(COOKIE_NAME)?.value;
}

// Devuelve el usuario autenticado o null. Usar en Route Handlers / Server Components.
export async function getCurrentUser(
  req?: NextRequest
): Promise<PublicUser | null> {
  const token = readToken(req);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = await getDb();
  const user = await db
    .collection<UserDoc>("users")
    .findOne({ _id: new ObjectId(payload.sub) });
  if (!user) return null;

  return toPublicUser(user);
}

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id!.toString(),
    username: user.username,
    email: user.email,
    avatar_url: user.avatar_url,
    is_admin: user.is_admin,
  };
}
