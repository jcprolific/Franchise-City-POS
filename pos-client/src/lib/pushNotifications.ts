import { supabase, isSupabaseConfigured } from './supabase';

const SW_SCRIPT_URL = `/sw.js?v=20260714181500`;

export type PushEnableResult =
  | { ok: true; reason: string }
  | { ok: false; reason: string };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIosDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePwa(): boolean {
  try {
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    );
  } catch {
    return false;
  }
}

export async function registerPosServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_SCRIPT_URL, {
      scope: '/',
      updateViaCache: 'none',
    });
    try {
      await reg.update();
    } catch {
      /* ignore */
    }
    return reg;
  } catch (err) {
    console.warn('[push] SW register failed', err);
    return null;
  }
}

async function fetchVapidPublicKey(): Promise<string | null> {
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!base) return null;

  const res = await fetch(`${base}/functions/v1/push-config`, {
    headers: key
      ? { apikey: key, Authorization: `Bearer ${key}` }
      : {},
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { publicKey?: string };
  return json.publicKey ?? null;
}

async function saveSubscription(subscription: PushSubscription) {
  if (!isSupabaseConfigured()) return { error: { message: 'no_supabase' } };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'no_user' } };

  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  return supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: keys.p256dh ?? '',
      auth: keys.auth ?? '',
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
}

export async function getNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Owner-facing enable flow (must be triggered by a user gesture). */
export async function enableOwnerSaleNotifications(): Promise<PushEnableResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  // iOS Web Push only works from Home Screen PWA — tip the user, but still attempt.
  if (isIosDevice() && !isStandalonePwa()) {
    // Continue: some builds report non-standalone incorrectly; subscribe failure handles it.
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    if (isIosDevice() && !isStandalonePwa()) {
      return { ok: false, reason: 'ios_not_standalone' };
    }
    return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' };
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return { ok: false, reason: 'missing_public_key' };
  }

  const reg = await registerPosServiceWorker();
  if (!reg) {
    return { ok: false, reason: 'sw_failed' };
  }

  try {
    const ready = await navigator.serviceWorker.ready;
    const existing = await ready.pushManager.getSubscription();
    if (existing) {
      try {
        await existing.unsubscribe();
      } catch {
        /* ignore */
      }
    }

    const sub = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const saveRes = await saveSubscription(sub);
    if (saveRes.error) {
      return { ok: false, reason: saveRes.error.message ?? 'save_failed' };
    }

    return { ok: true, reason: 'subscribed' };
  } catch (err) {
    console.warn('[push] subscribe failed', err);
    if (isIosDevice() && !isStandalonePwa()) {
      return { ok: false, reason: 'ios_not_standalone' };
    }
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'subscribe_failed',
    };
  }
}

/** Refresh subscription if permission already granted (safe on page load). */
export async function maintainOwnerPushSubscription(): Promise<PushEnableResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (Notification.permission !== 'granted') return { ok: false, reason: 'not_granted' };
  if (isIosDevice() && !isStandalonePwa()) return { ok: false, reason: 'ios_not_standalone' };

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) return { ok: false, reason: 'missing_public_key' };

  const reg = await registerPosServiceWorker();
  if (!reg) return { ok: false, reason: 'sw_failed' };

  const ready = await navigator.serviceWorker.ready;
  let sub = await ready.pushManager.getSubscription();
  if (!sub) {
    sub = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const saveRes = await saveSubscription(sub);
  if (saveRes.error) {
    return { ok: false, reason: saveRes.error.message ?? 'save_failed' };
  }
  return { ok: true, reason: 'refreshed' };
}
