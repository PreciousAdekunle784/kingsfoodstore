/* Kings Food Mart — admin subscribers list.
   Shows the newsletter sign-ups. Admin-only (owner email or is_admin). */
(() => {
    "use strict";
    const root = document.getElementById("subsRoot");
    const toast = document.getElementById("toast");
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    if (!root) return;

    const ADMIN_EMAIL = "kingsfoodstoreabuja@gmail.com";
    let toastTimer = null;
    const showToast = (m) => { if (!toast) return; toast.textContent = m; toast.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200); };
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const when = (iso) => { try { return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
    const notice = (t, b) => `<div class="cart-state"><h2>${t}</h2><p>${b}</p></div>`;

    let subs = [];

    const render = () => {
        if (!subs.length) { root.innerHTML = notice("No subscribers yet", "When someone signs up in the newsletter box, they'll appear here.<br><br>If you know people have subscribed but see none here, re-run <strong>supabase-subscribers.sql</strong> in Supabase — the admin read-permission may not have applied."); return; }
        const rows = subs.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.email)}</td><td>${when(s.created_at)}</td></tr>`).join("");
        root.innerHTML = `
            <div class="subs-bar">
                <span class="subs-count">${subs.length} subscriber${subs.length === 1 ? "" : "s"}</span>
                <div class="subs-actions">
                    <button class="btn btn--ghost btn--sm" id="copyEmails" type="button">Copy all emails</button>
                    <button class="btn btn--primary btn--sm" id="downloadCsv" type="button">Download CSV</button>
                </div>
            </div>
            <div class="subs-table-wrap">
                <table class="subs-table">
                    <thead><tr><th>#</th><th>Email</th><th>Joined</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;

        const copyBtn = document.getElementById("copyEmails");
        if (copyBtn) copyBtn.addEventListener("click", async () => {
            const text = subs.map((s) => s.email).join(", ");
            try { await navigator.clipboard.writeText(text); showToast("All emails copied"); }
            catch (e) { showToast("Couldn't copy — try Download CSV"); }
        });
        const csvBtn = document.getElementById("downloadCsv");
        if (csvBtn) csvBtn.addEventListener("click", () => {
            const csv = "email,joined\n" + subs.map((s) => `${s.email},${s.created_at}`).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "kings-food-mart-subscribers.csv";
            a.click();
            URL.revokeObjectURL(a.href);
        });
    };

    const boot = async () => {
        if (!window.SB_READY || !window.sb) { root.innerHTML = notice("Database not connected", "Add your Supabase keys in supabase-client.js."); return; }
        let user = null;
        try { const { data } = await window.sb.auth.getSession(); user = data && data.session && data.session.user; } catch (e) {}
        if (!user) { root.innerHTML = notice("Please sign in", 'Sign in with your admin account. <a href="/login">Sign in</a>'); return; }
        let isAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL;
        if (!isAdmin) { const { data: prof } = await window.sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(); isAdmin = !!(prof && prof.is_admin); }
        if (!isAdmin) { root.innerHTML = notice("Access denied", "This page is for store admins only."); return; }

        const { data, error } = await window.sb.from("subscribers").select("email, created_at").order("created_at", { ascending: false });
        if (error) { root.innerHTML = notice("Couldn't load subscribers", esc(error.message) + " — did you run supabase-subscribers.sql?"); return; }
        subs = data || [];
        render();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
