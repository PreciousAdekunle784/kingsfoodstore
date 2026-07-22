/* Kings Food Mart — Paystack public key.
   ────────────────────────────────────────────────────────────
   SETUP: paste your Paystack PUBLIC key below.
   Find it in the Paystack dashboard → Settings → API Keys & Webhooks.
   Use the TEST key (pk_test_…) while testing, then switch to the
   LIVE key (pk_live_…) when you're ready to take real money.

   Only the PUBLIC key goes here — it's safe in the browser.
   Your SECRET key (sk_…) must NEVER be in any website file; it lives
   only in the Supabase Edge Function (see verify-payment/index.ts). */

const PAYSTACK_PUBLIC_KEY = "pk_live_86332c190507c82d135d897432ea4cb285cbdc79";

window.PAYSTACK_READY = /^pk_(test|live)_[A-Za-z0-9]+/.test(PAYSTACK_PUBLIC_KEY)
    && !PAYSTACK_PUBLIC_KEY.includes("PASTE_YOUR");
window.PAYSTACK_PUBLIC_KEY = PAYSTACK_PUBLIC_KEY;
