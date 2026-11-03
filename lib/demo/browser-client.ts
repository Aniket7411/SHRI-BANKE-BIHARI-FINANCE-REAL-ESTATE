import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side stand-in for supabase-js in demo mode. Table queries are recorded
 * and replayed on the server (`/api/demo/query`) as the signed-in demo user;
 * auth goes through `/api/demo/auth`, storage through `/api/demo-files/*`.
 */

type Call = { m: string; a: unknown[] };
type Res = { data: unknown; error: { message: string; code?: string } | null; count?: number | null };

const fileUrl = (bucket: string, p: string) =>
  `/api/demo-files/${bucket}/${p
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/")}`;

async function post(url: string, body: unknown): Promise<Res> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return (await r.json()) as Res;
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "Network error" } };
  }
}

function recorder(table: string) {
  const calls: Call[] = [];
  const target = {
    then(ok?: (v: Res) => unknown, fail?: (e: unknown) => unknown) {
      return post("/api/demo/query", { table, calls }).then(ok, fail);
    },
  };
  const proxy: unknown = new Proxy(target, {
    get(t, prop) {
      if (prop === "then") return t.then;
      return (...a: unknown[]) => {
        calls.push({ m: String(prop), a });
        return proxy;
      };
    },
  });
  return proxy;
}

const auth = (action: string, payload: Record<string, unknown> = {}) => post("/api/demo/auth", { action, ...payload });

export function demoBrowserClient(): SupabaseClient {
  const client = {
    from: (t: string) => recorder(t),
    auth: {
      signInWithPassword: (c: { email: string; password: string }) => auth("signIn", c),
      signOut: () => auth("signOut"),
      getUser: () => auth("getUser"),
      getSession: () => auth("getSession"),
      updateUser: (attrs: Record<string, unknown>) => auth("updateUser", { attrs }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(p: string, body: Blob, opts: { contentType?: string; upsert?: boolean } = {}) {
            const fd = new FormData();
            fd.set("file", body);
            if (opts.contentType) fd.set("contentType", opts.contentType);
            if (opts.upsert) fd.set("upsert", "1");
            try {
              const r = await fetch(fileUrl(bucket, p), { method: "POST", body: fd });
              const j = (await r.json()) as Res;
              return j.error ? { data: null, error: j.error } : { data: { id: p, path: p, fullPath: `${bucket}/${p}` }, error: null };
            } catch (e) {
              return { data: null, error: { message: e instanceof Error ? e.message : "Upload failed" } };
            }
          },
          getPublicUrl: (p: string) => ({ data: { publicUrl: fileUrl(bucket, p) } }),
          async createSignedUrl(p: string) {
            return { data: { signedUrl: fileUrl(bucket, p) }, error: null };
          },
          async remove(paths: string[]) {
            await Promise.all(paths.map((p) => fetch(fileUrl(bucket, p), { method: "DELETE" }).catch(() => null)));
            return { data: paths.map((name) => ({ name })), error: null };
          },
        };
      },
    },
  };
  return client as unknown as SupabaseClient;
}
