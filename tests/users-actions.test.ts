import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminContext, createFakeSupabase, form, IDLE, type FakeSupabase } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({ context: null as unknown }));

vi.mock("@/lib/admin/roles", async () => ({
  ...(await import("@/lib/admin/role-constants")),
  getAdminContext: async () => state.context,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addAdmin, changeAdminRole, removeAdmin } from "@/app/admin/users/actions";

type AuthUser = { id: string; email: string };
type Request = { method: string; path: string };

let fake: FakeSupabase;
let requests: Request[];
let authUsers: AuthUser[];

/** A fake GoTrue admin API: lists users in pages and ignores any email filter, as the real one does. */
function stubAuthApi({ createStatus = 200 }: { createStatus?: number } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { method?: string }) => {
      const url = new URL(input);
      const path = url.pathname.replace("/auth/v1/admin/", "");
      const method = init?.method ?? "GET";
      requests.push({ method, path: `${path}${url.search}` });

      if (method === "GET" && path === "users") {
        const page = Number(url.searchParams.get("page") ?? 1);
        const perPage = Number(url.searchParams.get("per_page") ?? 50);
        const users = authUsers.slice((page - 1) * perPage, page * perPage);
        return new Response(JSON.stringify({ users }), { status: 200 });
      }
      if (method === "POST" && path === "users") {
        return new Response(JSON.stringify({ id: "new-user" }), { status: createStatus });
      }
      if (method === "DELETE") return new Response(null, { status: 204 });
      return new Response("not found", { status: 404 });
    }),
  );
}

const deletes = () => requests.filter((request) => request.method === "DELETE").map((request) => request.path);

beforeEach(() => {
  fake = createFakeSupabase();
  state.context = adminContext(fake, "super_admin", "boss@club.test");
  requests = [];
  authUsers = [
    { id: "id-boss", email: "boss@club.test" },
    { id: "id-ama", email: "ama@club.test" },
    { id: "id-bob", email: "Bob@Club.test" },
  ];
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
  vi.spyOn(console, "error").mockImplementation(() => {});
  stubAuthApi();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("users role gate", () => {
  it.each(["content", "fixtures"])("refuses a %s admin", async (role) => {
    state.context = adminContext(fake, role);
    const result = await removeAdmin(IDLE, form({ email: "ama@club.test" }));
    expect(result.status).toBe("error");
    expect(fake.calls).toHaveLength(0);
    expect(requests).toHaveLength(0);
  });

  it("refuses a signed-out caller", async () => {
    state.context = null;
    await expect(changeAdminRole(IDLE, form({ email: "ama@club.test", role: "content" }))).rejects.toThrow(/sign in/i);
  });
});

describe("removeAdmin", () => {
  it("deletes the sign-in account whose email matches, not the first one listed", async () => {
    const result = await removeAdmin(IDLE, form({ email: "bob@club.test" }));

    expect(result.status).toBe("success");
    expect(deletes()).toEqual(["users/id-bob"]);
  });

  it("finds the account on a later page", async () => {
    authUsers = [
      ...Array.from({ length: 1000 }, (_, index) => ({ id: `filler-${index}`, email: `fan${index}@example.com` })),
      { id: "id-late", email: "late@club.test" },
    ];
    await removeAdmin(IDLE, form({ email: "late@club.test" }));

    expect(requests.filter((request) => request.method === "GET")).toHaveLength(2);
    expect(deletes()).toEqual(["users/id-late"]);
  });

  it("deletes no account when no email matches exactly", async () => {
    await removeAdmin(IDLE, form({ email: "ama@club.tes" }));
    expect(deletes()).toEqual([]);
  });

  it("leaves the sign-in account alone when the admin row was not removed", async () => {
    fake.respond({ table: "site_admins", op: "delete" }, { data: [], error: null });
    const result = await removeAdmin(IDLE, form({ email: "ama@club.test" }));

    expect(result.status).toBe("error");
    expect(requests).toHaveLength(0);
  });

  it("refuses to remove the signed-in admin", async () => {
    const result = await removeAdmin(IDLE, form({ email: "BOSS@club.test" }));
    expect(result.status).toBe("error");
    expect(fake.calls).toHaveLength(0);
  });

  it("explains the last-super-admin guard", async () => {
    fake.respond({ table: "site_admins", op: "delete" }, { data: null, error: { message: "guard", code: "42501" } });
    const result = await removeAdmin(IDLE, form({ email: "ama@club.test" }));
    expect(result).toEqual({ status: "error", message: "That would leave the site with no super admin." });
    expect(requests).toHaveLength(0);
  });
});

describe("addAdmin", () => {
  it("reports an existing sign-in account only when the email really exists", async () => {
    stubAuthApi({ createStatus: 422 });
    const existing = await addAdmin(IDLE, form({ email: "ama@club.test", role: "content" }));
    expect(existing.status).toBe("success");
    expect(existing.message).toContain("already had a sign-in account");

    // Creation failed and no account matches: the old lookup reported "exists"
    // here because the list endpoint returned unrelated users.
    const missing = await addAdmin(IDLE, form({ email: "new@club.test", role: "content" }));
    expect(missing.status).toBe("error");
    expect(fake.writes("site_admins", "insert")).toHaveLength(1);
  });

  it("does not claim a confirmation email was sent", async () => {
    const result = await addAdmin(IDLE, form({ email: "new@club.test", role: "fixtures" }));
    expect(result.status).toBe("success");
    expect(result.message).not.toMatch(/email has been sent/i);
  });
});

describe("changeAdminRole", () => {
  it("reports an error when no admin row was updated", async () => {
    fake.respond({ table: "site_admins", op: "update" }, { data: [], error: null });
    const result = await changeAdminRole(IDLE, form({ email: "ghost@club.test", role: "content" }));
    expect(result.status).toBe("error");
  });
});
