import { describe, it, expect } from "vitest";
import { auditDateBounds } from "@/lib/admin/audit-range";

describe("auditDateBounds", () => {
  it("applies no bounds without filters", () => {
    expect(auditDateBounds()).toEqual({});
    expect(auditDateBounds("", "")).toEqual({});
  });

  it("passes the from date through as an inclusive lower bound", () => {
    expect(auditDateBounds("2026-10-01")).toEqual({ gte: "2026-10-01" });
  });

  it("includes the whole of a bare to date", () => {
    // Exclusive start of the next day, so 23:59:59.999 on the 20th is still in.
    expect(auditDateBounds(undefined, "2026-10-20")).toEqual({ lt: "2026-10-21T00:00:00.000Z" });
  });

  it("rolls a bare to date over month and year ends", () => {
    expect(auditDateBounds(undefined, "2026-10-31").lt).toBe("2026-11-01T00:00:00.000Z");
    expect(auditDateBounds(undefined, "2026-12-31").lt).toBe("2027-01-01T00:00:00.000Z");
    expect(auditDateBounds(undefined, "2028-02-28").lt).toBe("2028-02-29T00:00:00.000Z");
  });

  it("treats a full timestamp as an inclusive upper bound", () => {
    expect(auditDateBounds(undefined, "2026-10-20T12:00:00Z")).toEqual({ lte: "2026-10-20T12:00:00Z" });
  });

  it("combines both bounds", () => {
    expect(auditDateBounds("2026-10-01", "2026-10-20")).toEqual({
      gte: "2026-10-01",
      lt: "2026-10-21T00:00:00.000Z",
    });
  });
});
