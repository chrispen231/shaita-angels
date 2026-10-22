/**
 * A chainable stand-in for the Supabase client, for testing server actions.
 *
 * Every query is recorded when it is awaited, with its table, operation, values
 * and filters, so a test can assert on what was written. Results come from
 * responders the test registers; anything unmatched gets a plausible default:
 * an empty list for reads, one returned row for writes that ask for rows back.
 */

export type DbError = { message: string; code?: string };
export type DbResult = { data: unknown; error: DbError | null };

export type QueryCall = {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  values?: unknown;
  filters: { column: string; operator: string; value: unknown }[];
  /** Columns requested back from a write, via .select() after it. */
  returning?: string;
  terminal?: "single" | "maybeSingle";
};

export type RpcCall = { name: string; args: unknown };
export type StorageCall = { bucket: string; op: "remove"; paths: string[] };

type Match = { table?: string; op?: QueryCall["op"] };
type Responder = { match: Match; result: DbResult | ((call: QueryCall) => DbResult) };

const FILTERS = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "like", "ilike"] as const;
const PASSTHROUGH = ["order", "limit", "range"] as const;

export function createFakeSupabase() {
  const calls: QueryCall[] = [];
  const rpcCalls: RpcCall[] = [];
  const storageCalls: StorageCall[] = [];
  const responders: Responder[] = [];
  let rpcResult: (call: RpcCall) => DbResult = () => ({ data: null, error: null });
  let storageResult: (call: StorageCall) => DbResult = (call) => ({
    data: call.paths.map((name) => ({ name })),
    error: null,
  });

  function resultFor(call: QueryCall): DbResult {
    // Most recently registered responder wins, so a test can override a default.
    for (let i = responders.length - 1; i >= 0; i -= 1) {
      const { match, result } = responders[i];
      if (match.table && match.table !== call.table) continue;
      if (match.op && match.op !== call.op) continue;
      return typeof result === "function" ? result(call) : result;
    }
    if (call.terminal) return { data: null, error: null };
    if (call.op === "select") return { data: [], error: null };
    if (call.returning) return { data: [{ id: "row-1" }], error: null };
    return { data: null, error: null };
  }

  function builder(table: string) {
    const call: QueryCall = { table, op: "select", filters: [] };
    let opSet = false;

    const run = () => {
      calls.push(call);
      return Promise.resolve(resultFor(call));
    };

    const self: Record<string, unknown> = {
      select(columns?: string) {
        if (opSet) call.returning = columns ?? "*";
        else {
          call.op = "select";
          opSet = true;
        }
        return self;
      },
      insert(values: unknown) {
        Object.assign(call, { op: "insert", values });
        opSet = true;
        return self;
      },
      update(values: unknown) {
        Object.assign(call, { op: "update", values });
        opSet = true;
        return self;
      },
      upsert(values: unknown) {
        Object.assign(call, { op: "upsert", values });
        opSet = true;
        return self;
      },
      delete() {
        call.op = "delete";
        opSet = true;
        return self;
      },
      single() {
        call.terminal = "single";
        return run();
      },
      maybeSingle() {
        call.terminal = "maybeSingle";
        return run();
      },
      then(onFulfilled: (value: DbResult) => unknown, onRejected?: (reason: unknown) => unknown) {
        return run().then(onFulfilled, onRejected);
      },
    };

    for (const operator of FILTERS) {
      self[operator] = (column: string, value: unknown) => {
        call.filters.push({ column, operator, value });
        return self;
      };
    }
    for (const name of PASSTHROUGH) self[name] = () => self;

    return self;
  }

  const client = {
    from: (table: string) => builder(table),
    rpc: (name: string, args: unknown) => {
      const call = { name, args };
      rpcCalls.push(call);
      return Promise.resolve(rpcResult(call));
    },
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) => {
          const call: StorageCall = { bucket, op: "remove", paths };
          storageCalls.push(call);
          return Promise.resolve(storageResult(call));
        },
      }),
    },
  };

  return {
    client,
    calls,
    rpcCalls,
    storageCalls,
    /** Answer queries matching table/op with a fixed result or a function of the call. */
    respond(match: Match, result: Responder["result"]) {
      responders.push({ match, result });
    },
    onRpc(result: (call: RpcCall) => DbResult) {
      rpcResult = result;
    },
    onStorage(result: (call: StorageCall) => DbResult) {
      storageResult = result;
    },
    /** Recorded queries for one table and operation. */
    writes(table: string, op: QueryCall["op"]) {
      return calls.filter((call) => call.table === table && call.op === op);
    },
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;

/** The shape getAdminContext returns, around a fake client. */
export function adminContext(fake: FakeSupabase, role: string, email = "editor@club.test") {
  return { supabase: fake.client, user: { id: "user-1", email }, role };
}

/** Builds FormData; an array value appends the key once per item, as repeated inputs do. */
export function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

export const IDLE = { status: "idle", message: "" } as const;
export const UUID_A = "11111111-1111-4111-8111-111111111111";
export const UUID_B = "22222222-2222-4222-8222-222222222222";
