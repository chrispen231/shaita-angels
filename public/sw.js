/*
 * Shaita Angels service worker.
 *
 * Kept deliberately small, because a service worker bug can pin visitors to an
 * old site. The rules:
 *
 *   - Pages are network-first. Scores and fixtures change during a match, so a
 *     saved copy is only ever shown when the network fails, never in place of a
 *     fresh one. Failing that, the offline page.
 *   - /_next/static is content-hashed build output: cache-first is safe.
 *   - Images are stale-while-revalidate, capped so the cache cannot grow forever.
 *   - The admin, auth and API routes, Next's client-side data requests (RSC),
 *     non-GET requests and every other origin (Supabase included) are not
 *     touched at all: the browser handles them exactly as it would without this
 *     file.
 *
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = "v2";
const SHELL = `sa-shell-${VERSION}`;
const PAGES = `sa-pages-${VERSION}`;
const ASSETS = `sa-assets-${VERSION}`;
const IMAGES = `sa-images-${VERSION}`;
const CURRENT = [SHELL, PAGES, ASSETS, IMAGES];

const OFFLINE_URL = "/offline.html";
const SHELL_FILES = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

const MAX_PAGES = 25;
const MAX_IMAGES = 80;
const MAX_ASSETS = 150;

const BYPASS_PREFIXES = ["/admin", "/auth", "/api"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !CURRENT.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) return;
  // Client-side navigation data. Left to the network: when it fails, Next falls
  // back to a full page load, which the navigation handler below then serves.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSETS, MAX_ASSETS));
    return;
  }
  if (url.pathname.startsWith("/_next/image") || /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request, IMAGES, MAX_IMAGES));
  }
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (isCacheablePage(response)) {
      const copy = response.clone();
      caches.open(PAGES).then((cache) => cache.put(request, copy).then(() => trim(PAGES, MAX_PAGES)));
    }
    return response;
  } catch {
    const saved = await caches.match(request, { cacheName: PAGES });
    if (saved) return saved;
    const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL });
    return offline ?? Response.error();
  }
}

// Only a plain, successful, same-origin public page is saved. A redirect could
// land on /admin, so redirected responses are never stored.
function isCacheablePage(response) {
  if (!response.ok || response.redirected || response.type !== "basic") return false;
  const path = new URL(response.url).pathname;
  return !BYPASS_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function cacheFirst(request, cacheName, max) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(cacheName).then((cache) => cache.put(request, copy).then(() => trim(cacheName, max)));
  }
  return response;
}

async function staleWhileRevalidate(event, request, cacheName, max) {
  const cached = await caches.match(request, { cacheName });
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, copy).then(() => trim(cacheName, max)));
      }
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return refresh.then((response) => response ?? Response.error());
}

/*
 * Match alerts. The server sends { title, body, url, tag, vibrate? }. The tag is
 * per match (or per story), so a goal replaces the kick-off alert on the lock
 * screen instead of stacking, and renotify makes the replacement still buzz.
 * vibrate is a short Android pattern for goals and kick-off; anything malformed
 * is dropped so the phone falls back to its default.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Shaita Angels FC";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      ...(safeVibration(data.vibrate) ? { vibrate: data.vibrate } : {}),
      data: { url: safeUrl(data.url) },
    }),
  );
});

function safeVibration(pattern) {
  return (
    Array.isArray(pattern) &&
    pattern.length > 0 &&
    pattern.length <= 10 &&
    pattern.every((ms) => Number.isInteger(ms) && ms >= 0 && ms <= 1000)
  );
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      // navigate() rejects for a window this worker does not control yet.
      if (open) return open.focus().then(() => open.navigate(url)).catch(() => self.clients.openWindow(url));
      return self.clients.openWindow(url);
    }),
  );
});

// Only ever open a page on this site, whatever a payload says.
function safeUrl(value) {
  try {
    const url = new URL(value || "/", self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}

// Oldest entries first: Cache.keys() returns them in insertion order.
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}
