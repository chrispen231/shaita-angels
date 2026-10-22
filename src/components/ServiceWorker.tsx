"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Registers public/sw.js and shows a notice while the visitor is offline.
 *
 * Registration waits for the load event so the worker never competes with the
 * first page for bandwidth, and only runs in production: a worker in `next dev`
 * would cache hot-reloaded chunks and make local work confusing.
 *
 * The notice matters because, offline, the worker serves the last saved copy of
 * a page. Without it a fan could read an old score as the current one.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.error("Service worker registration failed", error);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  // The server always renders online; the browser corrects it after hydration.
  const offline = useSyncExternalStore(subscribeToConnection, () => !navigator.onLine, () => false);

  if (!offline) return null;

  return (
    <div className="offline-notice" role="status">
      You&rsquo;re offline. This is the last saved version of the page, so scores and fixtures may be out of date.
    </div>
  );
}

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
