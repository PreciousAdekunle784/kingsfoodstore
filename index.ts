// Kings Food Mart — notify-order Edge Function (Supabase / Deno)
// ─────────────────────────────────────────────────────────────────
// Emails you whenever a new order is placed, so you don't have to watch
// the Supabase dashboard. Triggered by a Database Webhook on orders INSERT
// (set that up in the dashboard — see the setup notes).
//
// Uses Resend (resend.com) to send the email — free tier, simple API.
//
// DEPLOY (dashboard, no CLI):
//   Supabase → Edge Functions → Deploy a new function → name "notify-order"
//   → paste this file → Deploy. Turn OFF "Verify JWT" for this function
//   (it's called by the database webhook, not a signed-in user).
// SECRETS (Edge Functions → Secrets):
//   RESEND_API_KEY  = your Resend API key (re_…)
//   OWNER_EMAIL     = where to send alerts, e.g. you@gmail.com
//   NOTIFY_FROM     = a verified Resend sender, e.g. "Kings Food Mart <orders@kingsfoodmart.ng>"
//                     (while testing you can use "Kings Food Mart <onboarding@resend.dev>")
// WEBHOOK (Database → Webhooks → Create):
//   Table: orders · Events: Insert · Type: Supabase Edge Function → notify-order

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const ngn = (v: number) => "₦" + Number(v || 0).toLocaleString("en-NG");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    // Database webhooks send { type, table, record, ... }; also accept a raw order.
    const order = body.record || body.order || body;
    if (!order || !order.id) return json({ ok: false, error: "No order" }, 400);

    // Pull the line items for a nice email body (service role bypasses RLS).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: items } = await admin
      .from("order_items").select("name, qty, unit_price").eq("order_id", order.id);

    const rows = (items || []).map((i: any) =>
      `<tr><td style="padding:4px 8px">${i.qty} × ${i.name}</td><td style="padding:4px 8px;text-align:right">${ngn(i.unit_price * i.qty)}</td></tr>`
    ).join("");

    const ref = String(order.id).slice(0, 8).toUpperCase();
    const pay = order.payment_method === "paystack" ? "Paid online" : "Pay on delivery";
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px">
        <h2 style="color:#00A858;margin:0 0 4px">New order #${ref}</h2>
        <p style="margin:0 0 14px;color:#555">${new Date(order.created_at || Date.now()).toLocaleString("en-NG")}</p>
        <p style="margin:0"><b>${order.full_name || "-"}</b><br>${order.phone || ""}<br>${order.address || ""}</p>
        <table style="border-collapse:collapse;margin:14px 0;width:100%">${rows}</table>
        <p style="font-size:18px;margin:0"><b>Total: ${ngn(order.total)}</b></p>
        <p style="color:#555;margin:4px 0 0">${pay} · status: ${order.status || "pending"}</p>
        ${order.note ? `<p style="margin:12px 0 0;color:#555"><b>Note:</b> ${order.note}</p>` : ""}
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("NOTIFY_FROM") || "Kings Food Mart <onboarding@resend.dev>",
        to: [Deno.env.get("OWNER_EMAIL")],
        subject: `🛒 New order ${ngn(order.total)} — ${order.full_name || ref}`,
        html,
      }),
    });
    if (!r.ok) return json({ ok: false, error: await r.text() }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
