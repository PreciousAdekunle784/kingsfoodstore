/* Kings Food Mart — cart page.
   Loads the signed-in shopper's cart from Supabase, lets them change
   quantities and remove items, and keeps a running total. */
(() => {
    "use strict";
    const root = document.getElementById("cartRoot");
    const toast = document.getElementById("toast");
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    if (!root) return;

    let toastTimer = null;
    const showToast = (msg) => {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
    };

    const naira = (v) => "₦" + Number(v || 0).toLocaleString("en-NG");
    const eff = (p) => (p && p.sale_price != null && Number(p.sale_price) < Number(p.price)) ? Number(p.sale_price) : Number(p && p.price || 0);
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    let rows = [];          // { id, qty, product:{...} }
    let user = null;

    const stateCard = (icon, title, body, cta) => `
        <div class="cart-state">
            ${icon}
            <h2>${title}</h2>
            <p>${body}</p>
            ${cta || ""}
        </div>`;

    const BASKET_ICON = `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;

    const rowHTML = (r) => {
        const p = r.product || {};
        const line = eff(p) * r.qty;
        const img = p.image_url
            ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'" />`
            : "";
        return `<div class="cart-row" data-id="${r.id}">
            <div class="cart-row__media" style="--tint:${esc(p.tint || "#F0EAD8")}">${img}</div>
            <div class="cart-row__info">
                <div class="cart-row__name">${esc(p.name || "Item")}</div>
                <div class="cart-row__meta">${esc(p.weight || "")}</div>
                <div class="cart-row__unit">${(p.sale_price!=null && Number(p.sale_price)<Number(p.price)) ? `<span class="prod-card__price--was">${naira(p.price)}</span> ` : ""}${naira(eff(p))} each</div>
            </div>
            <div class="cart-row__right">
                <div class="qty">
                    <button class="qty__btn" data-act="dec" aria-label="Decrease quantity">−</button>
                    <span class="qty__val">${r.qty}</span>
                    <button class="qty__btn" data-act="inc" aria-label="Increase quantity">+</button>
                </div>
                <div class="cart-row__line">${naira(line)}</div>
                <button class="cart-row__remove" data-act="remove">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    Remove
                </button>
            </div>
        </div>`;
    };

    const render = () => {
        // signed out
        if (!user) {
            root.innerHTML = stateCard(BASKET_ICON, "Please sign in to see your basket",
                "Your basket is saved to your account. Sign in and it'll be right here.",
                `<a href="login.html" class="btn btn--primary" data-magnetic>Sign in</a>`);
            return;
        }
        // empty
        if (!rows.length) {
            root.innerHTML = stateCard(BASKET_ICON, "Your basket is empty",
                "Looks like you haven't added anything yet. Let's fix that.",
                `<a href="index.html#best-sellers" class="btn btn--primary" data-magnetic>Browse products</a>`);
            return;
        }
        const subtotal = rows.reduce((s, r) => s + eff(r.product) * r.qty, 0);
        const count = rows.reduce((s, r) => s + r.qty, 0);
        root.innerHTML = `<div class="cart-wrap">
            <div class="cart-list">${rows.map(rowHTML).join("")}</div>
            <aside class="cart-summary">
                <h2>Order summary</h2>
                <div class="cart-summary__row"><span>Items (${count})</span><span>${naira(subtotal)}</span></div>
                <div class="cart-summary__row"><span>Delivery</span><span>Calculated at checkout</span></div>
                <div class="cart-summary__row is-total"><span>Subtotal</span><span>${naira(subtotal)}</span></div>
                <p class="cart-summary__note">Delivery fees depend on your area and are added at checkout.</p>
                <button class="btn btn--primary btn--lg" id="checkoutBtn" data-magnetic>Proceed to checkout</button>
                <a href="index.html#best-sellers" class="cart-summary__continue">← Continue shopping</a>
            </aside>
        </div>`;
    };

    /* ── data ── */
    const load = async () => {
        if (!user) { render(); return; }
        const { data, error } = await window.sb
            .from("cart_items")
            .select("id, qty, product:products(id,name,weight,price,sale_price,image_url,tint,svg,stock)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });
        if (error) { showToast("Couldn't load your basket."); rows = []; }
        else { rows = data || []; }
        render();
    };

    const setQty = async (id, qty) => {
        const r = rows.find((x) => x.id === id);
        if (!r) return;
        r.qty = qty;                       // optimistic
        render();
        const { error } = await window.sb.from("cart_items").update({ qty }).eq("id", id);
        if (error) { showToast("Couldn't update quantity."); load(); }
    };

    const removeRow = async (id) => {
        const el = root.querySelector(`.cart-row[data-id="${id}"]`);
        if (el) el.classList.add("is-removing");
        rows = rows.filter((x) => x.id !== id);   // optimistic
        setTimeout(render, 220);
        const { error } = await window.sb.from("cart_items").delete().eq("id", id);
        if (error) { showToast("Couldn't remove item."); load(); }
        else showToast("Item removed");
    };

    /* ── interactions (delegated) ── */
    root.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-act]");
        if (!btn) return;
        const rowEl = e.target.closest(".cart-row");
        if (btn.id === "checkoutBtn") return;   // handled below
        if (!rowEl) return;
        const id = rowEl.dataset.id;
        const r = rows.find((x) => x.id === id);
        if (!r) return;
        const act = btn.dataset.act;
        if (act === "inc") setQty(id, r.qty + 1);
        else if (act === "dec") { r.qty > 1 ? setQty(id, r.qty - 1) : removeRow(id); }
        else if (act === "remove") removeRow(id);
    });

    root.addEventListener("click", (e) => {
        if (e.target.closest("#checkoutBtn")) {
            window.location.href = "checkout.html";
        }
    });

    /* ── boot: get the user, then load; react to sign-in/out ── */
    const boot = async () => {
        if (!window.SB_READY || !window.sb) {
            root.innerHTML = stateCard(BASKET_ICON, "Basket needs the store database",
                "Connect Supabase (add your keys in supabase-client.js) to use the basket.", "");
            return;
        }
        try {
            const { data } = await window.sb.auth.getSession();
            user = (data && data.session && data.session.user) || null;
        } catch (e) { user = null; }
        await load();
        window.sb.auth.onAuthStateChange((_e, session) => {
            user = (session && session.user) || null;
            load();
        });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
