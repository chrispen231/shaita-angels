import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminContext, createFakeSupabase, form, type FakeSupabase } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({ context: null as unknown, client: null as unknown }));

vi.mock("@/lib/admin/roles", async () => ({
  ...(await import("@/lib/admin/role-constants")),
  getAdminContext: async () => state.context,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.client }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { deleteImage, togglePublish } from "@/app/admin/media/actions";

const IDLE = { status: "idle", message: "", url: "", path: "" } as const;
const target = { bucket: "gallery", path: "2026/10/cup-final.jpg" };

let fake: FakeSupabase;

beforeEach(() => {
  fake = createFakeSupabase();
  state.client = fake.client;
  state.context = adminContext(fake, "super_admin");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("deleteImage", () => {
  it.each(["content", "fixtures"])("refuses a %s admin", async (role) => {
    state.context = adminContext(fake, role);
    const result = await deleteImage(IDLE, form(target));
    expect(result.status).toBe("error");
    expect(fake.storageCalls).toHaveLength(0);
  });

  it("refuses a signed-out caller", async () => {
    state.context = null;
    expect((await deleteImage(IDLE, form(target))).status).toBe("error");
    expect(fake.storageCalls).toHaveLength(0);
  });

  it.each(["../players/x.jpg", "/abs.jpg", ""])("rejects the path %j before touching storage", async (path) => {
    const result = await deleteImage(IDLE, form({ bucket: "gallery", path }));
    expect(result.status).toBe("error");
    expect(fake.storageCalls).toHaveLength(0);
  });

  it("rejects an unknown bucket", async () => {
    const result = await deleteImage(IDLE, form({ bucket: "secrets", path: "a.jpg" }));
    expect(result.status).toBe("error");
    expect(fake.storageCalls).toHaveLength(0);
  });

  it("reports failure when storage removed nothing, as it does when RLS blocks the delete", async () => {
    fake.onStorage(() => ({ data: [], error: null }));
    const result = await deleteImage(IDLE, form(target));

    expect(result.status).toBe("error");
    expect(fake.writes("media_uploads", "delete")).toHaveLength(0);
  });

  it("removes the file and then its upload record", async () => {
    const result = await deleteImage(IDLE, form(target));

    expect(result.status).toBe("success");
    expect(fake.storageCalls).toEqual([{ bucket: "gallery", op: "remove", paths: ["2026/10/cup-final.jpg"] }]);
    const [record] = fake.writes("media_uploads", "delete");
    expect(record.filters).toEqual([
      { column: "bucket", operator: "eq", value: "gallery" },
      { column: "object_path", operator: "eq", value: "2026/10/cup-final.jpg" },
    ]);
  });

  it("says so when the file went but the record could not be removed", async () => {
    fake.respond({ table: "media_uploads", op: "delete" }, { data: null, error: { message: "denied" } });
    const result = await deleteImage(IDLE, form(target));
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/image was deleted/i);
  });
});

describe("togglePublish", () => {
  it("is super-admin only", async () => {
    state.context = adminContext(fake, "content");
    const result = await togglePublish(IDLE, form({ id: "photo-1", publish: "true" }));
    expect(result.status).toBe("error");
    expect(fake.calls).toHaveLength(0);
  });

  it("reports an error when the update matched no photo", async () => {
    fake.respond({ table: "media_uploads", op: "update" }, { data: [], error: null });
    const result = await togglePublish(IDLE, form({ id: "photo-1", publish: "true" }));
    expect(result.status).toBe("error");
  });
});
