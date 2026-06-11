import { MongoClient, Db } from "mongodb";

// Conexión a MongoDB con cache global — clave en entornos serverless (Vercel),
// donde cada función podría reabrir la conexión en cada invocación.

const dbName = process.env.MONGODB_DB || "prode";

let cached = (global as any)._mongo as
  | { client: MongoClient; promise: Promise<MongoClient> }
  | undefined;

async function getClient(): Promise<MongoClient> {
  if (cached?.client) return cached.client;

  // Validamos la URI acá (no al importar) para no romper `next build`.
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Falta la variable de entorno MONGODB_URI");
  }

  if (!cached) {
    const client = new MongoClient(uri, { maxPoolSize: 10 });
    cached = { client, promise: client.connect() };
    (global as any)._mongo = cached;
  }
  await cached.promise;
  cached.client = (await cached.promise) as MongoClient;
  return cached.client;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}

// Crea los índices recomendados (idempotente — se puede llamar en cada arranque/sync).
export async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db
      .collection("users")
      .createIndex({ email: 1 }, { unique: true }),
    db
      .collection("predictions")
      .createIndex({ user_id: 1, match_id: 1 }, { unique: true }),
    db.collection("predictions").createIndex({ match_id: 1 }),
    db.collection("matches").createIndex({ kickoff_at: 1 }),
    db.collection("matches").createIndex({ external_id: 1 }, { unique: true }),
    db.collection("leagues").createIndex({ code: 1 }, { unique: true }),
    db
      .collection("special_predictions")
      .createIndex({ user_id: 1, competition: 1 }, { unique: true }),
  ]);
}
