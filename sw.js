/* Kings Food Mart — service worker.
   Makes the site installable and fast, and lets already-visited pages
   open on a shaky connection. Live data (Supabase, Paystack) is never
   cached — those always go to the network. */
const CACHE = "kfm-v1";

// Core files worth pre-caching so the app shell loads instantly / offline.
const SHELL = [
  "/", "/shop", "/cart", "/checkout", "/orders", "/login", "/signup", "/contact",
  "/style.css", "/pages.css", "/auth.css",
  "/script.js", "/session.js", "/supabase-client.js",
  "/manifest.webmanifest",
  "/icon-192.png", "/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin GETs. Everything else (Supabase, Paystack,
  // fonts, images CDN, POSTs) goes straight to the network, uncached.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Network-first: always try for fresh content, fall back to cache offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/")))
  );
});
