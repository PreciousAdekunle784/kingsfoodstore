/* Kings Food Mart — admin orders dashboard.
   Only users flagged is_admin in profiles can see this data (enforced by
   RLS in supabase-admin.sql). Others get an access-denied screen. */
(() => {
    "use strict";
    const root = document.getElementById("adminRoot");
    const filtersEl = document.getElementById("adminFilters");
    const subEl = document.getElementById("adminSub");
    const refreshBtn = document.getElementById("refreshBtn");
    const toast = document.getElementById("toast");
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    if (!root) return;

    let toastTimer = null;
    const showToast = (m) => { if (!toast) return; toast.textContent = m; toast.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200); };
    const naira = (v) => "₦" + Number(v || 0).toLocaleString("en-NG");
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const when = (iso) => { try { return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };

    const STATUSES = ["pending", "paid", "delivered", "cancelled"];
    let all = [];
    let filter = "all";

    const notice = (title, body) => `<div class="cart-state"><h2>${title}</h2><p>${body}</p></div>`;

    const orderCard = (o) => {
        const items = (o.order_items || []).map((it) =>
            `<div class="order-line"><span>${esc(it.name)} × ${it.qty}</span><span>${naira(Number(it.unit_price) * it.qty)}</span></div>`).join("");
        const st = (o.status || "pending").toLowerCase();
        const opts = STATUSES.map((s) => `<option value="${s}" ${s === st ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("");
        const pay = o.payment_method === "paystack" ? "Paid online" : "Pay on delivery";
        return `<article class="order-card" data-id="${o.id}">
            <div class="order-card__head">
                <span class="order-card__ref">#${String(o.id).slice(0, 8).toUpperCase()}</span>
                <span class="order-card__date">${when(o.created_at)}</span>
                <span class="order-card__spacer"></span>
                <span class="order-status order-status--${esc(st)}">${esc(st)}</span>
            </div>
            <div class="order-card__body">
                <p class="admin-cust"><strong>${esc(o.full_name || "—")}</strong> · <a href="tel:${esc(o.phone || "")}">${esc(o.phone || "")}</a></p>
                <p class="admin-addr">${esc(o.address || "")}</p>
                <div class="order-lines">${items || '<div class="order-line"><span>No items</span><span></span></div>'}</div>
                <div class="order-card__foot">
                    <label class="admin-status">Status
                        <select data-id="${o.id}" class="admin-status__select">${opts}</select>
                    </label>
                    <div class="order-card__total">${naira(o.total)} <span class="order-card__pay">· ${pay}</span></div>
                </div>
            </div>
        </article>`;
    };

    const render = () => {
        const list = filter === "all" ? all : all.filter((o) => (o.status || "pending") === filter);
        const counts = STATUSES.reduce((a, s) => (a[s] = all.filter((o) => (o.status || "pending") === s).length, a), {});
        filtersEl.innerHTML = [`<button class="chip ${filter === "all" ? "is-active" : ""}" data-f="all">All (${all.length})</button>`]
            .concat(STATUSES.map((s) => `<button class="chip ${filter === s ? "is-active" : ""}" data-f="${s}">${s[0].toUpperCase() + s.slice(1)} (${counts[s]})</button>`)).join("");
        root.innerHTML = list.length
            ? `<div class="orders-list">${list.map(orderCard).join("")}</div>`
            : notice("No orders here", "Nothing matches this filter yet.");
    };

    filtersEl.addEventListener("click", (e) => {
        const b = e.target.closest("[data-f]");
        if (!b) return;
        filter = b.dataset.f; render();
    });

    root.addEventListener("change", async (e) => {
        const sel = e.target.closest(".admin-status__select");
        if (!sel) return;
        const id = sel.dataset.id, status = sel.value;
        const { error } = await window.sb.from("orders").update({ status }).eq("id", id);
        if (error) { showToast("Couldn't update — are you an admin?"); return; }
        const o = all.find((x) => x.id === id); if (o) o.status = status;
        showToast("Order marked " + status);
        render();
    });

    const load = async () => {
        const { data, error } = await window.sb.from("orders")
            .select("id, created_at, status, total, full_name, phone, address, payment_method, order_items(name, qty, unit_price)")
            .order("created_at", { ascending: false });
        if (error) { root.innerHTML = notice("Couldn't load orders", esc(error.message)); return; }
        all = data || [];
        render();
    };
    if (refreshBtn) refreshBtn.addEventListener("click", load);

    const boot = async () => {
        if (!window.SB_READY || !window.sb) { root.innerHTML = notice("Database not connected", "Add your Supabase keys in supabase-client.js."); return; }
        let user = null;
        try { const { data } = await window.sb.auth.getSession(); user = data && data.session && data.session.user; } catch (e) {}
        if (!user) { root.innerHTML = notice("Please sign in", 'Sign in with your admin account, then reload. <a href="login.html">Sign in</a>'); return; }
        // must be an admin
        const { data: prof } = await window.sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
        if (!prof || !prof.is_admin) {
            root.innerHTML = notice("Access denied", "This page is for store admins only.");
            if (subEl) subEl.textContent = "";
            filtersEl.innerHTML = "";
            return;
        }
        await load();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
