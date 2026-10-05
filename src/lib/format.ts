/**
 * Pure formatting helpers.
 *
 * This module deliberately imports nothing. It exists because two kinds of
 * component need these helpers and they sit on opposite sides of the client
 * boundary:
 *
 *   * components/SquadGrid.tsx is "use client" (it holds the filter state).
 *   * app/team/player/[number]/page.tsx renders on the server.
 *
 * Putting them in src/lib/content.ts failed, because that module imports
 * ./supabase/server, which imports next/headers. The client boundary then dragged a
 * server-only module into the browser bundle and the production build rejected it:
 *
 *   ./src/lib/supabase/server.ts -> ./src/lib/content.ts -> ./src/components/SquadGrid.tsx
 *
 * A module that both sides can import must have no server-only dependencies at
 * all. That is the whole rule this file exists to encode.
 */

/** "9" becomes "09", matching the shirt treatment across the site. */
export function pad(number: number): string {
  return String(number).padStart(2, "0");
}

/** "Goalkeepers" reads as "Goalkeeper" on a card. */
export function singular(position: string): string {
  return position.endsWith("s") && !position.endsWith("ss") ? position.slice(0, -1) : position;
}
