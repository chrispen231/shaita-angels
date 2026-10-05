import { describe, it, expect } from "vitest";
import {
  validateMinute,
  validatePlayerName,
  validateSide,
  validateShirtNumber,
  validateCardType,
  validateAssistNote,
  validateGoalForMinute,
  validateSquad,
  validateReport,
  validateLineup,
  isMinorFromDob,
  formatMinute,
  describeGoal,
  REPORT_MAX,
  type SquadInput,
  type LineupInput,
} from "@/lib/matches/validation";

/**
 * These tests exist to keep the admin forms and the database CHECK constraints in
 * supabase/migrations/20261005150000_match_content.sql from drifting apart. Each
 * bound asserted here has a named constraint or index in that file.
 */

describe("minute", () => {
  it("accepts 1 to 120", () => {
    expect(validateMinute(1)).toBeNull();
    expect(validateMinute(45)).toBeNull();
    expect(validateMinute(90)).toBeNull();
    expect(validateMinute(93)).toBeNull();
    expect(validateMinute(120)).toBeNull();
  });

  it("rejects out of range and non-integers", () => {
    expect(validateMinute(0)).toMatch(/1 to 120/);
    expect(validateMinute(121)).toMatch(/1 to 120/);
    expect(validateMinute(-5)).toMatch(/1 to 120/);
    expect(validateMinute(45.5)).toMatch(/1 to 120/);
    expect(validateMinute(Number.NaN)).toMatch(/1 to 120/);
  });

  it("tells the editor how to enter stoppage time when the minute is invalid", () => {
    // The hint lives in the error path: a valid 93 needs no explanation.
    expect(validateMinute(0) ?? "").toMatch(/90\+3 is 93/);
    expect(validateMinute(121) ?? "").toMatch(/90\+3 is 93/);
    expect(validateMinute(93)).toBeNull();
  });
});

describe("goal plausibility", () => {
  it("accepts a normal minute", () => {
    expect(validateGoalForMinute(78, false)).toBeNull();
  });

  it("flags a high minute that looks like stoppage time", () => {
    expect(validateGoalForMinute(112, false)).toMatch(/stoppage/);
  });

  it("accepts a high minute when stoppage is ticked", () => {
    expect(validateGoalForMinute(112, true)).toBeNull();
  });
});

describe("player name", () => {
  it("requires a name", () => {
    expect(validatePlayerName("")).toMatch(/Enter the player/);
    expect(validatePlayerName("   ")).toMatch(/Enter the player/);
  });

  it("allows up to 120 characters", () => {
    // *_name_length check: char_length between 1 and 120
    expect(validatePlayerName("a".repeat(120))).toBeNull();
    expect(validatePlayerName("a".repeat(121))).toMatch(/too long/);
  });

  it("keeps internal whitespace but trims for emptiness", () => {
    expect(validatePlayerName("Grace FC")).toBeNull();
  });
});

describe("side and card type", () => {
  it("accepts shaita and opponent only", () => {
    expect(validateSide("shaita")).toBeNull();
    expect(validateSide("opponent")).toBeNull();
    expect(validateSide("home")).toMatch(/which side/);
  });

  it("accepts the three card types", () => {
    for (const card of ["yellow", "red", "second_yellow"]) {
      expect(validateCardType(card)).toBeNull();
    }
    expect(validateCardType("green")).toMatch(/yellow, red/);
  });
});

describe("shirt number", () => {
  it("treats blank as absent", () => {
    expect(validateShirtNumber("")).toBeNull();
    expect(validateShirtNumber("  ")).toBeNull();
  });

  it("accepts 1 to 99", () => {
    expect(validateShirtNumber("1")).toBeNull();
    expect(validateShirtNumber("99")).toBeNull();
    expect(validateShirtNumber("0")).toMatch(/1 to 99/);
    expect(validateShirtNumber("100")).toMatch(/1 to 99/);
    expect(validateShirtNumber("9a")).toMatch(/1 to 99/);
  });
});

