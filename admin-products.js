/* Kings Food Mart — admin product management.
   Add / edit / delete products, set a discount (sale price), or mark a
   product as pre-order. Admin-only (owner email or is_admin flag). */
(() => {
    "use strict";
    const root = document.getElementById("prodAdminRoot");
    const toast = document.getElementById("toast");
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    if (!root) return;

    const ADMIN_EMAIL = "kingsfoodstoreabuja@gmail.com";
    const CATEGORIES = ["Rice & Grains", "Pasta & Noodles", "Beans & Legumes", "Cooking Oils",
        "Flour & Baking", "Tinned & Packaged", "Milk & Cereals", "Seasonings & Spices",
        "Beverages & Drinks", "Snacks & Biscuits", "Household & Cleaning", "Provisions & Staples"];
    const SVGS = ["s-sack", "s-jar", "s-bottle", "s-flour", "s-tomato", "s-pepper", "s-crayfish", "s-fish", "s-leaf", "s-fruit"];

    let toastTimer = null;
    const showToast = (m) => { if (!toast) return; toast.textContent = m; toast.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400); };
    const naira = (v) => "₦" + Number(v || 0).toLocaleString("en-NG");
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const notice = (t, b) => `<div class="cart-state"><h2>${t}</h2><p>${b}</p></div>`;

    let products = [];

    const catOptions = (sel) => CATEGORIES.map((c) => `<option value="${esc(c)}" ${c === sel ? "selected" : ""}>${esc(c)}</option>`).join("");
    const svgOptions = (sel) => SVGS.map((s) => `<option value="${s}" ${s === sel ? "selected" : ""}>${s}</option>`).join("");

    // one editable form; id="" means "new product"
    const productForm = (p) => {
        const isNew = !p.id;
        return `<form class="padmin" data-id="${esc(p.id || "")}">
            <div class="padmin__media" style="--tint:${esc(p.tint || "#F0EAD8")}">
                ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" onerror="this.style.display='none'">` : ""}
            </div>
            <div class="padmin__fields">
                <div class="padmin__row">
                    <label>Name<input name="name" value="${esc(p.name || "")}" placeholder="e.g. Premium Rice" required></label>
                    <label>Category<select name="category">${catOptions(p.category)}</select></label>
                </div>
                <div class="padmin__row">
                    <label>Size / weight<input name="weight" value="${esc(p.weight || "")}" placeholder="e.g. 5 kg"></label>
                    <label>Price (₦)<input name="price" type="number" min="0" step="1" value="${p.price != null ? p.price : ""}" required></label>
                    <label>Sale price (₦)<input name="sale_price" type="number" min="0" step="1" value="${p.sale_price != null ? p.sale_price : ""}" placeholder="empty = no sale"></label>
                </div>
                <div class="padmin__row">
                    <label>Product photo
                        <input type="file" name="photo" accept="image/*" class="padmin__file">
                    </label>
                    <label>…or paste an image URL<input name="image_url" value="${esc(p.image_url || "")}" placeholder="https://…"></label>
                    <label>Badge<input name="badge" value="${esc(p.badge || "")}" placeholder="e.g. Best Seller"></label>
                </div>
                <div class="padmin__row">
                    <label>Stock<select name="stock"><option value="in" ${p.stock !== "low" && p.stock !== "out" ? "selected" : ""}>In stock</option><option value="low" ${p.stock === "low" ? "selected" : ""}>Low stock</option><option value="out" ${p.stock === "out" ? "selected" : ""}>Out of stock</option></select></label>
                    <label>Fallback icon<select name="svg">${svgOptions(p.svg || "s-sack")}</select></label>
                    <label>Tint<input name="tint" value="${esc(p.tint || "#F0EAD8")}" placeholder="#F0EAD8"></label>
                </div>
                <div class="padmin__toggles">
                    <label class="padmin__check"><input type="checkbox" name="preorder" ${p.preorder ? "checked" : ""}> Pre-order item</label>
                    <label class="padmin__check"><input type="checkbox" name="is_bestseller" ${p.is_bestseller ? "checked" : ""}> Show in "Best sellers"</label>
                </div>
                <div class="padmin__actions">
                    <button type="submit" class="btn btn--primary btn--sm">${isNew ? "Add product" : "Save changes"}</button>
                    ${isNew ? "" : `<button type="button" class="padmin__del" data-del="${esc(p.id)}">Delete</button>`}
                </div>
            </div>
        </form>`;
    };

    const render = () => {
        root.innerHTML = `
            <h2 class="padmin__h">Add a new product</h2>
            <div id="newProduct">${productForm({})}</div>
            <h2 class="padmin__h">Your products (${products.length})</h2>
            <div class="padmin__list">${products.map(productForm).join("")}</div>`;
    };

    const readForm = (form) => {
        const g = (n) => { const el = form.elements[n]; return el ? el.value.trim() : ""; };
        const num = (n) => { const v = g(n); return v === "" ? null : Number(v); };
        const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || ("item-" + Date.now());
        const name = g("name");
        return {
            name,
            category: g("category"),
            weight: g("weight"),
            price: num("price") || 0,
            sale_price: num("sale_price"),
            image_url: g("image_url"),
            badge: g("badge") || null,
            stock: g("stock") || "in",
            svg: g("svg") || "s-sack",
            tint: g("tint") || "#F0EAD8",
            preorder: form.elements["preorder"].checked,
            is_bestseller: form.elements["is_bestseller"].checked,
            slug: slugify(name)
        };
    };

    // upload a chosen photo to Supabase Storage, then fill in its URL
    root.addEventListener("change", async (e) => {
        const input = e.target.closest(".padmin__file");
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) { showToast("Image too large — please use one under 5MB."); input.value = ""; return; }
        const form = input.closest(".padmin");
        const label = input.closest("label");
        const original = label ? label.childNodes[0].nodeValue : "";
        if (label) label.childNodes[0].nodeValue = "Uploading… ";
        try {
            const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
            const path = "prod-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + ext;
            const { error } = await window.sb.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
            if (error) { showToast("Upload failed: " + error.message); return; }
            const { data: pub } = window.sb.storage.from("product-images").getPublicUrl(path);
            const urlField = form.elements["image_url"];
            if (urlField) urlField.value = pub.publicUrl;
            // update the little preview thumbnail
            const media = form.querySelector(".padmin__media");
            if (media) media.innerHTML = `<img src="${pub.publicUrl}" alt="" onerror="this.style.display='none'">`;
            showToast("Photo uploaded — remember to Save.");
        } catch (err) {
            showToast("Upload failed. Please try again.");
        } finally {
            if (label) label.childNodes[0].nodeValue = original;
            input.value = "";
        }
    });

    root.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target.closest(".padmin");
        if (!form) return;
        const id = form.dataset.id;
        const data = readForm(form);
        if (!data.name || !data.price) { showToast("Name and price are required."); return; }
        if (id) {
            const { error } = await window.sb.from("products").update(data).eq("id", id);
            if (error) { showToast("Couldn't save: " + error.message); return; }
            showToast("Saved");
        } else {
            const { error } = await window.sb.from("products").insert(data);
            if (error) { showToast("Couldn't add: " + error.message); return; }
            showToast("Product added");
        }
        load();
    });

    root.addEventListener("click", async (e) => {
        const del = e.target.closest("[data-del]");
        if (!del) return;
        if (!confirm("Delete this product? This can't be undone.")) return;
        const { error } = await window.sb.from("products").delete().eq("id", del.dataset.del);
        if (error) { showToast("Couldn't delete: " + error.message); return; }
        showToast("Deleted"); load();
    });

    const load = async () => {
        const { data, error } = await window.sb.from("products").select("*").order("sort", { ascending: true }).order("name");
        if (error) { root.innerHTML = notice("Couldn't load products", esc(error.message)); return; }
        products = data || [];
        render();
    };

    const boot = async () => {
        if (!window.SB_READY || !window.sb) { root.innerHTML = notice("Database not connected", "Add your Supabase keys in supabase-client.js."); return; }
        let user = null;
        try { const { data } = await window.sb.auth.getSession(); user = data && data.session && data.session.user; } catch (e) {}
        if (!user) { root.innerHTML = notice("Please sign in", 'Sign in with your admin account. <a href="/login">Sign in</a>'); return; }
        let isAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL;
        if (!isAdmin) { const { data: prof } = await window.sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(); isAdmin = !!(prof && prof.is_admin); }
        if (!isAdmin) { root.innerHTML = notice("Access denied", "This page is for store admins only."); return; }
        await load();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
