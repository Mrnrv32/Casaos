"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";

export type PushStatus =
  | "loading"
  | "unsupported" // navegador sin Push API
  | "no-sw"       // sin service worker (dev, o PWA no instalada en iOS)
  | "denied"      // permiso bloqueado en el navegador
  | "off"
  | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { userId, homeId } = useHome();
  const supabase = createClient();

  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (isIOS && !standalone) setNeedsInstall(true);

      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (cancelled) return;
      if (!reg) {
        setStatus("no-sw");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setStatus(sub ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("denied");
        return false;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setStatus("no-sw");
        return false;
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("suscripción incompleta");
      }
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          home_id: homeId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent.slice(0, 200),
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setStatus("on");
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [supabase, userId, homeId]);

  const disable = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }, [supabase]);

  return { status, busy, needsInstall, enable, disable };
}