describe("assist note", () => {
  it("allows up to 200 characters", () => {
    // goal_note_length check: <= 200
    expect(validateAssistNote("a".repeat(200))).toBeNull();
    expect(validateAssistNote("a".repeat(201))).toMatch(/under 200/);
  });
});

const baseSquad: SquadInput = {
  full_name: "Grace FC",
  date_of_birth: "",
  position: "Forward",
  preferred_foot: "right",
  height_cm: "170",
  weight_kg: "62",
  shirt_number: "9",
  bio: "",
};

describe("squad validation", () => {
  it("accepts a complete valid entry", () => {
    expect(validateSquad(baseSquad)).toBeNull();
  });

  it("requires a name", () => {
    expect(validateSquad({ ...baseSquad, full_name: "" })).toMatch(/full name/);
  });

  it("allows a blank date of birth", () => {
    expect(validateSquad({ ...baseSquad, date_of_birth: "" })).toBeNull();
  });

  it("rejects a malformed date of birth", () => {
    // A bad date must not be silently treated as no date, because is_minor would
    // then read false for a minor.
    expect(validateSquad({ ...baseSquad, date_of_birth: "05/10/2010" })).toMatch(/YYYY-MM-DD/);
    expect(validateSquad({ ...baseSquad, date_of_birth: "2010-13-45" })).toMatch(/not a real date/);
  });

  it("rejects an implausible age", () => {
    const thisYear = new Date().getUTCFullYear();
    expect(validateSquad({ ...baseSquad, date_of_birth: `${thisYear - 5}-01-01` })).toMatch(/under 12/);
    expect(validateSquad({ ...baseSquad, date_of_birth: `${thisYear - 80}-01-01` })).toMatch(/over 60/);
  });

  it("accepts a 15-year-old, the club minimum", () => {
    const now = new Date();
    const dob = new Date(Date.UTC(now.getUTCFullYear() - 15, now.getUTCMonth(), now.getUTCDate() + 1));
    expect(validateSquad({ ...baseSquad, date_of_birth: dob.toISOString().slice(0, 10) })).toBeNull();
  });

  it("checks foot, height, weight and shirt number", () => {
    expect(validateSquad({ ...baseSquad, preferred_foot: "ambidextrous" })).toMatch(/left, right/);
    expect(validateSquad({ ...baseSquad, height_cm: "99" })).toMatch(/100 to 230/);
    expect(validateSquad({ ...baseSquad, height_cm: "231" })).toMatch(/100 to 230/);
    expect(validateSquad({ ...baseSquad, weight_kg: "24" })).toMatch(/25 to 120/);
    expect(validateSquad({ ...baseSquad, shirt_number: "100" })).toMatch(/1 to 99/);
  });

  it("allows blank measurements", () => {
    expect(validateSquad({ ...baseSquad, height_cm: "", weight_kg: "", preferred_foot: "" })).toBeNull();
  });

  it("caps the biography", () => {
    expect(validateSquad({ ...baseSquad, bio: "a".repeat(2000) })).toBeNull();
    expect(validateSquad({ ...baseSquad, bio: "a".repeat(2001) })).toMatch(/under 2000/);
  });
});

describe("isMinorFromDob", () => {
  const today = new Date("2026-10-05T00:00:00Z");

  it("is true for a 16-year-old", () => {
    expect(isMinorFromDob("2010-10-05", today)).toBe(true);
  });

  it("is false for a 24-year-old", () => {
    expect(isMinorFromDob("2002-10-05", today)).toBe(false);
  });

  it("is false for a blank or invalid date", () => {
    expect(isMinorFromDob("", today)).toBe(false);
    expect(isMinorFromDob("nonsense", today)).toBe(false);
  });

  it("treats exactly 18 as not a minor", () => {
    // The boundary matters: the flag drives a safeguarding decision.
    expect(isMinorFromDob("2008-10-05", today)).toBe(false);
    expect(isMinorFromDob("2008-10-06", today)).toBe(true);
  });
});

