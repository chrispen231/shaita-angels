import { describe, it, expect } from "vitest";
import { liveClock, elapsedMinutes, looksFinished, secondHalfStart } from "@/lib/fixtures/live-clock";

/**
 * The live match clock.
 *
 * The clock runs from went_live_at, not from kickoff_time, because the club marks
 * a match live by hand and kickoff can be delayed. These tests pin that behaviour:
 * the minute is derived from the real start, so a late kickoff shows the right
 * minute rather than one that has already drifted.
 */

const T0 = "2026-10-16T16:00:00.000Z";
const at = (minutes: number) => new Date(Date.parse(T0) + minutes * 60_000);

describe("elapsedMinutes", () => {
  it("counts whole minutes since the match went live", () => {
    expect(elapsedMinutes(T0, at(0))).toBe(0);
    expect(elapsedMinutes(T0, at(1))).toBe(1);
    expect(elapsedMinutes(T0, at(37))).toBe(37);
  });

  it("floors rather than rounds, so a minute is not shown early", () => {
    expect(elapsedMinutes(T0, new Date(Date.parse(T0) + 59_000))).toBe(0);
    expect(elapsedMinutes(T0, new Date(Date.parse(T0) + 60_000))).toBe(1);
    expect(elapsedMinutes(T0, new Date(Date.parse(T0) + 119_000))).toBe(1);
  });

  it("returns null when the match has no start time", () => {
    // A live fixture with no went_live_at cannot show an honest minute, so it
    // shows none rather than inventing 0'.
    expect(elapsedMinutes(null, at(10))).toBeNull();
  });

  it("returns null for an unparseable timestamp", () => {
    expect(elapsedMinutes("not-a-date", at(10))).toBeNull();
  });

  it("clamps a future start to zero instead of going negative", () => {
    // Clock skew between the database and the browser must not render "-3'".
    expect(elapsedMinutes(T0, new Date(Date.parse(T0) - 5 * 60_000))).toBe(0);
  });
});

describe("liveClock", () => {
  it("shows the football minute in the first half", () => {
    expect(liveClock(T0, at(0))?.label).toBe("1'");
    expect(liveClock(T0, at(1))?.label).toBe("2'");
    expect(liveClock(T0, at(22))?.label).toBe("23'");
    expect(liveClock(T0, at(44))?.label).toBe("45'");
  });

  it("shows first-half stoppage after 45 instead of guessing half time", () => {
    // Half time is the explicit "halftime" status. A match still live after 45
    // minutes is in first-half stoppage.
    expect(liveClock(T0, at(45))?.label).toBe("45+1'");
    expect(liveClock(T0, at(47))?.label).toBe("45+3'");
    expect(liveClock(T0, at(59))?.label).toBe("45+15'");
    expect(liveClock(T0, at(52))?.over).toBe(false);
  });

  it("restarts the football minute at 46 for the second half", () => {
    // The 15-minute break is real time but not football time, so the second half
    // must begin at 46' rather than at 61'.
    expect(liveClock(T0, at(60))?.label).toBe("46'");
    expect(liveClock(T0, at(61))?.label).toBe("47'");
    expect(liveClock(T0, at(104))?.label).toBe("90'");
  });

  it("shows stoppage time past 90, capped so it cannot run away", () => {
    expect(liveClock(T0, at(105))?.label).toBe("90+1'");
    expect(liveClock(T0, at(110))?.label).toBe("90+6'");
    // A fixture forgotten live overnight must not read 900'.
    expect(liveClock(T0, at(600))?.label).toBe("90+15'");
  });

  it("flags a match that has passed 90 plus stoppage", () => {
    expect(liveClock(T0, at(100))?.over).toBe(false);
    expect(liveClock(T0, at(120))?.over).toBe(true);
  });

  it("returns null when there is no start time", () => {
    expect(liveClock(null, at(10))).toBeNull();
  });

  it("is a pure function of the inputs, so server and client agree", () => {
    // The same timestamps must produce the same label regardless of when it is
    // called - this is what lets the server render the first paint and the
    // browser take over without the two disagreeing.
    const a = liveClock(T0, at(30));
    const b = liveClock(T0, at(30));
    expect(a).toEqual(b);
  });
});

describe("secondHalfStart", () => {
  it("restarts the clock at 46' when a match comes back from halftime", () => {
    // However long the first half and the break ran, the second half begins at 46'.
    const resumedAt = at(73);
    const start = secondHalfStart(resumedAt);
    expect(liveClock(start, resumedAt)?.label).toBe("46'");
    expect(liveClock(start, new Date(resumedAt.getTime() + 10 * 60_000))?.label).toBe("56'");
    expect(liveClock(start, new Date(resumedAt.getTime() + 45 * 60_000))?.label).toBe("90+1'");
  });
});

describe("looksFinished", () => {
  it("is false during a normal match", () => {
    expect(looksFinished(T0, at(10))).toBe(false);
    expect(looksFinished(T0, at(90))).toBe(false);
  });

  it("is true once a match has clearly finished", () => {
    // 90' + 15' interval + stoppage allowance, so this only fires well after the
    // final whistle - it flags a forgotten fixture, not a long match.
    expect(looksFinished(T0, at(130))).toBe(true);
  });

  it("is false when there is no start time", () => {
    expect(looksFinished(null, at(200))).toBe(false);
  });
});
