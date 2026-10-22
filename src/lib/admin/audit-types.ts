/*
 * Audit log vocabulary, shared by the server reader (audit.ts) and the client
 * filter UI (AuditLog.tsx). Kept free of server imports so the client can use it.
 * Must match the admin_audit_target_type and admin_audit_actor_role CHECK
 * constraints in 20261022130000_audit_triggers.sql.
 */

export const AUDIT_TARGET_TYPES = [
  "fixture",
  "match_content",
  "news",
  "sponsor",
  "site_settings",
  "user",
  "media",
  "staff",
  "leadership",
  "honour",
  "squad",
  "competition",
] as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

// "system" is a write with no signed-in user (a migration or the service role);
// "none" is a signed-in account that is not an admin.
export type AuditActorRole = "super_admin" | "fixtures" | "content" | "system" | "none";
