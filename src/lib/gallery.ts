import type { Article, SquadPlayer, StaffMember } from "@/lib/content";
import { photosForPlayer } from "@/lib/player-photos";

export type GalleryCategory = "stories" | "players" | "staff" | "gallery";
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
  uploads,
}: {
  articles: Article[];
  players: SquadPlayer[];
  staff: StaffMember[];
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
  for (const upload of uploads) {
    const title = upload.original_filename?.replace(/\.[^.]+$/, "") || "Shaita Angels FC";
    add({ id: `gallery:${upload.id}`, public_url: upload.public_url, alt: upload.original_filename || "Shaita Angels gallery photo", title, category: "gallery", date: upload.uploaded_at });
  }

  return photos.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
}
