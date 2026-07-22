/* Kings Food Mart — tiny shared session layer.
   Loaded on every page so the site knows who's signed in.
   Storage is client-side only (localStorage). It's fine for gating
   "add to cart" and greeting the shopper, but it is NOT real security —
   for anything sensitive, verify the Google token on a backend. */
(() => {
    "use strict";
    const KEY = "kfm_user";

    const decodeJwt = (token) => {
        try {
            const base = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            const json = decodeURIComponent(
                atob(base).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
            );
            return JSON.parse(json);
        } catch (e) { return null; }
    };

    const getUser = () => {
        try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
        catch (e) { return null; }
    };
    const setUser = (u) => {
        try { localStorage.setItem(KEY, JSON.stringify(u)); } catch (e) {}
        applyNav();
    };
    const signOut = () => {
        try { localStorage.removeItem(KEY); } catch (e) {}
        if (window.google && google.accounts && google.accounts.id) {
            try { google.accounts.id.disableAutoSelect(); } catch (e) {}
        }
        applyNav();
    };

    /* reflect signed-in state in whatever nav the current page has */
    const applyNav = () => {
        const user = getUser();
        const first = user && user.name ? user.name.split(" ")[0] : "";
        if (document.body && document.body.dataset) document.body.dataset.auth = user ? "in" : "out";

        // turn "Sign in" links into "Sign out" (store nav + content-page nav)
        document.querySelectorAll("a.nav__signin, a.page-nav__link").forEach((a) => {
            const txt = (a.textContent || "").trim().toLowerCase();
            if (!a.dataset.origText) a.dataset.origText = a.textContent.trim();
            if (user && (txt === "sign in" || txt === "sign out")) {
                a.textContent = "Sign out";
                a.setAttribute("href", "#");
                a.onclick = (e) => { e.preventDefault(); signOut(); location.reload(); };
            } else if (!user) {
                a.textContent = a.dataset.origText || "Sign in";
                a.setAttribute("href", "login.html");
                a.onclick = null;
            }
        });

        // greeting chip in the nav actions area (added once)
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
            } else if (chip) {
                chip.remove();
            }
        });
    };

    window.KFM = { getUser, setUser, signOut, decodeJwt, applyNav };
    document.addEventListener("DOMContentLoaded", applyNav);
})();
