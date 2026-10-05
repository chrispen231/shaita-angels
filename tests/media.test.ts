import { describe, it, expect } from "vitest";
import {
  PURPOSE_BUCKET,
  allowedTypes,
  SIZE_LIMIT,
  humanSize,
  objectPathFor,
  checkFile,
  svgWarning,
  MEDIA_BUCKETS,
  type UploadPurpose,
} from "@/lib/media";

/**
 * The bucket list and limits here must match
 * supabase/migrations/20261005170000_media_and_reference_data.sql. Storage enforces
 * them again, so a mismatch fails an upload rather than corrupting one - but it
 * fails it at the wrong moment with a worse message, which is what these catch.
 */

const file = (name: string, type: string, size: number): File =>
  ({ name, type, size }) as File;

describe("buckets", () => {
  it("maps each purpose to its own bucket", () => {
    // One bucket per task: a shared bucket would need a purpose column nobody
    // filters on, and would give a public URL that says nothing about its use.
    expect(PURPOSE_BUCKET.sponsor).toBe("sponsor-logos");
    expect(PURPOSE_BUCKET.news).toBe("news");
    expect(PURPOSE_BUCKET.player).toBe("players");
    expect(PURPOSE_BUCKET.opponent).toBe("opponents");
  });

  it("uses every declared bucket exactly once", () => {
    const mapped = Object.values(PURPOSE_BUCKET).sort();
    expect(mapped).toEqual([...MEDIA_BUCKETS].sort());
  });

  it("has a size limit for every bucket", () => {
    for (const bucket of MEDIA_BUCKETS) {
      expect(SIZE_LIMIT[bucket]).toBeGreaterThan(0);
    }
  });
});

describe("allowedTypes", () => {
  it("allows svg only for logos", () => {
    // A user-supplied SVG on a news page would be an arbitrary script.
    expect(allowedTypes("sponsor")).toContain("image/svg+xml");
    expect(allowedTypes("opponent")).toContain("image/svg+xml");
    expect(allowedTypes("news")).not.toContain("image/svg+xml");
    expect(allowedTypes("player")).not.toContain("image/svg+xml");
  });

  it("allows the raster formats everywhere", () => {
    for (const purpose of ["sponsor", "news", "player", "opponent"] as UploadPurpose[]) {
      expect(allowedTypes(purpose)).toContain("image/png");
      expect(allowedTypes(purpose)).toContain("image/jpeg");
      expect(allowedTypes(purpose)).toContain("image/webp");
    }
  });
});

describe("humanSize", () => {
  it("reads in the right unit", () => {
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(2048)).toBe("2 KB");
    expect(humanSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("objectPathFor", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const unique = "abc123xy";

  it("date-prefixes and slugifies the filename", () => {
    expect(objectPathFor("news", "Orange Cup Final.JPG", now, unique)).toBe(
      "2026-10-05/orange-cup-final-abc123xy.jpg",
    );
  });

  it("maps each mime to a sensible extension", () => {
    expect(objectPathFor("news", "a.png", now, unique)).toMatch(/\.png$/);
    expect(objectPathFor("news", "a.jpeg", now, unique)).toMatch(/\.jpg$/);
    expect(objectPathFor("news", "a.webp", now, unique)).toMatch(/\.webp$/);
    expect(objectPathFor("sponsor", "a.svg", now, unique)).toMatch(/\.svg$/);
  });

  it("adds a unique suffix so two uploads never collide", () => {
    // Without the suffix, uploading logo.png twice would silently overwrite the
    // first - the exact failure the design is avoiding.
    const a = objectPathFor("sponsor", "logo.png", now, "aaaaaaaa");
    const b = objectPathFor("sponsor", "logo.png", now, "bbbbbbbb");
    expect(a).not.toBe(b);
  });

  it("strips accents and punctuation from the filename", () => {
    expect(objectPathFor("news", "Künye vs Café!.png", now, unique)).toBe(
      "2026-10-05/kunye-vs-cafe-abc123xy.png",
    );
  });

  it("falls back to a stem when the filename has nothing usable", () => {
    expect(objectPathFor("news", "!!!.png", now, unique)).toBe("2026-10-05/image-abc123xy.png");
  });

  it("caps a very long filename", () => {
    const path = objectPathFor("news", `${"a".repeat(200)}.png`, now, unique);
    // 60-char stem cap, plus the date, the suffix and the extension.
    expect(path.length).toBeLessThan(100);
  });

  it("produces a path with no traversal segments", () => {
    const path = objectPathFor("news", "../../etc/passwd.png", now, unique);
    expect(path).not.toContain("..");
    expect(path.startsWith("2026-10-05/")).toBe(true);
  });

  it("defaults the unique suffix so two calls differ", () => {
    const paths = new Set([
      objectPathFor("news", "logo.png", now),
      objectPathFor("news", "logo.png", now),
      objectPathFor("news", "logo.png", now),
    ]);
    expect(paths.size).toBe(3);
  });
});

describe("checkFile", () => {
  it("accepts a normal png", () => {
    expect(checkFile(file("a.png", "image/png", 50_000), "news").ok).toBe(true);
  });

  it("rejects an unlisted type", () => {
    const result = checkFile(file("a.pdf", "application/pdf", 1000), "news");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/png/);
  });

  it("rejects a file over the bucket limit", () => {
    const tooBig = SIZE_LIMIT.news + 1;
    const result = checkFile(file("a.png", "image/png", tooBig), "news");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/limit/);
  });

  it("accepts a file exactly at the limit", () => {
    expect(checkFile(file("a.png", "image/png", SIZE_LIMIT.news), "news").ok).toBe(true);
  });

  it("enforces a tighter limit for logos than for news", () => {
    // A logo over the sponsor limit must fail even though it is under the news one.
    const between = SIZE_LIMIT["sponsor-logos"] + 1;
    expect(checkFile(file("a.png", "image/png", between), "sponsor").ok).toBe(false);
    expect(checkFile(file("a.png", "image/png", between), "news").ok).toBe(true);
  });

  it("rejects an empty file", () => {
    const result = checkFile(file("a.png", "image/png", 0), "news");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/empty/);
  });

  it("rejects svg for news but allows it for a logo", () => {
    expect(checkFile(file("a.svg", "image/svg+xml", 2000), "news").ok).toBe(false);
    expect(checkFile(file("a.svg", "image/svg+xml", 2000), "sponsor").ok).toBe(true);
  });

  it("rejects a file with no reported type", () => {
    // Some browsers report an empty type for an unusual file. Storage would reject
    // it too, but catching it here gives a readable message.
    expect(checkFile(file("a.png", "", 1000), "news").ok).toBe(false);
  });
});

describe("svgWarning", () => {
  it("warns that svg is stored as supplied for logos", () => {
    expect(svgWarning("sponsor")).toMatch(/stored exactly as supplied/);
    expect(svgWarning("opponent")).toMatch(/stored exactly as supplied/);
  });

  it("says png is required elsewhere", () => {
    expect(svgWarning("news")).toMatch(/PNG/);
    expect(svgWarning("player")).toMatch(/PNG/);
  });
});
