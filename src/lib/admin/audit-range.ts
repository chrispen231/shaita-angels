/**
 * The created_at bounds for an audit log query.
 *
 * Kept apart from audit.ts, which imports the Supabase server client, so the date
 * handling can be tested on its own.
 */
export type AuditDateBounds = {
  /** created_at >= gte */
  gte?: string;
  /** created_at < lt */
  lt?: string;
  /** created_at <= lte */
  lte?: string;
};

const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function auditDateBounds(from?: string, to?: string): AuditDateBounds {
  const bounds: AuditDateBounds = {};
  if (from) bounds.gte = from;
  if (to) {
    if (BARE_DATE.test(to)) {
      // A bare date from the filter form means "up to the end of that day", so
      // the bound is the start of the next day, exclusive.
      const nextDay = new Date(`${to}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      bounds.lt = nextDay.toISOString();
    } else {
      bounds.lte = to;
    }
  }
  return bounds;
}
