import webpush from "web-push";
import { Db } from "mongodb";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@prode.app";
  if (!pub || !priv) throw new Error("Faltan las claves VAPID");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export interface PushSub {
  user_id: import("mongodb").ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  created_at: Date;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Envía una notificación. Si la suscripción expiró (404/410), la borra.
export async function sendPush(
  db: Db,
  sub: PushSub,
  payload: PushPayload
): Promise<boolean> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    );
    return true;
  } catch (e: any) {
    const code = e?.statusCode;
    if (code === 404 || code === 410) {
      await db
        .collection("push_subscriptions")
        .deleteOne({ endpoint: sub.endpoint });
    }
    return false;
  }
}
