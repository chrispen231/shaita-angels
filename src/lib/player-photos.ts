import { playerPhotos } from "@/data/site";

/**
 * The photos to show for a player.
 *
 * One helper rather than the same expression in two components, because they had
 * drifted: the squad grid read only the bundled map and ignored the database
 * entirely, while the profile page preferred the bundled map over the database.
 * An uploaded photo therefore appeared nowhere, and the two pages disagreed about
 * which image was primary.
 *
 * The database is the source of truth. A photo uploaded through the admin squad
 * editor wins outright, because that is the one the club chose and can change
 * without a deploy. The bundled map is the fallback for the players photographed
 * before the media library existed, so those cards keep working.
 *
 * A bundled player keeps the pair the map already holds. An uploaded player gets
 * a hover portrait only when the club supplies an alternate; without one the card
 * shows a single image and simply does not swap.
 */
export function photosForPlayer(player: {
  name: string;
  photo?: string | null;
  photoAlternate?: string | null;
}): string[] {
  if (player.photo) {
    return player.photoAlternate ? [player.photo, player.photoAlternate] : [player.photo];
  }
  return playerPhotos[player.name] ?? [];
}
