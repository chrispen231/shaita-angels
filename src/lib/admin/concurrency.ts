/**
 * Optimistic concurrency for the admin editors.
 *
 * Up to six admins can have the same record open. Without a check, the second
 * person to press save silently overwrites the first. Each edit form carries the
 * record's updated_at as it was when the form rendered; the update adds
 * `.eq("updated_at", expected)`, so a row someone else saved in the meantime no
 * longer matches and nothing is written. The action then reports the conflict
 * instead of overwriting.
 *
 * No server-only imports: the client forms use the field name too.
 */

/** Hidden form field carrying the record's updated_at at render time. */
export const EXPECTED_UPDATED_AT_FIELD = "expected_updated_at";

/**
 * The updated_at the form was rendered with, or null if missing or malformed.
 *
 * Returned verbatim, never re-formatted: Postgres stores microseconds, and a
 * round trip through Date would truncate them so the comparison could never match.
 */
export function readExpectedUpdatedAt(formData: FormData): string | null {
  const value = String(formData.get(EXPECTED_UPDATED_AT_FIELD) ?? "").trim();
  if (value === "" || value.length > 40 || Number.isNaN(Date.parse(value))) return null;
  return value;
}

/** True when a guarded update matched no row, i.e. the record changed underneath. */
export function updateWasRejected(rows: readonly unknown[] | null | undefined): boolean {
  return !rows || rows.length === 0;
}

export function conflictMessage(noun: string): string {
  return `This ${noun} was changed by someone else while you were editing. Reload to see their changes.`;
}

/** For a form submitted without the field, e.g. one rendered before this check existed. */
export function staleFormMessage(noun: string): string {
  return `This ${noun} form is out of date. Reload the page and make your changes again.`;
}
