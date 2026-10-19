import { describe, it, expect } from "vitest";
import {
  LOGIN_VIDEOS,
  LOGIN_VIDEO_STORAGE_KEY,
  pickLoginVideoIndex,
  readStoredIndex,
  writeStoredIndex,
  resolveInitialIndex,
  nextFailedIndex,
  createLoginVideoStore,
  type StorageLike,
} from "@/lib/admin/login-videos";

/**
 * The rotation is the one piece of login-page logic with real branching, so it
 * is pinned here: a repeat on refresh is the bug a visitor would actually
 * notice, and it is the cheapest thing to regress.
 */

/** A storage stub that can be told to throw, standing in for private mode. */
function memoryStorage(options: { throwOnSet?: boolean; throwOnGet?: boolean } = {}) {
  const map = new Map<string, string>();
  const store: StorageLike = {
    getItem(key) {
      if (options.throwOnGet) throw new Error("blocked");
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      if (options.throwOnSet) throw new Error("quota");
      map.set(key, value);
    },
  };
  return { store, map };
}

describe("login video config", () => {
  it("lists four videos at the expected public paths", () => {
    expect(LOGIN_VIDEOS).toHaveLength(4);
    expect([...LOGIN_VIDEOS]).toEqual([
      "/videos/login-bg-1.mp4",
      "/videos/login-bg-2.mp4",
      "/videos/login-bg-3.mp4",
      "/videos/login-bg-4.mp4",
    ]);
  });
});

