/* Kings Food Mart — Facebook Login (Facebook JavaScript SDK)
   ────────────────────────────────────────────────────────────
   SETUP (one-time): paste your Facebook App ID below.
   Get it free at https://developers.facebook.com → My Apps →
   Create App → choose the "Authenticate and request data from
   users with Facebook Login" use case. Then:
     • Add the "Facebook Login" product.
     • App settings → Basic: copy the App ID, and add your site
       to "App Domains" (e.g. kingsfoodmart.ng).
     • Facebook Login → Settings: add your site URL under
       "Valid OAuth Redirect URIs" and your domain under
       "Allowed Domains for the JavaScript SDK".
     • Flip the app from "In development" to "Live" so shoppers
       who aren't you can sign in.
   Facebook Login needs HTTPS (localhost is allowed for testing);
   it does NOT work from a file:// path. */

const FACEBOOK_APP_ID = "1070825792141935";
const FACEBOOK_API_VERSION = "v21.0"; // bump to a current Graph API version if needed

(() => {
    "use strict";
    const btn = document.getElementById("facebookBtn");
    if (!btn) return; // not an auth page
    const hint = document.getElementById("facebookHint");
    const showHint = (msg) => { if (hint) { hint.textContent = msg; hint.hidden = false; } };

    const configured = /^\d{6,}$/.test(FACEBOOK_APP_ID); // App IDs are long numbers
    if (!configured) {
        showHint("Facebook sign-in isn't switched on yet — add your Facebook App ID in facebook-auth.js to activate this button.");
        btn.addEventListener("click", () =>
            showHint("Facebook sign-in isn't switched on yet — add your Facebook App ID in facebook-auth.js to activate this button."));
        return;
    }

    let ready = false;

    // load the SDK once, then init
    window.fbAsyncInit = function () {
        window.FB.init({
            appId: FACEBOOK_APP_ID,
            cookie: true,
            xfbml: false,
            version: FACEBOOK_API_VERSION
        });
        ready = true;
    };
    (function loadSdk(d, s, id) {
        if (d.getElementById(id)) return;
        const js = d.createElement(s);
        js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        js.async = true;
        js.defer = true;
        const first = d.getElementsByTagName(s)[0];
        first.parentNode.insertBefore(js, first);
    })(document, "script", "facebook-jssdk");

    const finishSignIn = (profile) => {
        const user = {
            name: profile.name || "Friend",
            email: profile.email || "",
            picture: (profile.picture && profile.picture.data && profile.picture.data.url) || "",
            sub: profile.id || "",
            via: "facebook",
            ts: Date.now()
        };
        if (window.KFM) window.KFM.setUser(user);
        window.location.href = "index.html";
    };

    btn.addEventListener("click", () => {
        if (!ready || !window.FB) {
            showHint("Still connecting to Facebook — give it a second and try again.");
            return;
        }
        window.FB.login((response) => {
            if (response.status !== "connected") {
                showHint("Facebook sign-in was cancelled. You can try again or use another option.");
                return;
            }
            /* We fetch email opportunistically — Facebook returns it only if the
               "email" permission has been granted (needs App Review to go public).
               Until then, public_profile alone works with no review. */
            window.FB.api("/me", { fields: "name,email,picture.width(96)" }, (profile) => {
                if (!profile || profile.error) {
                    showHint("Couldn't read your Facebook profile. Please try again.");
                    return;
                }
                finishSignIn(profile);
            });
        }, { scope: "public_profile" });
    });
})();
