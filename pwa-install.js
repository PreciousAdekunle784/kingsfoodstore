/* Kings Food Mart — install pop-up.
   Shows a friendly "Install our app" card. On Android/desktop it triggers
   the real install prompt; on iPhone (which has no prompt) it shows the
   Share → Add to Home Screen instructions. Remembers dismissal for a week
   and never shows once the app is already installed. */
(() => {
    "use strict";
    const KEY = "kfm_pwa_dismissed";
    const COOLDOWN_DAYS = 7;

    // already installed / running as an app → never prompt
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (standalone) return;

    // dismissed recently?
    try {
        const t = Number(localStorage.getItem(KEY) || 0);
        if (t && (Date.now() - t) < COOLDOWN_DAYS * 864e5) return;
    } catch (e) {}

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    let deferred = null;

    const build = (ios) => {
        if (document.getElementById("pwaPrompt")) return;
        const el = document.createElement("div");
        el.className = "pwa-prompt";
        el.id = "pwaPrompt";
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-label", "Install Kings Food Mart app");
        el.innerHTML =
            '<img class="pwa-prompt__icon" src="/icon-192.png" alt="" />' +
            '<div class="pwa-prompt__body">' +
                '<strong>Install the Kings Food Mart app</strong>' +
                '<span>' + (ios
                    ? 'Tap the Share button below, then “Add to Home Screen”.'
                    : 'Add us to your home screen for faster shopping.') + '</span>' +
            '</div>' +
            '<div class="pwa-prompt__actions">' +
                (ios ? '' : '<button type="button" id="pwaInstall" class="btn btn--primary btn--sm" data-magnetic>Install</button>') +
                '<button type="button" id="pwaClose" class="pwa-prompt__close" aria-label="Dismiss">✕</button>' +
            '</div>';
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add("is-visible"));

        const close = () => {
            el.classList.remove("is-visible");
            try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
            setTimeout(() => el.remove(), 300);
        };
        const closeBtn = document.getElementById("pwaClose");
        if (closeBtn) closeBtn.addEventListener("click", close);

        const installBtn = document.getElementById("pwaInstall");
        if (installBtn) installBtn.addEventListener("click", async () => {
            if (!deferred) { close(); return; }
            deferred.prompt();
            try { await deferred.userChoice; } catch (e) {}
            deferred = null;
            close();
        });
    };

    if (isIOS) {
        // iOS Safari only — Chrome on iOS can't install
        const safari = /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
        if (safari) setTimeout(() => build(true), 2500);
        return;
    }

    // Android / desktop: wait for the browser to say it's installable
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferred = e;
        setTimeout(() => build(false), 1500);
    });
    window.addEventListener("appinstalled", () => {
        try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
        const el = document.getElementById("pwaPrompt");
        if (el) el.remove();
    });
})();
