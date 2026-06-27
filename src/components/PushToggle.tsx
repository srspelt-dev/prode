"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { api, apiPost } from "@/lib/api-client";

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    const sup =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(sup);
    if (!sup) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !standalone) setNeedsInstall(true);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Permiso denegado. Activalo en los ajustes del navegador.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key) as unknown as BufferSource,
      });
      await apiPost("/push/subscribe", sub.toJSON());
      setSubscribed(true);
      setMsg("¡Recordatorios activados! 🔔");
    } catch (e: any) {
      setMsg(e?.message || "No se pudo activar");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api("/push/subscribe", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Recordatorios desactivados");
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-medium">
          {subscribed ? (
            <Bell size={18} className="text-pitch" />
          ) : (
            <BellOff size={18} className="text-slate-400" />
          )}
          Recordatorios
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          Te avisamos ~1h antes de cada partido para que no te olvides de
          pronosticar.
        </p>
        {needsInstall && !subscribed && (
          <p className="mt-1 text-xs text-amber-500">
            En iPhone: agregá la app a la pantalla de inicio para poder activar
            los avisos.
          </p>
        )}
        {msg && <p className="mt-1 text-xs text-pitch">{msg}</p>}
      </div>
      <button
        className={subscribed ? "btn-ghost text-sm" : "btn-primary text-sm"}
        onClick={subscribed ? disable : enable}
        disabled={busy || (needsInstall && !subscribed)}
      >
        {busy ? "..." : subscribed ? "Desactivar" : "Activar"}
      </button>
    </div>
  );
}
