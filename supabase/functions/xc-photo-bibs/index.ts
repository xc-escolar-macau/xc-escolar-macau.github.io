// 比賽相片號碼布辨識（Supabase Edge Function）
// 由 photo-admin.html 在相片上載後呼叫：POST { id }，Authorization 帶工作人員登入後的 JWT
//   1. 以呼叫者身份確認是管理員（xc_is_admin），並讀取該相片紀錄
//   2. 下載 1600px 相片 → Gemini 只回傳號碼布 JSON
//   3. 以呼叫者身份呼叫 xc_photo_judge 寫入結果並判斷是否自動公開
// 不使用 service role 金鑰；Gemini 金鑰只存於 Supabase secrets（GEMINI_API_KEY），不入 repo、不經前端
// Gemini 回應 429（配額用完）時回傳 429 及 retry_after，由上載頁稍後重試
//
// 部署：supabase functions deploy xc-photo-bibs
// 設定：supabase secrets set GEMINI_API_KEY=...（使用者自行設定）；可選 GEMINI_MODEL（預設見下）

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { encodeBase64 } from "jsr:@std/encoding@1.0.5/base64";

const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });

const PROMPT = `This is a photo from a school cross-country race. List every race bib number that is pinned on a runner and clearly readable in the photo.
Rules:
- Bib numbers are whole numbers from 1 to 999.
- Only count bibs worn by runners. Ignore signs, banners, clothing logos, watches and background text.
- If a bib is partly hidden, blurred or you are not sure of every digit, still give your best reading but set "sure" to false.
- Do not invent numbers. If no bib is readable, return an empty list.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    bibs: {
      type: "ARRAY",
      items: { type: "OBJECT", properties: { n: { type: "INTEGER" }, sure: { type: "BOOLEAN" } }, required: ["n", "sure"] },
    },
  },
  required: ["bibs"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "GEMINI_API_KEY 未設定" }, 503);

  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });

  let id = "";
  try { id = String((await req.json()).id || ""); } catch { /* 下面處理 */ }
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "id" }, 400);

  const { data: admin } = await sb.rpc("xc_is_admin");
  if (admin !== true) return json({ error: "not allowed" }, 403);

  const { data: ph, error: e1 } = await sb.from("xc_photos").select("id,full_path,status").eq("id", id).maybeSingle();
  if (e1 || !ph) return json({ error: "photo not found" }, 404);
  if (ph.status === "removed") return json({ status: "removed" });

  const img = await sb.storage.from("xc-photos").download(ph.full_path);
  if (img.error || !img.data) return json({ error: "download" }, 502);
  const bytes = new Uint8Array(await img.data.arrayBuffer());
  const mime = ph.full_path.endsWith(".jpg") ? "image/jpeg" : "image/webp";

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data: encodeBase64(bytes) } }, { text: PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: SCHEMA },
    }),
  });
  if (r.status === 429) {
    // 配額用完：免費層每分鐘／每日次數有限
    let wait = 30;
    try {
      const err = await r.json();
      const info = (err?.error?.details || []).find((d: { retryDelay?: string }) => d.retryDelay);
      if (info) wait = Math.max(5, Math.ceil(parseFloat(info.retryDelay)));
    } catch { /* 用預設 */ }
    return json({ error: "quota", retry_after: wait }, 429, { "Retry-After": String(wait) });
  }
  if (!r.ok) return json({ error: "gemini " + r.status, detail: (await r.text()).slice(0, 300) }, 502);

  const out = await r.json();
  const text: string = out?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  let list: { n: number; sure: boolean }[] = [];
  try { list = JSON.parse(text).bibs || []; } catch { list = []; }
  const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 99999;
  const bibs = [...new Set(list.filter((x) => ok(x.n)).map((x) => x.n))];
  const unsure = [...new Set(list.filter((x) => ok(x.n) && !x.sure).map((x) => x.n))];

  const { data: res, error: e2 } = await sb.rpc("xc_photo_judge", { p_id: id, p_bibs: bibs, p_unsure: unsure, p_raw: text.slice(0, 4000) });
  if (e2) return json({ error: "judge", detail: e2.message }, 500);
  return json({ ...res, model: MODEL });
});
