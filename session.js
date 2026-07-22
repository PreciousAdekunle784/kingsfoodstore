/* Kings Food Mart — shared session layer (Supabase-backed).
   Loaded on every page. Supabase is the source of truth for auth;
   we cache the current user so the rest of the site can check
   "is someone signed in?" synchronously (e.g. cart gating).

   If Supabase isn't configured yet (supabase-client.js still has
   placeholders), we fall back to a local check so the site keeps
   working during setup. */
(() => {
    "use strict";
    const KEY = "kfm_user";               // legacy/local fallback store
    let currentUser = null;               // cached, normalised { name, email, id }
    const listeners = [];

    const norm = (u) => {
        if (!u) return null;
        const meta = u.user_metadata || u.raw_user_meta_data || {};
        return {
            id: u.id || meta.sub || "",
            name: meta.full_name || meta.name || u.name || (u.email ? u.email.split("@")[0] : "Friend"),
            email: u.email || meta.email || "",
            picture: meta.picture || meta.avatar_url || ""
        };
    };

    const decodeJwt = (token) => {
        try {
            const b = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            const json = decodeURIComponent(atob(b).split("").map(
                (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
            return JSON.parse(json);
        } catch (e) { return null; }
    };

    const setLocal = (u) => { try { localStorage.setItem(KEY, JSON.stringify(u)); } catch (e) {} };
    const getLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };

    const getUser = () => currentUser;
    const isSignedIn = () => !!currentUser;

    const setUser = (u) => {           // used by the local fallback (pre-Supabase)
        currentUser = norm(u);
        setLocal(currentUser);
        applyNav();
        listeners.forEach((fn) => fn(currentUser));
    };

    const signOut = async () => {
        currentUser = null;
        try { localStorage.removeItem(KEY); } catch (e) {}
        if (window.SB_READY && window.sb) {
            try { await window.sb.auth.signOut(); } catch (e) {}
        }
        if (window.google && google.accounts && google.accounts.id) {
            try { google.accounts.id.disableAutoSelect(); } catch (e) {}
        }
        applyNav();
        listeners.forEach((fn) => fn(null));
    };

    const onChange = (fn) => { listeners.push(fn); if (currentUser) fn(currentUser); };

    /* reflect signed-in state in whatever nav the current page has */
    const applyNav = () => {
        const user = currentUser;
        const first = user && user.name ? user.name.split(" ")[0] : "";
        if (document.body) document.body.dataset.auth = user ? "in" : "out";

        document.querySelectorAll("a.nav__signin, a.page-nav__link").forEach((a) => {
            const txt = (a.textContent || "").trim().toLowerCase();
            if (!a.dataset.origText) a.dataset.origText = a.textContent.trim();
            if (user && (txt === "sign in" || txt === "sign out")) {
                a.textContent = "Sign out";
                a.setAttribute("href", "#");
                a.onclick = (e) => { e.preventDefault(); signOut().then(() => location.reload()); };
            } else if (!user && a.dataset.origText) {
                a.textContent = a.dataset.origText;
                a.setAttribute("href", "login.html");
                a.onclick = null;
            }
        });

        [".nav__actions", ".page-nav__actions"].forEach((sel) => {
            const bar = document.querySelector(sel);
            if (!bar) return;
            let chip = bar.querySelector(".auth-greeting");
            if (user) {
                if (!chip) {
                    chip = document.createElement("span");
                    chip.className = "auth-greeting";
                    bar.insertBefore(chip, bar.firstChild);
                }
                chip.textContent = "Hi, " + first;
            } else if (chip) { chip.remove(); }
        });
    };

    /* boot: prefer Supabase; fall back to local store */
    const boot = async () => {
        if (window.SB_READY && window.sb) {
            try {
                const { data } = await window.sb.auth.getSession();
                currentUser = norm(data && data.session && data.session.user);
            } catch (e) { currentUser = null; }
            applyNav();
            listeners.forEach((fn) => fn(currentUser));
            // keep in sync with sign-in / sign-out / token refresh
            window.sb.auth.onAuthStateChange((_evt, session) => {
                currentUser = norm(session && session.user);
                applyNav();
                listeners.forEach((fn) => fn(currentUser));
            });
        } else {
            currentUser = getLocal();       // pre-Supabase fallback
            applyNav();
        }
    };

    window.KFM = { getUser, isSignedIn, setUser, signOut, onChange, decodeJwt, applyNav };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else { boot(); }
})();
