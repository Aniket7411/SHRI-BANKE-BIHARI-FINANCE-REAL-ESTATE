import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSeed, OLD_DEMO_EMAILS, OLD_SAMPLE_PROPERTY_IDS } from "./seed";

/**
 * Demo database — an in-memory stand-in for the subset of supabase-js this app
 * uses, so the whole site + admin run before Supabase keys are added.
 *
 * Persistence: `.demo-db.json` in the project root (dev), else the OS temp dir,
 * else memory only. Uploaded files go to `.demo-uploads/` next to it (or memory)
 * and are served by `/api/demo-files/[bucket]/[...path]`.
 *
 * Supported: from(t).select(cols, {count, head}) incl. column lists, aliases and
 * one-level embeds via known foreign keys; insert / update / upsert / delete with
 * `.select()`; filters eq neq gt gte lt lte like ilike is in contains containedBy
 * overlaps match not or filter textSearch; order (chainable) limit range single
 * maybeSingle; auth (+ auth.admin) and storage. See README → Demo mode.
 */

export type Row = Record<string, unknown>;
type Err = { message: string; code: string; details: string | null; hint: string | null };
export type Result = { data: unknown; error: Err | null; count: number | null; status: number; statusText: string };

export interface DemoUser {
  id: string;
  email: string;
  password: string | null;
  user_metadata: Row;
  created_at: string;
}

interface ObjectMeta {
  type: string;
  size: number;
  created_at: string;
}

interface State {
  version: 1;
  tables: Record<string, Row[]>;
  seq: Record<string, number>;
  users: DemoUser[];
  objects: Record<string, ObjectMeta>;
  /** Tables whose seed rows have been loaded — lets seeds added later still appear. */
  seeded: string[];
}

interface Store {
  state: State;
  file: string | null;
  filesDir: string | null;
  mtime: number;
  memFiles: Map<string, Buffer>;
}

/* ============================================================== schema */

const now = () => new Date().toISOString();

type Fk = { table: string; col: string; ref: string; refCol?: string; onDelete: "cascade" | "set null" };
const extDefaults: Record<string, Row> = {};
/** Foreign keys from 0005_reels.sql (deleting a listing unlinks its reels). */
const extFks: Fk[] = [{ table: "reels", col: "property_id", ref: "properties", onDelete: "set null" }];

/** Column defaults from supabase/migrations/0001_init.sql. Unknown tables just get id + timestamps. */
const DEFAULTS: Record<string, Row> = {
  profiles: { full_name: "", email: "", phone: null, role: "agent", active: true },
  properties: {
    category: "Residential",
    city: "Kanpur",
    details: {},
    beds: null,
    baths: null,
    images: [],
    videos: [],
    tags: [],
    amenities: [],
    description: "",
    featured: false,
    verified: false,
    status: "published",
    sort_order: 0,
    views: 0,
    created_by: null,
  },
  loan_products: { short: "", icon: "home", max_amount: "", processing: "", highlights: [], eligibility: [], documents: [], image: "", sort_order: 0, active: true },
  testimonials: { role: "", avatar: "", rating: 5, sort_order: 0, active: true, reel_url: "", source: "admin", verified_buyer: false, lead_id: null, property_id: null, city: "", consent: true },
  faqs: { sort_order: 0, active: true },
  site_settings: { id: 1, data: {} },
  jobs: {
    department: "",
    location: "Kanpur",
    employment_type: "Full-time",
    experience: "",
    salary: "",
    description: "",
    responsibilities: [],
    requirements: [],
    status: "open",
    sort_order: 0,
  },
  job_applications: { job_id: null, job_title: "", email: null, experience: null, message: null, resume_path: null, status: "new", notes: null },
  leads: {
    email: null,
    interest: "Other",
    budget: null,
    message: null,
    callback_slot: null,
    source: "website",
    channel: "website",
    property_id: null,
    status: "new",
    assigned_to: null,
    follow_up_at: null,
    utm: {},
    meta: {},
    submissions: 1,
  },
  lead_activities: { actor: null, body: null, data: {} },
  subscribers: { source: "footer" },
  // 0003_cms.sql
  offers: {
    description: "",
    code: null,
    discount_text: "",
    applies_to: "All",
    starts_at: null,
    ends_at: null,
    show_banner: false,
    show_popup: false,
    cta_label: "Claim offer",
    cta_href: "/contact",
    theme: "default",
    active: true,
    sort_order: 0,
  },
  documents: { category: "Certificate", file_kind: "link", size_bytes: null, active: true, sort_order: 0 },
  // 0005_reels.sql
  reels: { cover: "", property_id: null, active: true, sort_order: 0 },
  // 0006_cities.sql
  cities: { localities: [], active: true, sort_order: 0 },
  // 0008_banks.sql
  banks: { kind: "Government", logo: "", active: true, sort_order: 0 },
  bank_rates: { rate_max: null, processing: "", note: "" },
  // 0007_reviews.sql
  review_requests: { lead_id: null, property_id: null, phone: "", email: null, role_hint: "", created_by: null, expires_at: null, submitted_at: null, testimonial_id: null },
  // 0009_requirements.sql
  requirements: {
    lead_id: null,
    email: null,
    purpose: "Buy",
    city: "",
    localities: [],
    category: "",
    types: [],
    budget_min: null,
    budget_max: null,
    beds: [],
    notes: "",
    alerts: true,
    status: "active",
    source: "website",
    last_notified_at: null,
  },
  requirement_alerts: { sent_by: null },
};

/** AFTER INSERT triggers. */
const AFTER_INSERT: Record<string, (row: Row) => void> = {
  // 0002_crm.sql touch_lead_activity(): bump the lead's last_activity_at
  lead_activities: (a) => {
    const lead = table("leads").find((l) => l.id === a.lead_id);
    if (lead && String(a.created_at) > String(lead.last_activity_at ?? "")) lead.last_activity_at = a.created_at;
  },
};

/** `generated always as identity` columns and their start values. */
const IDENTITY: Record<string, Record<string, number>> = {
  testimonials: { id: 1 },
  faqs: { id: 1 },
  lead_activities: { id: 1 },
  leads: { ref: 1001 },
  requirements: { ref: 101 },
  requirement_alerts: { id: 1 },
};

/** Primary keys that aren't a generated uuid. */
const PK: Record<string, string> = { subscribers: "email" };
const UNIQUE: Record<string, string[]> = { jobs: ["slug"], leads: ["ref"], banks: ["name"], requirements: ["ref", "token"] };

