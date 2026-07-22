// Kings Food Mart — verify-payment Edge Function (Supabase / Deno)
// ─────────────────────────────────────────────────────────────────
// Verifies a Paystack transaction with your SECRET key, then marks the
// matching order 'paid'. The browser can never do this itself (there's
// no client UPDATE policy on orders), so this is the only trusted path.
//
// DEPLOY (dashboard, no CLI needed):
//   Supabase → Edge Functions → Deploy a new function → name it
//   "verify-payment" → paste this file → Deploy.
// SET THE SECRET:
//   Supabase → Edge Functions → Secrets (or Settings) → add
//   PAYSTACK_SECRET_KEY = sk_test_… (or sk_live_… when live).
//   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { reference, order_id } = await req.json();
    if (!reference || !order_id) {
      return json({ verified: false, error: "Missing reference or order_id" }, 400);
    }

    // 1) Ask Paystack whether this transaction really succeeded.
    const pRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` } },
    );
    const pData = await pRes.json();
    const ok = pData?.status === true && pData?.data?.status === "success";
    if (!ok) return json({ verified: false, error: "Payment not successful" });

    const paidKobo = Number(pData.data.amount || 0);

    // 2) Identify the signed-in user from their JWT.
    const authHeader = req.headers.get("Authorization") || "";
    const asUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ verified: false, error: "Not signed in" }, 401);

    // 3) Load the order (service role) and check the amount matches.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: order } = await admin
      .from("orders").select("id,total,user_id,status")
      .eq("id", order_id).eq("user_id", user.id).single();
    if (!order) return json({ verified: false, error: "Order not found" }, 404);

    const expectedKobo = Math.round(Number(order.total) * 100);
    if (paidKobo < expectedKobo) {
      return json({ verified: false, error: "Amount mismatch" });
    }

    // 4) Mark it paid.
    await admin.from("orders")
      .update({ status: "paid", payment_ref: reference, payment_method: "paystack" })
      .eq("id", order_id);

    return json({ verified: true });
  } catch (e) {
    return json({ verified: false, error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
