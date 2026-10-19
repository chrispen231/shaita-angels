import { describe, expect, it } from "vitest";
import { buildGalleryPhotos } from "@/lib/gallery";
import type { Article, LeadershipMember, SquadPlayer, StaffMember } from "@/lib/content";

const article: Article = {
  slug: "cup-final", category: "News", date: "2026-10-18", title: "Cup final",
  excerpt: "The club wins.", image: "https://cdn.example.com/shared.jpg", imageAlt: null,
  body: [], isFeatured: false,
};
const player: SquadPlayer = {
  number: 7, name: "Aline Doe", position: "Forward", photo: "https://cdn.example.com/player.jpg",
  photoAlt: null, photoAlternate: "https://cdn.example.com/player-alt.jpg", bio: null,
};
const member: StaffMember = {
  id: "staff-1", name: "Coach Doe", role: "Head Coach", bio: null,
  photo: "https://cdn.example.com/coach.jpg", photoAlt: null,
  photoAlternate: "https://cdn.example.com/coach-alt.jpg",
};
const leader: LeadershipMember = {
  id: "leader-1", name: "Leader Doe", role: "President", bio: null,
  photo: "https://cdn.example.com/leader.jpg", photoAlt: "Leader Doe portrait",
};

describe("buildGalleryPhotos", () => {
  it("collects photos from published content and both portrait images", () => {
    const photos = buildGalleryPhotos({ articles: [article], players: [player], staff: [member], leaders: [leader], uploads: [] });
    expect(photos.map(({ category }) => category)).toEqual(["stories", "players", "players", "staff", "staff", "leadership"]);
    expect(photos).toHaveLength(6);
  });

  it("includes bundled player portraits used by the squad cards", () => {
    const photos = buildGalleryPhotos({
      articles: [],
      players: [{ ...player, name: "Aline Capehart", photo: null, photoAlternate: null }],
      staff: [],
      leaders: [],
      uploads: [],
    });

    expect(photos.map(({ public_url }) => public_url)).toEqual([
      "/players/aline-capehart.jpg",
      "/players/aline-capehart-alt.jpg",
    ]);
    expect(photos.every(({ category }) => category === "players")).toBe(true);
  });

  it("includes published gallery uploads and deduplicates repeated image URLs", () => {
    const photos = buildGalleryPhotos({
      articles: [article], players: [], staff: [], leaders: [],
      uploads: [
        { id: "upload-1", public_url: "https://cdn.example.com/shared.jpg", original_filename: "Cup.jpg", uploaded_at: "2026-10-19T10:00:00Z" },
        { id: "upload-2", public_url: "https://cdn.example.com/other.jpg", original_filename: null, uploaded_at: "2026-10-20T10:00:00Z" },
      ],
    });
    expect(photos).toHaveLength(2);
    expect(photos[0].category).toBe("gallery");
    expect(photos[1].category).toBe("stories");
  });

  it("ignores empty URLs", () => {
    const photos = buildGalleryPhotos({
      articles: [{ ...article, image: " " }], players: [], staff: [], leaders: [], uploads: [],
    });
    expect(photos).toEqual([]);
  });

  it("includes published leadership portraits", () => {
    const photos = buildGalleryPhotos({ articles: [], players: [], staff: [], leaders: [leader], uploads: [] });
    expect(photos).toEqual([expect.objectContaining({
      id: "leadership:leader-1", public_url: leader.photo, category: "leadership", title: leader.name,
    })]);
  });
});
