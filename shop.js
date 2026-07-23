/* Kings Food Mart — shop / all-products page with category filtering.
   Reads ?category=… from the URL; no param = all products. */
(() => {
    "use strict";
    const grid = document.getElementById("shopGrid");
    const filters = document.getElementById("shopFilters");
    const titleEl = document.getElementById("shopTitle");
    const subEl = document.getElementById("shopSub");
    const cartBtn = document.getElementById("shopCartBtn");
    const cartCount = document.getElementById("shopCartCount");
    const toast = document.getElementById("toast");
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    if (!grid) return;

    const CATEGORIES = [
        "Rice & Grains", "Pasta & Noodles", "Beans & Legumes", "Cooking Oils",
        "Flour & Baking", "Tinned & Packaged", "Milk & Cereals", "Seasonings & Spices",
        "Beverages & Drinks", "Snacks & Biscuits", "Household & Cleaning", "Provisions & Staples"
    ];

    let toastTimer = null;
    const showToast = (msg) => {
        if (!toast) return;
        toast.textContent = msg; toast.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
    };
    const naira = (v) => "₦" + Number(v || 0).toLocaleString("en-NG");
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    const params = new URLSearchParams(location.search);
    const category = params.get("category");   // null = all
    let user = null;

    /* header + filter chips */
    if (category) {
        titleEl.textContent = category;
        subEl.textContent = "Browse our " + category.toLowerCase() + ".";
    }
    const paintFilters = (names) => {
        filters.innerHTML = [`<a class="chip ${!category ? "is-active" : ""}" href="/shop">All</a>`]
            .concat(names.map((c) =>
                `<a class="chip ${category === c ? "is-active" : ""}" href="/shop?category=${encodeURIComponent(c)}">${esc(c)}</a>`
            )).join("");
    };
    paintFilters(CATEGORIES);   // shown immediately; refreshed from the DB below

    const star = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z"/></svg>`;

    const cardHTML = (p) => {
        const stockLow = p.stock === "low";
        const onSale = p.sale_price != null && Number(p.sale_price) < Number(p.price);
        const eff = onSale ? Number(p.sale_price) : Number(p.price);
        let badge = "";
        if (p.preorder) badge = `<span class="prod-card__badge prod-card__badge--preorder">Pre-order</span>`;
        else if (onSale) badge = `<span class="prod-card__badge prod-card__badge--sale">Sale</span>`;
        else if (p.badge) badge = `<span class="prod-card__badge${p.badge_fresh ? " prod-card__badge--fresh" : ""}">${esc(p.badge)}</span>`;
        const priceHTML = onSale
            ? `<span class="prod-card__price--was">${naira(p.price)}</span>${naira(eff)}`
            : naira(eff);
        const btnLabel = p.preorder ? "Pre-order" : "Quick Add";
        const img = p.image_url
            ? `<img class="photo prod-card__photo is-loaded" src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">` : "";
        return `<li class="prod-card" style="--tint:${esc(p.tint || "#F0EAD8")}">
            <div class="prod-card__media">${img}${badge}</div>
            <div class="prod-card__info">
                <div class="prod-card__meta">
                    <span class="prod-card__rating">${star}${esc(String(p.rating || "4.8"))}</span>
                    <span class="prod-card__stock prod-card__stock--${stockLow ? "low" : "in"}">${stockLow ? "Low stock" : "In stock"}</span>
                </div>
                <h3 class="prod-card__name">${esc(p.name)}</h3>
                <p class="prod-card__weight">${esc(p.weight || "")}</p>
                <div class="prod-card__row">
                    <p class="prod-card__price">${priceHTML}</p>
                    <button class="quick-add" data-name="${esc(p.name)}" data-product-id="${esc(p.id)}" aria-label="${btnLabel} ${esc(p.name)}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>${btnLabel}</span>
                    </button>
                </div>
            </div>
        </li>`;
    };

    const emptyState = () => `<div class="cart-state">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <h2>Nothing here yet</h2>
        <p>We're still stocking this category. Check back soon or browse everything.</p>
        <a href="/shop" class="btn btn--primary" data-magnetic>View all products</a>
    </div>`;

    const renderProducts = (list) => {
        if (!list.length) { grid.innerHTML = emptyState(); return; }
        grid.innerHTML = `<ul class="prod-grid shop-grid" role="list">${list.map(cardHTML).join("")}</ul>`;
    };

    /* ── cart ── */
    const refreshCount = async () => {
        if (!user || !cartCount) { if (cartCount) cartCount.textContent = "0"; return; }
        const { data } = await window.sb.from("cart_items").select("qty").eq("user_id", user.id);
        cartCount.textContent = String((data || []).reduce((s, r) => s + (r.qty || 0), 0));
    };

    const addToCart = async (productId, name) => {
        if (!user) { showToast("Please sign in to add items"); setTimeout(() => location.href = "/login", 800); return; }
        const { data: ex } = await window.sb.from("cart_items")
            .select("id,qty").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
        if (ex) await window.sb.from("cart_items").update({ qty: ex.qty + 1 }).eq("id", ex.id);
        else await window.sb.from("cart_items").insert({ user_id: user.id, product_id: productId, qty: 1 });
        showToast(name + " added to your basket");
        refreshCount();
    };

    grid.addEventListener("click", (e) => {
        const btn = e.target.closest(".quick-add");
        if (!btn) return;
        const label = btn.querySelector("span");
        const original = label ? label.textContent : "";
        if (label) { label.textContent = "Added ✓"; setTimeout(() => { label.textContent = original; }, 1400); }
        addToCart(btn.dataset.productId, btn.dataset.name);
    });

    if (cartBtn) cartBtn.addEventListener("click", () => {
        location.href = user ? "/cart" : "/login";
    });

    /* ── boot ── */
    const boot = async () => {
        if (!window.SB_READY || !window.sb) {
            grid.innerHTML = `<div class="cart-state"><h2>Shop needs the store database</h2><p>Connect Supabase (add your keys in supabase-client.js) to list products.</p></div>`;
            return;
        }
        try {
            const { data } = await window.sb.auth.getSession();
            user = (data && data.session && data.session.user) || null;
        } catch (e) { user = null; }
        refreshCount();

        // refresh the filter chips from the admin's categories
        try {
            const { data: cd } = await window.sb.from("categories").select("name").order("sort", { ascending: true });
            if (cd && cd.length) paintFilters(cd.map((c) => c.name));
        } catch (e) { /* keep the built-in chips */ }

        let q = window.sb.from("products").select("*").order("sort", { ascending: true });
        if (category) q = q.eq("category", category);
        const { data, error } = await q;
        renderProducts(error ? [] : (data || []));

        window.sb.auth.onAuthStateChange((_e, s) => { user = (s && s.user) || null; refreshCount(); });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
