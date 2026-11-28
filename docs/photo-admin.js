/* 相片上載（工作人員用）：手機揀相上載；預設人手標號碼布（免費方案，賽後標），site.json 設 photo_ai: true 才改用 Gemini 辨識
   - site.json 設 photo_auto: true（2026-11-28 起）：電腦掃描到清楚的三位數號碼，經名單及拍攝時段核對後自動公開，不用逐張批准
   - 登入：與終點輸入同一套帳戶（xc_live_admins）
   - 揀相片 → 手機內壓縮成長邊 1280px 大圖＋400px 縮圖（重新編碼，位置等 EXIF 資料不會上載）；先讀出拍攝時間另存
   - 大批相片先在電腦用 scripts/photo_prep.py 壓縮（多核心）：大圖照原檔上載、只移除 EXIF，不壓縮第二次
   - photo_prep.py 亦在本機掃描號碼布（ocr=）：人手標時預先填入名單內、拍攝時段在跑道上的號碼；不肯定的列作「可能」；仍須工作人員確認才公開
   - 相片檔案放獨立的相片專案（site.json photos；另一個 Supabase organization，超額亦不影響計時）：
     上載前由 Edge Function xc-photo-store 核對管理員身分並簽發上載網址；移除亦經該函式
   - 壓縮後的檔案存於本機 IndexedDB 佇列：斷網、重新整理頁面都不會遺失，恢復後自動續傳
   - 每張：上載兩個檔 → 寫入 xc_photos → 呼叫 Edge Function xc-photo-bibs 辨識並判斷是否自動公開
   - Gemini 配額用完（429）時按建議時間稍後重試
   - 待覆核：輸入／改正號碼布後「批准公開」（自動跳到下一張）；或「移除」（刪除檔案；免費方案的 CDN 不會即時清除快取，所以快取只設 1 小時，網址最遲 1 小時內失效）
   - 人手標提示（xc_photo_hints）：拍攝時間前後 20 秒經過終點的號碼布（一按加入）、當時在跑道上的組別、
     已輸入號碼布該時段是否在跑道上 */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get(k, fb) { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無痕模式 */ } } };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));
  const catLabel = (c) => `${c[0] === "M" ? "男" : "女"}${c[1]}`;
  const BUCKET = "xc-photos", FULL = 1280, THUMB = 400, PARALLEL = 2, OCR_SURE = 80;

  let sb = null, PH = null, SITE = null, SCHOOL = new Map(), ROSTER = new Map(), ROSTER_HEATS = new Map();
  const st = Object.assign({ event: "48", tab: "pending" }, store.get("xc-photo-state", {}));
  const save = () => store.set("xc-photo-state", st);
  const photos = new Map(); // 伺服器上的相片紀錄（本 event）
  let rev = 0, online = true, quotaUntil = 0, noKey = false;
  const AI = () => !!(SITE && SITE.photo_ai);   // false＝人手標（預設）
  const AUTO = () => !AI() && !!(SITE && SITE.photo_auto);   // true＝電腦掃描到清楚的三位數號碼即自動公開
  const isSure = ([b, c]) => c >= OCR_SURE && b >= 100;

  /* ---------- 本機佇列（IndexedDB） ---------- */
  const IDB = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((ok, bad) => {
      const r = indexedDB.open("xc-photo-queue", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("items", { keyPath: "id" });
      r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error);
    }));
    const tx = async (mode, fn) => { const db = await open(); return new Promise((ok, bad) => { const t = db.transaction("items", mode); const s = t.objectStore("items"); const r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => bad(t.error); }); };
    return { all: () => tx("readonly", (s) => s.getAll()), put: (x) => tx("readwrite", (s) => s.put(x)), del: (id) => tx("readwrite", (s) => s.delete(id)) };
  })();
  let queue = []; // 佇列項目（記憶體副本）

  /* ---------- 拍攝時間：讀 JPEG EXIF 的 DateTimeOriginal（及 SubSecTimeOriginal、OffsetTimeOriginal；沒有時區即按澳門時間）
     回傳 { ms, cam }：cam 為相機型號（Make＋Model），用來按相機分別校正時間 ---------- */
  async function exifInfo(file) {
    try {
      const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
      if (fourcc(buf, 0) === "RIFF" && fourcc(buf, 8) === "WEBP") return webpExif(new DataView(await file.arrayBuffer()));
      if (buf.getUint16(0) !== 0xFFD8) return null;
      let p = 2;
      while (p + 4 < buf.byteLength) {
        const marker = buf.getUint16(p), len = buf.getUint16(p + 2);
        if (marker === 0xFFE1 && buf.getUint32(p + 4) === 0x45786966) return readTiff(buf, p + 10);
        if ((marker & 0xFF00) !== 0xFF00 || marker === 0xFFDA) return null;
        p += 2 + len;
      }
    } catch (e) { /* 讀不到 */ }
    return null;
  }
  /* ---------- 電腦預先壓縮的相片（scripts/photo_prep.py）：WebP，EXIF 在檔案尾段的 EXIF chunk ---------- */
  const fourcc = (v, o) => o + 4 <= v.byteLength ? String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3)) : "";
  function webpChunks(v) {
    const out = [];
    for (let p = 12; p + 8 <= v.byteLength;) {
      const n = v.getUint32(p + 4, true), end = p + 8 + n + (n & 1);
      if (end > v.byteLength + 1) return null;   // 檔案不完整
      out.push({ id: fourcc(v, p), at: p, data: p + 8, n, end: Math.min(end, v.byteLength) });
      p = end;
    }
    return out;
  }
  function webpExif(v) {
    const c = (webpChunks(v) || []).find((x) => x.id === "EXIF");
    if (!c) return null;
    const t = fourcc(v, c.data) === "Exif" ? c.data + 6 : c.data;   // 有些程式在前面加 "Exif\0\0"
    return readTiff(v, t);
  }
  // 移除 EXIF／XMP（不重新編碼，畫質不變）：公開的相片不帶拍攝時間、相機型號等資料
  async function webpStrip(file) {
    const ab = await file.arrayBuffer(), v = new DataView(ab), u8 = new Uint8Array(ab);
    const chunks = webpChunks(v);
    if (!chunks) return null;
    const keep = chunks.filter((x) => x.id !== "EXIF" && x.id !== "XMP ").map((x) => u8.slice(x.at, x.end));
    for (const k of keep) if (String.fromCharCode(...k.slice(0, 4)) === "VP8X") k[8] &= ~0x0C;   // 清除 EXIF、XMP 旗標
    const len = 4 + keep.reduce((s, k) => s + k.length, 0);
    const head = new Uint8Array(12); head.set([82, 73, 70, 70]); new DataView(head.buffer).setUint32(4, len, true); head.set([87, 69, 66, 80], 8);
    return new Blob([head, ...keep], { type: "image/webp" });
  }
  function readTiff(v, t) {
    const le = v.getUint16(t) === 0x4949;
    const u16 = (o) => v.getUint16(t + o, le), u32 = (o) => v.getUint32(t + o, le);
    const str = (o, n) => { let s = ""; for (let i = 0; i < n; i++) { const c = v.getUint8(t + o + i); if (!c) break; s += String.fromCharCode(c); } return s; };
    const ifd = (o) => { const out = {}; const n = u16(o); for (let i = 0; i < n; i++) { const e = o + 2 + i * 12; const tag = u16(e), cnt = u32(e + 4); out[tag] = { cnt, val: cnt > 4 ? u32(e + 8) : e + 8, raw: u32(e + 8) }; } return out; };
    const ifd0 = ifd(u32(4));
    const tag = (o, k) => (o[k] ? str(o[k].val, o[k].cnt).trim() : "");
    const make = tag(ifd0, 0x010F), model = tag(ifd0, 0x0110);
    const base = (model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`).trim().slice(0, 60);
    // photo_prep.py 的標記：原檔大小；ocr=號碼:信心,…＝電腦掃描號碼布的結果（沒有 ocr＝沒有掃描）
    const desc = tag(ifd0, 0x010E), pm = desc.match(/^xc-prep v\d+ src=(\d+)/), om = desc.match(/ ocr=([\d:,]*)/);
    const ocr = om ? om[1].split(",").map((x) => x.split(":").map(Number)).filter(([b, c]) => b >= 1 && b <= 99999 && c >= 0) : null;
    const prep = pm ? { src: Number(pm[1]), ocr } : null;
    if (!ifd0[0x8769]) return null;
    const ex = ifd(ifd0[0x8769].raw);
    // 機身序號（BodySerialNumber）：同型號的兩部相機各自校正時間；只取尾 6 位
    const sn = tag(ex, 0xA431).replace(/[^A-Za-z0-9]/g, "").slice(-6);
    const cam = base && sn ? `${base} #${sn}` : base;
    const d = ex[0x9003] || ex[0x9004];
    if (!d) return null;
    const m = str(d.val, d.cnt).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    const off = ex[0x9011] ? str(ex[0x9011].val, ex[0x9011].cnt) : "";
    const tz = /^[+-]\d{2}:\d{2}$/.test(off) ? off : "+08:00";
    const sub = (tag(ex, 0x9291).match(/^\d{1,3}/) || [""])[0].padEnd(3, "0");
    const ms = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${sub}${tz}`);
    return Number.isFinite(ms) ? { ms, cam, prep } : null;
  }

  /* ---------- 相機時間校正：每部相機一個誤差（秒，正數＝相機快），只套用於該相機相片的 EXIF 時間
     相機名稱＝牌子＋型號（有機身序號時加「 #序號尾 6 位」）；校正值存資料庫 xc_photo_clock，所有上載裝置共用
     舊的校正只有型號（沒有序號）：序號相機找不到自己的校正時，沿用同型號的校正 ---------- */
  const CAM_NONE = "（未知型號）";
  const camName = (cam) => cam || CAM_NONE;
  const clockKey = (cam) => {
    const c = st.clock || {}, name = camName(cam);
    if (name in c) return name;
    const model = name.replace(/ #[A-Za-z0-9]+$/, "");
    return model !== name && model in c ? model : name;
  };
  const clockOff = (cam) => (st.clock && Number(st.clock[clockKey(cam)])) || 0;
  const fmtOff = (s) => s === 0 ? "準確" : `${s > 0 ? "快" : "慢"} ${Math.floor(Math.abs(s) / 60) ? `${Math.floor(Math.abs(s) / 60)} 分 ` : ""}${Math.abs(s) % 60} 秒`;

  /* ---------- 略過已上載：同一張相片（拍攝時間＋檔案大小＋檔名）不會上載兩次 ---------- */
  // 預先壓縮的相片用原檔大小及原檔名（不計副檔名）：同一張相經電腦壓縮或直接揀原相上載，都當作同一張
  // 一定要比對檔名：部分相機（例如 Sony ILCE-7M3）不記秒以下時間、JPEG 大小按 32KB 取整，同一秒連拍的時間及大小完全相同
  const stem = (name) => String(name).replace(/\.[^.]*$/, "").toLowerCase().slice(0, 120);
  const srcKey = (f, ex) => ex ? `x${ex.ms}|${ex.prep ? ex.prep.src : f.size}|${stem(f.name)}` : `f${f.name}|${f.size}|${f.lastModified || 0}`;
  const seenAll = store.get("xc-photo-seen", {});
  const seenSet = (ev) => new Set(seenAll[ev] || []);
  function markSeen(ev, keys) {
    if (!keys.length) return;
    seenAll[ev] = [...(seenAll[ev] || []), ...keys].slice(-5000);
    store.set("xc-photo-seen", seenAll);
  }
  function alreadyHave(ev, key, local) {
    if (local.has(key)) return true;
    if (queue.some((q) => q.event === ev && q.src_key === key)) return true;
    for (const p of photos.values()) if (p.src_key === key) return true;   // 其他裝置上載過的亦略過
    return false;
  }

  /* ---------- 壓縮：Safari 不支援輸出 WebP 時改用 JPEG ---------- */
  async function shrink(bmp, max) {
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(bmp, 0, 0, w, h);
    const blob = (type, q) => new Promise((ok) => c.toBlob(ok, type, q));
    let b = await blob("image/webp", 0.82);
    if (!b || b.type !== "image/webp") b = await blob("image/jpeg", 0.85);
    return { blob: b, w, h, ext: b.type === "image/webp" ? "webp" : "jpg" };
  }
  async function prepare(files) {
    const list = [...files].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|heic|heif|png|webp)$/i.test(f.name));
    const el = $("#prep"), ev = st.event, local = seenSet(ev);
    let done = 0, bad = 0, skip = 0, future = 0, added = 0;
    el.hidden = false;
    for (const f of list) {
      el.textContent = `壓縮中 ${done + 1}／${list.length}……`;
      try {
        const exif = await exifInfo(f);
        const key = srcKey(f, exif);
        if (alreadyHave(ev, key, local)) { skip++; done++; continue; }
        const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
        // 電腦已壓縮（photo_prep.py）且不大於 FULL（1280px）：大圖照原檔上載（只移除 EXIF），不再壓縮第二次；縮圖照常在此產生
        const pre = exif && exif.prep && Math.max(bmp.width, bmp.height) <= FULL ? await webpStrip(f) : null;
        const full = pre ? { blob: pre, w: bmp.width, h: bmp.height, ext: "webp" } : await shrink(bmp, FULL);
        const thumb = await shrink(bmp, THUMB);
        if (bmp.close) bmp.close();
        const off = exif ? clockOff(exif.cam) : 0;
        const taken = exif ? exif.ms - off * 1000 : (f.lastModified || null);
        if (exif && taken > Date.now() + 5 * 60000) future++;
        const id = uuid();
        const item = {
          id, event: ev, name: f.name, full: full.blob, thumb: thumb.blob, ext: full.ext, text: thumb.ext, w: full.w, h: full.h,
          taken_ms: taken, taken_src: exif ? "exif" : f.lastModified ? "file" : "upload",
          camera: exif ? exif.cam || null : null, clock_off_s: off || null, src_key: key, ocr: (exif && exif.prep && exif.prep.ocr) || null,
          stage: "ready", tries: 0, next_at: 0, err: "", added: Date.now(),
        };
        await IDB.put(item); queue.push(item);
        local.add(key); markSeen(ev, [key]); added++;
      } catch (e) { bad++; console.warn(f.name, e); }
      done++;
      renderAll();
    }
    const parts = [`已加入 ${added} 張`];
    if (skip) parts.push(`略過 ${skip} 張（之前已上載）`);
    if (bad) parts.push(`${bad} 張未能讀取（格式不支援）`);
    if (future) parts.push(`${future} 張拍攝時間比現在遲，相機時間可能不準，請按「相機時間」校正`);
    el.textContent = parts.join("；") + (added ? "，正在上載" : "");
    setTimeout(() => { el.hidden = true; }, future ? 12000 : 5000);
    $("#files").value = "";
    work();
  }

  /* ---------- 上載及辨識 ---------- */
  const paths = (q) => ({ full: `${q.event}/${q.id}.${q.ext}`, thumb: `${q.event}/${q.id}_t.${q.text}` });
  const busy = new Set();
  function work() {
    const now = Date.now();
    for (const q of queue) {
      if (busy.size >= PARALLEL) break;
      if (busy.has(q.id) || q.next_at > now) continue;
      if (q.stage === "row" && quotaUntil > now) continue;
      busy.add(q.id);
      step(q).finally(() => { busy.delete(q.id); renderAll(); work(); });
    }
    setSync();
  }
  async function step(q) {
    const p = paths(q);
    try {
      if (q.stage === "ready") {
        const files = [[p.full, q.full], [p.thumb, q.thumb]];
        if (PH) {   // 相片專案：先由 xc-photo-store 簽發上載網址，再直接上載
          const { urls } = await photoStore("sign", files.map(([path]) => path));
          // 直接 PUT 到簽名網址：新式公開金鑰只放 apikey 標頭（舊版 supabase-js 會同時放 Authorization，被拒）
          for (const [path, blob] of files) {
            const u = urls.find((x) => x.path === path);
            const res = await fetch(`${PH.url}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${encodeURIComponent(u.token)}`, {
              method: "PUT", body: blob,
              headers: { apikey: PH.key, "Content-Type": blob.type, "x-upsert": "true", "cache-control": "max-age=3600" },   // 快取 1 小時：移除後網址最遲 1 小時內失效（免費方案不能清除 CDN 快取）
            });
            if (!res.ok) throw new Error(`相片上載失敗（${res.status}）`);
          }
        } else {
          for (const [path, blob] of files) {
            const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true, cacheControl: "3600" });
            if (error) throw error;
          }
        }
        q.stage = "uploaded"; q.err = ""; await IDB.put(q);
      }
      if (q.stage === "uploaded") {
        const row = { id: q.id, event: q.event, full_path: p.full, thumb_path: p.thumb, w: q.w, h: q.h, taken_ms: q.taken_ms, taken_src: q.taken_src,
          camera: q.camera || null, clock_off_s: q.clock_off_s || null, src_key: q.src_key || null };
        if (!AI()) Object.assign(row, { status: "pending", reason: "未標號碼布" });
        // 電腦掃描號碼布（photo_prep.py）：先作建議寫入；是否公開由工作人員確認，或由下一步自動公開（photo_auto）
        // ai_bibs（預先填入）＝信心 ≥ OCR_SURE 且三位數；其餘（含 1–2 位數）放 ai_unsure（列作「可能」）。
        // 第 47 屆官方相簿實測：錯誤讀數多是 1–2 位數（被遮住一半的號碼布「612→61」、頒獎台名次、橫額年份碎片），
        // 用此規則後比賽中相片預先填入的號碼沒有錯誤
        if (!AI() && q.ocr) {
          const asc = (a) => [...new Set(a)].sort((x, y) => x - y);
          Object.assign(row, { ai_bibs: asc(q.ocr.filter(isSure).map(([b]) => b)), ai_unsure: asc(q.ocr.filter((x) => !isSure(x)).map(([b]) => b)) });
        }
        const { error } = await sb.from("xc_photos").upsert(row, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw error;
        q.stage = "row"; q.err = ""; await IDB.put(q);
      }
      if (q.stage === "row") {
        const r = AI() ? await recognise(q.id) : {};
        if (AUTO()) await autoPublish(q);   // 失敗（斷網等）會留在佇列重試
        if (r.wait) { q.next_at = Date.now() + r.wait * 1000; q.err = r.msg; await IDB.put(q); return; }
        await IDB.del(q.id);
        queue = queue.filter((x) => x.id !== q.id);
        pull();
      }
      online = true;
    } catch (e) {
      console.warn(e);
      online = navigator.onLine !== false && !/fetch|network/i.test(String(e && e.message));
      q.tries++; q.next_at = Date.now() + Math.min(60, 3 * 2 ** Math.min(q.tries, 5)) * 1000;
      q.err = online ? `上載失敗，稍後重試（${q.tries}）` : "離線，恢復網絡後自動續傳";
      await IDB.put(q).catch(() => {});
    }
  }
  // 自動公開：清楚的三位數號碼，而且在名單內；正式資料另要相機拍攝時間、該組當時在跑道上（演練用舊相片，不核對時段）
  // 只公開通過核對的號碼；一個也沒有則留在待覆核。已人手覆核或已公開的紀錄不會被覆蓋
  async function autoPublish(q) {
    const sure = [...new Set((q.ocr || []).filter(isSure).map(([b]) => b))].sort((a, b) => a - b);
    if (!sure.length) return;
    const { data, error } = await sb.rpc("xc_photo_hints", { p_id: q.id, p_bibs: sure });
    if (error || !data) throw error || new Error("未能核對號碼布");
    const timed = q.event !== "test";
    const ok = !timed || q.taken_src === "exif"
      ? (data.check || []).filter((c) => c.in_roster && (!timed || c.on_course === true)).map((c) => c.bib) : [];
    const patch = ok.length ? { bibs: ok, status: "approved", reason: null }
      : { reason: timed && q.taken_src !== "exif" ? "沒有相機拍攝時間" : timed ? "號碼不在名單或拍攝時段不符" : "號碼不在名單" };
    const { error: e2 } = await sb.from("xc_photos").update(patch).eq("id", q.id).eq("status", "pending").eq("reviewed", false);
    if (e2) throw e2;
  }
  // 呼叫 Edge Function；回傳 { wait, msg } 表示稍後再試
  async function recognise(id) {
    const { data, error } = await sb.functions.invoke("xc-photo-bibs", { body: { id } });
    if (!error) { noKey = false; if (data && data.status) mergePhoto({ id, status: data.status, bibs: data.bibs || [], reason: data.reason || null }); return {}; }
    const res = error.context;
    const code = res && res.status;
    let body = {};
    try { body = res && res.json ? await res.json() : {}; } catch (e) { /* 非 JSON */ }
    if (code === 429) { const s = body.retry_after || 30; quotaUntil = Date.now() + s * 1000; return { wait: s, msg: `Gemini 配額已滿，${s} 秒後重試` }; }
    if (code === 503) { noKey = true; return { wait: 60, msg: "Gemini 金鑰未設定，相片已上載，設定後自動辨識" }; }
    throw new Error(body.error || error.message || "辨識失敗");
  }

  /* ---------- 伺服器紀錄 ---------- */
  function mergePhoto(r) { if (photos.has(r.id)) photos.set(r.id, { ...photos.get(r.id), ...r }); }  // 只更新已載入的紀錄；新紀錄由 pull 取得完整資料
  // Supabase（PostgREST）每次最多回傳 1000 行：相片紀錄、名單都分批讀完
  const PAGE = 1000;
  let pulling = false;
  async function pull(full) {
    if (pulling && !full) return;
    pulling = true;
    try {
      if (full) { rev = 0; photos.clear(); }
      const ev = st.event;
      let got = 0;
      for (;;) {
        const { data, error } = await sb.from("xc_photos").select("id,event,full_path,thumb_path,w,h,taken_ms,taken_src,camera,clock_off_s,src_key,ai_bibs,ai_unsure,bibs,status,reason,reviewed,created_at,rev")
          .eq("event", ev).gt("rev", rev).order("rev").limit(PAGE);
        if (ev !== st.event) return;   // 讀取途中轉了資料（正式／演練）
        if (error) { online = false; setSync(); return; }
        online = true;
        for (const r of data) { photos.set(r.id, r); rev = Math.max(rev, r.rev); }
        got += data.length;
        if (data.length < PAGE) break;
      }
      if (got || full) renderAll(); else setSync();
    } finally { pulling = false; }
  }
  async function loadRoster() {
    ROSTER.clear(); ROSTER_HEATS.clear();
    for (let i = 0; ; i += PAGE) {
      const { data, error } = await sb.from("xc_live_roster").select("bib,cat,heat,abbr,name").eq("event", st.event).order("bib").range(i, i + PAGE - 1);
      if (error) break;
      for (const r of data) { ROSTER.set(r.bib, r); ROSTER_HEATS.set(r.cat, Math.max(ROSTER_HEATS.get(r.cat) || 1, r.heat || 1)); }
      if (data.length < PAGE) break;
    }
  }
  const pubUrl = (path) => `${(PH || SITE.views).url}/storage/v1/object/public/${BUCKET}/${path}`;
  // 相片專案的 Edge Function：上載簽名／刪除；以主專案登入憑證證明是管理員
  async function photoStore(action, list) {
    const { data } = await sb.auth.getSession();
    const token = data && data.session && data.session.access_token;
    if (!token) throw new Error("請重新登入");
    const res = await fetch(`${PH.url}/functions/v1/xc-photo-store`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: PH.key, "x-main-token": token },
      body: JSON.stringify({ action, paths: list }),
    });
    let body = {};
    try { body = await res.json(); } catch (e) { /* 非 JSON */ }
    if (!res.ok) throw new Error(res.status === 403 ? "此帳戶未獲授權上載相片" : body.error || `相片儲存失敗（${res.status}）`);
    return body;
  }
  const who = (bib) => {
    const r = ROSTER.get(bib);
    if (!r) return `<span class="who-bad">${bib} 不在名單</span>`;
    return `<span><b class="num">${bib}</b> ${esc(r.name || "（隱藏）")} <small>${esc(catLabel(r.cat))}${r.heat ? ` C${r.heat}` : ""} · ${esc(SCHOOL.get(r.abbr) || r.abbr)}</small></span>`;
  };
  const hhmm = (ms) => ms ? new Date(ms).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Macau" }) : "-";
  const srcLabels = { exif: "", file: "（檔案時間）", upload: "（上載時間）" };
  const when = (p) => `${hhmm(p.taken_ms)}${srcLabels[p.taken_src] || ""}${p.clock_off_s ? "（已校正）" : ""}`;

  /* ---------- 畫面 ---------- */
  const byTimeAsc = (a, b) => (a.taken_ms || 0) - (b.taken_ms || 0) || String(a.id).localeCompare(String(b.id));
  const byTimeDesc = (a, b) => byTimeAsc(b, a);
  const pendingList = () => [...photos.values()].filter((p) => p.status === "pending" || p.status === "uploaded").sort(byTimeAsc);
  function setSync() {
    const el = $("#sync"), n = queue.length;
    el.textContent = !online ? `離線 · 待上載 ${n}` : n ? `上載中 ${n}` : `已同步 · 名單 ${ROSTER.size}`;
    el.className = "sync " + (!online ? "bad" : n ? "busy" : "ok");
    const msg = $("#queueMsg");
    const waitQ = quotaUntil > Date.now();
    msg.hidden = !AI() || !(waitQ || noKey);
    msg.textContent = noKey ? "Gemini 金鑰未設定：相片照樣上載，設定後自動辨識。" : waitQ ? `Gemini 配額已滿，約 ${Math.ceil((quotaUntil - Date.now()) / 1000)} 秒後繼續辨識（免費層每分鐘次數有限）。` : "";
  }
  // 格內只畫頭 SHOW 張（相片多時整格重畫會令手機卡住）；「顯示更多」每次加 SHOW 張
  const SHOW = 60;
  let shown = SHOW;
  const moreBtn = (total) => total > shown ? `<button type="button" class="ghost more-btn" id="moreBtn">顯示更多（尚有 ${total - shown} 張）</button>` : "";
  function renderAll() {
    const list = [...photos.values()].filter((p) => p.status !== "removed");
    const pend = list.filter((p) => p.status === "pending" || p.status === "uploaded");
    const appr = list.filter((p) => p.status === "approved");
    $("#nQueue").textContent = queue.length; $("#nPending").textContent = pend.length; $("#nApproved").textContent = appr.length;
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === st.tab));
    const g = $("#grid"), note = $("#tabNote");
    if (st.tab === "queue") {
      const qs = queue.filter((q) => q.event === st.event);
      note.textContent = qs.length ? "壓縮後的相片暫存在本機，上載及辨識完成後自動清走。" : "本機沒有待上載的相片。";
      g.innerHTML = qs.slice(0, shown).map((q) => `<div class="card q"><img alt="" src="${q.thumbUrl || (q.thumbUrl = URL.createObjectURL(q.thumb))}"><div class="meta"><b>${esc({ ready: "等候上載", uploaded: "已上載檔案", row: AI() ? "辨識中" : "寫入紀錄" }[q.stage] || q.stage)}</b><small>${esc(q.err || "")}</small><small>${when(q)}</small></div></div>`).join("") + moreBtn(qs.length);
      setSync(); return;
    }
    const show = st.tab === "approved" ? appr.sort(byTimeDesc) : pend.sort(byTimeAsc);
    note.textContent = st.tab === "approved" ? (AUTO() ? "已公開：運動員可用號碼布＋姓名查到。部分由電腦自動公開，發現錯誤可按相片更正或移除（已覆核者標 ✓）。" : "已公開：運動員可用號碼布＋姓名查到。賽後請逐張再看一次（已覆核者標 ✓）。")
      : AI() ? "待覆核：未公開。改正號碼布後按「批准公開」，或移除。"
      : AUTO() ? "清楚的三位數號碼會自動公開；這裡是未公開的相片，有需要才逐張輸入號碼布後「批准公開」。"
      : "待標號碼布：按拍攝時間排列。逐張輸入相中號碼布後「批准公開」，會自動跳到下一張。";
    g.innerHTML = show.length ? show.slice(0, shown).map((p) => `<button class="card" type="button" data-id="${esc(p.id)}">
        <img alt="" loading="lazy" src="${esc(pubUrl(p.thumb_path))}">
        <div class="meta">
          <b>${!AI() && !(p.bibs && p.bibs.length) && (p.ai_bibs || []).length ? "建議 " : ""}${(p.bibs && p.bibs.length ? p.bibs : p.ai_bibs || []).map((n) => esc(n)).join("、") || (AI() ? "讀不到號碼布" : "未標號碼布")}${p.reviewed ? ' <i class="rv">✓</i>' : ""}</b>
          ${p.status === "uploaded" ? (AI() ? "<small>辨識中……</small>" : "") : p.reason && p.reason !== "未標號碼布" ? `<small class="why">${esc(p.reason)}</small>` : ""}
          <small>${when(p)}</small>
        </div></button>`).join("") + moreBtn(show.length) : `<p class="muted empty">${st.tab === "approved" ? "未有已公開的相片。" : "沒有待覆核的相片。"}</p>`;
    setSync();
  }

  /* ---------- 覆核一張 ---------- */
  const parseBibs = (s) => [...new Set(String(s).split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n >= 1 && n <= 99999))].sort((a, b) => a - b);
  function openSheet(id) {
    const p = photos.get(id); if (!p) return;
    const f = $("#sheetBody");
    // 人手標＋電腦掃描建議（photo_prep.py）：只預先填入名單內的號碼；不在名單的剔除；不肯定的列作「可能」按一下加入；
    // 提示載入後，拍攝時段不在跑道上的建議亦自動剔除（未改動輸入前）
    const sugg = !AI() && !(p.bibs && p.bibs.length) && ((p.ai_bibs || []).length || (p.ai_unsure || []).length) ? {
      unsure: (p.ai_unsure || []).filter((n) => ROSTER.has(n) && !(p.ai_bibs || []).includes(n)),
      out: [...(p.ai_bibs || []), ...(p.ai_unsure || [])].filter((n) => !ROSTER.has(n)).map((n) => `${n}（不在名單）`),
    } : null;
    let touched = false, firstHints = true, hintsReady = false;
    const start = p.bibs && p.bibs.length ? p.bibs : sugg ? (p.ai_bibs || []).filter((n) => ROSTER.has(n)) : p.ai_bibs || [];
    f.innerHTML = `<h2>覆核相片</h2>
      <div class="big-wrap" id="bigWrap" title="按相片放大／縮小"><img class="big" alt="相片（按一下放大，看清號碼布）" src="${esc(pubUrl(p.full_path))}"></div>
      <p class="muted">按相片放大（可拖動）· 拍攝 ${when(p)}${p.camera ? ` · ${esc(p.camera)}` : ""}${p.clock_off_s ? `（相機${esc(fmtOff(p.clock_off_s))}）` : ""}${AI() ? ` · AI 讀出：${(p.ai_bibs || []).join("、") || "無"}${(p.ai_unsure || []).length ? `（不確定：${p.ai_unsure.join("、")}）` : ""}` : ""}</p>
      ${p.reason && p.reason !== "未標號碼布" ? `<p class="why">${esc(p.reason)}</p>` : ""}
      <div id="hints" class="hints" aria-live="polite"></div>
      <label>相中號碼布（以空格或逗號分隔；按 Enter＝批准公開）<input id="bibsIn" inputmode="numeric" autocomplete="off" value="${esc(start.join(" "))}"></label>
      <div id="whoList" class="who-list"></div>
      <div class="sheet-btns">
        <button type="button" class="primary" id="approve">批准公開</button>
        <button type="button" class="ghost" id="keep">留待覆核</button>
        ${AI() ? '<button type="button" class="ghost" id="again">重新辨識</button>' : ""}
        <button type="button" class="danger" id="remove">移除</button>
        <button type="submit" class="ghost">關閉</button>
      </div>
      <p id="sheetMsg" class="msg" role="alert"></p>`;
    // 放大：真實比賽相片的號碼布很小（1280px 相片約 30px），手機上要放大三倍才看得清；以按下位置為中心
    $("#bigWrap").onclick = (e) => {
      const wrap = $("#bigWrap"), img = wrap.querySelector("img"), r = img.getBoundingClientRect();
      const clamp = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5);
      const fx = clamp((e.clientX - r.left) / r.width), fy = clamp((e.clientY - r.top) / r.height);
      if (!wrap.classList.toggle("z")) return;
      const center = () => {
        if (!wrap.classList.contains("z")) return;
        wrap.scrollLeft = fx * img.offsetWidth - wrap.clientWidth / 2;
        wrap.scrollTop = fy * img.offsetHeight - wrap.clientHeight / 2;
      };
      requestAnimationFrame(center);
      if (!img.complete) img.addEventListener("load", () => requestAnimationFrame(center), { once: true });   // 大圖未載入完（網絡慢）：載入後再對準按下的位置
    };
    // 提示：拍攝時間前後經過終點的號碼布＋該時段在跑道上的組別；已輸入號碼布逐個檢查是否在跑道上
    let offCourse = new Set(), hintSeq = 0, hintTimer = 0;
    const loadHints = async () => {
      const mine = ++hintSeq, b = parseBibs($("#bibsIn").value);
      const { data, error } = await sb.rpc("xc_photo_hints", { p_id: id, p_bibs: sugg ? [...new Set([...b, ...sugg.unsure])] : b });
      if (mine !== hintSeq || !$("#hints")) return;
      hintsReady = true;
      if (error || !data) { $("#hints").innerHTML = '<p class="muted">未能載入提示（網絡）；仍可直接輸入號碼布。</p>'; return; }
      offCourse = new Set((data.check || []).filter((c) => c.on_course === false).map((c) => c.bib));
      // 拍攝時間可信（相機 EXIF 時間，而且當時有組別在跑道上）才按時段剔除電腦建議；
      // 否則多數是相機時間未校正：剔除會把正確的號碼布一併刪走，所以保留建議、只提示核對時間
      const timeOk = p.taken_src === "exif" && data.taken_ms != null && (data.cats || []).length > 0;
      if (sugg && firstHints && !timeOk) {
        firstHints = false;
        sugg.timeWarn = true;
      }
      if (sugg && firstHints) {
        firstHints = false;
        const off = b.filter((n) => offCourse.has(n));
        if (off.length && !touched) {
          $("#bibsIn").value = b.filter((n) => !offCourse.has(n)).join(" ");
          sugg.out.push(...off.map((n) => `${n}（該時段不在跑道上）`));
        }
        const offU = sugg.unsure.filter((n) => offCourse.has(n));
        sugg.out.push(...offU.map((n) => `${n}（不肯定；該時段不在跑道上）`));
        sugg.unsure = sugg.unsure.filter((n) => !offCourse.has(n));
      }
      const suggHtml = sugg ? `<p class="hint-h">電腦掃描建議（已預先填入，請對照相片核對）</p>`
        + (sugg.timeWarn ? `<p class="why">${p.taken_src === "exif" ? "拍攝時間沒有組別在跑道上" : "這張相片沒有相機拍攝時間"}：可能是相機時間未校正，建議未按跑道時段過濾，請逐個核對號碼；同一部相機的相片請先按「相機時間」校正再上載。</p>` : "")
        + (sugg.unsure.length ? `<div class="near">${sugg.unsure.map((n) => `<button type="button" class="chip" data-add="${n}"><b class="num">${n}</b> ${esc((ROSTER.get(n) || {}).name || "")}<small>可能（不肯定）</small></button>`).join("")}</div>` : "")
        + (sugg.out.length ? `<p class="muted">已剔除：${esc(sugg.out.join("、"))}</p>` : "") : "";
      const near = (data.near || []).filter((n) => ROSTER.has(n.bib));
      const dtTxt = (dt) => Math.abs(dt) < 0.5 ? "同時衝線" : dt > 0 ? `相片後 ${Math.round(dt)} 秒衝線` : `相片前 ${Math.round(-dt)} 秒衝線`;
      const cats = (data.cats || []).map((c) => `${catLabel(c.cat)}${(ROSTER_HEATS.get(c.cat) || 1) > 1 ? ` C${c.heat}` : ""}`);
      $("#hints").innerHTML = suggHtml + (data.taken_ms == null ? '<p class="muted">這張相片沒有拍攝時間，未能提示。</p>' : "")
        + (near.length ? `<p class="hint-h">終點紀錄：拍攝前後 20 秒經過終點（按一下加入）</p><div class="near">${near.map((n) => `<button type="button" class="chip" data-add="${n.bib}"><b class="num">${n.bib}</b> ${esc((ROSTER.get(n.bib) || {}).name || "")}<small>${dtTxt(n.dt)}${n.fin ? "" : "・中途經過"}</small></button>`).join("")}</div>` : "")
        + (data.taken_ms != null ? `<p class="muted hint-cats">此時段在跑道上：${cats.length ? esc(cats.join("、")) : "沒有組別（可能是比賽前後的相片）"}</p>` : "");
      upd(false);
    };
    const upd = (reload = true) => {
      const b = parseBibs($("#bibsIn").value);
      $("#whoList").innerHTML = b.map((n) => who(n) + (offCourse.has(n) && ROSTER.has(n) ? ' <span class="who-warn">⚠ 該時段不在跑道上，請再核對號碼</span>' : "")).join("<br>") || '<span class="muted">（沒有號碼布：不會被任何人查到）</span>';
      $("#approve").disabled = !b.length || b.some((n) => !ROSTER.has(n));
      document.querySelectorAll("#hints [data-add]").forEach((x) => x.classList.toggle("on", b.includes(Number(x.dataset.add))));
      if (reload) { clearTimeout(hintTimer); hintTimer = setTimeout(loadHints, 350); }
    };
    $("#bibsIn").oninput = () => { touched = true; upd(); };
    $("#hints").onclick = (e) => {
      const x = e.target.closest("[data-add]"); if (!x) return;
      touched = true;
      const b = parseBibs($("#bibsIn").value), n = Number(x.dataset.add);
      $("#bibsIn").value = (b.includes(n) ? b.filter((v) => v !== n) : [...b, n]).join(" ");
      upd();
    };
    upd(false); loadHints();
    // 儲存後自動開下一張待標相片（按拍攝時間）
    const save2 = async (patch, next) => {
      $("#sheetMsg").textContent = "儲存中……";
      const after = next ? pendingList().filter((x) => x.id !== id && byTimeAsc(x, p) > 0)[0] : null;
      const { error } = await sb.from("xc_photos").update(patch).eq("id", id);
      if (error) { $("#sheetMsg").textContent = "儲存失敗：" + error.message; return false; }
      clearTimeout(hintTimer); hintSeq++;
      mergePhoto({ id, ...patch }); renderAll(); $("#sheet").close();
      if (after) openSheet(after.id);
      return true;
    };
    const approve = () => {
      const b = parseBibs($("#bibsIn").value);
      if (!b.length || b.some((n) => !ROSTER.has(n))) return;
      if (sugg && !hintsReady) { $("#sheetMsg").textContent = "正在核對電腦建議（拍攝時段是否在跑道上），請稍候再按。"; return; }
      // 有號碼布在拍攝時段不在跑道上：頁面內提示，8 秒內再按一次（或再按 Enter）才公開（不用 confirm 彈出視窗）
      const off = b.filter((n) => offCourse.has(n));
      const key = b.join(",");
      if (off.length && !(offOk.key === key && Date.now() - offOk.at <= 8000)) {
        offOk = { key, at: Date.now() };
        $("#approve").textContent = "仍然公開（再按一次）";
        $("#sheetMsg").textContent = `${off.join("、")} 在拍攝時段不在跑道上，請再核對號碼；確定沒有看錯，8 秒內再按一次。`;
        setTimeout(() => { if ($("#approve") && Date.now() - offOk.at >= 8000) { $("#approve").textContent = "批准公開"; } }, 8100);
        return;
      }
      offOk = { key: "", at: 0 };
      save2({ bibs: b, status: "approved", reviewed: true, reason: null }, true);
    };
    let offOk = { key: "", at: 0 };
    $("#approve").onclick = approve;
    $("#bibsIn").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); approve(); } };
    $("#keep").onclick = () => save2({ bibs: parseBibs($("#bibsIn").value), status: "pending", reviewed: true }, true);
    if ($("#again")) $("#again").onclick = async () => {
      $("#sheetMsg").textContent = "重新辨識中……";
      const { error } = await sb.from("xc_photos").update({ reviewed: false, status: "uploaded" }).eq("id", id);
      if (error) { $("#sheetMsg").textContent = "失敗：" + error.message; return; }
      try { const r = await recognise(id); if (r.wait) { $("#sheetMsg").textContent = r.msg; return; } } catch (e) { $("#sheetMsg").textContent = "失敗：" + e.message; return; }
      await pull(); $("#sheet").close();
    };
    // 移除要在 8 秒內按兩次（頁面內確認）：部分 App 內置瀏覽器會封鎖 confirm() 彈出視窗，令按鈕「沒反應」
    let armed = 0;
    $("#remove").onclick = async () => {
      const btn = $("#remove");
      if (Date.now() - armed > 8000) {
        armed = Date.now();
        btn.textContent = "再按一次確定移除";
        $("#sheetMsg").textContent = "移除後檔案即時刪除，已分享的網址最遲 1 小時內失效，不能復原。";
        setTimeout(() => { if (btn.isConnected && Date.now() - armed >= 8000) { btn.textContent = "移除"; if ($("#sheetMsg").textContent.startsWith("移除後")) $("#sheetMsg").textContent = ""; } }, 8100);
        return;
      }
      armed = 0;
      $("#sheetMsg").textContent = "移除中……";
      if (PH) {
        try { await photoStore("remove", [p.full_path, p.thumb_path]); } catch (e) { $("#sheetMsg").textContent = "刪除檔案失敗：" + e.message; return; }
      } else {
        const { error } = await sb.storage.from(BUCKET).remove([p.full_path, p.thumb_path]);
        if (error) { $("#sheetMsg").textContent = "刪除檔案失敗：" + error.message; return; }
      }
      await save2({ status: "removed", reviewed: true, bibs: [] });
    };
    $("#sheet").showModal();
  }

  /* ---------- 相機時間校正 ----------
     用相機影一張本頁的大時鐘（手機時間）→ 揀這張相片 → 輸入相中時鐘顯示的時間 → 相片 EXIF 時間減去該時間＝相機誤差
     iPhone 的時間輸入不支援秒，所以改用數字輸入（081048 或 8:10:48） */
  const macauDate = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Macau" });
  const hms = (ms) => new Date(ms).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Macau" });
  function parseHms(s) {
    const t = String(s).trim();
    let m = t.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{1,2})$/);
    if (!m) { const d = t.replace(/\D/g, ""); if (d.length === 6 || d.length === 5) m = [null, d.slice(0, -4), d.slice(-4, -2), d.slice(-2)]; }
    if (!m) return null;
    const [h, mi, se] = m.slice(1).map(Number);
    return h < 24 && mi < 60 && se < 60 ? `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(se).padStart(2, "0")}` : null;
  }
  let calib = null, clockTimer = 0;
  function clockLabel() {
    const n = Object.keys(st.clock || {}).length;
    $("#clockBtn").textContent = n ? `相機時間：已校正 ${n} 部` : "相機時間：未校正";
  }
  // 已上載的相片中，屬於這個校正（相機）而所用誤差與現在不同的：可按「更正已上載」重新計算拍攝時間
  function staleFor(name) {
    const off = Number((st.clock || {})[name]) || 0;
    return [...photos.values()].filter((p) => p.event === st.event && p.taken_src === "exif" && p.status !== "removed"
      && clockKey(p.camera) === name && (Number(p.clock_off_s) || 0) !== off);
  }
  function renderClockList() {
    const c = st.clock || {};
    const names = Object.keys(c);
    $("#clockList").innerHTML = names.length ? names.map((k) => {
      const n = staleFor(k).length;
      return `<li><span><b>${esc(k)}</b> ${esc(fmtOff(c[k]))}</span>${n ? `<button type="button" class="primary" data-fix="${esc(k)}">更正已上載 ${n} 張</button>` : ""}<button type="button" class="ghost" data-clear="${esc(k)}">清除</button></li>`;
    }).join("") : '<li class="muted">未有已校正的相機。手機本身影的相片不用校正。</li>';
  }
  // 校正值以資料庫為準（所有裝置共用）；離線時做的校正先存本機（clockPending），下次連線時補上載
  async function loadClocks() {
    const pend = (st.clockPending || []).filter((k) => st.clock && k in st.clock);
    if (pend.length) {
      const { error } = await sb.from("xc_photo_clock").upsert(pend.map((k) => ({ camera: k, off_s: Number(st.clock[k]) || 0 })), { onConflict: "camera" });
      if (!error) { st.clockPending = []; save(); }
    }
    const { data, error } = await sb.from("xc_photo_clock").select("camera,off_s");
    if (error || !data) return false;
    const keep = Object.fromEntries((st.clockPending || []).filter((k) => st.clock && k in st.clock).map((k) => [k, st.clock[k]]));
    st.clock = { ...Object.fromEntries(data.map((r) => [r.camera, r.off_s])), ...keep }; save();
    return true;
  }
  async function openClock() {
    calib = null;
    $("#clockFile").value = ""; $("#clockSeen").value = ""; $("#clockInfo").textContent = ""; $("#clockMsg").textContent = "";
    renderClockList();
    const tick = () => { $("#clockNow").textContent = hms(Date.now()); };
    tick(); clearInterval(clockTimer); clockTimer = setInterval(tick, 200);
    $("#clock").showModal();
    if (await loadClocks()) { renderClockList(); clockLabel(); }
  }
  async function clockPick(file) {
    calib = null; $("#clockMsg").textContent = "";
    const ex = file && await exifInfo(file);
    if (!ex) { $("#clockInfo").textContent = "這張相片沒有拍攝時間資料，請直接用相機原檔（JPEG；經 WhatsApp 傳送會失去拍攝時間）。"; return; }
    calib = ex;
    $("#clockInfo").textContent = `相機：${camName(ex.cam)} · 相片記錄的時間 ${hms(ex.ms)}`;
    $("#clockSeen").focus();
  }
  async function clockApply() {
    const msg = $("#clockMsg");
    if (!calib) { msg.textContent = "請先揀相機影的時鐘相片。"; return; }
    const seen = parseHms($("#clockSeen").value);
    if (!seen) { msg.textContent = "請輸入相中時鐘顯示的時間，例如 081048 或 8:10:48。"; return; }
    let diff = calib.ms - Date.parse(`${macauDate(calib.ms)}T${seen}+08:00`);
    const DAY = 86400000;
    while (diff > DAY / 2) diff -= DAY;
    while (diff < -DAY / 2) diff += DAY;
    const off = Math.round(diff / 1000), name = camName(calib.cam);
    st.clock = { ...(st.clock || {}), [name]: off }; save();
    renderClockList(); clockLabel();
    msg.textContent = "儲存中……";
    const { error } = await sb.from("xc_photo_clock").upsert({ camera: name, off_s: off }, { onConflict: "camera" });
    if (error) { st.clockPending = [...new Set([...(st.clockPending || []), name])]; save(); }
    else { st.clockPending = (st.clockPending || []).filter((k) => k !== name); save(); }
    const n = staleFor(name).length;
    msg.textContent = `已套用：${name} ${fmtOff(off)}${error ? "（暫存本機，未能同步到其他裝置；連線後自動補上）" : "（所有上載裝置共用）"}。之後揀的相片會自動更正時間。`
      + (n ? `已上載的 ${n} 張可按下面「更正已上載」。` : "");
    renderClockList();
  }
  async function fixUploaded(name) {
    const msg = $("#clockMsg"), off = Number((st.clock || {})[name]) || 0;
    const cams = [...new Set(staleFor(name).map((p) => p.camera || null))];
    msg.textContent = "更正中……";
    let total = 0;
    for (const cam of cams) {
      const { data, error } = await sb.rpc("xc_photo_reclock", { p_event: st.event, p_camera: cam, p_off_s: off });
      if (error) { msg.textContent = "更正失敗：" + error.message; return; }
      total += Number(data) || 0;
    }
    await pull();
    msg.textContent = `已更正 ${total} 張已上載相片的拍攝時間（${name} ${fmtOff(off)}）。`;
    renderClockList();
  }
  async function clockClear(name) {
    const { error } = await sb.from("xc_photo_clock").delete().eq("camera", name);
    if (error) { $("#clockMsg").textContent = "清除失敗（網絡），請稍後再試。"; return; }
    delete st.clock[name]; st.clockPending = (st.clockPending || []).filter((k) => k !== name); save();
    renderClockList(); clockLabel();
  }

  /* ---------- 登入 ---------- */
  async function loadStatic() {
    const [site, race] = await Promise.all(["data/site.json", "data/race48.json"].map((u) => fetch(u, { cache: "no-cache" }).then((r) => r.json())));
    SITE = site;
    for (const s of race.schools) SCHOOL.set(s.abbr, s.zh);
    sb = supabase.createClient(site.views.url, site.views.key, { auth: { persistSession: true, autoRefreshToken: true } });
    // 相片檔案放獨立的相片專案（site.json photos）；未設定則沿用主專案 storage
    PH = site.photos && site.photos.url ? site.photos : null;
  }
  async function login() {
    const msg = $("#loginMsg"); msg.textContent = "登入中……";
    const { error } = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#pw").value });
    if (error) { msg.textContent = "登入失敗：電郵或密碼不正確。"; return; }
    await afterLogin();
  }
  async function afterLogin() {
    const { data: ok, error } = await sb.rpc("xc_is_admin");
    if (error || !ok) { $("#loginMsg").textContent = "此帳戶未獲授權，請聯絡網站管理員。"; await sb.auth.signOut(); return; }
    $("#login").hidden = true; $("#app").hidden = false; $("#logout").hidden = false;
    $("#event").value = st.event;
    queue = (await IDB.all().catch(() => [])).sort((a, b) => a.added - b.added);
    await loadRoster();
    if (await loadClocks()) clockLabel();   // 相機校正（資料庫，所有裝置共用）：揀相片前要先載入
    await pull(true);
    setInterval(pull, 4000);
    setInterval(work, 1000);
    work();
    keepAwake();
  }
  async function keepAwake() { try { if (navigator.wakeLock) { let lock = await navigator.wakeLock.request("screen"); document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen"); }); } } catch (e) { /* 不支援 */ } }

  async function init() {
    await loadStatic();
    $("#loginBtn").onclick = login;
    $("#pw").onkeydown = (e) => { if (e.key === "Enter") login(); };
    $("#logout").onclick = async () => { await sb.auth.signOut(); location.reload(); };
    $("#event").onchange = async () => { st.event = $("#event").value; save(); shown = SHOW; await loadRoster(); await pull(true); };
    $("#files").onchange = (e) => prepare(e.target.files);
    $("#clockBtn").onclick = openClock;
    $("#clockFile").onchange = (e) => clockPick(e.target.files[0]);
    $("#clockApply").onclick = clockApply;
    $("#clockSeen").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); clockApply(); } };
    $("#clockList").onclick = (e) => {
      const f = e.target.closest("[data-fix]"); if (f) { fixUploaded(f.dataset.fix); return; }
      const b = e.target.closest("[data-clear]"); if (b) clockClear(b.dataset.clear);
    };
    $("#clock").addEventListener("close", () => clearInterval(clockTimer));
    clockLabel();
    document.querySelectorAll(".tabs button").forEach((b) => { b.onclick = () => { st.tab = b.dataset.tab; save(); shown = SHOW; renderAll(); }; });
    $("#grid").onclick = (e) => {
      if (e.target.closest("#moreBtn")) { shown += SHOW; renderAll(); return; }
      const c = e.target.closest(".card[data-id]"); if (c) openSheet(c.dataset.id);
    };
    window.addEventListener("online", () => { online = true; for (const q of queue) q.next_at = 0; work(); });
    const { data } = await sb.auth.getSession();
    if (data && data.session) await afterLogin();
  }
  init();
})();
