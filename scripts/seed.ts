// Seed de datos de prueba para desarrollo local SIN gastar la cuota de API-Football.
// Crea un usuario admin + algunos partidos de ejemplo (uno ya jugable).
//
//   npm run seed            (carga .env.local automáticamente con Node 20.6+)
//
// Si tu Node no carga .env.local solo, usá:  node --env-file=.env.local ...

import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

// Cargar .env.local manualmente (simple, sin dependencias)
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // sin .env.local → usar variables ya presentes en el entorno
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/prode";
const dbName = process.env.MONGODB_DB || "prode";
const adminEmail = process.env.ADMIN_EMAIL || "admin@tudominio.com";

function fixture(
  id: number,
  home: string,
  away: string,
  homeFlag: string,
  awayFlag: string,
  group: string,
  hoursFromNow: number
) {
  const kickoff = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  return {
    external_id: id,
    phase: "grupos",
    group,
    home_team: home,
    away_team: away,
    // Usamos flags emoji como "logo" placeholder en el seed (el sync real trae URLs)
    home_logo: null,
    away_logo: null,
    home_flag: homeFlag,
    away_flag: awayFlag,
    kickoff_at: kickoff,
    deadline_at: new Date(kickoff.getTime() - 1 * 60 * 1000),
    status: "upcoming",
    result: null,
    synced_at: new Date(),
  };
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Admin
  const hash = await bcrypt.hash("admin123", 10);
  await db.collection("users").updateOne(
    { email: adminEmail },
    {
      $set: { username: "Admin", is_admin: true, password_hash: hash },
      $setOnInsert: { avatar_url: null, created_at: new Date() },
    },
    { upsert: true }
  );

  // Partidos de ejemplo: uno en 1h (jugable), otros más adelante
  const matches = [
    fixture(9001, "Argentina", "Francia", "🇦🇷", "🇫🇷", "A", 1),
    fixture(9002, "Brasil", "Alemania", "🇧🇷", "🇩🇪", "A", 3),
    fixture(9003, "España", "Inglaterra", "🇪🇸", "🏴", "B", 26),
    fixture(9004, "Países Bajos", "Croacia", "🇳🇱", "🇭🇷", "B", 28),
  ];
  for (const m of matches) {
    await db
      .collection("matches")
      .updateOne({ external_id: m.external_id }, { $set: m }, { upsert: true });
  }

  console.log(
    `[seed] OK. Admin: ${adminEmail} / admin123 · ${matches.length} partidos de ejemplo.`
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
