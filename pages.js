/* Kings Food Mart — shared behaviour for content pages */
(() => {
    "use strict";

    /* footer year */
    const yr = document.getElementById("year");
    if (yr) yr.textContent = String(new Date().getFullYear());

    /* ── table-of-contents active highlighting (legal pages) ── */
    const tocLinks = Array.from(document.querySelectorAll(".toc__list a"));
    if (tocLinks.length && "IntersectionObserver" in window) {
        const sections = tocLinks
            .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
            .filter(Boolean);

        const setActive = (id) => {
            tocLinks.forEach((a) =>
                a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
        };

        const io = new IntersectionObserver((entries) => {
            const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visible[0]) setActive(visible[0].target.id);
        }, { rootMargin: "-88px 0px -70% 0px", threshold: 0 });

        sections.forEach((s) => io.observe(s));

        /* smooth scroll for TOC clicks */
        tocLinks.forEach((a) => {
            a.addEventListener("click", (e) => {
                const target = document.getElementById(a.getAttribute("href").slice(1));
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(null, "", a.getAttribute("href"));
            });
        });
    }

    /* ── contact form validation ── */
    const form = document.getElementById("contactForm");
    if (form) {
        const success = document.getElementById("contactSuccess");
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        const setError = (field, msg) => {
            const wrap = field.closest(".pfield");
            const err = wrap.querySelector(".pfield__error");
            wrap.classList.add("is-invalid");
            if (err && msg) err.textContent = msg;
        };
        const clearError = (field) => field.closest(".pfield").classList.remove("is-invalid");

        form.querySelectorAll("input, textarea, select").forEach((f) => {
            f.addEventListener("input", () => clearError(f));
        });

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            let ok = true;
            const name = form.name;
            const email = form.email;
            const subject = form.subject;
            const message = form.message;

            if (!name.value.trim()) { setError(name, "Please enter your name."); ok = false; }
            if (!emailRe.test(email.value.trim())) { setError(email, "Enter a valid email address."); ok = false; }
            if (subject && !subject.value) { setError(subject, "Please choose a topic."); ok = false; }
            if (message.value.trim().length < 10) { setError(message, "Please write at least a short message (10+ characters)."); ok = false; }

            if (!ok) {
                const firstBad = form.querySelector(".pfield.is-invalid input, .pfield.is-invalid textarea, .pfield.is-invalid select");
                if (firstBad) firstBad.focus();
                return;
            }

            success.querySelector(".contact-success__text").textContent =
                `Thanks, ${name.value.trim().split(" ")[0]}! Your message is on its way — we'll reply within one business day.`;
            success.classList.add("is-visible");
            success.scrollIntoView({ behavior: "smooth", block: "center" });
            form.reset();
        });
    }
})();
