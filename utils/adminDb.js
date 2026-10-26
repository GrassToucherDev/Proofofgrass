// Browser helper for admin pages: the same chained query style as the Supabase client, but the write runs on the
// server behind the admin secret (see /api/admin/db). Use `adminDb.from(t).update(...).eq(...)` where the page used
// to call `supabase.from(t)...`; results come back as { data, error } like before.
import { adminFetch } from "./adminClient";

const CHAIN = ["select", "eq", "neq", "gt", "gte", "lt", "lte", "ilike", "like", "in", "is", "not", "or", "match", "order", "limit", "single", "maybeSingle"];
const OPS = ["insert", "update", "upsert", "delete"];

async function send(payload) {
  try {
    const r = await adminFetch("/api/admin/db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { data: null, error: { message: j.error || `Request failed (${r.status})` } };
    return { data: j.data ?? null, count: j.count ?? null, error: j.error || null };
  } catch (e) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}

class Query {
  constructor(table) { this.table = table; this.op = null; this.args = []; this.steps = []; }
  then(resolve, reject) { return send({ table: this.table, op: this.op, args: this.args, steps: this.steps }).then(resolve, reject); }
}
Query.prototype.catch = function (fn) { return this.then(undefined, fn); };
Query.prototype.finally = function (fn) { return this.then((v) => { fn?.(); return v; }, (e) => { fn?.(); throw e; }); };
for (const op of OPS) Query.prototype[op] = function (...a) { this.op = op; this.args = a; return this; };
for (const m of CHAIN) Query.prototype[m] = function (...a) { this.steps.push([m, a]); return this; };

export const adminDb = {
  from: (table) => new Query(table),
  rpc: (fn, args) => send({ rpc: fn, args }),
};
