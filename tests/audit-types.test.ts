import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { AUDIT_TARGET_TYPES } from "@/lib/admin/audit-types";

/**
 * The audit filter offers AUDIT_TARGET_TYPES, and the triggers can only write
 * what the CHECK constraint allows. Reading the constraint out of the migration
 * keeps the two from drifting apart.
 */

const migration = readFileSync(
  join(__dirname, "../supabase/migrations/20261022130000_audit_triggers.sql"),
  "utf8",
);

function checkList(constraint: string): string[] {
  const match = migration.match(new RegExp(`add constraint ${constraint}[\\s\\S]*?in \\(([\\s\\S]*?)\\)\\)`));
  if (!match) throw new Error(`${constraint} not found`);
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

describe("audit target types", () => {
  it("match the admin_audit_target_type constraint", () => {
    expect([...AUDIT_TARGET_TYPES].sort()).toEqual(checkList("admin_audit_target_type").sort());
  });

  it("cover every target type a trigger writes", () => {
    const triggerTypes = [...migration.matchAll(/audit_row_change\('([a-z_]+)'/g)].map((m) => m[1]);
    const functionTypes = [...migration.matchAll(/audit_write\(\s*'([a-z_]+)'/g)].map((m) => m[1]);
    for (const type of [...triggerTypes, ...functionTypes]) {
      expect(AUDIT_TARGET_TYPES).toContain(type);
    }
    expect(triggerTypes.length).toBeGreaterThan(10);
  });

  it("allow the leadership target", () => {
    expect(AUDIT_TARGET_TYPES).toContain("leadership");
  });
});
