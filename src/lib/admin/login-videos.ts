/**
 * Background videos for the admin sign-in screen.
 *
 * The four files live in `public/videos/`. Renaming or replacing them means
 * editing this one array and nothing else - the component and the tests both
 * read from here.
 */
export const LOGIN_VIDEOS = [
  "/videos/login-bg-1.mp4",
  "/videos/login-bg-2.mp4",
  "/videos/login-bg-3.mp4",
  "/videos/login-bg-4.mp4",
] as const;

/**
 * The previously shown video index, kept in sessionStorage so a refresh or a
 * logout can avoid repeating the same clip. Deliberately session-scoped: a new
 * browser session is free to start anywhere.
 */
export const LOGIN_VIDEO_STORAGE_KEY = "shaita-admin-login-video";

/** The slice of the Web Storage API this module needs. */
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Pick an index that is never the one just shown.
 *
 * With `previousIndex` unusable (first visit, cleared storage, a stale value
 * from an older build) this is a plain uniform draw. Otherwise the draw is
 * uniform across the *other* `count - 1` entries, which keeps the rotation fair
 * instead of biasing toward the start of the array.
 */
export function pickLoginVideoIndex(
  count: number,
  previousIndex: number | null,
  random: () => number = Math.random,
): number {
  if (count <= 0) return 0;
  if (count === 1) return 0;

  const usable =
    previousIndex !== null &&
    Number.isInteger(previousIndex) &&
    previousIndex >= 0 &&
    previousIndex < count;

  if (!usable) {
    return Math.min(count - 1, Math.floor(random() * count));
  }

  // Walk forward from the previous index by 1..count-1, so every other entry is
  // reachable and the previous one never is.
  const offset = Math.floor(random() * (count - 1));
  return (previousIndex + 1 + offset) % count;
}

/** Resolve a storage object, tolerating SSR and a locked-down browser. */
function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // Safari in private mode throws on the property access itself.
    return null;
  }
}

/**
 * Read the stored index. Returns null for a missing, unparseable or
 * unavailable value - the caller then treats the visit as a first visit rather
 * than failing.
 */
export function readStoredIndex(
  key: string,
  storage?: StorageLike | null,
): number | null {
  try {
    const store = resolveStorage(storage);
    if (!store) return null;
    const raw = store.getItem(key);
    if (raw === null) return null;
    // Strict digit check rather than parseInt: parseInt("1.5") is 1 and
    // parseInt("3abc") is 3, either of which would silently accept a corrupt or
    // hand-edited value as a real index.
    if (!/^\d+$/.test(raw)) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Remember the index just shown. A storage failure is not worth surfacing: the
 * rotation simply falls back to a uniform draw on the next visit.
 */
export function writeStoredIndex(
  key: string,
  index: number,
  storage?: StorageLike | null,
): void {
  try {
    resolveStorage(storage)?.setItem(key, String(index));
  } catch {
    /* sessionStorage unavailable (private mode, quota) - rotation degrades, login does not. */
  }
}

/**
 * Resolve the index for this page visit: no video under reduced motion,
 * otherwise a clip that differs from the one the last visit showed.
 */
export function resolveInitialIndex(
  count: number = LOGIN_VIDEOS.length,
  options: { storage?: StorageLike | null; random?: () => number; reducedMotion?: boolean } = {},
): number | null {
  if (options.reducedMotion) return null;
  const previous = readStoredIndex(LOGIN_VIDEO_STORAGE_KEY, options.storage);
  const next = pickLoginVideoIndex(count, previous, options.random);
  writeStoredIndex(LOGIN_VIDEO_STORAGE_KEY, next, options.storage);
  return next;
}

/**
 * The next index to try after `current` failed, or null once every clip has
 * been tried. Pure so the failure walk is testable without a DOM.
 */
export function nextFailedIndex(current: number, tried: ReadonlySet<number>, count: number): number | null {
  if (tried.size >= count) return null;
  let candidate = current;
  for (let step = 0; step < count; step += 1) {
    candidate = (candidate + 1) % count;
    if (!tried.has(candidate)) return candidate;
  }
  return null;
}

/** The shape the backdrop needs from a per-mount store. */
export type LoginVideoStore = {
  subscribe(onChange: () => void): () => void;
  getSnapshot(): number | null;
};

/**
 * A store resolved once per mount.
 *
 * This exists so the backdrop can read sessionStorage without setting state
 * from an effect. `useSyncExternalStore` renders the server snapshot (null, no
 * video) during hydration and then re-reads `getSnapshot` on the client, which
 * is exactly the "resolve on mount, keep the element decorative" behaviour the
 * login screen wants. A fresh mount - a refresh, or returning after logout -
 * gets a fresh store, so the clip rotates per visit rather than per page load.
 */
export function createLoginVideoStore(options: {
  reducedMotion?: () => boolean;
  storage?: StorageLike | null;
  random?: () => number;
} = {}): LoginVideoStore {
  let resolved: number | null | undefined;
  return {
    subscribe: () => () => {},
    getSnapshot(): number | null {
      if (resolved === undefined) {
        resolved = resolveInitialIndex(LOGIN_VIDEOS.length, {
          reducedMotion: options.reducedMotion?.(),
          storage: options.storage,
          random: options.random,
        });
      }
      return resolved;
    },
  };
}

