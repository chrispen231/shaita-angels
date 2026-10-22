"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_TOPICS, PUSH_TOPICS, type PushTopic } from "@/lib/push/endpoint";
import styles from "./MatchAlerts.module.css";

/**
 * "Get match alerts": the opt-in for Web Push.
 *
 * Nothing is requested until the fan presses Save; the browser's permission
 * prompt only ever follows that click. The chosen topics are kept in
 * localStorage purely so the button can say "Match alerts on" — the server's
 * push_subscriptions row is what actually decides who gets what.
 *
 * Renders nothing on the server or when VAPID keys are not configured, and on an
 * iPhone outside the installed app it explains the Home Screen step instead,
 * because Safari only offers push to installed web apps.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const STORAGE_KEY = "sa-match-alerts";
const CHANGE_EVENT = "sa-match-alerts-change";

const TOPIC_LABELS: Record<PushTopic, { label: string; hint: string }> = {
  kickoff: { label: "Kick-off", hint: "An hour before, and when the match starts" },
  goals: { label: "Goals and half time", hint: "Every goal, as it happens" },
  results: { label: "Full-time results", hint: "The final score" },
  news: { label: "Club news", hint: "When a new story is published" },
};

type Support = "pending" | "unsupported" | "ios-install" | "available";

function readSupport(): Support {
  if (!PUBLIC_KEY) return "unsupported";
  const pushReady = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (pushReady) return "available";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone ? "ios-install" : "unsupported";
}

/*
 * Android starts web alerts quietly in the notification shade; pop-up ("heads-up")
 * display is a per-site or per-app setting only the fan can turn on. Where that
 * setting lives depends on whether the site is open in Chrome or installed.
 */
type AndroidMode = "browser" | "installed" | null;

function readAndroidMode(): AndroidMode {
  if (!/Android/i.test(navigator.userAgent)) return null;
  return window.matchMedia("(display-mode: standalone)").matches ? "installed" : "browser";
}

function readSavedTopics(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveTopics(topics: PushTopic[] | null) {
  try {
    if (topics) window.localStorage.setItem(STORAGE_KEY, topics.join(","));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the label just won't remember.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribeToSaved(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const noopSubscribe = () => () => {};

function urlBase64ToUint8Array(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function getRegistration() {
  // The worker registers itself in production; in development it may not exist yet.
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
}

export default function MatchAlerts({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const support = useSyncExternalStore(noopSubscribe, readSupport, () => "pending" as Support);
  const saved = useSyncExternalStore(subscribeToSaved, readSavedTopics, () => "");
  const android = useSyncExternalStore(noopSubscribe, readAndroidMode, () => null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [topics, setTopics] = useState<PushTopic[]>([...DEFAULT_TOPICS]);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  if (support === "pending" || support === "unsupported") return null;

  const toneClass = tone === "light" ? styles.light : styles.dark;

  if (support === "ios-install") {
    return (
      <p className={`${styles.hint} ${toneClass}`}>
        Want match alerts? On iPhone, tap Share, then <strong>Add to Home Screen</strong>, and turn them on from the app.
      </p>
    );
  }

  const isOn = saved.length > 0;

  const openPanel = () => {
    const current = saved.split(",").filter((entry): entry is PushTopic => (PUSH_TOPICS as readonly string[]).includes(entry));
    setTopics(current.length ? current : [...DEFAULT_TOPICS]);
    setMessage(null);
    setOpen(true);
  };

  const closePanel = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  const toggleTopic = (topic: PushTopic, checked: boolean) => {
    setTopics((current) => (checked ? [...new Set([...current, topic])] : current.filter((entry) => entry !== topic)));
  };

  const save = async () => {
    if (!topics.length) {
      setMessage({ kind: "error", text: "Choose at least one kind of alert, or turn alerts off." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (Notification.permission === "denied") {
        setMessage({ kind: "error", text: "Notifications are blocked for this site. Allow them in your browser settings, then try again." });
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage({ kind: "error", text: "Alerts need notification permission. You can turn them on any time." });
        return;
      }
      const registration = await getRegistration();
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) }));
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), topics }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage({ kind: "error", text: body?.error ?? "We couldn't save your alerts. Try again." });
        return;
      }
      saveTopics(topics);
      setMessage({ kind: "ok", text: "Alerts on. We'll let you know." });
    } catch (error) {
      console.error("Match alerts subscribe failed", error);
      setMessage({ kind: "error", text: "We couldn't turn on alerts on this device. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      saveTopics(null);
      setMessage({ kind: "ok", text: "Alerts off." });
    } catch (error) {
      console.error("Match alerts unsubscribe failed", error);
      setMessage({ kind: "error", text: "We couldn't turn off alerts. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${styles.root} ${toneClass}`}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? closePanel() : openPanel())}
      >
        <BellIcon />
        {isOn ? "Match alerts on" : "Get match alerts"}
      </button>

      {open && (
        <div
          id={panelId}
          className={styles.panel}
          role="group"
          aria-label="Match alerts"
          onKeyDown={(event) => {
            if (event.key === "Escape") closePanel();
          }}
        >
          <fieldset className={styles.fieldset} disabled={busy}>
            <legend className={styles.legend}>Send me</legend>
            {PUSH_TOPICS.map((topic) => (
              <label key={topic} className={styles.option}>
                <input
                  type="checkbox"
                  checked={topics.includes(topic)}
                  onChange={(event) => toggleTopic(topic, event.target.checked)}
                />
                <span>
                  {TOPIC_LABELS[topic].label}
                  <small>{TOPIC_LABELS[topic].hint}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={save} disabled={busy}>
              {busy ? "Saving…" : isOn ? "Update alerts" : "Turn on alerts"}
            </button>
            {isOn && (
              <button type="button" className={styles.secondary} onClick={turnOff} disabled={busy}>
                Turn off
              </button>
            )}
          </div>
          <p className={message?.kind === "error" ? styles.error : styles.status} role="status">
            {message?.text}
          </p>
          {isOn && android && (
            <p className={styles.tip}>
              <strong>Want alerts to pop up on screen?</strong> Android shows them quietly at first.{" "}
              {android === "installed" ? (
                <>
                  Long-press the Shaita Angels icon, tap <b>App info</b> then <b>Notifications</b>, and turn on{" "}
                  <b>Pop on screen</b>.
                </>
              ) : (
                <>
                  Open your phone&rsquo;s <b>Settings</b>, then <b>Apps</b>, <b>Chrome</b>, <b>Notifications</b>. Find this site
                  and turn on <b>Pop on screen</b>.
                </>
              )}{" "}
              On Samsung it&rsquo;s called <b>Pop-up</b>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1Z"
        fill="currentColor"
      />
    </svg>
  );
}
