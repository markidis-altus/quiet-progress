/* Quiet Progress service worker: makes the app open with no internet.
   Pages: try the network briefly (to pick up updates), otherwise serve the saved copy.
   Everything else: saved copy first. Bump CACHE when this file changes. */
const CACHE = "qp-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png"];
const NET_TIMEOUT_MS = 2500;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function page(req) {
  const cache = await caches.open(CACHE);
  const saved = (await cache.match("./index.html")) || (await cache.match("./"));
  const net = fetch(req).then((res) => {
    // Safari refuses redirected responses for page loads, so only keep clean 200s
    if (res.ok && !res.redirected) cache.put("./index.html", res.clone());
    return res;
  });
  if (!saved) return net; // first ever visit: nothing saved yet
  const timeout = new Promise((r) => setTimeout(() => r(null), NET_TIMEOUT_MS));
  try {
    const res = await Promise.race([net, timeout]);
    if (res && res.ok && !res.redirected) return res;
  } catch (_) { /* offline */ }
  net.catch(() => {}); // let a slow fetch finish in the background without errors
  return saved;
}

async function asset(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate" || req.destination === "document";
  e.respondWith(isPage ? page(req) : asset(req));
});
