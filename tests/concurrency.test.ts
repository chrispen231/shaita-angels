import { describe, it, expect } from "vitest";
import {
  EXPECTED_UPDATED_AT_FIELD,
  conflictMessage,
  readExpectedUpdatedAt,
  updateWasRejected,
} from "@/lib/admin/concurrency";

function form(value?: string) {
  const data = new FormData();
  if (value !== undefined) data.set(EXPECTED_UPDATED_AT_FIELD, value);
  return data;
}

describe("readExpectedUpdatedAt", () => {
  it("returns a Postgres timestamp verbatim, microseconds included", () => {
    // Re-formatting through Date would drop the microseconds and never match.
    const stored = "2026-10-20T14:03:27.123456+00:00";
    expect(readExpectedUpdatedAt(form(stored))).toBe(stored);
  });

  it("accepts the millisecond ISO strings the app writes itself", () => {
    expect(readExpectedUpdatedAt(form("2026-10-20T14:03:27.123Z"))).toBe("2026-10-20T14:03:27.123Z");
  });

  it("rejects a missing, empty or malformed value", () => {
    expect(readExpectedUpdatedAt(form())).toBeNull();
    expect(readExpectedUpdatedAt(form("  "))).toBeNull();
    expect(readExpectedUpdatedAt(form("not a date"))).toBeNull();
    expect(readExpectedUpdatedAt(form(`2026-10-20T14:03:27Z${"0".repeat(40)}`))).toBeNull();
  });
});

describe("updateWasRejected", () => {
  it("is true when the guarded update matched no row", () => {
    expect(updateWasRejected([])).toBe(true);
    expect(updateWasRejected(null)).toBe(true);
    expect(updateWasRejected(undefined)).toBe(true);
  });

  it("is false when the row was written", () => {
    expect(updateWasRejected([{ id: "a" }])).toBe(false);
  });
});

describe("conflictMessage", () => {
  it("names the record and tells the admin to reload", () => {
    expect(conflictMessage("fixture")).toBe(
      "This fixture was changed by someone else while you were editing. Reload to see their changes.",
    );
  });
});
