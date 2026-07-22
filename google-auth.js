/* Kings Food Mart — Google Sign-In (Google Identity Services)
   ────────────────────────────────────────────────────────────
   SETUP (one-time): paste your Google OAuth Client ID below.
   Get it free at https://console.cloud.google.com/apis/credentials
   → Create Credentials → OAuth client ID → Web application.
   Under "Authorized JavaScript origins" add the address you serve
   the site from, e.g. http://localhost:5500 and your live domain
   https://kingsfoodmart.ng  (no trailing slash).
   Google Sign-In does NOT work from a file:// path — you must open
   the site through a local server or a real domain. */

const GOOGLE_CLIENT_ID = "979545143190-bumo0ammqiin1p94n2g55d9ucjem977b.apps.googleusercontent.com";

(() => {
    "use strict";
    const mount = document.getElementById("googleBtn");
    if (!mount) return; // not an auth page
    const hint = document.getElementById("googleHint");
    const isSignup = !!document.getElementById("signupForm");
    const configured = /apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID) &&
        !GOOGLE_CLIENT_ID.startsWith("PASTE_");

    const showHint = (msg) => { if (hint) { hint.textContent = msg; hint.hidden = false; } };

    if (!configured) {
        showHint("Google sign-in isn't switched on yet — add your Google Client ID in google-auth.js to activate this button.");
        return;
    }

    // called by Google with the signed-in user's ID token
    const onCredential = (response) => {
        const info = window.KFM ? window.KFM.decodeJwt(response.credential) : null;
        if (!info) { showHint("Something went wrong reading your Google account. Please try again."); return; }
        const user = {
            name: info.name || info.given_name || "Friend",
            email: info.email || "",
            picture: info.picture || "",
            sub: info.sub || "",
            via: "google",
            ts: Date.now()
        };
        if (window.KFM) window.KFM.setUser(user);
        // land back in the store, now signed in
        window.location.href = "index.html";
    };

    const renderBtn = () => {
        const w = Math.round(Math.min(400, Math.max(200, mount.getBoundingClientRect().width || 320)));
        mount.innerHTML = "";
        google.accounts.id.renderButton(mount, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: isSignup ? "signup_with" : "signin_with",
            shape: "rectangular",
            logo_alignment: "center",
            width: w
        });
    };

    const init = () => {
        if (!(window.google && google.accounts && google.accounts.id)) return false;
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: onCredential,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        renderBtn();
        // keep the button matched to its column when the window resizes
        let rt = null;
        window.addEventListener("resize", () => {
            clearTimeout(rt);
            rt = setTimeout(renderBtn, 180);
        });
        // optional One Tap prompt
        try { google.accounts.id.prompt(); } catch (e) { }
        return true;
    };

    // GIS loads async; run init when it's ready (or now if already there)
    if (!init()) {
        window.onGoogleLibraryLoad = init;
        let tries = 0;
        const t = setInterval(() => { if (init() || ++tries > 40) clearInterval(t); }, 150);
    }
})();
