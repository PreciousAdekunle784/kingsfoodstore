/* Kings Food Mart — auth pages: validation, password toggle, strength, submit */
(() => {
    "use strict";

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^[0-9+()\s-]{7,}$/;

    /* photo fade-in / fallback for the brand panel */
    document.querySelectorAll("img.auth__aside-photo").forEach((img) => {
        const ok = () => img.classList.add("is-loaded");
        const bad = () => img.classList.add("is-failed");
        if (img.complete) { img.naturalWidth > 0 ? ok() : bad(); }
        else { img.addEventListener("load", ok); img.addEventListener("error", bad); }
    });

    /* password show / hide */
    document.querySelectorAll("[data-toggle-pw]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.togglePw);
            if (!input) return;
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
            btn.setAttribute("aria-pressed", String(show));
            btn.innerHTML = show ? EYE_OFF : EYE_ON;
        });
    });

    const EYE_ON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const EYE_OFF = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.3 13.3 0 0 1-1.67 2.42M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 3.4-.66"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M2 2l20 20"/></svg>`;

    const setError = (fieldId, msg) => {
        const field = document.getElementById(fieldId).closest(".field");
        field.classList.toggle("has-error", !!msg);
        const err = field.querySelector(".field__error");
        if (err && msg) err.textContent = msg;
    };
    const clearOnInput = (id) => {
        const el = document.getElementById(id);
        el.addEventListener("input", () => el.closest(".field").classList.remove("has-error"));
    };

    /* password strength (signup) */
    const pw = document.getElementById("password");
    const meter = document.querySelector(".strength");
    if (pw && meter) {
        const fill = meter.querySelector(".strength__fill");
        const label = meter.querySelector(".strength__label");
        const score = (v) => {
            let s = 0;
            if (v.length >= 8) s++;
            if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
            if (/\d/.test(v)) s++;
            if (/[^A-Za-z0-9]/.test(v)) s++;
            return s;
        };
        const cfg = [
            { w: "0%",  c: "#D64545", t: "" },
            { w: "30%", c: "#D64545", t: "Weak — add length" },
            { w: "55%", c: "#F58230", t: "Fair — mix in a number" },
            { w: "80%", c: "#0E9F53", t: "Good password" },
            { w: "100%", c: "#0A7A3F", t: "Strong password" },
        ];
        pw.addEventListener("input", () => {
            const s = pw.value ? score(pw.value) : 0;
            fill.style.width = cfg[s].w;
            fill.style.background = cfg[s].c;
            label.textContent = cfg[s].t;
            label.style.color = cfg[s].c;
        });
    }

    /* ── LOGIN ── */
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        ["loginEmail", "loginPassword"].forEach(clearOnInput);
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = loginForm.loginEmail.value.trim();
            const pass = loginForm.loginPassword.value;
            let ok = true;
            if (!emailRe.test(email)) { setError("loginEmail", "Enter a valid email address."); ok = false; }
            if (pass.length < 1) { setError("loginPassword", "Enter your password."); ok = false; }
            if (!ok) return;
            submitFlow(loginForm, "Signing you in…", "Welcome back! Redirecting to your account…");
        });
    }

    /* ── SIGNUP ── */
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        ["fullName", "email", "phone", "password", "confirm"].forEach(clearOnInput);
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const f = signupForm;
            let ok = true;
            if (f.fullName.value.trim().length < 2) { setError("fullName", "Please enter your full name."); ok = false; }
            if (!emailRe.test(f.email.value.trim())) { setError("email", "Enter a valid email address."); ok = false; }
            if (!phoneRe.test(f.phone.value.trim())) { setError("phone", "Enter a valid phone number."); ok = false; }
            if (f.password.value.length < 8) { setError("password", "Use at least 8 characters."); ok = false; }
            if (f.confirm.value !== f.password.value || !f.confirm.value) { setError("confirm", "Passwords don't match."); ok = false; }
            if (!f.terms.checked) {
                f.terms.closest(".checkbox").style.color = "#D64545";
                ok = false;
            } else {
                f.terms.closest(".checkbox").style.color = "";
            }
            if (!ok) return;
            submitFlow(signupForm, "Creating your account…", "Account created! Welcome to Kings Food Mart 🎉");
        });
        signupForm.terms.addEventListener("change", () => {
            signupForm.terms.closest(".checkbox").style.color = "";
        });
    }

    /* shared submit UX — front-end only; wire to a backend to persist accounts */
    function submitFlow(form, pending, done) {
        const btn = form.querySelector(".auth__submit");
        const banner = form.querySelector(".auth__success");
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = pending;
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = original;
            if (banner) {
                banner.querySelector(".auth__success-text").textContent = done;
                banner.classList.add("is-visible");
                banner.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            form.reset();
            const meterFill = form.querySelector(".strength__fill");
            const meterLabel = form.querySelector(".strength__label");
            if (meterFill) { meterFill.style.width = "0"; meterLabel.textContent = ""; }
        }, 1100);
    }

    /* footer year */
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
})();
