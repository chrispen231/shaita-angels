import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminContext, createFakeSupabase, form, IDLE, UUID_A, type FakeSupabase } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({ context: null as unknown }));

vi.mock("@/lib/admin/roles", async () => ({
  ...(await import("@/lib/admin/role-constants")),
  getAdminContext: async () => state.context,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { saveCards, saveGoals, saveLineup } from "@/app/admin/matches/[id]/actions";

type LineupRow = { player_name: string; shirt_number: number | null; is_starter: boolean; sort_order: number; player_id: string | null };

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  state.context = adminContext(fake, "fixtures");
});

function lineupRows() {
  return (fake.rpcCalls.find((call) => call.name === "replace_lineups")?.args as { p_rows: LineupRow[] }).p_rows;
}

describe("match editor role gate", () => {
  it("refuses a signed-out caller", async () => {
    state.context = null;
    await expect(saveLineup(IDLE, form({ fixture_id: UUID_A, lineup_name: "Jane" }))).rejects.toThrow(/sign in/i);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("refuses a content editor", async () => {
    state.context = adminContext(fake, "content");
    await expect(saveGoals(IDLE, form({ fixture_id: UUID_A }))).rejects.toThrow(/role/i);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("rejects a fixture id that is not a UUID before any query", async () => {
    await expect(saveCards(IDLE, form({ fixture_id: "1; drop table fixtures" }))).rejects.toThrow(/unknown match/i);
    expect(fake.calls).toHaveLength(0);
  });
});

describe("saveLineup", () => {
  it("reads the starter flag by the row's position in the whole form", async () => {
    // Row 0 is a blank "add player" row whose starter box is ticked; row 1 is a
    // bench player. The blank row must not shift its tick onto Jane.
    const result = await saveLineup(
      IDLE,
      form({
        fixture_id: UUID_A,
        lineup_name: ["", "Jane Bench", "Ama Starter"],
        lineup_starter_0: "on",
        lineup_starter_2: "on",
      }),
    );

    expect(result.status).toBe("success");
    const rows = lineupRows();
    expect(rows.map((row) => [row.player_name, row.is_starter])).toEqual([
      ["Jane Bench", false],
      ["Ama Starter", true],
    ]);
  });

  it("saves the whole set in one replace_lineups call, linking squad players by name", async () => {
    fake.respond({ table: "squad", op: "select" }, { data: [{ id: "squad-ama", full_name: "Ama Starter" }], error: null });

    await saveLineup(
      IDLE,
      form({
        fixture_id: UUID_A,
        lineup_name: ["Ama Starter", "Guest Player"],
        lineup_shirt_0: "9",
        lineup_starter_0: "on",
      }),
    );

    expect(fake.rpcCalls).toHaveLength(1);
    expect(fake.rpcCalls[0].args).toMatchObject({ p_fixture_id: UUID_A });
    expect(lineupRows()).toEqual([
      expect.objectContaining({ player_name: "Ama Starter", player_id: "squad-ama", shirt_number: 9, is_starter: true, sort_order: 0 }),
      expect.objectContaining({ player_name: "Guest Player", player_id: null, shirt_number: null, is_starter: false, sort_order: 1 }),
    ]);
    // Nothing is deleted or inserted outside the transaction.
    expect(fake.writes("lineups", "delete")).toHaveLength(0);
    expect(fake.writes("lineups", "insert")).toHaveLength(0);
  });

  it("maps a duplicate shirt number from the database to a readable message", async () => {
    fake.onRpc(() => ({ data: null, error: { message: "duplicate key", code: "23505" } }));
    const result = await saveLineup(IDLE, form({ fixture_id: UUID_A, lineup_name: "Jane", lineup_shirt_0: "7" }));
    expect(result).toEqual({ status: "error", message: "Two players share a shirt number in this match." });
  });

  it("does not call the database when validation fails", async () => {
    const result = await saveLineup(IDLE, form({ fixture_id: UUID_A, lineup_name: ["A", "B"], lineup_shirt_0: "7", lineup_shirt_1: "7" }));
    expect(result.status).toBe("error");
    expect(fake.rpcCalls).toHaveLength(0);
  });
});

describe("saveGoals and saveCards", () => {
  it("saves goals through replace_match_goals with the form's rows", async () => {
    const result = await saveGoals(
      IDLE,
      form({
        fixture_id: UUID_A,
        goal_name: ["", "Ama Starter"],
        goal_side_1: "shaita",
        goal_minute_1: "93",
        goal_stoppage_1: "on",
      }),
    );

    expect(result).toEqual({ status: "success", message: "Saved 1 goal." });
    expect(fake.rpcCalls).toEqual([
      {
        name: "replace_match_goals",
        args: {
          p_fixture_id: UUID_A,
          p_rows: [
            expect.objectContaining({
              player_name: "Ama Starter",
              side: "shaita",
              minute: 93,
              added_stoppage_minutes: true,
              is_own_goal: false,
              sort_order: 1,
            }),
          ],
        },
      },
    ]);
  });

  it("clears all goals with an empty set rather than a separate delete", async () => {
    const result = await saveGoals(IDLE, form({ fixture_id: UUID_A }));
    expect(result).toEqual({ status: "success", message: "All goals removed." });
    expect(fake.rpcCalls[0]).toEqual({ name: "replace_match_goals", args: { p_fixture_id: UUID_A, p_rows: [] } });
  });

  it("saves cards through replace_match_cards", async () => {
    await saveCards(IDLE, form({ fixture_id: UUID_A, cardrow_name: "Jane", cardrow_side_0: "opponent", cardrow_card_0: "yellow", cardrow_minute_0: "30" }));
    expect(fake.rpcCalls[0].name).toBe("replace_match_cards");
    expect(fake.rpcCalls[0].args).toMatchObject({ p_rows: [expect.objectContaining({ card: "yellow", side: "opponent", minute: 30 })] });
  });

  it("reports a failed card save instead of success", async () => {
    fake.onRpc(() => ({ data: null, error: { message: "permission denied", code: "42501" } }));
    const result = await saveCards(IDLE, form({ fixture_id: UUID_A, cardrow_name: "Jane", cardrow_side_0: "opponent", cardrow_card_0: "red", cardrow_minute_0: "30" }));
    expect(result.status).toBe("error");
  });
});
