// Web Push to franchise owner when a POS order is punched.
// Auth: x-owner-sale-push-secret (called from DB via pg_net). Deploy with --no-verify-jwt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-owner-sale-push-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PushRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatManilaTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function configureVapid(): boolean {
  const publicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY")?.trim();
  const privateKey = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY")?.trim();
  const subject =
    Deno.env.get("WEB_PUSH_VAPID_SUBJECT")?.trim() ||
    "mailto:support@franchisecity.ph";
  if (!publicKey || !privateKey) {
    console.warn("notify-owner-sale: VAPID keys missing");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expected = Deno.env.get("OWNER_SALE_PUSH_SECRET")?.trim();
  const provided = req.headers.get("x-owner-sale-push-secret")?.trim();
  if (!expected || !provided || provided !== expected) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!configureVapid()) {
    return jsonResponse({ error: "VAPID not configured" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  let orderId: string | null = null;
  try {
    const body = await req.json();
    orderId = typeof body?.order_id === "string" ? body.order_id : null;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  if (!orderId) {
    return jsonResponse({ error: "order_id required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: order, error: orderErr } = await admin
    .from("pos_order")
    .select("id, branch_id, total_amount, item_count, created_at, status, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return jsonResponse({ error: orderErr?.message ?? "Order not found" }, 404);
  }

  const status = String(order.status ?? "").toUpperCase();
  const pay = String(order.payment_status ?? "").toUpperCase();
  if (pay !== "PAID" || ["VOIDED", "REFUNDED", "CANCELLED"].includes(status)) {
    return jsonResponse({ skipped: true, reason: "not_paid_sale" });
  }

  const { data: branch } = await admin
    .from("branch")
    .select("id, name, owner_user_id")
    .eq("id", order.branch_id)
    .maybeSingle();

  const ownerId = branch?.owner_user_id as string | null | undefined;
  if (!ownerId) {
    return jsonResponse({ skipped: true, reason: "no_owner" });
  }

  // Prefer line-item sum when available; fall back to header item_count.
  let cups = Number(order.item_count) || 0;
  const { data: items } = await admin
    .from("pos_order_item")
    .select("quantity")
    .eq("pos_order_id", orderId);
  if (items?.length) {
    cups = items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  }

  const total = Number(order.total_amount) || 0;
  const branchName = String(branch?.name ?? "Your store");
  const punchedAt = formatManilaTime(String(order.created_at));
  const cupLabel = cups === 1 ? "1 cup" : `${cups} cups`;

  const payload = {
    title: `New sale — ${branchName}`,
    body: `${formatPeso(total)} · ${cupLabel} · ${punchedAt}`,
    url: "/dashboard",
    tag: `owner-sale-${orderId}`,
  };

  const { data: subs, error: subErr } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", ownerId);

  if (subErr) {
    return jsonResponse({ error: subErr.message }, 500);
  }
  if (!subs?.length) {
    return jsonResponse({ skipped: true, reason: "no_subscriptions", ownerId });
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  const dead: string[] = [];

  for (const row of subs as PushRow[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: 86_400 }
      );
      sent += 1;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        dead.push(row.endpoint);
      } else {
        console.error("notify-owner-sale: push failed", statusCode, err);
      }
    }
  }

  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return jsonResponse({
    ok: true,
    sent,
    recipients: subs.length,
    removedDead: dead.length,
  });
});
