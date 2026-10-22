import type { Article, LeadershipMember, SquadPlayer, StaffMember } from "@/lib/content";
import { photosForPlayer } from "@/lib/player-photos";

export type GalleryCategory = "stories" | "players" | "staff" | "leadership" | "gallery";
export type GalleryPhoto = {
  id: string;
  public_url: string;
  alt: string;
  title: string;
  category: GalleryCategory;
  date: string | null;
};

type UploadedGalleryPhoto = {
  id: string | number;
  public_url: string;
  original_filename: string | null;
  uploaded_at: string;
};

export function buildGalleryPhotos({
  articles,
  players,
  staff,
  leaders,
  uploads,
}: {
  articles: Article[];
  players: SquadPlayer[];
  staff: StaffMember[];
  leaders: LeadershipMember[];
  uploads: UploadedGalleryPhoto[];
}): GalleryPhoto[] {
  const photos: GalleryPhoto[] = [];
  const seenUrls = new Set<string>();
  const add = (photo: GalleryPhoto) => {
    const url = photo.public_url.trim();
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    photos.push({ ...photo, public_url: url });
  };

  for (const article of articles) {
    if (article.image) {
      add({ id: `story:${article.slug}`, public_url: article.image, alt: article.imageAlt || article.title, title: article.title, category: "stories", date: article.date });
    }
  }
  for (const player of players) {
    const playerPhotos = photosForPlayer(player);
    playerPhotos.forEach((url, index) => {
      add({
        id: `player:${player.number}${index > 0 ? `:photo-${index + 1}` : ""}`,
        public_url: url,
        alt: index === 0
          ? player.photoAlt || `${player.name}, Shaita Angels player`
          : `${player.name}, alternate squad photo`,
        title: player.name,
        category: "players",
        date: null,
      });
    });
  }
  for (const member of staff) {
    if (member.photo) {
      add({ id: `staff:${member.id}`, public_url: member.photo, alt: member.photoAlt || `${member.name}, ${member.role}`, title: member.name, category: "staff", date: null });
    }
    if (member.photoAlternate) {
      add({ id: `staff:${member.id}:alternate`, public_url: member.photoAlternate, alt: `${member.name}, alternate staff photo`, title: member.name, category: "staff", date: null });
    }
  }
  for (const leader of leaders) {
    if (leader.photo) {
      add({ id: `leadership:${leader.id}`, public_url: leader.photo, alt: leader.photoAlt || `${leader.name}, ${leader.role}`, title: leader.name, category: "leadership", date: null });
    }
  }
  for (const upload of uploads) {
    const name = uploadTitle(upload.original_filename);
    add({
      id: `gallery:${upload.id}`,
      public_url: upload.public_url,
      alt: name ? `${name}, Shaita Angels gallery photo` : "Shaita Angels gallery photo",
      title: name ?? "Shaita Angels FC",
      category: "gallery",
      date: upload.uploaded_at,
    });
  }

  return photos.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}

// Names cameras and phones give files, which describe nothing to a reader:
// "IMG_2034", "DSC00123", "PXL_20261019_101500", "WhatsApp Image 2026-10-19".
const CAMERA_FILENAME = /^(img|dsc|dscn|dscf|pxl|photo|image|screenshot|whatsapp image|signal)[\s_-]*\d/i;

/**
 * A readable title from an uploaded file's name, or null when the name says
 * nothing about the photo. Gallery uploads carry no caption field, so the
 * filename is the only source, and a raw "IMG_2034.jpg" must not become alt text.
 */
export function uploadTitle(filename: string | null): string | null {
  if (!filename) return null;
  const name = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!/[a-z]{2}/i.test(name) || CAMERA_FILENAME.test(name)) return null;
  return name;
}

/**
 * Whether next/image can optimise this source. Local files and this project's
 * public Supabase storage match next.config.ts remotePatterns; anything else
 * (a pasted article image URL) would fail in the optimiser, so it is served as is.
 */
export function canOptimizeImage(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  return /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//.test(url);
}
