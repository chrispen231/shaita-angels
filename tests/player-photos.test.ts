import { describe, it, expect } from "vitest";
import { photosForPlayer } from "@/lib/player-photos";
import { playerPhotos } from "@/data/site";

/**
 * Which photo a player card shows.
 *
 * This exists because the bug it covers shipped: the squad grid read only the
 * bundled map and ignored squad.photo_url entirely, so a photo uploaded through
 * the admin editor appeared nowhere on the public site. The profile page had the
 * same data backwards, preferring the bundled file over the uploaded one. Neither
 * page's tests noticed, because nothing asserted that an uploaded photo reaches
 * the component.
 *
 * The rule under test: the database wins, the bundled map is the fallback.
 */

describe("photosForPlayer", () => {
  it("prefers an uploaded photo over the bundled one", () => {
    // This is the case that was broken. Aline Capehart has bundled photos, so the
    // old code would have returned those and silently ignored the upload.
    const bundled = playerPhotos["Aline Capehart"];
    expect(bundled.length).toBeGreaterThan(0);

    const uploaded = "https://example.supabase.co/storage/v1/object/public/players/2026-10-15/aline.png";
    expect(photosForPlayer({ name: "Aline Capehart", photo: uploaded })).toEqual([uploaded]);
  });

  it("returns an uploaded photo for a player with no bundled file", () => {
    // The common case once the club uploads the remaining squad: 17 of 24 players
    // have no bundled photo at all, so this path must work on its own.
    const uploaded = "https://example.supabase.co/storage/v1/object/public/players/2026-10-15/new.png";
    expect(photosForPlayer({ name: "Someone New", photo: uploaded })).toEqual([uploaded]);
  });

  it("falls back to the bundled map when there is no upload", () => {
    const bundled = playerPhotos["Blessing King"];
    expect(photosForPlayer({ name: "Blessing King", photo: null })).toEqual(bundled);
  });

  it("returns the bundled pair, so the hover alternate still works", () => {
    // A bundled player keeps their alternate portrait; an uploaded one has only
    // the single image the upload field stores.
    const photos = photosForPlayer({ name: "Haddy Wally", photo: null });
    expect(photos).toHaveLength(2);
    expect(photos[1]).toContain("-alt");
  });

  it("returns an uploaded photo alone, with no invented alternate", () => {
    const uploaded = "https://example.supabase.co/storage/v1/object/public/players/2026-10-15/x.png";
    expect(photosForPlayer({ name: "Haddy Wally", photo: uploaded })).toHaveLength(1);
  });

  it("returns nothing for a player with neither source", () => {
    // The card then renders the shirt artwork, which is deliberate rather than
    // broken, so an empty array is the correct answer and not an error.
    expect(photosForPlayer({ name: "No Photo Anywhere", photo: null })).toEqual([]);
    expect(photosForPlayer({ name: "No Photo Anywhere" })).toEqual([]);
  });

  it("treats an empty string as no photo", () => {
    // The admin form can submit an empty value, and an empty src renders a broken
    // image rather than falling through to the bundled file.
    expect(photosForPlayer({ name: "Blessing King", photo: "" })).toEqual(
      playerPhotos["Blessing King"],
    );
  });

  it("covers every bundled player, so no card regresses", () => {
    // Guards the fallback for the seven players photographed before the media
    // library existed.
    for (const name of Object.keys(playerPhotos)) {
      expect(photosForPlayer({ name, photo: null }).length).toBeGreaterThan(0);
    }
  });
});
