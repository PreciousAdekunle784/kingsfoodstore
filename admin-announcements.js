/* Kings Food Mart — admin announcements (the hero board). */
(() => {
    "use strict";
    const root = document.getElementById("annRoot");
    const toast = document.getElementById("toast");
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    if (!root) return;

    const ADMIN_EMAIL = "kingsfoodstoreabuja@gmail.com";
    let toastTimer = null;
    const showToast = (m) => { if (!toast) return; toast.textContent = m; toast.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400); };
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const notice = (t, b) => `<div class="cart-state"><h2>${t}</h2><p>${b}</p></div>`;
    const dt = (iso) => { if (!iso) return ""; try { return new Date(iso).toISOString().slice(0, 10); } catch (e) { return ""; } };

    let list = [];

    const form = (a) => {
        const isNew = !a.id;
        const th = a.theme || "green";
        return `<form class="padmin ann" data-id="${esc(a.id || "")}">
            <div class="ann__preview announce announce--${esc(th)}">
                <div class="announce__inner" style="max-width:none">
                    ${a.eyebrow ? `<p class="announce__eyebrow">${esc(a.eyebrow)}</p>` : ""}
                    <h2 class="announce__title" style="font-size:1.2rem">${esc(a.title || "Your headline")}</h2>
                </div>
            </div>
            <div class="padmin__fields">
                <div class="padmin__row">
                    <label>Small line above<input name="eyebrow" value="${esc(a.eyebrow || "")}" placeholder="e.g. Coming soon"></label>
                    <label>Headline<input name="title" value="${esc(a.title || "")}" placeholder="e.g. Black Friday Sale" required></label>
                </div>
                <div class="padmin__row">
                    <label style="flex:100%">Message<input name="body" value="${esc(a.body || "")}" placeholder="e.g. Up to 30% off provisions all week"></label>
                </div>
                <div class="padmin__row">
                    <label>Button text<input name="cta_label" value="${esc(a.cta_label || "")}" placeholder="e.g. Shop deals"></label>
                    <label>Button link<input name="cta_link" value="${esc(a.cta_link || "")}" placeholder="/shop"></label>
                    <label>Colour<select name="theme">
                        <option value="green" ${th === "green" ? "selected" : ""}>Green</option>
                        <option value="orange" ${th === "orange" ? "selected" : ""}>Orange</option>
                        <option value="dark" ${th === "dark" ? "selected" : ""}>Dark</option>
                    </select></label>
                </div>
                <div class="padmin__row">
                    <label>Background photo<input type="file" name="photo" accept="image/*" class="padmin__file"></label>
                    <label>…or image URL<input name="image_url" value="${esc(a.image_url || "")}" placeholder="optional"></label>
                </div>
                <div class="padmin__row">
                    <label>Show from<input type="date" name="starts_at" value="${dt(a.starts_at)}"></label>
                    <label>Hide after<input type="date" name="ends_at" value="${dt(a.ends_at)}"></label>
                    <label>Order<input type="number" name="sort" value="${a.sort != null ? a.sort : 0}"></label>
                </div>
                <div class="padmin__toggles">
                    <label class="padmin__check"><input type="checkbox" name="active" ${a.active !== false ? "checked" : ""}> Show on the store</label>
                </div>
                <div class="padmin__actions">
                    <button type="submit" class="btn btn--primary btn--sm">${isNew ? "Add announcement" : "Save changes"}</button>
                    ${isNew ? "" : `<button type="button" class="padmin__del" data-del="${esc(a.id)}">Delete</button>`}
                </div>
            </div>
        </form>`;
    };

    const render = () => {
        root.innerHTML = `<h2 class="padmin__h">New announcement</h2>
            <div>${form({})}</div>
            <h2 class="padmin__h">Your announcements (${list.length})</h2>
            <div class="padmin__list">${list.length ? list.map(form).join("") : '<p style="color:var(--ink-soft)">None yet — add one above.</p>'}</div>`;
    };

    const read = (f) => {
        const g = (n) => { const el = f.elements[n]; return el ? el.value.trim() : ""; };
        const d = (n) => { const v = g(n); return v ? new Date(v).toISOString() : null; };
        return {
            eyebrow: g("eyebrow") || null, title: g("title"), body: g("body") || null,
            cta_label: g("cta_label") || null, cta_link: g("cta_link") || null,
            theme: g("theme") || "green", image_url: g("image_url") || null,
            starts_at: d("starts_at"), ends_at: d("ends_at"),
            sort: Number(g("sort") || 0), active: f.elements["active"].checked
        };
    };

    // upload a background photo
    root.addEventListener("change", async (e) => {
        const input = e.target.closest(".padmin__file");
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) { showToast("Image too large — use one under 5MB."); input.value = ""; return; }
        const f = input.closest("form");
        showToast("Uploading…");
        try {
            const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
            const path = "ann-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + ext;
            const { error } = await window.sb.storage.from("product-images").upload(path, file);
            if (error) { showToast("Upload failed: " + error.message); return; }
            const { data: pub } = window.sb.storage.from("product-images").getPublicUrl(path);
            if (f.elements["image_url"]) f.elements["image_url"].value = pub.publicUrl;
            showToast("Photo uploaded — remember to Save.");
        } catch (err) { showToast("Upload failed."); }
        finally { input.value = ""; }
    });

    root.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target.closest("form");
        const id = f.dataset.id;
        const data = read(f);
        if (!data.title) { showToast("A headline is required."); return; }
        const q = id
            ? window.sb.from("announcements").update(data).eq("id", id)
            : window.sb.from("announcements").insert(data);
        const { error } = await q;
        if (error) { showToast("Couldn't save: " + error.message); return; }
        showToast(id ? "Saved" : "Announcement added");
        load();
    });

    root.addEventListener("click", async (e) => {
        const del = e.target.closest("[data-del]");
        if (!del) return;
        if (!confirm("Delete this announcement?")) return;
        const { error } = await window.sb.from("announcements").delete().eq("id", del.dataset.del);
        if (error) { showToast("Couldn't delete: " + error.message); return; }
        showToast("Deleted"); load();
    });

    const load = async () => {
        const { data, error } = await window.sb.from("announcements").select("*").order("sort", { ascending: true });
        if (error) { root.innerHTML = notice("Couldn't load", esc(error.message) + " — did you run supabase-announcements.sql?"); return; }
        list = data || [];
        render();
    };

    const boot = async () => {
        if (!window.SB_READY || !window.sb) { root.innerHTML = notice("Database not connected", "Add your Supabase keys in supabase-client.js."); return; }
        let user = null;
        try { const { data } = await window.sb.auth.getSession(); user = data && data.session && data.session.user; } catch (e) {}
        if (!user) { root.innerHTML = notice("Please sign in", 'Sign in with your admin account. <a href="/login">Sign in</a>'); return; }
        let isAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL;
        if (!isAdmin) { const { data: p } = await window.sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(); isAdmin = !!(p && p.is_admin); }
        if (!isAdmin) { root.innerHTML = notice("Access denied", "This page is for store admins only."); return; }
        await load();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