/** Which timestamp columns each known table has (unknown tables: both). */
const STAMPS: Record<string, string[]> = {
  profiles: ["created_at"],
  properties: ["created_at", "updated_at"],
  loan_products: ["updated_at"],
  testimonials: ["created_at"],
  faqs: ["created_at"],
  site_settings: ["updated_at"],
  jobs: ["created_at", "updated_at"],
  job_applications: ["created_at"],
  leads: ["created_at", "updated_at", "last_activity_at"],
  lead_activities: ["created_at"],
  subscribers: ["created_at"],
  bank_rates: ["updated_at"],
  requirement_alerts: ["created_at"],
};

const FKS: Fk[] = [
  { table: "leads", col: "property_id", ref: "properties", onDelete: "set null" },
  { table: "leads", col: "assigned_to", ref: "profiles", onDelete: "set null" },
  { table: "lead_activities", col: "lead_id", ref: "leads", onDelete: "cascade" },
  { table: "lead_activities", col: "actor", ref: "profiles", onDelete: "set null" },
  { table: "job_applications", col: "job_id", ref: "jobs", onDelete: "set null" },
  { table: "properties", col: "created_by", ref: "profiles", onDelete: "set null" },
  { table: "bank_rates", col: "bank_id", ref: "banks", onDelete: "cascade" },
  { table: "bank_rates", col: "loan_id", ref: "loan_products", onDelete: "cascade" },
  { table: "requirements", col: "lead_id", ref: "leads", onDelete: "set null" },
  { table: "requirement_alerts", col: "requirement_id", ref: "requirements", onDelete: "cascade" },
  { table: "requirement_alerts", col: "property_id", ref: "properties", onDelete: "cascade" },
  { table: "requirement_alerts", col: "sent_by", ref: "profiles", onDelete: "set null" },
  ...extFks,
];

const pkOf = (t: string) => PK[t] ?? "id";
const stampsOf = (t: string) => STAMPS[t] ?? ["created_at", "updated_at"];

/* ============================================================== store */

const g = globalThis as typeof globalThis & { __demoDb?: Store };

function writableDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.demo-probe-${process.pid}`);
    fs.writeFileSync(probe, "");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function locate(): { file: string | null; filesDir: string | null } {
  for (const dir of [process.cwd(), path.join(os.tmpdir(), "sbb-demo")]) {
    if (writableDir(dir)) return { file: path.join(dir, ".demo-db.json"), filesDir: path.join(dir, ".demo-uploads") };
  }
  return { file: null, filesDir: null };
}

function readFile(file: string | null): State | null {
  if (!file) return null;
  try {
    const s = JSON.parse(fs.readFileSync(file, "utf8")) as State;
    return s?.version === 1 && s.tables ? { ...s, objects: s.objects ?? {}, seeded: s.seeded ?? [] } : null;
  } catch {
    return null;
  }
}

const mtimeOf = (file: string) => {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
};

function emptyState(): State {
  return { version: 1, tables: {}, seq: {}, users: [], objects: {}, seeded: [] };
}

/** Load seed rows for any table not seeded yet (so seeds filled in later still show up). */
function ensureSeeded(state: State) {
  const seed = buildSeed();
  let changed = false;
  // One-time cleanup: drop the built-in sample listings (and unlink leads / reels that pointed at them).
  if (!state.seeded.includes("purge:sample-properties")) {
    state.seeded.push("purge:sample-properties");
    const old = new Set(OLD_SAMPLE_PROPERTY_IDS);
    if (state.tables.properties) state.tables.properties = state.tables.properties.filter((p) => !old.has(String(p.id)));
    for (const t of ["leads", "reels", "testimonials", "review_requests"]) for (const r of state.tables[t] ?? []) if (old.has(String(r.property_id))) r.property_id = null;
    changed = true;
  }
  // One-time cleanup: drop everything the old demo seed created (sample content + demo logins).
  if (!state.seeded.includes("purge:demo-data")) {
    state.seeded.push("purge:demo-data");
    const demoIds = new Set(state.users.filter((u) => OLD_DEMO_EMAILS.includes(u.email)).map((u) => u.id));
    state.users = state.users.filter((u) => !demoIds.has(u.id));
    if (state.tables.profiles) state.tables.profiles = state.tables.profiles.filter((p) => !demoIds.has(String(p.id)));
    for (const t of ["loan_products", "testimonials", "faqs", "jobs", "leads", "lead_activities", "offers", "documents"]) state.tables[t] = [];
    changed = true;
  }
  for (const [table, rows] of Object.entries(seed.tables)) {
    if (state.seeded.includes(table) || !rows.length) continue;
    state.seeded.push(table);
    const list = (state.tables[table] ??= []);
    for (const r of rows) {
      const row = withDefaults(state, table, structuredClone(r));
      const key = pkOf(table);
      if (row[key] != null && list.some((x) => looseEq(x[key], row[key]))) continue;
      list.push(row);
    }
    changed = true;
  }
  return changed;
}

function persist(s: Store) {
  if (!s.file) return;
  const json = JSON.stringify(s.state);
  try {
    const tmp = `${s.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, s.file);
  } catch {
    try {
      fs.writeFileSync(s.file, json);
    } catch (e) {
      // e.g. a sync client briefly locking the file — keep the data in memory, retry on the next write
      console.warn("[demo-db] could not save:", e instanceof Error ? e.message : e);
      return;
    }
  }
  if (s.file) s.mtime = mtimeOf(s.file);
}

function store(): Store {
  let s = g.__demoDb;
  if (!s) {
    const loc = locate();
    const saved = readFile(loc.file);
    s = { ...loc, state: saved ?? emptyState(), mtime: loc.file ? mtimeOf(loc.file) : 0, memFiles: new Map() };
    g.__demoDb = s;
    if (ensureSeeded(s.state) || !saved) persist(s);
  } else if (s.file) {
    // another process (or a manual edit) changed the file → reload
    const m = mtimeOf(s.file);
    if (m && m > s.mtime + 1) {
      const fresh = readFile(s.file);
      if (fresh) {
        s.state = fresh;
        s.mtime = m;
        if (ensureSeeded(s.state)) persist(s);
      }
    }
  }
  return s;
}

const table = (t: string) => (store().state.tables[t] ??= []);

/** Wipe everything (tables, logins, uploads) and re-seed. */
export function resetDemoDb() {
  const s = store();
  s.state = emptyState();
  ensureSeeded(s.state);
  s.memFiles.clear();
  if (s.filesDir) fs.rmSync(s.filesDir, { recursive: true, force: true });
  persist(s);
}

