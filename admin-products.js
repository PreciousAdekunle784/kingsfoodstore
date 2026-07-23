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
    let cats = [];

    const catOptions = (sel) => {
        const names = (cats && cats.length) ? cats.map((c) => c.name) : CATEGORIES;
        // keep a product's existing category listed even if it was deleted
        if (sel && names.indexOf(sel) === -1) names.push(sel);
        return names.map((c) => `<option value="${esc(c)}" ${c === sel ? "selected" : ""}>${esc(c)}</option>`).join("");
    };
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

    /* ── categories (the "Shop by Category" tiles) — full add/edit/delete ── */
    const TINTS = ["#F0EAD8", "#F3ECD9", "#EFE4D6", "#F5E8D2", "#F2EDE2", "#F5E2DC",
                   "#EAF0F4", "#F4E3D3", "#E7D8C4", "#F5E3C2", "#F3EEE6", "#EDEFF1"];

    const catCard = (c) => {
        const isNew = !c.name;
        const used = products.filter((p) => p.category === c.name).length;
        return `<form class="catadm" data-name="${esc(c.name || "")}">
            <div class="catadm__media">${c.image_url ? `<img src="${esc(c.image_url)}" alt="" onerror="this.style.display='none'">` : `<span class="catadm__empty">No picture</span>`}</div>
            <div class="catadm__info">
                <label class="catadm__lbl">Name<input name="name" value="${esc(c.name || "")}" placeholder="e.g. Baby Care" required></label>
                <div class="catadm__row">
                    <label class="catadm__lbl">Order<input type="number" name="sort" value="${c.sort != null ? c.sort : 0}"></label>
                    <label class="catadm__lbl">Tint<select name="tint">${TINTS.map((t) => `<option value="${t}" ${((c.tint || "#F0EAD8").toLowerCase() === t.toLowerCase()) ? "selected" : ""}>${t}</option>`).join("")}</select></label>
                </div>
                <label class="catadm__pick">
                    <input type="file" accept="image/*" class="catadm__file" data-name="${esc(c.name || "")}">
                    <span>${c.image_url ? "Change picture" : "Upload picture"}</span>
                </label>
                <div class="catadm__actions">
                    <button type="submit" class="btn btn--primary btn--sm">${isNew ? "Add" : "Save"}</button>
                    ${isNew ? "" : `<button type="button" class="padmin__del" data-delcat="${esc(c.name)}" data-used="${used}">Delete</button>`}
                </div>
                ${!isNew && used ? `<span class="catadm__used">${used} product${used === 1 ? "" : "s"}</span>` : ""}
            </div>
        </form>`;
    };

    const render = () => {
        root.innerHTML = `
            <h2 class="padmin__h">Categories</h2>
            <p class="padmin__hint">These are the tiles in the “Shop by Category” section on your homepage. Rename one and its products move with it.</p>
            <div class="catadm__grid">${cats.map(catCard).join("")}${catCard({ sort: (cats.length || 0) + 1 })}</div>
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

    // add / save (and rename) a CATEGORY
    root.addEventListener("submit", async (e) => {
        const f = e.target.closest(".catadm");
        if (!f) return;
        e.preventDefault();
        const oldName = f.dataset.name || "";
        const newName = f.elements["name"].value.trim();
        const sort = Number(f.elements["sort"].value || 0);
        const tint = f.elements["tint"].value;
        if (!newName) { showToast("Give the category a name."); return; }

        try {
            if (!oldName) {
                // brand new category
                const { error } = await window.sb.from("categories").insert({ name: newName, sort, tint });
                if (error) { showToast(/duplicate|unique/i.test(error.message) ? "That category already exists." : "Couldn't add: " + error.message); return; }
                showToast("Category added");
            } else if (oldName !== newName) {
                // rename: create the new row, move its products across, drop the old row
                const existing = cats.find((c) => c.name === oldName) || {};
                const { error: insErr } = await window.sb.from("categories")
                    .insert({ name: newName, sort, tint, image_url: existing.image_url || null, svg: existing.svg || "s-sack" });
                if (insErr) { showToast(/duplicate|unique/i.test(insErr.message) ? "A category with that name already exists." : "Couldn't rename: " + insErr.message); return; }
                const { error: movErr } = await window.sb.from("products").update({ category: newName }).eq("category", oldName);
                if (movErr) { showToast("Renamed, but products didn't move: " + movErr.message); }
                await window.sb.from("categories").delete().eq("name", oldName);
                showToast("Renamed — products moved across");
            } else {
                const { error } = await window.sb.from("categories").update({ sort, tint }).eq("name", oldName);
                if (error) { showToast("Couldn't save: " + error.message); return; }
                showToast("Saved");
            }
            load();
        } catch (err) { showToast("Something went wrong. Please try again."); }
    });

    // delete a CATEGORY
    root.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-delcat]");
        if (!btn) return;
        const name = btn.dataset.delcat;
        const used = Number(btn.dataset.used || 0);
        const warn = used
            ? `Delete “${name}”?\n\n${used} product${used === 1 ? " is" : "s are"} in this category — ${used === 1 ? "it" : "they"} will stay in your shop but won't belong to any category until you reassign ${used === 1 ? "it" : "them"}.`
            : `Delete “${name}”?`;
        if (!confirm(warn)) return;
        const { error } = await window.sb.from("categories").delete().eq("name", name);
        if (error) { showToast("Couldn't delete: " + error.message); return; }
        showToast("Category deleted"); load();
    });

    // upload / change a CATEGORY picture
    root.addEventListener("change", async (e) => {
        const input = e.target.closest(".catadm__file");
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        const name = (input.dataset.name || "").trim();
        if (!name) { showToast("Save the category first, then add its picture."); input.value = ""; return; }
        if (file.size > 5 * 1024 * 1024) { showToast("Image too large — use one under 5MB."); input.value = ""; return; }
        showToast("Uploading…");
        try {
            const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
            const path = "cat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + ext;
            const { error: upErr } = await window.sb.storage.from("product-images").upload(path, file);
            if (upErr) { showToast("Upload failed: " + upErr.message); return; }
            const { data: pub } = window.sb.storage.from("product-images").getPublicUrl(path);
            const { error } = await window.sb.from("categories")
                .upsert({ name, image_url: pub.publicUrl }, { onConflict: "name" });
            if (error) { showToast("Couldn't save: " + error.message); return; }
            showToast(name + " picture updated");
            load();
        } catch (err) { showToast("Upload failed."); }
        finally { input.value = ""; }
    });

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
        // category pictures — if the table isn't set up yet, fall back to the known list
        const { data: cd, error: ce } = await window.sb.from("categories").select("*").order("sort", { ascending: true });
        cats = (!ce && cd && cd.length) ? cd : CATEGORIES.map((n, i) => ({ name: n, image_url: null, sort: i + 1 }));
        if (ce) console.warn("[KFM] categories table not found — run supabase-categories.sql");
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
