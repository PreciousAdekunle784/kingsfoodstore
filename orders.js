/* Kings Food Mart — My Orders (order history for the signed-in user). */
(() => {
    "use strict";
    const root = document.getElementById("ordersRoot");
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    if (!root) return;

    const naira = (v) => "₦" + Number(v || 0).toLocaleString("en-NG");
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const when = (iso) => {
        try { return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); }
        catch (e) { return ""; }
    };
    const ICON = `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>`;
    const state = (title, body, cta) =>
        `<div class="cart-state">${ICON}<h2>${title}</h2><p>${body}</p>${cta || ""}</div>`;

    const STATUS = {
        pending: "Pending", paid: "Paid", delivered: "Delivered", cancelled: "Cancelled"
    };

    const orderCard = (o) => {
        const items = (o.order_items || []);
        const lines = items.map((it) =>
            `<div class="order-line"><span>${esc(it.name)} × ${it.qty}</span><span>${naira(Number(it.unit_price) * it.qty)}</span></div>`
        ).join("") || `<div class="order-line"><span>Order items</span><span></span></div>`;
        const st = (o.status || "pending").toLowerCase();
        const stLabel = STATUS[st] || st;
        const ref = "#" + String(o.id).slice(0, 8).toUpperCase();
        const mapLink = (o.lat != null && o.lng != null)
            ? ` · <a href="https://www.google.com/maps?q=${o.lat},${o.lng}" target="_blank" rel="noopener">view on map</a>` : "";
        const pay = o.payment_method === "paystack" ? "Paid online" : "Pay on delivery";
        return `<article class="order-card">
            <div class="order-card__head">
                <span class="order-card__ref">Order ${ref}</span>
                <span class="order-card__date">${when(o.created_at)}</span>
                <span class="order-card__spacer"></span>
                <span class="order-status order-status--${esc(st)}">${esc(stLabel)}</span>
            </div>
            <div class="order-card__body">
                <div class="order-lines">${lines}</div>
                <div class="order-card__foot">
                    <div class="order-card__addr">${esc(o.address || "")}${mapLink}<br><span class="order-card__pay">${pay}</span></div>
                    <div class="order-card__total">${naira(o.total)}</div>
                </div>
            </div>
        </article>`;
    };

    const render = (orders, user) => {
        if (!user) {
            root.innerHTML = state("Please sign in to see your orders",
                "Your order history is tied to your account.",
                `<a href="login.html" class="btn btn--primary" data-magnetic>Sign in</a>`);
            return;
        }
        if (!orders.length) {
            root.innerHTML = state("No orders yet",
                "When you place your first order, it'll show up here.",
                `<a href="index.html#best-sellers" class="btn btn--primary" data-magnetic>Start shopping</a>`);
            return;
        }
        root.innerHTML = `<div class="orders-list">${orders.map(orderCard).join("")}</div>`;
    };

    const boot = async () => {
        if (!window.SB_READY || !window.sb) {
            root.innerHTML = state("Orders need the store database",
                "Connect Supabase (add your keys in supabase-client.js) to see order history.", "");
            return;
        }
        let user = null;
        try {
            const { data } = await window.sb.auth.getSession();
            user = (data && data.session && data.session.user) || null;
        } catch (e) { user = null; }
        if (!user) { render([], null); return; }

        const { data, error } = await window.sb.from("orders")
            .select("id, created_at, status, total, address, lat, lng, payment_method, order_items(name, qty, unit_price)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
        render(error ? [] : (data || []), user);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
