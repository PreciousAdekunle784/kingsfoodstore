/* Kings Food Mart — checkout & order placement.
   Collects delivery details, shows the order, and on "Place order"
   writes to orders + order_items, then clears the cart. */
(() => {
    "use strict";

    /* ── delivery pricing (edit these to your real rates) ── */
    const DELIVERY_FEE = 1500;          // flat delivery fee, in Naira
    const FREE_DELIVERY_OVER = 50000;   // free delivery at/above this subtotal

    /* ── pickup / delivery locations (edit this list to your real areas) ──
       Just add or remove names. The customer picks the one closest to them. */
    const PICKUP_LOCATIONS = [
        "Apo Resettlement (Main Store)",
        "Apo Legislative Quarters",
        "Gudu",
        "Lokogoma",
        "Galadimawa",
        "Games Village",
        "Gwarinpa",
        "Kubwa",
        "Lugbe",
        "Wuse 2",
        "Garki",
        "Utako",
        "Jabi",
        "Maitama",
        "Asokoro",
        "Central Area"
    ];

    const root = document.getElementById("checkoutRoot");
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
        toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
    };
    const naira = (v) => "₦" + Number(v || 0).toLocaleString("en-NG");
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    let rows = [], user = null, profile = null, busy = false;

    const BASKET_ICON = `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
    const stateCard = (title, body, cta) =>
        `<div class="cart-state">${BASKET_ICON}<h2>${title}</h2><p>${body}</p>${cta || ""}</div>`;

    const totals = () => {
        const subtotal = rows.reduce((s, r) => s + Number(r.product ? r.product.price : 0) * r.qty, 0);
        const delivery = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
        return { subtotal, delivery, total: subtotal + delivery };
    };

    const render = () => {
        if (!user) {
            root.innerHTML = stateCard("Please sign in to check out",
                "You need to be signed in to place an order.",
                `<a href="login.html" class="btn btn--primary" data-magnetic>Sign in</a>`);
            return;
        }
        if (!rows.length) {
            root.innerHTML = stateCard("Your basket is empty",
                "Add a few items before checking out.",
                `<a href="index.html#best-sellers" class="btn btn--primary" data-magnetic>Browse products</a>`);
            return;
        }
        const t = totals();
        const name = (profile && profile.full_name) || (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || "";
        const phone = (profile && profile.phone) || (user.user_metadata && user.user_metadata.phone) || "";
        const payReady = !!window.PAYSTACK_READY;
        const itemsHTML = rows.map((r) => {
            const p = r.product || {};
            const img = p.image_url ? `<img src="${esc(p.image_url)}" alt="" onerror="this.style.display='none'">` : "";
            return `<div class="co-item">
                <div class="co-item__media" style="--tint:${esc(p.tint || "#F0EAD8")}">${img}</div>
                <div class="co-item__info">
                    <div class="co-item__name">${esc(p.name)}</div>
                    <div class="co-item__qty">${r.qty} × ${naira(p.price)}</div>
                </div>
                <div class="co-item__line">${naira(Number(p.price) * r.qty)}</div>
            </div>`;
        }).join("");

        root.innerHTML = `<div class="checkout-wrap">
            <div class="checkout-card">
                <h2>Delivery details</h2>
                <p class="hint">Where should we bring your order?</p>
                <form id="checkoutForm" novalidate>
                    <div class="contact-grid-2">
                        <div class="pfield">
                            <label class="pfield__label" for="coName">Full name</label>
                            <input type="text" id="coName" name="coName" value="${esc(name)}" placeholder="e.g. Adaeze Okoro" autocomplete="name" required />
                            <p class="pfield__error" role="alert"></p>
                        </div>
                        <div class="pfield">
                            <label class="pfield__label" for="coPhone">Phone number</label>
                            <input type="tel" id="coPhone" name="coPhone" value="${esc(phone)}" placeholder="0803 000 0000" autocomplete="tel" required />
                            <p class="pfield__error" role="alert"></p>
                        </div>
                    </div>
                    <div class="pfield">
                        <label class="pfield__label" for="coArea">Pickup / delivery location</label>
                        <select id="coArea" name="coArea" required>
                            <option value="" disabled selected>Select the location closest to you…</option>
                            ${PICKUP_LOCATIONS.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join("")}
                        </select>
                        <p class="pfield__error" role="alert"></p>
                    </div>
                    <div class="pfield">
                        <label class="pfield__label" for="coLandmark">Nearest landmark or street <span style="font-weight:400;color:var(--ink-soft)">(optional)</span></label>
                        <input type="text" id="coLandmark" name="coLandmark" placeholder="e.g. beside GTBank, off Road 4" autocomplete="off" />
                        <p class="pfield__error" role="alert"></p>
                    </div>
                    <div class="pfield">
                        <label class="pfield__label" for="coNote">Delivery note <span style="font-weight:400;color:var(--ink-soft)">(optional)</span></label>
                        <textarea id="coNote" name="coNote" placeholder="Landmark, gate code, preferred time…"></textarea>
                    </div>
                </form>
            </div>

            <aside class="cart-summary">
                <h2>Your order</h2>
                <div class="co-items">${itemsHTML}</div>
                <div class="cart-summary__row"><span>Subtotal</span><span>${naira(t.subtotal)}</span></div>
                <div class="cart-summary__row"><span>Delivery</span><span>${t.delivery === 0 ? "Free" : naira(t.delivery)}</span></div>
                <div class="cart-summary__row is-total"><span>Total</span><span>${naira(t.total)}</span></div>
                <div class="pay-methods">
                    ${payReady ? `<label class="pay-opt"><input type="radio" name="paymethod" value="online" checked><span><strong>Pay online now</strong><small>Card · transfer · USSD — secured by Paystack</small></span></label>` : ""}
                    <label class="pay-opt"><input type="radio" name="paymethod" value="delivery" ${payReady ? "" : "checked"}><span><strong>Pay on delivery</strong><small>Cash or transfer when your order arrives</small></span></label>
                </div>
                <button class="btn btn--primary btn--lg" id="placeOrderBtn" data-magnetic>${payReady ? "Pay " + naira(t.total) + " now" : "Place order · " + naira(t.total)}</button>
                <a href="cart.html" class="cart-summary__continue">← Edit basket</a>
            </aside>
        </div>`;
    };

    const selectedMethod = () => {
        const el = document.querySelector('input[name="paymethod"]:checked');
        return el ? el.value : "delivery";
    };
    const setBtnLabel = () => {
        const btn = document.getElementById("placeOrderBtn");
        if (!btn || busy) return;
        const t = totals();
        btn.textContent = selectedMethod() === "online" ? "Pay " + naira(t.total) + " now" : "Place order · " + naira(t.total);
    };

    const showError = (id, msg) => {
        const el = document.getElementById(id);
        if (!el) return;
        const field = el.closest(".pfield");
        const err = field && field.querySelector(".pfield__error");
        if (err) err.textContent = msg || "";
        if (field) field.classList.toggle("is-invalid", !!msg);
    };

    /* create the order + its line items; returns the new order id */
    const createOrder = async (d, method, status, ref, total) => {
        const payload = {
            user_id: user.id, status, total,
            full_name: d.name, phone: d.phone, address: d.address, note: d.note,
            payment_method: method, payment_ref: ref
        };
        if (d.lat != null && d.lng != null) { payload.lat = d.lat; payload.lng = d.lng; }
        const { data: order, error: oErr } = await window.sb.from("orders")
            .insert(payload).select("id").single();
        if (oErr) throw oErr;
        const lineItems = rows.map((r) => ({
            order_id: order.id,
            product_id: r.product ? r.product.id : null,
            name: r.product ? r.product.name : "Item",
            unit_price: r.product ? r.product.price : 0,
            qty: r.qty
        }));
        const { error: iErr } = await window.sb.from("order_items").insert(lineItems);
        if (iErr) throw iErr;
        return order.id;
    };

    const reenable = (btn, t) => {
        busy = false;
        if (btn) { btn.disabled = false; btn.textContent = selectedMethod() === "online" ? "Pay " + naira(t.total) + " now" : "Place order · " + naira(t.total); }
    };

    const showSuccess = (name, phone, orderId, reference, total, method) => {
        const ref = reference || ("#" + orderId.slice(0, 8).toUpperCase());
        const paidLine = method === "paystack"
            ? `<p>Payment received. We'll pack your order and be in touch on ${esc(phone)}.</p>`
            : `<p>We'll call ${esc(phone)} to confirm, and you'll pay on delivery.</p>`;
        root.innerHTML = `<div class="co-success">
            <div class="co-success__badge"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></div>
            <h2>Thank you, ${esc(name.split(" ")[0])}!</h2>
            ${paidLine}
            <span class="co-success__ref">${esc(String(ref))}</span>
            <p style="margin-bottom:22px">Total: <strong>${naira(total)}</strong>${method === "paystack" ? " · Paid online" : " · Pay on delivery"}</p>
            <div class="co-success__actions">
                <a href="orders.html" class="btn btn--primary" data-magnetic>View my orders</a>
                <a href="index.html" class="btn btn--ghost">Continue shopping</a>
            </div>
        </div>`;
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const startPaystack = (d, t, btn) => {
        const email = user.email || (user.user_metadata && user.user_metadata.email) || "";
        if (!email) { showToast("Add an email to your account to pay online."); reenable(btn, t); return; }
        if (typeof PaystackPop === "undefined") { showToast("Payment failed to load — please refresh and try again."); reenable(btn, t); return; }
        const pop = new PaystackPop();
        pop.newTransaction({
            key: window.PAYSTACK_PUBLIC_KEY,
            email,
            amount: Math.round(t.total * 100),   // kobo
            currency: "NGN",
            reference: "KFM-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
            onSuccess: async (txn) => {
                try {
                    const orderId = await createOrder(d, "paystack", "pending", txn.reference, t.total);
                    // verify server-side (marks the order paid). If the function
                    // isn't deployed yet, payment is still captured and the order
                    // is saved as pending for you to confirm.
                    try { await window.sb.functions.invoke("verify-payment", { body: { reference: txn.reference, order_id: orderId } }); } catch (e) { }
                    await window.sb.from("cart_items").delete().eq("user_id", user.id);
                    showSuccess(d.name, d.phone, orderId, txn.reference, t.total, "paystack");
                } catch (e) {
                    showToast("Payment succeeded but saving the order failed. Please keep this reference: " + txn.reference);
                    reenable(btn, t);
                }
            },
            onCancel: () => { showToast("Payment cancelled — you can try again."); reenable(btn, t); }
        });
    };

    const placeOrder = async () => {
        if (busy) return;
        const name = document.getElementById("coName").value.trim();
        const phone = document.getElementById("coPhone").value.trim();
        const area = document.getElementById("coArea").value;
        const landmark = document.getElementById("coLandmark").value.trim();
        const note = document.getElementById("coNote").value.trim();

        let ok = true;
        showError("coName", ""); showError("coPhone", ""); showError("coArea", "");
        if (name.length < 2) { showError("coName", "Please enter your name."); ok = false; }
        if (!/^[0-9+()\s-]{7,}$/.test(phone)) { showError("coPhone", "Enter a valid phone number."); ok = false; }
        if (!area) { showError("coArea", "Please choose the location closest to you."); ok = false; }
        if (!ok) return;

        const address = area + (landmark ? " — " + landmark : "");
        const d = { name, phone, address, note };
        const method = selectedMethod();
        const t = totals();
        const btn = document.getElementById("placeOrderBtn");
        busy = true;
        if (btn) { btn.disabled = true; btn.textContent = method === "online" ? "Opening secure payment…" : "Placing your order…"; }

        if (method === "online" && window.PAYSTACK_READY) {
            startPaystack(d, t, btn);
        } else {
            try {
                const orderId = await createOrder(d, "delivery", "pending", null, t.total);
                await window.sb.from("cart_items").delete().eq("user_id", user.id);
                showSuccess(d.name, d.phone, orderId, null, t.total, "delivery");
            } catch (e) {
                showToast("Sorry — we couldn't place your order. Please try again.");
                reenable(btn, t);
            }
        }
    };

    root.addEventListener("click", (e) => {
        if (e.target.closest("#placeOrderBtn")) { e.preventDefault(); placeOrder(); }
    });
    root.addEventListener("input", (e) => {
        const field = e.target.closest && e.target.closest(".pfield");
        if (field) field.classList.remove("is-invalid");
    });
    root.addEventListener("change", (e) => {
        if (e.target.name === "paymethod") setBtnLabel();
    });

    /* ── data / boot ── */
    const load = async () => {
        if (!user) { render(); return; }
        // cart
        const { data, error } = await window.sb.from("cart_items")
            .select("id, qty, product:products(id,name,weight,price,image_url,tint,svg)")
            .eq("user_id", user.id).order("created_at", { ascending: true });
        rows = error ? [] : (data || []);
        // profile (for prefill) — ignore errors
        try {
            const { data: pr } = await window.sb.from("profiles")
                .select("full_name,phone").eq("id", user.id).maybeSingle();
            profile = pr || null;
        } catch (e) { profile = null; }
        render();
    };

    const boot = async () => {
        if (!window.SB_READY || !window.sb) {
            root.innerHTML = stateCard("Checkout needs the store database",
                "Connect Supabase (add your keys in supabase-client.js) to place orders.", "");
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