describe("report", () => {
  it("requires content", () => {
    expect(validateReport("   ")).toMatch(/Write the match report/);
  });

  it("allows up to 8000 characters", () => {
    // report_length check: <= 8000
    expect(validateReport("a".repeat(REPORT_MAX))).toBeNull();
    expect(validateReport("a".repeat(REPORT_MAX + 1))).toMatch(/under 8000/);
  });
});

describe("lineup", () => {
  const row = (over: Partial<LineupInput> = {}): LineupInput => ({
    player_name: "Player",
    shirt_number: "",
    position: "Forward",
    is_starter: true,
    ...over,
  });

  it("requires at least one player", () => {
    expect(validateLineup([])).toMatch(/at least one player/);
  });

  it("accepts players without numbers", () => {
    expect(validateLineup([row(), row({ player_name: "Another" })])).toBeNull();
  });

  it("catches a duplicate shirt number before the database does", () => {
    // Partial unique index lineups_match_shirt_unique on (fixture_id, shirt_number).
    const result = validateLineup([
      row({ player_name: "Grace", shirt_number: "7" }),
      row({ player_name: "Ruth", shirt_number: "7" }),
    ]);
    expect(result).toMatch(/Shirt number 7 is used by both Grace and Ruth/);
  });

  it("names the two conflicting players", () => {
    const result = validateLineup([
      row({ player_name: "Grace", shirt_number: "10" }),
      row({ player_name: "Ruth", shirt_number: "10" }),
    ]);
    expect(result).toContain("Grace");
    expect(result).toContain("Ruth");
  });

  it("reports a missing name on any row", () => {
    expect(validateLineup([row(), row({ player_name: "  " })])).toMatch(/Enter the player/);
  });

  it("rejects more than eleven starters", () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      row({ player_name: `P${i}`, shirt_number: String(i + 1) }),
    );
    expect(validateLineup(eleven)).toBeNull();

    const twelve = [...eleven, row({ player_name: "P12", shirt_number: "12" })];
    expect(validateLineup(twelve)).toMatch(/more than eleven/);
  });

  it("allows fewer than eleven starters", () => {
    // A short-handed lineup is legitimate, so this is deliberately not an error.
    const five = Array.from({ length: 5 }, (_, i) =>
      row({ player_name: `P${i}`, shirt_number: String(i + 1) }),
    );
    expect(validateLineup(five)).toBeNull();
  });
});

describe("formatMinute", () => {
  it("renders a plain minute", () => {
    expect(formatMinute(23, false)).toBe("23'");
    expect(formatMinute(90, false)).toBe("90'");
  });

  it("renders stoppage time from the running total", () => {
    expect(formatMinute(93, true)).toBe("90+3'");
    expect(formatMinute(97, true)).toBe("90+7'");
  });

  it("splits first-half stoppage at 45, not 90", () => {
    // A goal at 47 is 45+2. Reading it as a plain 47 was a real bug.
    expect(formatMinute(47, true)).toBe("45+2'");
    expect(formatMinute(46, true)).toBe("45+1'");
  });

  it("leaves the half itself alone even with the flag set", () => {
    expect(formatMinute(90, true)).toBe("90'");
    expect(formatMinute(45, true)).toBe("45'");
  });

  it("never renders stoppage when the flag is unset", () => {
    expect(formatMinute(93, false)).toBe("93'");
    expect(formatMinute(47, false)).toBe("47'");
  });
});

describe("describeGoal", () => {
  it("names the scorer", () => {
    expect(describeGoal({ player_name: "Grace", side: "shaita", is_own_goal: false })).toBe("Grace");
  });

  it("marks an own goal clearly", () => {
    expect(describeGoal({ player_name: "Grace", side: "shaita", is_own_goal: true })).toBe(
      "Own goal, Grace",
    );
    expect(describeGoal({ player_name: "Ruth", side: "opponent", is_own_goal: true })).toBe(
      "Ruth (own goal)",
    );
  });
});
