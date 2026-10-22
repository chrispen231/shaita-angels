import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminContext, createFakeSupabase, form, IDLE, UUID_A, type FakeSupabase } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({ context: null as unknown }));

vi.mock("@/lib/admin/roles", async () => ({
  ...(await import("@/lib/admin/role-constants")),
  getAdminContext: async () => state.context,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { savePlayer, togglePlayerPublished, removePlayer, updatePlayer } from "@/app/admin/squad/actions";

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  state.context = adminContext(fake, "content");
});

describe("squad role gate", () => {
  it("refuses a signed-out caller", async () => {
    state.context = null;
    await expect(savePlayer(IDLE, form({ full_name: "Jane Doe" }))).rejects.toThrow(/sign in/i);
    expect(fake.calls).toHaveLength(0);
  });

  it("refuses a fixtures editor, whose role does not include the squad", async () => {
    state.context = adminContext(fake, "fixtures");
    await expect(savePlayer(IDLE, form({ full_name: "Jane Doe" }))).rejects.toThrow(/role/i);
    expect(fake.calls).toHaveLength(0);
  });

  it.each(["content", "super_admin"])("lets a %s admin add a player, unpublished", async (role) => {
    state.context = adminContext(fake, role);
    const result = await savePlayer(IDLE, form({ full_name: "Jane Doe" }));

    expect(result.status).toBe("success");
    const [insert] = fake.writes("squad", "insert");
    expect(insert.values).toMatchObject({ full_name: "Jane Doe", is_published: false });
  });
});

describe("squad writes that change nothing", () => {
  it("reports an error when the publish toggle matched no rows", async () => {
    fake.respond({ table: "squad", op: "update" }, { data: [], error: null });
    const result = await togglePlayerPublished(IDLE, form({ id: UUID_A, publish: "true" }));
    expect(result.status).toBe("error");
  });

  it("reports an error when the delete matched no rows", async () => {
    fake.respond({ table: "squad", op: "delete" }, { data: [], error: null });
    const result = await removePlayer(IDLE, form({ id: UUID_A }));
    expect(result.status).toBe("error");
  });

  it("reports success when the delete removed the row", async () => {
    fake.respond({ table: "squad", op: "select" }, { data: { full_name: "Jane Doe" }, error: null });
    const result = await removePlayer(IDLE, form({ id: UUID_A }));
    expect(result).toMatchObject({ status: "success" });
    expect(result.message).toContain("Jane Doe");
  });
});

describe("updatePlayer concurrency", () => {
  const edit = (extra: Record<string, string> = {}) =>
    form({ id: UUID_A, full_name: "Jane Doe", expected_updated_at: "2026-10-20T10:00:00Z", ...extra });

  it("writes only when the row still has the version the form was rendered with", async () => {
    const result = await updatePlayer(IDLE, edit());

    expect(result.status).toBe("success");
    const [update] = fake.writes("squad", "update");
    expect(update.filters).toEqual(
      expect.arrayContaining([
        { column: "id", operator: "eq", value: UUID_A },
        { column: "updated_at", operator: "eq", value: "2026-10-20T10:00:00Z" },
      ]),
    );
  });

  it("reports a conflict when another admin saved first", async () => {
    fake.respond({ table: "squad", op: "update" }, { data: [], error: null });
    const result = await updatePlayer(IDLE, edit());
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/changed|someone|reload/i);
  });

  it("refuses a form with no version to compare against", async () => {
    const result = await updatePlayer(IDLE, form({ id: UUID_A, full_name: "Jane Doe" }));
    expect(result.status).toBe("error");
    expect(fake.writes("squad", "update")).toHaveLength(0);
  });
});
