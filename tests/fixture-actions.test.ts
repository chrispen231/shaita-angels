import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminContext, createFakeSupabase, form, UUID_A, type FakeSupabase } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({ context: null as unknown }));

vi.mock("@/lib/admin/roles", async () => ({
  ...(await import("@/lib/admin/role-constants")),
  getAdminContext: async () => state.context,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => null }));
vi.mock("@/lib/reference-data.server", () => ({ getCompetitionsForAdmin: async () => [] }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

import { saveFixture } from "@/app/admin/fixtures/actions";

const IDLE = { status: "idle", message: "" } as const;
const NOW = new Date("2026-10-24T15:30:00Z");

function fixtureForm(extra: Record<string, string> = {}) {
  return form({
    opponent: "Earth Angels",
    competition: "LFA Women's First Division",
    season: "2026-27",
    match_date: "2026-10-24",
    kickoff_time: "15:00",
    venue: "Careysburg",
    venue_type: "home",
    status: "scheduled",
    confirm_duplicate: "1",
    ...extra,
  });
}

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  state.context = adminContext(fake, "fixtures");
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("saveFixture role gate", () => {
  it("refuses a signed-out caller", async () => {
    state.context = null;
    const result = await saveFixture(IDLE, fixtureForm());
    expect(result.status).toBe("error");
    expect(fake.calls).toHaveLength(0);
  });

  it("refuses a content editor before writing anything", async () => {
    state.context = adminContext(fake, "content");
    const result = await saveFixture(IDLE, fixtureForm());
    expect(result.status).toBe("error");
    expect(fake.writes("fixtures", "insert")).toHaveLength(0);
  });

  it.each(["fixtures", "super_admin"])("lets a %s admin add a fixture", async (role) => {
    state.context = adminContext(fake, role);
    await expect(saveFixture(IDLE, fixtureForm())).rejects.toThrow("NEXT_REDIRECT /admin?saved=1");
    expect(fake.writes("fixtures", "insert")).toHaveLength(1);
  });
});

describe("saveFixture validation and concurrency", () => {
  it("rejects an impossible date", async () => {
    const result = await saveFixture(IDLE, fixtureForm({ match_date: "2026-02-30" }));
    expect(result).toEqual({ status: "error", message: "Enter a valid match date." });
    expect(fake.calls).toHaveLength(0);
  });

  it("refuses an edit whose form carries no version", async () => {
    const result = await saveFixture(IDLE, fixtureForm({ id: UUID_A }));
    expect(result.status).toBe("error");
    expect(fake.writes("fixtures", "update")).toHaveLength(0);
  });

  it("reports a conflict when the conditional update matched no rows", async () => {
    fake.respond({ table: "fixtures", op: "update" }, { data: [], error: null });
    const result = await saveFixture(IDLE, fixtureForm({ id: UUID_A, expected_updated_at: "2026-10-20T00:00:00Z" }));
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/changed by someone else/);
  });
});

describe("saveFixture live clock", () => {
  async function save(previous: { status: string; went_live_at: string | null }, status: string, extra: Record<string, string> = {}) {
    fake.respond({ table: "fixtures", op: "select" }, (call) =>
      call.terminal
        ? { data: { ...previous, opponent: "Earth Angels", competition: "LFA Women's First Division", match_date: "2026-10-24" }, error: null }
        : { data: [], error: null },
    );
    await expect(
      saveFixture(IDLE, fixtureForm({ id: UUID_A, status, expected_updated_at: "2026-10-20T00:00:00Z", ...extra })),
    ).rejects.toThrow("NEXT_REDIRECT");
    return (fake.writes("fixtures", "update")[0].values as { went_live_at: string | null }).went_live_at;
  }

  it("starts the clock when a match goes live", async () => {
    expect(await save({ status: "scheduled", went_live_at: null }, "live")).toBe(NOW.toISOString());
  });

  it("keeps the clock through halftime", async () => {
    expect(await save({ status: "live", went_live_at: "2026-10-24T15:00:00.000Z" }, "halftime")).toBe("2026-10-24T15:00:00.000Z");
  });

  it("restarts at 46' when the match resumes after halftime", async () => {
    const wentLiveAt = await save({ status: "halftime", went_live_at: "2026-10-24T15:00:00.000Z" }, "live");
    expect(NOW.getTime() - Date.parse(wentLiveAt!)).toBe(60 * 60_000);
  });

  it("keeps the original start when a live match is edited", async () => {
    expect(await save({ status: "live", went_live_at: "2026-10-24T15:05:00.000Z" }, "live")).toBe("2026-10-24T15:05:00.000Z");
  });

  it("clears the clock when the match is played", async () => {
    const played = { shaita_goals: "2", opponent_goals: "1" };
    expect(await save({ status: "live", went_live_at: "2026-10-24T15:05:00.000Z" }, "played", played)).toBeNull();
  });
});

describe("saveFixture match alerts mute", () => {
  const written = () => fake.writes("fixtures", "insert")[0].values as { alerts_muted: boolean };

  it("writes alerts_muted when the box is ticked", async () => {
    await expect(saveFixture(IDLE, fixtureForm({ alerts_muted: "on" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(written().alerts_muted).toBe(true);
  });

  it("leaves alerts on by default", async () => {
    await expect(saveFixture(IDLE, fixtureForm())).rejects.toThrow("NEXT_REDIRECT");
    expect(written().alerts_muted).toBe(false);
  });
});
