/* Kings Food Mart — Supabase connection.
   ────────────────────────────────────────────────────────────
   SETUP (one-time): paste your project's URL and anon (public) key.
   Find them in the Supabase dashboard → Project Settings → API.
   The anon key is safe to expose in the browser — Row Level Security
   (see supabase-setup.sql) is what actually protects your data.

   This file must load AFTER the supabase-js library and BEFORE
   session.js / auth.js / google-auth.js / script.js. */

const SUPABASE_URL = "https://qqmxeonpwmoydiyfqcyo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbXhlb25wd21veWRpeWZxY3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NzcxMjksImV4cCI6MjEwMDI1MzEyOX0.VoIFo5tbdUYaGR2UMrq_O5y1BRSIxkMdRMsBKeH8bTc";

window.SB_READY = false;
try {
    if (window.supabase && typeof window.supabase.createClient === "function"
        && !/YOUR-/.test(SUPABASE_URL) && !/YOUR-/.test(SUPABASE_ANON_KEY)) {
        // create the shared client the rest of the site uses as window.sb
        window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.SB_READY = true;
    } else {
        console.warn("[KFM] Supabase not configured yet — add your URL and anon key in supabase-client.js");
    }
} catch (e) {
    console.error("[KFM] Supabase failed to initialise:", e);
}