/** Where demo data lives — shown in Admin → Settings. */
export function demoStorageInfo() {
  const s = store();
  return { file: s.file, persistent: Boolean(s.file) };
}

/* ============================================================== helpers */

const err = (message: string, code: string, details: string | null = null): Err => ({ message, code, details, hint: null });

function looseEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a === "object" || typeof b === "object") return JSON.stringify(a) === JSON.stringify(b);
  return String(a) === String(b);
}

function cmp(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" || typeof b === "boolean") return Number(a === true || a === "true") - Number(b === true || b === "true");
  if (typeof a === "number" || typeof b === "number") {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  }
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : v);

/** Read a column, supporting json paths like `meta->>leadgen_id` / `data->a->b`. */
function get(r: Row, col: string): unknown {
  if (!col.includes("->")) return r[col];
  const [base, ...keys] = col.split(/->>?/);
  let v: unknown = r[base.trim()];
  for (const k of keys) v = v && typeof v === "object" ? (v as Row)[k.trim().replace(/^'|'$/g, "")] : undefined;
  return v;
}

const likeRe = (pattern: string, flags = "") =>
  new RegExp(
    "^" +
      String(pattern)
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/[%*_]/g, (m) => (m === "_" ? "." : ".*")) +
      "$",
    flags + "s",
  );

/** Parse a PostgREST list literal: `(a,b,"c d")` or `{a,b}`. */
function parseList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  const s = String(v).trim().replace(/^[({]|[)}]$/g, "");
  if (!s) return [];
  return s.split(",").map((x) => x.trim().replace(/^"(.*)"$/, "$1"));
}

function parseScalar(op: string, v: string): unknown {
  if (op === "in") return parseList(v);
  if (op === "cs" || op === "cd" || op === "ov") return v.startsWith("{") || v.startsWith("(") ? parseList(v) : safeJson(v);
  if (op === "is") return v === "null" ? null : v === "true" ? true : v === "false" ? false : v;
  return v;
}

