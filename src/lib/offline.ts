/* Offline support: registers the service worker and reports whether the app can open with no internet. */

export type OfflineStatus = "ready" | "preparing" | "wrong-browser" | "unsupported" | "local-file";

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
/** Chrome, Firefox, Edge, Google app etc. on iPhone can't run web apps offline — only Safari / Home Screen apps can. */
export const isIOSOtherBrowser = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|DuckDuckGo|YaBrowser/.test(ua);
export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const CACHE_PREFIX = "qp-";

export function registerServiceWorker() {
  const okOrigin = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!("serviceWorker" in navigator) || !okOrigin) return;
  navigator.serviceWorker.register("./sw.js").catch(() => { /* status shows "preparing" */ });
}

export async function offlineStatus(): Promise<OfflineStatus> {
  if (location.protocol === "file:") return "local-file";
  if (isIOSOtherBrowser) return "wrong-browser";
  if (!("serviceWorker" in navigator) || !("caches" in window)) return "unsupported";
  try {
    const keys = (await caches.keys()).filter((k) => k.startsWith(CACHE_PREFIX));
    for (const k of keys) {
      const c = await caches.open(k);
      if ((await c.match("./index.html")) || (await c.match("./"))) return "ready";
    }
  } catch { /* fall through */ }
  return "preparing";
}

export const OFFLINE_TEXT: Record<OfflineStatus, { ok: boolean; title: string; body: string }> = {
  ready: { ok: true, title: "Works offline", body: "A copy of the app is saved on this device, so it opens with no internet." },
  preparing: { ok: false, title: "Not ready for offline yet", body: "Keep the app open with internet for a few seconds, then close and reopen it." },
  "wrong-browser": { ok: false, title: "This browser can't work offline", body: "On iPhone only Safari can install the app. Open this link in Safari, then Share → Add to Home Screen." },
  unsupported: { ok: false, title: "Offline isn't supported here", body: "Open the app in Safari (iPhone) or Chrome/Edge (computer)." },
  "local-file": { ok: true, title: "Running from a file", body: "Opened from your computer, so it doesn't need internet." },
};
