// 比賽相片檔案（獨立的 Supabase 相片專案，另一個 organization）：上載簽名及刪除
// 相片檔案與計時分開：相片專案即使超出免費額度被限制，計時、即時成績（主專案）都不受影響
//
// 呼叫者用主專案（計時）的登入憑證，放在 x-main-token 標頭；本函式向主專案呼叫 xc_is_admin，
// 是管理員才簽發上載網址（每個 2 小時內有效）或刪除檔案。相片專案本身不設登入帳戶
//
// POST { action: "sign", paths: ["48/<uuid>.webp", "48/<uuid>_t.webp"] } → { urls: [{ path, token }] }
// POST { action: "remove", paths: [...] } → { removed: n }
//
// 部署：verify_jwt = false（憑證屬於主專案，由本函式自行核對）
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MAIN_URL = "https://yilgegtaaxvltjdiguev.supabase.co";
const MAIN_KEY = "sb_publishable_4wBHti1Nh-LJxt6drZsjtQ_t6ICvJ9D";   // 主專案公開金鑰（與 docs/data/site.json 相同）
const BUCKET = "xc-photos";
const PATH = /^[a-z0-9_-]{1,20}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_t)?\.(webp|jpg)$/;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-main-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function serviceKey(): string {
  const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  const all = Deno.env.get("SUPABASE_SECRET_KEYS");   // 新式金鑰：{ "default": "sb_secret_..." }
  if (all) { try { const o = JSON.parse(all); return o.default || Object.values(o)[0] as string; } catch { /* 格式不符 */ } }
  throw new Error("no service key");
}

async function isAdmin(token: string): Promise<boolean> {
  const r = await fetch(`${MAIN_URL}/rest/v1/rpc/xc_is_admin`, {
    method: "POST",
    headers: { apikey: MAIN_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  return r.ok && (await r.json()) === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const token = req.headers.get("x-main-token") || "";
  if (!token) return json({ error: "login" }, 401);
  let body: { action?: string; paths?: unknown };
  try { body = await req.json(); } catch { return json({ error: "body" }, 400); }
  const paths = Array.isArray(body.paths) ? body.paths : [];
  if (!paths.length || paths.length > 20 || !paths.every((p) => typeof p === "string" && PATH.test(p))) return json({ error: "paths" }, 400);
  if (!(await isAdmin(token).catch(() => false))) return json({ error: "not allowed" }, 403);

  const st = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), { auth: { persistSession: false } }).storage.from(BUCKET);
  if (body.action === "sign") {
    const urls = [];
    for (const p of paths as string[]) {
      const { data, error } = await st.createSignedUploadUrl(p, { upsert: true });
      if (error || !data) return json({ error: error?.message || "sign" }, 502);
      urls.push({ path: p, token: data.token });
    }
    return json({ urls });
  }
  if (body.action === "remove") {
    const { data, error } = await st.remove(paths as string[]);
    if (error) return json({ error: error.message }, 502);
    return json({ removed: (data || []).length });
  }
  return json({ error: "action" }, 400);
});
