import { validateFormation } from "@/lib/matches/validation";

/**
 * Pitch slots for a formation, so the admin picks "4-3-3" instead of typing
 * coordinates for eleven players.
 *
 * Coordinates use the Pitch component's frame: a horizontal pitch with Shaita
 * attacking left to right, pitch_x 0 at their own goal line and 100 at the
 * opponent's, pitch_y 0 at the top touchline. Facing right, a player's left is
 * the top of the diagram, so each line runs left-sided player first.
 *
 * Slot 0 is the goalkeeper, then each line from defence to attack.
 */

export type FormationSlot = { position: string; pitch_x: number; pitch_y: number };

const GOALKEEPER_X = 6;
const FIRST_LINE_X = 24;
const LAST_LINE_X = 78;

// Spread across the width; a narrow line sits closer to the middle.
const LINE_Y: Record<number, number[]> = {
  1: [50],
  2: [35, 65],
  3: [22, 50, 78],
  4: [14, 38, 62, 86],
  5: [10, 30, 50, 70, 90],
};

function lineY(count: number): number[] {
  if (LINE_Y[count]) return LINE_Y[count];
  return Array.from({ length: count }, (_, i) => round(10 + (80 * i) / (count - 1)));
}

const DEFENCE: Record<number, string[]> = {
  3: ["CB", "CB", "CB"],
  4: ["LB", "CB", "CB", "RB"],
  5: ["LWB", "CB", "CB", "CB", "RWB"],
};
const MIDFIELD: Record<number, string[]> = {
  1: ["CDM"],
  2: ["CM", "CM"],
  3: ["CM", "CM", "CM"],
  4: ["LM", "CM", "CM", "RM"],
  5: ["LM", "CM", "CM", "CM", "RM"],
};
// The deeper of two midfield lines (4-2-3-1, 4-1-4-1, 4-4-1-1 …).
const HOLDING: Record<number, string[]> = {
  1: ["CDM"],
  2: ["CDM", "CDM"],
  3: ["CM", "CM", "CM"],
  4: ["LM", "CM", "CM", "RM"],
};
// The more advanced of two midfield lines.
const ATTACKING_MIDFIELD: Record<number, string[]> = {
  1: ["CAM"],
  2: ["CAM", "CAM"],
  3: ["LM", "CAM", "RM"],
  4: ["LM", "CM", "CM", "RM"],
};
const ATTACK: Record<number, string[]> = {
  1: ["ST"],
  2: ["ST", "ST"],
  3: ["LW", "ST", "RW"],
};

function positionsFor(table: Record<number, string[]>, count: number, fallback: string): string[] {
  return table[count] ?? Array.from({ length: count }, () => fallback);
}

/** The eleven slots for a formation, or null when the formation is not valid. */
export function formationLayout(formation: string): FormationSlot[] | null {
  if (formation === "" || validateFormation(formation) !== null) return null;

  const lines = formation.split("-").map(Number);
  const slots: FormationSlot[] = [{ position: "GK", pitch_x: GOALKEEPER_X, pitch_y: 50 }];

  lines.forEach((count, lineIndex) => {
    const last = lines.length - 1;
    const x = round(FIRST_LINE_X + ((LAST_LINE_X - FIRST_LINE_X) * lineIndex) / last);

    let positions: string[];
    if (lineIndex === 0) positions = positionsFor(DEFENCE, count, "CB");
    else if (lineIndex === last) positions = positionsFor(ATTACK, count, "ST");
    else if (lines.length === 3) positions = positionsFor(MIDFIELD, count, "CM");
    else if (lineIndex === 1) positions = positionsFor(HOLDING, count, "CM");
    else positions = positionsFor(ATTACKING_MIDFIELD, count, "CAM");

    lineY(count).forEach((y, i) => slots.push({ position: positions[i], pitch_x: x, pitch_y: y }));
  });

  return slots;
}

type PlaceableRow = {
  player_name: string;
  position: string | null;
  pitch_x: number | null;
  pitch_y: number | null;
  is_starter: boolean;
};

/**
 * Puts the first eleven named starters, in list order, into the formation's
 * slots: list the goalkeeper first, then defenders left to right, and so on.
 * Substitutes and blank rows are left alone. Returns the rows unchanged when the
 * formation is not valid.
 */
export function placeStarters<Row extends PlaceableRow>(rows: Row[], formation: string): Row[] {
  const slots = formationLayout(formation);
  if (!slots) return rows;

  let next = 0;
  return rows.map((row) => {
    if (!row.is_starter || row.player_name.trim() === "" || next >= slots.length) return row;
    const slot = slots[next++];
    return { ...row, position: slot.position, pitch_x: slot.pitch_x, pitch_y: slot.pitch_y };
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