const safeJson = (v: string) => {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

type Pred = (r: Row) => boolean;

function pred(col: string, op: string, value: unknown): Pred {
  const c = col.trim();
  // filters on embedded tables (e.g. "profiles.full_name") are ignored in demo mode
  if (c.includes(".") && !c.includes("->")) return () => true;
  const v = norm(value);
  switch (op) {
    case "eq":
      return (r) => looseEq(get(r, c), v);
    case "neq":
      return (r) => get(r, c) != null && !looseEq(get(r, c), v);
    case "gt":
      return (r) => get(r, c) != null && cmp(get(r, c), v) > 0;
    case "gte":
      return (r) => get(r, c) != null && cmp(get(r, c), v) >= 0;
    case "lt":
      return (r) => get(r, c) != null && cmp(get(r, c), v) < 0;
    case "lte":
      return (r) => get(r, c) != null && cmp(get(r, c), v) <= 0;
    case "like":
      return (r) => typeof get(r, c) === "string" && likeRe(String(v)).test(get(r, c) as string);
    case "ilike":
      return (r) => typeof get(r, c) === "string" && likeRe(String(v), "i").test(get(r, c) as string);
    case "is":
      return (r) => (v === null || v === "null" ? get(r, c) == null : Boolean(get(r, c)) === (v === true || v === "true") && get(r, c) != null);
    case "in": {
      const list = parseList(v);
      return (r) => list.some((x) => looseEq(get(r, c), x));
    }
    case "cs": {
      const need = v;
      return (r) => {
        const have = get(r, c);
        if (Array.isArray(have)) return parseList(need).every((x) => have.some((h) => looseEq(h, x)));
        if (have && typeof have === "object" && need && typeof need === "object") return Object.entries(need as Row).every(([k, x]) => looseEq((have as Row)[k], x));
        return false;
      };
    }
    case "cd": {
      const allowed = parseList(v);
      return (r) => {
        const have = get(r, c);
        return Array.isArray(have) && have.every((h) => allowed.some((x) => looseEq(h, x)));
      };
    }
    case "ov": {
      const any = parseList(v);
      return (r) => {
        const have = get(r, c);
        return Array.isArray(have) && have.some((h) => any.some((x) => looseEq(h, x)));
      };
    }
    case "fts":
    case "plfts":
    case "phfts":
    case "wfts": {
      const words = String(v)
        .toLowerCase()
        .split(/[\s&|!:'()]+/)
        .filter(Boolean);
      return (r) => words.every((w) => String(get(r, c) ?? "").toLowerCase().includes(w));
    }
    default:
      return () => true;
  }
}

function negate(col: string, op: string, value: unknown): Pred {
  const p = pred(col, op, value);
  if (op === "is") return (r) => !p(r);
  return (r) => get(r, col.trim()) != null && !p(r); // SQL: NOT(null) is null → excluded
}

/** Split on top-level commas (ignoring commas inside parentheses / quotes). */
function splitTop(s: string, sep = ","): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = false;
  let cur = "";
  for (const ch of s) {
    if (ch === '"') quote = !quote;
    if (!quote && (ch === "(" || ch === "{")) depth++;
    if (!quote && (ch === ")" || ch === "}")) depth--;
    if (ch === sep && depth === 0 && !quote) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** `name.ilike.%x%,and(a.gte.1,a.lte.5),phone.not.is.null` → predicate (OR of items). */
function parseLogic(expr: string, mode: "or" | "and"): Pred {
  const items = splitTop(expr).map((item): Pred => {
    const nested = item.match(/^(not\.)?(and|or)\(([\s\S]*)\)$/);
    if (nested) {
      const p = parseLogic(nested[3], nested[2] as "or" | "and");
      return nested[1] ? (r) => !p(r) : p;
    }
    const [col, ...rest] = item.split(".");
    let op = rest.shift() ?? "eq";
    let neg = false;
    if (op === "not") {
      neg = true;
      op = rest.shift() ?? "eq";
    }
    const raw = rest.join(".");
    const value = parseScalar(op, raw);
    return neg ? negate(col, op, value) : pred(col, op, value);
  });
  return mode === "or" ? (r) => items.some((p) => p(r)) : (r) => items.every((p) => p(r));
}

/* ============================================================== select parsing / embeds */

type Sel = { kind: "all" } | { kind: "col"; name: string; alias: string } | { kind: "embed"; target: string; alias: string; hint?: string; inner: boolean; cols: string };

function parseSelect(cols: string): Sel[] {
  const out: Sel[] = [];
  for (const raw of splitTop(cols.replace(/\s+/g, " "))) {
    const tok = raw.trim();
    if (tok === "*") {
      out.push({ kind: "all" });
      continue;
    }
    const embed = tok.match(/^(?:([\w]+)\s*:\s*)?([\w]+)(?:!([\w]+))?(?:!([\w]+))?\s*\(([\s\S]*)\)$/);
    if (embed) {
      const [, alias, target, h1, h2, inner] = embed;
      const hints = [h1, h2].filter(Boolean);
      out.push({ kind: "embed", target, alias: alias ?? target, hint: hints.find((h) => h !== "inner" && h !== "left"), inner: hints.includes("inner"), cols: inner || "*" });
      continue;
    }
    if (/^count\(\)$|^count$/.test(tok)) continue;
    const m = tok.match(/^(?:([\w]+)\s*:\s*)?([\w>-]+)(?:::\w+)?$/);
    if (m) {
      const name = m[2];
      out.push({ kind: "col", name, alias: m[1] ?? name.split(/->>?/).pop()! });
    }
  }
  return out.length ? out : [{ kind: "all" }];
}

const singular = (t: string) => t.replace(/ies$/, "y").replace(/s$/, "");

function project(t: string, r: Row, sels: Sel[]): Row | null {
  const out: Row = {};
  for (const s of sels) {
    if (s.kind === "all") Object.assign(out, r);
    else if (s.kind === "col") out[s.alias] = get(r, s.name) ?? null;
    else {
      const v = embed(t, r, s);
      if (s.inner && (v == null || (Array.isArray(v) && !v.length))) return null;
      out[s.alias] = v;
    }
  }
  return out;
}

function embed(t: string, r: Row, s: Extract<Sel, { kind: "embed" }>): unknown {
  const inner = parseSelect(s.cols);
  const one = (target: string, col: string, refCol = "id") => {
    const row = table(target).find((x) => looseEq(x[refCol], r[col]));
    return row ? project(target, row, inner) : null;
  };
  const many = (target: string, col: string, refCol = "id") =>
    table(target)
      .filter((x) => looseEq(x[col], r[refCol]))
      .map((x) => project(target, x, inner))
      .filter(Boolean);
  // many-to-one (this row points at target)
  const fk = FKS.find((f) => f.table === t && f.ref === s.target && (!s.hint || f.col === s.hint));
  if (fk) return one(s.target, fk.col, fk.refCol);
  if (s.hint && s.hint in r) return one(s.target, s.hint);
  // one-to-many (target rows point at this row)
  const back = FKS.find((f) => f.table === s.target && f.ref === t && (!s.hint || f.col === s.hint));
  if (back) return many(s.target, back.col, back.refCol);
  // guess by naming convention
  const guess = `${singular(s.target)}_id`;
  if (guess in r) return one(s.target, guess);
  const rev = `${singular(t)}_id`;
  if (table(s.target).some((x) => rev in x)) return many(s.target, rev);
  return null;
}

/* ============================================================== row-level security (simplified) */

export type DemoCtx = { kind: "service" } | { kind: "anon" } | { kind: "user"; uid: string | null; setSession?: (uid: string | null) => void };

const PRIVATE = new Set(["profiles", "job_applications", "leads", "lead_activities", "subscribers", "review_requests", "requirements", "requirement_alerts"]);
const ANON_READ: Record<string, Pred> = {
  properties: (r) => r.status !== "draft",
  loan_products: (r) => r.active !== false,
  testimonials: (r) => r.active !== false,
  faqs: (r) => r.active !== false,
  jobs: (r) => r.status === "open",
  offers: (r) => r.active !== false,
  documents: (r) => r.active !== false,
  reels: (r) => r.active !== false,
  cities: (r) => r.active !== false,
  banks: (r) => r.active !== false,
  bank_rates: () => true, // hidden banks' rates are dropped by the loaders
};

function staffOf(ctx: DemoCtx): { id: string; role: string } | null {
  if (ctx.kind !== "user" || !ctx.uid) return null;
  const p = table("profiles").find((x) => x.id === ctx.uid);
  return p && p.active !== false ? { id: p.id as string, role: String(p.role) } : null;
}

/** Rows this client may see/touch. Service role and admins see everything. */
function visible(t: string, ctx: DemoCtx): Pred | "none" | null {
  if (ctx.kind === "service") return null;
  const staff = staffOf(ctx);
  if (staff?.role === "admin") return null;
  if (staff) {
    if (t === "leads") return (r) => r.assigned_to === staff.id;
    if (t === "lead_activities") {
      const mine = new Set(table("leads").filter((l) => l.assigned_to === staff.id).map((l) => l.id));
      return (r) => mine.has(r.lead_id);
    }
    if (t === "requirements" || t === "requirement_alerts") {
      // 0009: agents see requirements whose lead is assigned to them.
      const mine = new Set(table("leads").filter((l) => l.assigned_to === staff.id).map((l) => l.id));
      const reqs = new Set(table("requirements").filter((r) => mine.has(r.lead_id)).map((r) => r.id));
      return t === "requirements" ? (r) => reqs.has(r.id) : (r) => reqs.has(r.requirement_id);
    }
        if (t === "job_applications" || t === "subscribers") return "none";
    return null;
  }
  if (PRIVATE.has(t)) return "none";
  return ANON_READ[t] ?? null;
}

/* ============================================================== writes */

function nextSeq(state: State, t: string, col: string) {
  const key = `${t}.${col}`;
  const start = IDENTITY[t]?.[col] ?? 1;
  const cur = state.seq[key] ?? start - 1;
  state.seq[key] = cur + 1;
  return cur + 1;
}

function withDefaults(state: State, t: string, input: Row): Row {
  const row: Row = { ...structuredClone(DEFAULTS[t] ?? {}), ...structuredClone(extDefaults[t] ?? {}) };
  for (const [k, v] of Object.entries(input)) if (v !== undefined) row[k] = norm(v);
  const ts = now();
  for (const c of stampsOf(t)) if (row[c] == null) row[c] = ts;
  for (const col of Object.keys(IDENTITY[t] ?? {})) {
    if (row[col] == null) row[col] = nextSeq(state, t, col);
    else {
      const key = `${t}.${col}`;
      state.seq[key] = Math.max(state.seq[key] ?? 0, Number(row[col]));
    }
  }
  const pk = pkOf(t);
  if (row[pk] == null && pk === "id" && !IDENTITY[t]?.id) row.id = randomUUID();
  return row;
}

function checkConstraints(t: string, row: Row, list: Row[], self?: Row): Err | null {
  for (const col of [pkOf(t), ...(UNIQUE[t] ?? [])]) {
    if (row[col] == null) continue;
    if (list.some((x) => x !== self && looseEq(x[col], row[col])))
      return err(`duplicate key value violates unique constraint "${t}_${col === pkOf(t) ? "pkey" : `${col}_key`}"`, "23505", `Key (${col})=(${String(row[col])}) already exists.`);
  }
  for (const fk of FKS) {
    if (fk.table !== t || row[fk.col] == null) continue;
    if (!table(fk.ref).some((x) => looseEq(x[fk.refCol ?? "id"], row[fk.col])))
      return err(`insert or update on table "${t}" violates foreign key constraint "${t}_${fk.col}_fkey"`, "23503", `Key (${fk.col})=(${String(row[fk.col])}) is not present in table "${fk.ref}".`);
  }
  return null;
}

function cascadeDelete(t: string, removed: Row[]) {
  for (const fk of FKS) {
    if (fk.ref !== t) continue;
    const keys = new Set(removed.map((r) => String(r[fk.refCol ?? "id"])));
    const list = table(fk.table);
    if (fk.onDelete === "cascade") {
      const gone = list.filter((x) => x[fk.col] != null && keys.has(String(x[fk.col])));
      if (!gone.length) continue;
      store().state.tables[fk.table] = list.filter((x) => !gone.includes(x));
      cascadeDelete(fk.table, gone);
    } else for (const x of list) if (x[fk.col] != null && keys.has(String(x[fk.col]))) x[fk.col] = null;
  }
}

/* ============================================================== query builder */

type Op = "select" | "insert" | "update" | "upsert" | "delete";

class Query implements PromiseLike<Result> {
  private op: Op = "select";
  private cols = "*";
  private returning = false;
  private countMode: string | null = null;
  private head = false;
  private payload: Row[] = [];
  private patch: Row = {};
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private filters: Pred[] = [];
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private lim: number | null = null;
  private off = 0;
  private mode: "many" | "single" | "maybe" = "many";
  private throws = false;

  constructor(
    private ctx: DemoCtx,
    private t: string,
  ) {}

  /* ---- operations */
  select(cols = "*", opts: { count?: string; head?: boolean } = {}) {
    if (this.op === "select") {
      this.cols = cols;
      this.countMode = opts.count ?? null;
      this.head = Boolean(opts.head);
    } else {
      this.returning = true;
      this.cols = cols;
    }
    return this;
  }
  insert(v: Row | Row[], opts: { count?: string } = {}) {
    this.op = "insert";
    this.payload = Array.isArray(v) ? v : [v];
    this.countMode = opts.count ?? null;
    return this;
  }
  upsert(v: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean; count?: string } = {}) {
    this.op = "upsert";
    this.payload = Array.isArray(v) ? v : [v];
    this.upsertOpts = opts;
    this.countMode = opts.count ?? null;
    return this;
  }
  update(v: Row, opts: { count?: string } = {}) {
    this.op = "update";
    this.patch = v;
    this.countMode = opts.count ?? null;
    return this;
  }
  delete(opts: { count?: string } = {}) {
    this.op = "delete";
    this.countMode = opts.count ?? null;
    return this;
  }

  /* ---- filters */
  private add(p: Pred) {
    this.filters.push(p);
    return this;
  }
  eq(c: string, v: unknown) {
    return this.add(pred(c, "eq", v));
  }
  neq(c: string, v: unknown) {
    return this.add(pred(c, "neq", v));
  }
  gt(c: string, v: unknown) {
    return this.add(pred(c, "gt", v));
  }
  gte(c: string, v: unknown) {
    return this.add(pred(c, "gte", v));
  }
  lt(c: string, v: unknown) {
    return this.add(pred(c, "lt", v));
  }
  lte(c: string, v: unknown) {
    return this.add(pred(c, "lte", v));
  }
  like(c: string, v: string) {
    return this.add(pred(c, "like", v));
  }
  ilike(c: string, v: string) {
    return this.add(pred(c, "ilike", v));
  }
  likeAnyOf(c: string, vs: string[]) {
    return this.add((r) => vs.some((v) => pred(c, "like", v)(r)));
  }
  ilikeAnyOf(c: string, vs: string[]) {
    return this.add((r) => vs.some((v) => pred(c, "ilike", v)(r)));
  }
  is(c: string, v: unknown) {
    return this.add(pred(c, "is", v));
  }
  in(c: string, v: unknown[]) {
    return this.add(pred(c, "in", v));
  }
  contains(c: string, v: unknown) {
    return this.add(pred(c, "cs", v));
  }
  containedBy(c: string, v: unknown) {
    return this.add(pred(c, "cd", v));
  }
  overlaps(c: string, v: unknown) {
    return this.add(pred(c, "ov", v));
  }
  textSearch(c: string, q: string) {
    return this.add(pred(c, "fts", q));
  }
  match(obj: Row) {
    for (const [k, v] of Object.entries(obj)) this.eq(k, v);
    return this;
  }
  not(c: string, op: string, v: unknown) {
    return this.add(negate(c, op, typeof v === "string" ? parseScalar(op, v) : v));
  }
  or(expr: string, opts: { foreignTable?: string; referencedTable?: string } = {}) {
    if (opts.foreignTable || opts.referencedTable) return this;
    return this.add(parseLogic(expr, "or"));
  }
  filter(c: string, op: string, v: unknown) {
    if (op.startsWith("not.")) return this.not(c, op.slice(4), v);
    return this.add(pred(c, op, typeof v === "string" ? parseScalar(op, v) : v));
  }

  /* ---- modifiers */
  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string; referencedTable?: string } = {}) {
    if (opts.foreignTable || opts.referencedTable) return this;
    const asc = opts.ascending ?? true;
    this.orders.push({ col, asc, nullsFirst: opts.nullsFirst ?? !asc });
    return this;
  }
  limit(n: number, opts: { foreignTable?: string; referencedTable?: string } = {}) {
    if (!opts.foreignTable && !opts.referencedTable) this.lim = n;
    return this;
  }
  range(from: number, to: number) {
    this.off = from;
    this.lim = to - from + 1;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  throwOnError() {
    this.throws = true;
    return this;
  }
  returns() {
    return this;
  }
  overrideTypes() {
    return this;
  }
  abortSignal() {
    return this;
  }

  then<A = Result, B = never>(onOk?: ((v: Result) => A | PromiseLike<A>) | null, onErr?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => {
        const res = this.exec();
        if (this.throws && res.error) throw Object.assign(new Error(res.error.message), res.error);
        return res;
      })
      .then(onOk, onErr);
  }

  /* ---- execution */
  private matches(list: Row[]) {
    const vis = visible(this.t, this.ctx);
    if (vis === "none") return [];
    return list.filter((r) => (!vis || vis(r)) && this.filters.every((f) => f(r)));
  }

  private sort(rows: Row[]) {
    if (!this.orders.length) return rows;
    return [...rows].sort((a, b) => {
      for (const o of this.orders) {
        const x = get(a, o.col);
        const y = get(b, o.col);
        if (x == null && y == null) continue;
        if (x == null) return o.nullsFirst ? -1 : 1;
        if (y == null) return o.nullsFirst ? 1 : -1;
        const d = cmp(x, y);
        if (d) return o.asc ? d : -d;
      }
      return 0;
    });
  }

  private shape(rows: Row[], status: number, count: number | null): Result {
    const sels = parseSelect(this.cols);
    const data = rows.map((r) => project(this.t, r, sels)).filter((r): r is Row => r !== null);
    const out = structuredClone(data);
    if (this.mode === "many") return { data: this.head ? null : out, error: null, count, status, statusText: "OK" };
    if (out.length === 1) return { data: out[0], error: null, count, status, statusText: "OK" };
    if (!out.length && this.mode === "maybe") return { data: null, error: null, count, status, statusText: "OK" };
    return {
      data: null,
      error: err("JSON object requested, multiple (or no) rows returned", "PGRST116", `The result contains ${out.length} rows`),
      count,
      status: 406,
      statusText: "Not Acceptable",
    };
  }

  private fail(e: Err, status = 400): Result {
    return { data: null, error: e, count: null, status, statusText: "Bad Request" };
  }

  private exec(): Result {
    const s = store();
    const list = table(this.t);
    const writeDenied = () => this.fail(err(`new row violates row-level security policy for table "${this.t}"`, "42501"), 403);

    if (this.op === "select") {
      const rows = this.matches(list);
      const count = this.countMode ? rows.length : null;
      const sorted = this.sort(rows);
      const sliced = sorted.slice(this.off, this.lim == null ? undefined : this.off + this.lim);
      return this.shape(sliced, 200, count);
    }

    if (this.ctx.kind === "anon" || (this.ctx.kind === "user" && !staffOf(this.ctx))) return writeDenied();

    if (this.op === "insert") {
      const rows: Row[] = [];
      const pending = [...list];
      for (const input of this.payload) {
        const row = withDefaults(s.state, this.t, input);
        const e = checkConstraints(this.t, row, pending);
        if (e) return this.fail(e, 409);
        pending.push(row);
        rows.push(row);
      }
      list.push(...rows);
      for (const r of rows) AFTER_INSERT[this.t]?.(r);
      persist(s);
      return this.returning ? this.shape(rows, 201, this.countMode ? rows.length : null) : { data: null, error: null, count: this.countMode ? rows.length : null, status: 201, statusText: "Created" };
    }

    if (this.op === "upsert") {
      const keys = (this.upsertOpts.onConflict ?? pkOf(this.t)).split(",").map((k) => k.trim());
      const touched: Row[] = [];
      for (const input of this.payload) {
        const existing = keys.every((k) => input[k] != null) ? list.find((r) => keys.every((k) => looseEq(r[k], input[k]))) : undefined;
        if (existing) {
          if (this.upsertOpts.ignoreDuplicates) continue;
          const next = { ...existing };
          for (const [k, v] of Object.entries(input)) if (v !== undefined) next[k] = norm(v);
          if (stampsOf(this.t).includes("updated_at") && !("updated_at" in input)) next.updated_at = now();
          const e = checkConstraints(this.t, next, list, existing);
          if (e) return this.fail(e, 409);
          Object.assign(existing, next);
          touched.push(existing);
        } else {
          const row = withDefaults(s.state, this.t, input);
          const e = checkConstraints(this.t, row, list);
          if (e) return this.fail(e, 409);
          list.push(row);
          touched.push(row);
        }
      }
      persist(s);
      return this.returning ? this.shape(touched, 201, null) : { data: null, error: null, count: null, status: 201, statusText: "Created" };
    }

    if (this.op === "update") {
      const rows = this.matches(list);
      for (const r of rows) {
        const next = { ...r };
        for (const [k, v] of Object.entries(this.patch)) if (v !== undefined) next[k] = norm(v);
        if (stampsOf(this.t).includes("updated_at") && !("updated_at" in this.patch)) next.updated_at = now();
        const e = checkConstraints(this.t, next, list, r);
        if (e) return this.fail(e, 409);
      }
      for (const r of rows) {
        for (const [k, v] of Object.entries(this.patch)) if (v !== undefined) r[k] = structuredClone(norm(v));
        if (stampsOf(this.t).includes("updated_at") && !("updated_at" in this.patch)) r.updated_at = now();
      }
      if (rows.length) persist(s);
      return this.returning ? this.shape(rows, 200, this.countMode ? rows.length : null) : { data: null, error: null, count: this.countMode ? rows.length : null, status: 204, statusText: "No Content" };
    }

    // delete
    const rows = this.matches(list);
    if (rows.length) {
      s.state.tables[this.t] = list.filter((r) => !rows.includes(r));
      cascadeDelete(this.t, rows);
      persist(s);
    }
    return this.returning ? this.shape(rows, 200, this.countMode ? rows.length : null) : { data: null, error: null, count: this.countMode ? rows.length : null, status: 204, statusText: "No Content" };
  }
}

/* ============================================================== auth */

type AuthErr = { message: string; name: string; status: number; code: string };
const authErr = (message: string, status = 400, code = "unexpected_failure"): AuthErr => ({ message, name: "AuthApiError", status, code });

function toUser(u: DemoUser) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.created_at,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: u.user_metadata,
    created_at: u.created_at,
    updated_at: u.created_at,
  };
}

