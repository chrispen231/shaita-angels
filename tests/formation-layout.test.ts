import { describe, it, expect } from "vitest";
import { formationLayout, placeStarters } from "@/lib/matches/formation-layout";
import { FORMATIONS, POSITIONS, validatePitchCoordinate } from "@/lib/matches/validation";

describe("formationLayout", () => {
  it.each(FORMATIONS)("gives %s eleven valid slots", (formation) => {
    const slots = formationLayout(formation)!;
    expect(slots).toHaveLength(11);
    expect(slots[0].position).toBe("GK");
    for (const slot of slots) {
      expect(POSITIONS).toContain(slot.position);
      expect(validatePitchCoordinate(String(slot.pitch_x), "x")).toBeNull();
      expect(validatePitchCoordinate(String(slot.pitch_y), "y")).toBeNull();
    }
    // No two players on the same spot.
    const spots = new Set(slots.map((slot) => `${slot.pitch_x},${slot.pitch_y}`));
    expect(spots.size).toBe(11);
  });

  it("lays out 4-3-3 as back four, midfield three and front three", () => {
    const slots = formationLayout("4-3-3")!;
    expect(slots.map((slot) => slot.position)).toEqual([
      "GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW",
    ]);
    // Each line sits further up the pitch than the one behind it.
    expect(slots[0].pitch_x).toBeLessThan(slots[1].pitch_x);
    expect(slots[1].pitch_x).toBeLessThan(slots[5].pitch_x);
    expect(slots[5].pitch_x).toBeLessThan(slots[8].pitch_x);
    // Left-sided players are at the top of the diagram.
    expect(slots[1].pitch_y).toBeLessThan(slots[4].pitch_y);
  });

  it("splits two midfield lines into holding and attacking roles", () => {
    expect(formationLayout("4-2-3-1")!.map((slot) => slot.position).slice(5)).toEqual([
      "CDM", "CDM", "LM", "CAM", "RM", "ST",
    ]);
  });

  it("returns null for an empty or invalid formation", () => {
    expect(formationLayout("")).toBeNull();
    expect(formationLayout("4-4-3")).toBeNull();
    expect(formationLayout("banana")).toBeNull();
  });
});

describe("placeStarters", () => {
  const row = (player_name: string, is_starter = true) => ({
    player_name,
    position: null as string | null,
    pitch_x: null as number | null,
    pitch_y: null as number | null,
    is_starter,
  });

  it("places named starters in list order and leaves substitutes and blanks alone", () => {
    const rows = [row("Keeper"), row("Sub", false), row(""), row("Left back"), row("Centre back")];
    const placed = placeStarters(rows, "4-3-3");
    expect(placed[0]).toMatchObject({ position: "GK", pitch_x: 6, pitch_y: 50 });
    expect(placed[1]).toEqual(rows[1]);
    expect(placed[2]).toEqual(rows[2]);
    expect(placed[3].position).toBe("LB");
    expect(placed[4].position).toBe("CB");
  });

  it("stops after eleven starters", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(`Player ${i + 1}`));
    const placed = placeStarters(rows, "4-4-2");
    expect(placed[10].pitch_x).not.toBeNull();
    expect(placed[11]).toEqual(rows[11]);
  });

  it("changes nothing for an invalid formation", () => {
    const rows = [row("Keeper")];
    expect(placeStarters(rows, "")).toBe(rows);
  });
});
