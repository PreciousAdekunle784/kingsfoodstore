/* King's Food Store — restrained, purposeful motion */
(() => {
    "use strict";

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── sticky nav ── */
    const nav = document.getElementById("nav");
    if (nav) {
        const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
    }

    /* ── mobile menu ── */
    const burger = document.getElementById("navBurger");
    const mobileMenu = document.getElementById("mobileMenu");
    if (burger && mobileMenu) {
        burger.addEventListener("click", () => {
            const open = mobileMenu.classList.toggle("is-open");
            burger.setAttribute("aria-expanded", String(open));
            burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        });
        mobileMenu.addEventListener("click", (e) => {
            if (e.target.closest("a")) {
                mobileMenu.classList.remove("is-open");
                burger.setAttribute("aria-expanded", "false");
            }
        });
    }

    /* ── scroll reveal with stagger ── */
    const reveals = document.querySelectorAll(".reveal");
    const grids = [".cat-grid", ".prod-grid", ".why-grid", ".quote-grid", ".offer-grid", ".counters"];
    grids.forEach((sel) => {
        document.querySelectorAll(`${sel} .reveal, ${sel}.reveal`).forEach((el, i) => {
            el.style.setProperty("--stagger", String(i % 8));
        });
    });
    if ("IntersectionObserver" in window && !prefersReducedMotion) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
        reveals.forEach((el) => io.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add("is-visible"));
    }

    /* ── animated counters ── */
    const counters = document.querySelectorAll("[data-count]");
    const runCounter = (el) => {
        const target = parseInt(el.dataset.count, 10);
        const decimals = parseInt(el.dataset.decimal || "0", 10);
        const divisor = 10 ** decimals;
        const duration = 1800;
        const start = performance.now();
        const fmt = (v) =>
            decimals ? (v / divisor).toFixed(decimals) : Math.round(v).toLocaleString("en-US");
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = fmt(target * eased);
            if (t < 1) requestAnimationFrame(tick);
        };
        if (prefersReducedMotion) { el.textContent = fmt(target); return; }
        requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
        const cio = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    runCounter(entry.target);
                    cio.unobserve(entry.target);
                }
            });
        }, { threshold: 0.6 });
        counters.forEach((el) => cio.observe(el));
    } else {
        counters.forEach(runCounter);
    }

    /* ── magnetic buttons ── */
    if (!prefersReducedMotion && window.matchMedia("(hover: hover)").matches) {
        document.querySelectorAll("[data-magnetic]").forEach((btn) => {
            const strength = 14;
            btn.addEventListener("mousemove", (e) => {
                const r = btn.getBoundingClientRect();
                const x = ((e.clientX - r.left) / r.width - 0.5) * strength;
                const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
                btn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            });
            btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
        });
    }

    /* ── gentle hero parallax ── */
    const parallaxEls = document.querySelectorAll("[data-parallax]");
    if (parallaxEls.length && !prefersReducedMotion) {
        let raf = null;
        window.addEventListener("scroll", () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                parallaxEls.forEach((el) => {
                    const speed = parseFloat(el.dataset.parallax) || 0.05;
                    el.style.transform = `translateY(${(window.scrollY * speed).toFixed(1)}px)`;
                });
                raf = null;
            });
        }, { passive: true });
    }

    /* ── basket / quick add ── */
    const cartBtn = document.getElementById("cartBtn");
    const cartCount = document.getElementById("cartCount");
    const toast = document.getElementById("toast");
    let items = 0;
    let toastTimer = null;

    const showToast = (msg) => {
        toast.textContent = msg;
        toast.classList.add("is-visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
    };

    /* Shopping requires an account. Until the shopper is signed in,
       any add-to-cart or basket action routes them to the sign-in page.
       (Swap isSignedIn for a real auth check once a backend is wired up.) */
    const isSignedIn = () => !!(window.KFM && window.KFM.getUser());
    const goToSignIn = () => { window.location.href = "/login"; };

    const requireSignIn = (msg, name) => {
        showToast(msg);
        clearTimeout(requireSignIn._t);
        requireSignIn._t = setTimeout(goToSignIn, 850);
    };

    const addToBasket = (btn) => {
        items += 1;
        cartCount.textContent = String(items);
        cartBtn.setAttribute("aria-label", `Shopping basket, ${items} item${items === 1 ? "" : "s"}`);
        cartBtn.classList.remove("is-bumped");
        void cartBtn.offsetWidth; /* restart animation */
        cartBtn.classList.add("is-bumped");
        btn.classList.add("is-added");
        const label = btn.querySelector("span");
        const original = label.textContent;
        label.textContent = "Added ✓";
        setTimeout(() => {
            btn.classList.remove("is-added");
            label.textContent = original;
        }, 1600);
        showToast(`${btn.dataset.name} added to your basket`);
        saveCartItem(btn.dataset.productId);
    };

    /* format a Naira value; pass-through if already a "₦…" string */
    const naira = (v) => (typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v)))
        ? "₦" + Number(v).toLocaleString("en-NG") : v;

    /* pull the true basket count from the database for the signed-in user */
    const refreshCartCount = async () => {
        if (!window.SB_READY || !window.sb || !cartCount) return;
        const user = window.KFM && window.KFM.getUser();
        if (!user) { items = 0; cartCount.textContent = "0"; return; }
        const { data, error } = await window.sb.from("cart_items").select("qty").eq("user_id", user.id);
        if (error) return;
        items = (data || []).reduce((s, r) => s + (r.qty || 0), 0);
        cartCount.textContent = String(items);
    };

    /* add one of a product to the signed-in shopper's cart (upsert qty) */
    const saveCartItem = async (productId) => {
        if (!productId || !window.SB_READY || !window.sb) return;
        const user = window.KFM && window.KFM.getUser();
        if (!user) return;
        const { data: existing } = await window.sb.from("cart_items")
            .select("id,qty").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
        if (existing) {
            await window.sb.from("cart_items").update({ qty: existing.qty + 1 }).eq("id", existing.id);
        } else {
            await window.sb.from("cart_items").insert({ user_id: user.id, product_id: productId, qty: 1 });
        }
        refreshCartCount();
    };

    // keep the badge in sync with sign-in / sign-out
    if (window.KFM && window.KFM.onChange) window.KFM.onChange(() => refreshCartCount());

    /* delegated so it also covers product cards added later by the rotator */
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".quick-add");
        if (!btn) return;
        if (isSignedIn()) {
            addToBasket(btn);
        } else {
            requireSignIn("Please sign in to add items to your basket");
        }
    });

    if (cartBtn) {
        cartBtn.addEventListener("click", () => {
            if (isSignedIn()) {
                window.location.href = "/cart";
            } else {
                requireSignIn("Please sign in to view your basket");
            }
        });
    }

    /* ── newsletter ── */
    const form = document.getElementById("newsForm");
    const note = document.getElementById("newsNote");
    if (form && note) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = form.email.value.trim();
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
            note.classList.toggle("is-error", !valid);
            if (!valid) {
                note.textContent = "Please enter a valid email address.";
                form.email.focus();
                return;
            }
            // save the subscriber to the database
            if (window.SB_READY && window.sb) {
                const { error } = await window.sb.from("subscribers")
                    .insert({ email: email.toLowerCase() });
                if (error && !/duplicate|unique/i.test(error.message)) {
                    note.classList.add("is-error");
                    note.textContent = "Hmm, that didn't save. Please try again.";
                    return;
                }
                // duplicate = already subscribed, which is fine
                note.textContent = /duplicate|unique/i.test(error ? error.message : "")
                    ? "You're already on the list — thanks! 🌿"
                    : "Welcome aboard! Fresh deals are on their way to your inbox. 🌿";
            } else {
                note.textContent = "Welcome aboard! Fresh deals are on their way to your inbox. 🌿";
            }
            form.reset();
        });
    }

    /* ── real photos with graceful SVG fallback ── */
    const wirePhotos = (root = document) => {
        root.querySelectorAll("img.photo:not([data-wired]), img.hero__photo:not([data-wired])").forEach((img) => {
            img.dataset.wired = "1";
            const markLoaded = () => {
                img.classList.add("is-loaded");
                const scene = img.closest(".hero__scene");
                if (scene) scene.classList.add("has-photo");
            };
            const markFailed = () => img.classList.add("is-failed");
            if (img.complete) {
                img.naturalWidth > 0 ? markLoaded() : markFailed();
            } else {
                img.addEventListener("load", markLoaded);
                img.addEventListener("error", markFailed);
            }
        });
    };
    wirePhotos();

    /* ── best sellers: a constantly-rotating selection ── */
    const prodGrid = document.getElementById("prodGrid");
    if (prodGrid) {
        const P = "https://images.unsplash.com/";
        const ph = (id) => `${P}${id}?auto=format&fit=crop&w=600&q=80`;
        // pool is larger than what's shown, so the shelf keeps refreshing
        const pool = [
            { n: "Premium Long-Grain Rice", w: "10&nbsp;kg bag", p: "₦18,500", r: "4.9", s: "in", badge: "Best Seller", tint: "#F0EAD8", svg: "s-sack", ss: "--grain:#D4A017", img: ph("photo-1586201375761-83865001e31c") },
            { n: "Golden Penny Spaghetti", w: "500&nbsp;g", p: "₦850", r: "4.8", s: "in", badge: "Popular", tint: "#F3E7CE", svg: "s-sack", ss: "--grain:#E8C558", img: ph("photo-1621996346565-e3dbc646d9a9") },
            { n: "Indomie Instant Noodles", w: "Carton of 40", p: "₦8,200", r: "4.9", s: "in", badge: "Best Seller", tint: "#F5E0C8", svg: "s-sack", ss: "--grain:#D98A2B", img: ph("photo-1612929633738-8fe44f7ec841") },
            { n: "Macaroni Pasta", w: "500&nbsp;g", p: "₦900", r: "4.6", s: "in", tint: "#F3E7CE", svg: "s-sack", ss: "--grain:#E8C558", img: ph("photo-1551462147-ff29053bfc14") },
            { n: "Honey Brown Beans", w: "5&nbsp;kg", p: "₦9,200", r: "4.7", s: "in", tint: "#EFE4D6", svg: "s-jar", ss: "--fill:#7B4A2D;--lid:#A3B18A", img: ph("photo-1515543237350-b3eea1ec8082") },
            { n: "Devon King's Vegetable Oil", w: "5&nbsp;litres", p: "₦11,000", r: "4.8", s: "in", tint: "#F6EDD6", svg: "s-bottle", ss: "--oil:#DBA512;--cap:#C96A3D", img: ph("photo-1608797178974-15b35a64ede9") },
            { n: "Pure Groundnut Oil", w: "5&nbsp;litres", p: "₦13,500", r: "4.8", s: "in", tint: "#F6EDD6", svg: "s-bottle", ss: "--oil:#E0B23C;--cap:#2E7D32", img: ph("photo-1474979266404-7eaacbcd87c5") },
            { n: "Golden Penny Semovita", w: "5&nbsp;kg", p: "₦8,900", r: "4.7", s: "in", tint: "#EFE9DA", svg: "s-flour", ss: "--label:#D4A017", img: ph("photo-1568254183919-78a4f43a2877") },
            { n: "Golden Penny Flour", w: "2&nbsp;kg", p: "₦3,200", r: "4.6", s: "in", tint: "#F2EDE2", svg: "s-flour", ss: "--label:#2E7D32", img: ph("photo-1509440159596-0249088772ff") },
            { n: "Gino Tomato Paste", w: "Sachet × 20", p: "₦3,600", r: "4.8", s: "in", badge: "Kitchen Staple", tint: "#F5E2DC", svg: "s-jar", ss: "--fill:#C0392B;--lid:#8A5F3B", img: ph("photo-1546094096-0df4bcaaa337") },
            { n: "Titus Sardines", w: "Pack of 3", p: "₦2,700", r: "4.7", s: "low", tint: "#EFE5D3", svg: "s-fish", ss: "", img: ph("photo-1519708227418-c8fd9a32b7a2") },
            { n: "Peak Powdered Milk", w: "400&nbsp;g tin", p: "₦4,200", r: "4.9", s: "in", badge: "Best Seller", tint: "#EAF0F4", svg: "s-jar", ss: "--fill:#EDE7DA;--lid:#2E5AAC", img: ph("photo-1550583724-b2692b85b150") },
            { n: "Nestlé Golden Morn", w: "500&nbsp;g", p: "₦2,600", r: "4.7", s: "in", tint: "#F1E4C9", svg: "s-jar", ss: "--fill:#D9A441;--lid:#7B4A2D", img: ph("photo-1517686469429-8bdb88b9f907") },
            { n: "Kellogg's Cornflakes", w: "500&nbsp;g", p: "₦3,500", r: "4.6", s: "in", tint: "#F5E3C2", svg: "s-jar", ss: "--fill:#E6B23C;--lid:#C0392B", img: ph("photo-1521483451396-84702a8a3d78") },
            { n: "Maggi Star Seasoning", w: "100 cubes", p: "₦1,500", r: "5.0", s: "in", badge: "Kitchen Staple", tint: "#F4E3D3", svg: "s-jar", ss: "--fill:#C0392B;--lid:#F1C40F", img: ph("photo-1596040033229-a9821ebd058d") },
            { n: "Milo Chocolate Drink", w: "500&nbsp;g tin", p: "₦3,800", r: "4.9", s: "in", badge: "Popular", tint: "#E7D8C4", svg: "s-jar", ss: "--fill:#5B3A1E;--lid:#2E7D32", img: ph("photo-1541167760496-1628856ab772") },
            { n: "Cadbury Bournvita", w: "500&nbsp;g", p: "₦3,400", r: "4.7", s: "in", tint: "#E7D8C4", svg: "s-jar", ss: "--fill:#5B3A1E;--lid:#C0392B", img: ph("photo-1541167760496-1628856ab772") },
            { n: "Dangote Sugar", w: "1&nbsp;kg", p: "₦1,600", r: "4.7", s: "in", tint: "#F3EEE6", svg: "s-jar", ss: "--fill:#FFFFFF;--lid:#2E5AAC", img: ph("photo-1581441363689-1f3c3c414635") }
        ];

        const SHOWN = 8;              // cards visible at once
        const STEP = 4;               // how many swap out each rotation
        const INTERVAL = 4500;        // ms between rotations
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let cursor = 0;
        let timer = null;

        const cardHTML = (d) => {
            const onSale = d.sale != null && Number(d.sale) < Number(d.p);
            const eff = onSale ? Number(d.sale) : Number(d.p);
            let badge = "";
            if (d.preorder) badge = `<span class="prod-card__badge prod-card__badge--preorder">Pre-order</span>`;
            else if (onSale) badge = `<span class="prod-card__badge prod-card__badge--sale">Sale</span>`;
            else if (d.badge) badge = `<span class="prod-card__badge${d.fresh ? " prod-card__badge--fresh" : ""}">${d.badge}</span>`;
            const priceHTML = onSale ? `<span class="prod-card__price--was">${naira(d.p)}</span>${naira(eff)}` : naira(eff);
            const btnLabel = d.preorder ? "Pre-order" : "Quick Add";
            const stockCls = d.s === "low" ? "prod-card__stock--low" : "prod-card__stock--in";
            const stockTxt = d.s === "low" ? "Low stock" : "In stock";
            const style = d.ss ? ` style="${d.ss}"` : "";
            return `<li class="prod-card" style="--tint:${d.tint}">
                <div class="prod-card__media"><img class="photo prod-card__photo" src="${d.img}" alt="${d.n.replace(/&amp;/g, "and")}" loading="lazy" decoding="async" />${badge}<svg viewBox="0 0 120 120"${style} aria-hidden="true"><use href="#${d.svg}"/></svg></div>
                <div class="prod-card__info">
                    <div class="prod-card__meta"><span class="prod-card__rating" aria-label="Rated ${d.r} out of 5"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><use href="#s-star"/></svg>${d.r}</span><span class="prod-card__stock ${stockCls}">${stockTxt}</span></div>
                    <h3 class="prod-card__name">${d.n}</h3>
                    <p class="prod-card__weight">${d.w}</p>
                    <div class="prod-card__row"><p class="prod-card__price">${priceHTML}</p>
                        <button class="quick-add" data-name="${d.n.replace(/&amp;/g, "and").replace(/<[^>]*>/g, "")}" data-product-id="${d.id || ""}" aria-label="${btnLabel} ${d.n.replace(/&amp;/g, "and")}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>${btnLabel}</span></button>
                    </div>
                </div>
            </li>`;
        };

        const render = (start) => {
            let html = "";
            for (let i = 0; i < SHOWN; i++) html += cardHTML(pool[(start + i) % pool.length]);
            prodGrid.innerHTML = html;
            wirePhotos(prodGrid);
        };

        const rotate = () => {
            cursor = (cursor + STEP) % pool.length;
            if (reduce) { render(cursor); return; }
            prodGrid.classList.add("is-swapping");
            setTimeout(() => {
                render(cursor);
                requestAnimationFrame(() => prodGrid.classList.remove("is-swapping"));
            }, 420);
        };

        render(cursor);
        const start = () => { if (!timer) timer = setInterval(rotate, INTERVAL); };
        const stop = () => { clearInterval(timer); timer = null; };
        start();
        // pause while the shopper is hovering the shelf, resume when they leave
        prodGrid.addEventListener("mouseenter", stop);
        prodGrid.addEventListener("mouseleave", start);
        document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

        /* Prefer live products from the database (so Quick Add can save a real
           product_id). Falls back silently to the built-in pool above if
           Supabase isn't configured or returns nothing. */
        (async () => {
            if (!window.SB_READY || !window.sb) return;
            try {
                const { data, error } = await window.sb
                    .from("products").select("*")
                    .eq("is_bestseller", true).order("sort", { ascending: true });
                if (error || !data || !data.length) return;
                pool.length = 0;
                data.forEach((row) => pool.push({
                    id: row.id,
                    n: row.name,
                    w: row.weight || "",
                    p: Number(row.price),
                    sale: row.sale_price != null ? Number(row.sale_price) : null,
                    preorder: !!row.preorder,
                    r: String(row.rating),
                    s: row.stock || "in",
                    badge: row.badge || undefined,
                    fresh: !!row.badge_fresh,
                    tint: row.tint || "#F0EAD8",
                    svg: row.svg || "s-sack",
                    ss: "",
                    img: row.image_url || ""
                }));
                cursor = 0;
                render(cursor);
            } catch (e) { /* keep the fallback pool */ }
        })();
    }

    /* ── footer year ── */
    document.getElementById("year").textContent = String(new Date().getFullYear());
})();