const session = (u: DemoUser) => ({ access_token: `demo-${u.id}`, refresh_token: "demo", token_type: "bearer", expires_in: 604800, expires_at: Math.floor(Date.now() / 1000) + 604800, user: toUser(u) });

const findUser = (id: string | null | undefined) => (id ? store().state.users.find((u) => u.id === id) : undefined);
const findByEmail = (email: string) => store().state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

/** Check a demo login. Returns the user id, or null. */
export function verifyDemoLogin(email: string, password: string) {
  const u = findByEmail(email);
  return u && u.password !== null && u.password === password ? u.id : null;
}

function createUser(attrs: { email?: string; password?: string; user_metadata?: Row; data?: Row }) {
  const s = store();
  const email = (attrs.email ?? "").trim().toLowerCase();
  if (!email) return { data: { user: null }, error: authErr("Email is required", 400, "validation_failed") };
  if (findByEmail(email)) return { data: { user: null }, error: authErr("A user with this email address has already been registered", 422, "email_exists") };
  if (attrs.password !== undefined && attrs.password.length < 6) return { data: { user: null }, error: authErr("Password should be at least 6 characters.", 422, "weak_password") };
  const u: DemoUser = { id: randomUUID(), email, password: attrs.password ?? null, user_metadata: attrs.user_metadata ?? attrs.data ?? {}, created_at: now() };
  s.state.users.push(u);
  // handle_new_user(): first user becomes admin, everyone after is an agent
  const profiles = table("profiles");
  profiles.push(
    withDefaults(s.state, "profiles", {
      id: u.id,
      email,
      full_name: (u.user_metadata.full_name as string) || email.split("@")[0],
      role: profiles.some((p) => p.role === "admin") ? "agent" : "admin",
    }),
  );
  persist(s);
  return { data: { user: toUser(u) }, error: null };
}

