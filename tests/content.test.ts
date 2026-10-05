import { describe, it, expect } from "vitest";
import { formatArticleDate, pad, singular, positionsInUse, POSITION_ORDER } from "@/lib/content";

/**
 * These are the pure helpers behind the migrated public pages. They live in
 * src/lib/content.ts rather than in a component because the player profile renders
 * on the server: a server component cannot call a function exported from a
 * "use client" module, which is a runtime error rather than a type error.
 */

describe("formatArticleDate", () => {
  it("renders the club's long form", () => {
    expect(formatArticleDate("2026-07-14")).toBe("14 July 2026");
    expect(formatArticleDate("2024-01-01")).toBe("1 January 2024");
  });

  it("drops a leading zero on the day", () => {
    expect(formatArticleDate("2026-07-01")).toBe("1 July 2026");
  });

  it("does not shift the day with the server timezone", () => {
    // new Date("2026-07-14").toLocaleDateString() renders the 13th west of UTC.
    // Building from the parts is why this is safe in production.
    expect(formatArticleDate("2026-01-01")).toBe("1 January 2026");
    expect(formatArticleDate("2026-12-31")).toBe("31 December 2026");
  });

  it("returns the input unchanged when it is not an ISO date", () => {
    expect(formatArticleDate("14 July 2026")).toBe("14 July 2026");
    expect(formatArticleDate("")).toBe("");
  });

  it("handles every month", () => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    months.forEach((name, index) => {
      const month = String(index + 1).padStart(2, "0");
      expect(formatArticleDate(`2026-${month}-05`)).toBe(`5 ${name} 2026`);
    });
  });
});

describe("pad", () => {
  it("pads a single digit to two", () => {
    expect(pad(1)).toBe("01");
    expect(pad(9)).toBe("09");
  });

  it("leaves a two digit number alone", () => {
    expect(pad(27)).toBe("27");
    expect(pad(30)).toBe("30");
  });
});

describe("singular", () => {
  it("makes a plural position singular", () => {
    expect(singular("Goalkeepers")).toBe("Goalkeeper");
    expect(singular("Defenders")).toBe("Defender");
  });

  it("leaves an already singular position alone", () => {
    expect(singular("Goalkeeper")).toBe("Goalkeeper");
    expect(singular("Defender")).toBe("Defender");
  });

  it("does not strip the s from a word ending in ss", () => {
    expect(singular("Midfieldress")).toBe("Midfieldress");
  });

  it("leaves an unknown position untouched", () => {
    expect(singular("Sweeper")).toBe("Sweeper");
  });
});

describe("positionsInUse", () => {
  const player = (position: string) => ({
    number: 1,
    name: "P",
    position,
    photo: null,
    photoAlt: null,
    bio: null,
  });

  it("returns the canonical order regardless of input order", () => {
    const squad = [player("Forward"), player("Goalkeeper"), player("Defender")];
    expect(positionsInUse(squad)).toEqual(["Goalkeeper", "Defender", "Forward"]);
  });

  it("omits positions with no players", () => {
    expect(positionsInUse([player("Goalkeeper")])).toEqual(["Goalkeeper"]);
  });

  it("puts an invented position after the known four, sorted", () => {
    const squad = [player("Sweeper"), player("Winger"), player("Goalkeeper")];
    expect(positionsInUse(squad)).toEqual(["Goalkeeper", "Sweeper", "Winger"]);
  });

  it("returns nothing for an empty squad", () => {
    expect(positionsInUse([])).toEqual([]);
  });

  it("every canonical position is one the seed data uses", () => {
    expect(POSITION_ORDER).toEqual(["Goalkeeper", "Defender", "Midfielder", "Forward"]);
  });
});
