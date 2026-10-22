import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminContext, createFakeSupabase, form, IDLE, UUID_A, UUID_B, type FakeSupabase } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({ context: null as unknown }));

vi.mock("@/lib/admin/roles", async () => ({
  ...(await import("@/lib/admin/role-constants")),
  getAdminContext: async () => state.context,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

import { moveHonor, removeHonor, toggleArticlePublished } from "@/app/admin/news/actions";
import { setSponsorPublished } from "@/app/admin/sponsors/actions";

const UUID_C = "33333333-3333-4333-8333-333333333333";

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  state.context = adminContext(fake, "content");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("moveHonor", () => {
  beforeEach(() => {
    fake.respond({ table: "honors", op: "select" }, {
      data: [
        { id: UUID_A, sort_order: 10 },
        { id: UUID_B, sort_order: 20 },
        { id: UUID_C, sort_order: 30 },
      ],
      error: null,
    });
  });

  it("swaps sort_order on exactly two rows and writes nothing else", async () => {
    const result = await moveHonor(IDLE, form({ id: UUID_B, direction: "up" }));

    expect(result.status).toBe("success");
    const updates = fake.writes("honors", "update");
    expect(updates.map((call) => [call.filters[0].value, call.values])).toEqual(
      expect.arrayContaining([
        [UUID_B, { sort_order: 10 }],
        [UUID_A, { sort_order: 20 }],
      ]),
    );
    expect(updates).toHaveLength(2);
    expect(fake.writes("honors", "upsert")).toHaveLength(0);
    expect(fake.writes("honors", "insert")).toHaveLength(0);
  });

  it("does nothing at the end of the list", async () => {
    const result = await moveHonor(IDLE, form({ id: UUID_C, direction: "down" }));
    expect(result.status).toBe("success");
    expect(fake.writes("honors", "update")).toHaveLength(0);
  });

  it("reports when a row disappeared mid-swap", async () => {
    fake.respond({ table: "honors", op: "update" }, (call) =>
      call.filters[0].value === UUID_A ? { data: [], error: null } : { data: [{ id: UUID_B }], error: null },
    );
    const result = await moveHonor(IDLE, form({ id: UUID_B, direction: "up" }));
    expect(result.status).toBe("error");
  });

  it("refuses a fixtures editor", async () => {
    state.context = adminContext(fake, "fixtures");
    await expect(moveHonor(IDLE, form({ id: UUID_B, direction: "up" }))).rejects.toThrow(/role/i);
    expect(fake.calls).toHaveLength(0);
  });
});

describe("content writes that change nothing", () => {
  it("removeHonor reports an error when no row was deleted", async () => {
    fake.respond({ table: "honors", op: "delete" }, { data: [], error: null });
    expect((await removeHonor(IDLE, form({ id: UUID_A }))).status).toBe("error");
  });

  it("toggleArticlePublished reports an error when no row was updated", async () => {
    fake.respond({ table: "articles", op: "update" }, { data: [], error: null });
    expect((await toggleArticlePublished(IDLE, form({ id: UUID_A, publish: "true" }))).status).toBe("error");
  });
});

describe("setSponsorPublished", () => {
  it("sends a signed-out caller to the login page", async () => {
    state.context = null;
    await expect(setSponsorPublished(IDLE, form({ id: UUID_A }))).rejects.toThrow("NEXT_REDIRECT /admin/login");
  });

  it("is super-admin only", async () => {
    await expect(setSponsorPublished(IDLE, form({ id: UUID_A }))).rejects.toThrow(/super admin/i);
    expect(fake.calls).toHaveLength(0);
  });

  it("reports an error when no sponsor was updated", async () => {
    state.context = adminContext(fake, "super_admin");
    fake.respond({ table: "sponsors", op: "update" }, { data: [], error: null });
    const result = await setSponsorPublished(IDLE, form({ id: UUID_A, is_published: "on" }));
    expect(result.status).toBe("error");
  });

  it("publishes when the row was updated", async () => {
    state.context = adminContext(fake, "super_admin");
    const result = await setSponsorPublished(IDLE, form({ id: UUID_A, is_published: "on" }));
    expect(result).toEqual({ status: "success", message: "Sponsor published." });
    expect(fake.writes("sponsors", "update")[0].values).toMatchObject({ is_published: true });
  });
});