function updateUser(u: DemoUser | undefined, attrs: { email?: string; password?: string; user_metadata?: Row; data?: Row }) {
  if (!u) return { data: { user: null }, error: authErr("User not found", 404, "user_not_found") };
  if (attrs.password !== undefined) {
    if (attrs.password.length < 6) return { data: { user: null }, error: authErr("Password should be at least 6 characters.", 422, "weak_password") };
    u.password = attrs.password;
  }
  if (attrs.email) {
    const other = findByEmail(attrs.email);
    if (other && other.id !== u.id) return { data: { user: null }, error: authErr("A user with this email address has already been registered", 422, "email_exists") };
    u.email = attrs.email.trim().toLowerCase();
  }
  const meta = attrs.user_metadata ?? attrs.data;
  if (meta) u.user_metadata = { ...u.user_metadata, ...meta };
  persist(store());
  return { data: { user: toUser(u) }, error: null };
}

function authApi(ctx: DemoCtx) {
  const uid = () => (ctx.kind === "user" ? ctx.uid : null);
  const setSession = (id: string | null) => {
    if (ctx.kind !== "user") return;
    ctx.uid = id;
    ctx.setSession?.(id);
  };
  const missing = () => authErr("Auth session missing!", 400, "session_not_found");
  return {
    async getUser() {
      const u = findUser(uid());
      return u ? { data: { user: toUser(u) }, error: null } : { data: { user: null }, error: { ...missing(), name: "AuthSessionMissingError" } };
    },
    async getSession() {
      const u = findUser(uid());
      return { data: { session: u ? session(u) : null }, error: null };
    },
    async getClaims() {
      const u = findUser(uid());
      return u ? { data: { claims: { sub: u.id, email: u.email, role: "authenticated" } }, error: null } : { data: null, error: missing() };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const id = verifyDemoLogin(email, password);
      const u = findUser(id);
      if (!u) return { data: { user: null, session: null }, error: authErr("Invalid login credentials", 400, "invalid_credentials") };
      setSession(u.id);
      return { data: { user: toUser(u), session: session(u) }, error: null };
    },
    async signOut() {
      setSession(null);
      return { error: null };
    },
    async exchangeCodeForSession() {
      return { data: { user: null, session: null }, error: authErr("Email links aren't available in demo mode.", 400, "bad_code_verifier") };
    },
    async verifyOtp() {
      return { data: { user: null, session: null }, error: authErr("Email links aren't available in demo mode.", 400, "otp_expired") };
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null }; // no email in demo mode
    },
    async updateUser(attrs: { email?: string; password?: string; data?: Row }) {
      return updateUser(findUser(uid()), attrs);
    },
    async refreshSession() {
      const u = findUser(uid());
      return { data: { user: u ? toUser(u) : null, session: u ? session(u) : null }, error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    admin: {
      async createUser(attrs: { email?: string; password?: string; email_confirm?: boolean; user_metadata?: Row }) {
        return createUser(attrs);
      },
      async inviteUserByEmail(email: string, opts: { data?: Row } = {}) {
        return createUser({ email, user_metadata: opts.data });
      },
      async updateUserById(id: string, attrs: { email?: string; password?: string; user_metadata?: Row }) {
        return updateUser(findUser(id), attrs);
      },
      async deleteUser(id: string) {
        const s = store();
        const u = findUser(id);
        if (!u) return { data: { user: null }, error: authErr("User not found", 404, "user_not_found") };
        s.state.users = s.state.users.filter((x) => x.id !== id);
        const gone = table("profiles").filter((p) => p.id === id);
        s.state.tables.profiles = table("profiles").filter((p) => p.id !== id);
        cascadeDelete("profiles", gone);
        persist(s);
        return { data: { user: toUser(u) }, error: null };
      },
      async getUserById(id: string) {
        const u = findUser(id);
        return u ? { data: { user: toUser(u) }, error: null } : { data: { user: null }, error: authErr("User not found", 404, "user_not_found") };
      },
      async listUsers() {
        return { data: { users: store().state.users.map(toUser), aud: "authenticated" }, error: null };
      },
      async signOut() {
        return { data: null, error: null };
      },
      async generateLink() {
        return { data: { properties: null, user: null }, error: authErr("Email links aren't available in demo mode.") };
      },
    },
  };
}

/* ============================================================== storage */

const objKey = (bucket: string, p: string) => `${bucket}/${p.replace(/^\/+/, "")}`;
const safeRel = (p: string) => p.split(/[\\/]+/).filter((seg) => seg && seg !== "." && seg !== "..").join("/");

/** Public URL for a demo-stored object (served by app/api/demo-files). */
export const demoFileUrl = (bucket: string, p: string) => `/api/demo-files/${bucket}/${safeRel(p).split("/").map(encodeURIComponent).join("/")}`;

async function toBuffer(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  if (body && typeof (body as Blob).arrayBuffer === "function") return Buffer.from(await (body as Blob).arrayBuffer());
  return Buffer.from(String(body ?? ""));
}

const MIME: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Save a file into demo storage. */
export async function putDemoObject(bucket: string, p: string, body: unknown, contentType?: string, upsert = false) {
  const s = store();
  const rel = safeRel(p);
  if (!rel) return { error: { message: "Invalid path", statusCode: "400", name: "StorageApiError" } };
  const key = objKey(bucket, rel);
  if (s.state.objects[key] && !upsert) return { error: { message: "The resource already exists", statusCode: "409", name: "StorageApiError" } };
  const buf = await toBuffer(body);
  const type = contentType || (body as Blob)?.type || MIME[rel.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream";
  let saved = false;
  if (s.filesDir) {
    try {
      const target = path.join(s.filesDir, bucket, ...rel.split("/"));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      saved = true;
    } catch {
      /* fall back to memory */
    }
  }
  if (!saved) s.memFiles.set(key, buf);
  s.state.objects[key] = { type, size: buf.length, created_at: now() };
  persist(s);
  return { error: null, path: rel };
}

/** Read a file from demo storage (for the file-serving route). */
export function getDemoObject(bucket: string, p: string): { data: Buffer; type: string } | null {
  const s = store();
  const rel = safeRel(p);
  const key = objKey(bucket, rel);
  const meta = s.state.objects[key];
  const mem = s.memFiles.get(key);
  if (mem) return { data: mem, type: meta?.type ?? "application/octet-stream" };
  if (!s.filesDir) return null;
  try {
    const data = fs.readFileSync(path.join(s.filesDir, bucket, ...rel.split("/")));
    return { data, type: meta?.type ?? MIME[rel.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

export function removeDemoObjects(bucket: string, paths: string[]) {
  const s = store();
  const removed: { name: string }[] = [];
  for (const p of paths) {
    const rel = safeRel(p);
    const key = objKey(bucket, rel);
    if (!s.state.objects[key] && !s.memFiles.has(key)) continue;
    delete s.state.objects[key];
    s.memFiles.delete(key);
    if (s.filesDir) fs.rmSync(path.join(s.filesDir, bucket, ...rel.split("/")), { force: true });
    removed.push({ name: rel });
  }
  persist(s);
  return removed;
}

function storageApi() {
  return {
    from(bucket: string) {
      return {
        async upload(p: string, body: unknown, opts: { contentType?: string; upsert?: boolean } = {}) {
          const r = await putDemoObject(bucket, p, body, opts.contentType, opts.upsert);
          return r.error ? { data: null, error: r.error } : { data: { id: r.path, path: r.path, fullPath: `${bucket}/${r.path}` }, error: null };
        },
        async update(p: string, body: unknown, opts: { contentType?: string } = {}) {
          const r = await putDemoObject(bucket, p, body, opts.contentType, true);
          return r.error ? { data: null, error: r.error } : { data: { id: r.path, path: r.path, fullPath: `${bucket}/${r.path}` }, error: null };
        },
        getPublicUrl(p: string) {
          return { data: { publicUrl: demoFileUrl(bucket, p) } };
        },
        async createSignedUrl(p: string, expiresIn: number) {
          if (!getDemoObject(bucket, p)) return { data: null, error: { message: "Object not found", statusCode: "404", name: "StorageApiError" } };
          return { data: { signedUrl: `${demoFileUrl(bucket, p)}?exp=${Date.now() + expiresIn * 1000}` }, error: null };
        },
        async createSignedUrls(paths: string[], expiresIn: number) {
          return { data: paths.map((p) => ({ path: p, signedUrl: `${demoFileUrl(bucket, p)}?exp=${Date.now() + expiresIn * 1000}`, error: null })), error: null };
        },
        async download(p: string) {
          const f = getDemoObject(bucket, p);
          return f ? { data: new Blob([new Uint8Array(f.data)], { type: f.type }), error: null } : { data: null, error: { message: "Object not found", statusCode: "404", name: "StorageApiError" } };
        },
        async remove(paths: string[]) {
          return { data: removeDemoObjects(bucket, paths), error: null };
        },
        async list(prefix = "", opts: { limit?: number; offset?: number; search?: string } = {}) {
          const base = safeRel(prefix);
          const start = base ? `${bucket}/${base}/` : `${bucket}/`;
          const seen = new Map<string, { name: string; id: string | null; created_at: string | null; metadata: Row | null }>();
          for (const [key, meta] of Object.entries(store().state.objects)) {
            if (!key.startsWith(start)) continue;
            const rest = key.slice(start.length);
            const [name, ...deeper] = rest.split("/");
            if (opts.search && !name.includes(opts.search)) continue;
            if (deeper.length) seen.set(name, { name, id: null, created_at: null, metadata: null });
            else seen.set(name, { name, id: key, created_at: meta.created_at, metadata: { size: meta.size, mimetype: meta.type } });
          }
          const all = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
          const off = opts.offset ?? 0;
          return { data: all.slice(off, off + (opts.limit ?? 100)), error: null };
        },
      };
    },
  };
}

/* ============================================================== client */

/** A supabase-js–shaped client backed by the demo database. */
export function demoClient(ctx: DemoCtx): SupabaseClient {
  const client = {
    from: (t: string) => new Query(ctx, t),
    auth: authApi(ctx),
    storage: storageApi(),
    async rpc(fn: string) {
      return { data: null, error: err(`Function ${fn} is not available in demo mode`, "PGRST202"), count: null, status: 404, statusText: "Not Found" };
    },
    channel() {
      const ch = { on: () => ch, subscribe: () => ch, unsubscribe: async () => "ok" };
      return ch;
    },
    removeChannel: async () => "ok",
  };
  return client as unknown as SupabaseClient;
}

/* ============================================================== remote (browser) queries */

export type RemoteCall = { m: string; a: unknown[] };
const ALLOWED = new Set([
  "select",
  "insert",
  "upsert",
  "update",
  "delete",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "likeAnyOf",
  "ilikeAnyOf",
  "is",
  "in",
  "contains",
  "containedBy",
  "overlaps",
  "textSearch",
  "match",
  "not",
  "or",
  "filter",
  "order",
  "limit",
  "range",
  "single",
  "maybeSingle",
]);

/** Replay a query recorded by the browser shim (lib/demo/browser-client.ts) as the signed-in user. */
export async function runRemoteQuery(ctx: DemoCtx, t: string, calls: RemoteCall[]): Promise<Result> {
  let q: Query = new Query(ctx, t);
  for (const c of calls) {
    if (!ALLOWED.has(c.m)) return { data: null, error: err(`Unsupported call ${c.m}`, "PGRST100"), count: null, status: 400, statusText: "Bad Request" };
    const fn = (q as unknown as Record<string, (...a: unknown[]) => Query>)[c.m];
    q = fn.apply(q, c.a);
  }
  return await q;
}