describe("pickLoginVideoIndex", () => {
  it("never returns the previous index", () => {
    for (let previous = 0; previous < LOGIN_VIDEOS.length; previous += 1) {
      for (let step = 0; step < 200; step += 1) {
        const next = pickLoginVideoIndex(LOGIN_VIDEOS.length, previous);
        expect(next).not.toBe(previous);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(LOGIN_VIDEOS.length);
      }
    }
  });

  it("reaches every other index across the rotation", () => {
    const seen = new Set<number>();
    for (let step = 0; step < 400; step += 1) {
      seen.add(pickLoginVideoIndex(4, 0));
    }
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it("draws uniformly when there is no usable previous index", () => {
    for (const previous of [null, -1, 4, 99, 1.5, Number.NaN]) {
      const results = new Set<number>();
      for (let step = 0; step < 400; step += 1) {
        results.add(pickLoginVideoIndex(4, previous));
      }
      expect([...results].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it("respects an injected random source", () => {
    // random() === 0 is the first allowed step after the previous index.
    expect(pickLoginVideoIndex(4, 2, () => 0)).toBe(3);
    // A value just under 1 takes the last allowed step, which wraps past the end.
    expect(pickLoginVideoIndex(4, 2, () => 0.999999)).toBe(1);
  });

  it("degrades safely for degenerate counts", () => {
    expect(pickLoginVideoIndex(0, 3)).toBe(0);
    expect(pickLoginVideoIndex(1, 0)).toBe(0);
    expect(pickLoginVideoIndex(1, null)).toBe(0);
  });
});

describe("storage helpers", () => {
  it("round-trips an index", () => {
    const { store } = memoryStorage();
    writeStoredIndex(LOGIN_VIDEO_STORAGE_KEY, 2, store);
    expect(readStoredIndex(LOGIN_VIDEO_STORAGE_KEY, store)).toBe(2);
  });

  it("treats a missing key as a first visit", () => {
    const { store } = memoryStorage();
    expect(readStoredIndex(LOGIN_VIDEO_STORAGE_KEY, store)).toBeNull();
  });

  it("rejects junk rather than throwing", () => {
    const { store, map } = memoryStorage();
    for (const junk of ["", "abc", "-1", "1.5", "NaN"]) {
      map.set(LOGIN_VIDEO_STORAGE_KEY, junk);
      expect(readStoredIndex(LOGIN_VIDEO_STORAGE_KEY, store)).toBeNull();
    }
  });

  it("survives a storage that throws on read", () => {
    const { store } = memoryStorage({ throwOnGet: true });
    expect(readStoredIndex(LOGIN_VIDEO_STORAGE_KEY, store)).toBeNull();
  });

  it("survives a storage that throws on write", () => {
    const { store } = memoryStorage({ throwOnSet: true });
    expect(() => writeStoredIndex(LOGIN_VIDEO_STORAGE_KEY, 1, store)).not.toThrow();
  });

  it("survives a null storage (SSR / blocked)", () => {
    expect(readStoredIndex(LOGIN_VIDEO_STORAGE_KEY, null)).toBeNull();
    expect(() => writeStoredIndex(LOGIN_VIDEO_STORAGE_KEY, 1, null)).not.toThrow();
  });

  it("avoids a consecutive repeat end to end", () => {
    const { store } = memoryStorage();
    let previous = readStoredIndex(LOGIN_VIDEO_STORAGE_KEY, store);
    const sequence: number[] = [];
    for (let visit = 0; visit < 30; visit += 1) {
      const next = pickLoginVideoIndex(LOGIN_VIDEOS.length, previous);
      expect(next).not.toBe(previous);
      writeStoredIndex(LOGIN_VIDEO_STORAGE_KEY, next, store);
      previous = readStoredIndex(LOGIN_VIDEO_STORAGE_KEY, store);
      sequence.push(next);
    }
    // And it genuinely moves around rather than ping-ponging between two files.
    expect(new Set(sequence).size).toBeGreaterThan(1);
  });
});

describe("resolveInitialIndex", () => {
  it("returns no video when the visitor prefers reduced motion", () => {
    const { store, map } = memoryStorage();
    expect(resolveInitialIndex(4, { storage: store, reducedMotion: true })).toBeNull();
    // And it must not record a choice it never showed.
    expect(map.has(LOGIN_VIDEO_STORAGE_KEY)).toBe(false);
  });

  it("records the chosen index so the next visit can avoid it", () => {
    const { store, map } = memoryStorage();
    const chosen = resolveInitialIndex(4, { storage: store, random: () => 0 });
    expect(chosen).not.toBeNull();
    expect(map.get(LOGIN_VIDEO_STORAGE_KEY)).toBe(String(chosen));
  });

  it("differs from the previously stored index", () => {
    const { store } = memoryStorage();
    writeStoredIndex(LOGIN_VIDEO_STORAGE_KEY, 2, store);
    const next = resolveInitialIndex(4, { storage: store });
    expect(next).not.toBe(2);
  });

  it("still returns an index when storage is unavailable", () => {
    const chosen = resolveInitialIndex(4, { storage: null });
    expect(chosen).toBeGreaterThanOrEqual(0);
    expect(chosen).toBeLessThan(4);
  });
});

describe("nextFailedIndex", () => {
  it("walks to the next untried index", () => {
    expect(nextFailedIndex(0, new Set([0]), 4)).toBe(1);
    expect(nextFailedIndex(1, new Set([0, 1]), 4)).toBe(2);
  });

  it("wraps past the end of the list", () => {
    expect(nextFailedIndex(3, new Set([3]), 4)).toBe(0);
  });

  it("skips indexes already tried", () => {
    expect(nextFailedIndex(0, new Set([0, 1, 3]), 4)).toBe(2);
  });

  it("gives up once every index has failed", () => {
    expect(nextFailedIndex(2, new Set([0, 1, 2, 3]), 4)).toBeNull();
  });
});

describe("createLoginVideoStore", () => {
  it("resolves once and returns the same snapshot", () => {
    const { store } = memoryStorage();
    const videoStore = createLoginVideoStore({ storage: store, random: () => 0 });
    const first = videoStore.getSnapshot();
    expect(first).not.toBeNull();
    // A second read must not draw again, or the clip would change mid-visit.
    expect(videoStore.getSnapshot()).toBe(first);
    expect(videoStore.getSnapshot()).toBe(first);
  });

  it("returns null under reduced motion", () => {
    const videoStore = createLoginVideoStore({ reducedMotion: () => true });
    expect(videoStore.getSnapshot()).toBeNull();
  });

  it("rotates across separate mounts", () => {
    const { store } = memoryStorage();
    const first = createLoginVideoStore({ storage: store }).getSnapshot();
    const second = createLoginVideoStore({ storage: store }).getSnapshot();
    expect(second).not.toBe(first);
  });

  it("exposes an unsubscribe function", () => {
    const videoStore = createLoginVideoStore();
    expect(typeof videoStore.subscribe(() => {})).toBe("function");
  });
});
