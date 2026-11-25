/* 相片上載（工作人員用）：比賽中以手機即時上載，雲端以 Gemini 辨識號碼布
   - 登入：與終點輸入同一套帳戶（xc_live_admins）
   - 揀相片 → 手機內壓縮成長邊 1600px 大圖＋400px 縮圖（重新編碼，位置等 EXIF 資料不會上載）；先讀出拍攝時間另存
   - 壓縮後的檔案存於本機 IndexedDB 佇列：斷網、重新整理頁面都不會遺失，恢復後自動續傳
   - 每張：上載兩個檔 → 寫入 xc_photos → 呼叫 Edge Function xc-photo-bibs 辨識並判斷是否自動公開
   - Gemini 配額用完（429）時按建議時間稍後重試
   - 待覆核：改正號碼布後「批准公開」；或「移除」（刪除檔案，網址即時失效） */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get(k, fb) { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無痕模式 */ } } };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));
  const catLabel = (c) => `${c[0] === "M" ? "男" : "女"}${c[1]}`;
  const BUCKET = "xc-photos", FULL = 1600, THUMB = 400, PARALLEL = 2;

  let sb = null, SITE = null, SCHOOL = new Map(), ROSTER = new Map();
  const st = Object.assign({ event: "48", tab: "pending" }, store.get("xc-photo-state", {}));
  const save = () => store.set("xc-photo-state", st);
  const photos = new Map(); // 伺服器上的相片紀錄（本 event）
  let rev = 0, online = true, quotaUntil = 0, noKey = false;

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
  function readTiff(v, t) {
    const le = v.getUint16(t) === 0x4949;
    const u16 = (o) => v.getUint16(t + o, le), u32 = (o) => v.getUint32(t + o, le);
    const str = (o, n) => { let s = ""; for (let i = 0; i < n; i++) { const c = v.getUint8(t + o + i); if (!c) break; s += String.fromCharCode(c); } return s; };
    const ifd = (o) => { const out = {}; const n = u16(o); for (let i = 0; i < n; i++) { const e = o + 2 + i * 12; const tag = u16(e), cnt = u32(e + 4); out[tag] = { cnt, val: cnt > 4 ? u32(e + 8) : e + 8, raw: u32(e + 8) }; } return out; };
    const ifd0 = ifd(u32(4));
    const tag = (o, k) => (o[k] ? str(o[k].val, o[k].cnt).trim() : "");
    const make = tag(ifd0, 0x010F), model = tag(ifd0, 0x0110);
    const cam = (model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`).trim().slice(0, 60);
    if (!ifd0[0x8769]) return null;
    const ex = ifd(ifd0[0x8769].raw);
    const d = ex[0x9003] || ex[0x9004];
    if (!d) return null;
    const m = str(d.val, d.cnt).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    const off = ex[0x9011] ? str(ex[0x9011].val, ex[0x9011].cnt) : "";
    const tz = /^[+-]\d{2}:\d{2}$/.test(off) ? off : "+08:00";
    const sub = (tag(ex, 0x9291).match(/^\d{1,3}/) || [""])[0].padEnd(3, "0");
    const ms = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${sub}${tz}`);
    return Number.isFinite(ms) ? { ms, cam } : null;
  }

  /* ---------- 相機時間校正：每部相機一個誤差（秒，正數＝相機快），只套用於該型號相片的 EXIF 時間 ---------- */
  const CAM_NONE = "（未知型號）";
  const camName = (cam) => cam || CAM_NONE;
  const clockOff = (cam) => (st.clock && Number(st.clock[camName(cam)])) || 0;
  const fmtOff = (s) => s === 0 ? "準確" : `${s > 0 ? "快" : "慢"} ${Math.floor(Math.abs(s) / 60) ? `${Math.floor(Math.abs(s) / 60)} 分 ` : ""}${Math.abs(s) % 60} 秒`;

  /* ---------- 略過已上載：同一張相片（拍攝時間＋檔案大小）不會上載兩次 ---------- */
  const srcKey = (f, ex) => ex ? `x${ex.ms}|${f.size}` : `f${f.name}|${f.size}|${f.lastModified || 0}`;
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
        const full = await shrink(bmp, FULL), thumb = await shrink(bmp, THUMB);
        if (bmp.close) bmp.close();
        const off = exif ? clockOff(exif.cam) : 0;
        const taken = exif ? exif.ms - off * 1000 : (f.lastModified || null);
        if (exif && taken > Date.now() + 5 * 60000) future++;
        const id = uuid();
        const item = {
          id, event: ev, name: f.name, full: full.blob, thumb: thumb.blob, ext: full.ext, text: thumb.ext, w: full.w, h: full.h,
          taken_ms: taken, taken_src: exif ? "exif" : f.lastModified ? "file" : "upload",
          camera: exif ? exif.cam || null : null, clock_off_s: off || null, src_key: key,
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
        for (const [path, blob] of [[p.full, q.full], [p.thumb, q.thumb]]) {
          const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true, cacheControl: "31536000" });
          if (error) throw error;
        }
        q.stage = "uploaded"; q.err = ""; await IDB.put(q);
      }
      if (q.stage === "uploaded") {
        const row = { id: q.id, event: q.event, full_path: p.full, thumb_path: p.thumb, w: q.w, h: q.h, taken_ms: q.taken_ms, taken_src: q.taken_src,
          camera: q.camera || null, clock_off_s: q.clock_off_s || null, src_key: q.src_key || null };
        const { error } = await sb.from("xc_photos").upsert(row, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw error;
        q.stage = "row"; q.err = ""; await IDB.put(q);
      }
      if (q.stage === "row") {
        const r = await recognise(q.id);
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
  async function pull(full) {
    if (full) { rev = 0; photos.clear(); }
    const { data, error } = await sb.from("xc_photos").select("id,event,full_path,thumb_path,w,h,taken_ms,taken_src,camera,clock_off_s,src_key,ai_bibs,ai_unsure,bibs,status,reason,reviewed,created_at,rev")
      .eq("event", st.event).gt("rev", rev).order("rev").limit(1000);
    if (error) { online = false; setSync(); return; }
    online = true;
    for (const r of data) { photos.set(r.id, r); rev = Math.max(rev, r.rev); }
    if (data.length || full) renderAll(); else setSync();
  }
  async function loadRoster() {
    ROSTER.clear();
    const { data, error } = await sb.from("xc_live_roster").select("bib,cat,heat,abbr,name").eq("event", st.event).limit(5000);
    if (!error) for (const r of data) ROSTER.set(r.bib, r);
  }
  const pubUrl = (path) => `${SITE.views.url}/storage/v1/object/public/${BUCKET}/${path}`;
  const who = (bib) => {
    const r = ROSTER.get(bib);
    if (!r) return `<span class="who-bad">${bib} 不在名單</span>`;
    return `<span><b class="num">${bib}</b> ${esc(r.name || "（隱藏）")} <small>${esc(catLabel(r.cat))}${r.heat ? ` C${r.heat}` : ""} · ${esc(SCHOOL.get(r.abbr) || r.abbr)}</small></span>`;
  };
  const hhmm = (ms) => ms ? new Date(ms).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Macau" }) : "-";
  const srcLabels = { exif: "", file: "（檔案時間）", upload: "（上載時間）" };
  const when = (p) => `${hhmm(p.taken_ms)}${srcLabels[p.taken_src] || ""}${p.clock_off_s ? "（已校正）" : ""}`;

  /* ---------- 畫面 ---------- */
  function setSync() {
    const el = $("#sync"), n = queue.length;
    el.textContent = !online ? `離線 · 待上載 ${n}` : n ? `上載中 ${n}` : `已同步 · 名單 ${ROSTER.size}`;
    el.className = "sync " + (!online ? "bad" : n ? "busy" : "ok");
    const msg = $("#queueMsg");
    const waitQ = quotaUntil > Date.now();
    msg.hidden = !(waitQ || noKey);
    msg.textContent = noKey ? "Gemini 金鑰未設定：相片照樣上載，設定後自動辨識。" : waitQ ? `Gemini 配額已滿，約 ${Math.ceil((quotaUntil - Date.now()) / 1000)} 秒後繼續辨識（免費層每分鐘次數有限）。` : "";
  }
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
      g.innerHTML = qs.map((q) => `<div class="card q"><img alt="" src="${q.thumbUrl || (q.thumbUrl = URL.createObjectURL(q.thumb))}"><div class="meta"><b>${esc({ ready: "等候上載", uploaded: "已上載檔案", row: "辨識中" }[q.stage] || q.stage)}</b><small>${esc(q.err || "")}</small><small>${when(q)}</small></div></div>`).join("");
      setSync(); return;
    }
    const show = (st.tab === "approved" ? appr : pend).sort((a, b) => (b.taken_ms || 0) - (a.taken_ms || 0));
    note.textContent = st.tab === "approved" ? "已公開：運動員可用號碼布＋姓名查到。賽後請逐張再看一次（已覆核者標 ✓）。" : "待覆核：未公開。改正號碼布後按「批准公開」，或移除。";
    g.innerHTML = show.length ? show.map((p) => `<button class="card" type="button" data-id="${esc(p.id)}">
        <img alt="" loading="lazy" src="${esc(pubUrl(p.thumb_path))}">
        <div class="meta">
          <b>${(p.bibs && p.bibs.length ? p.bibs : p.ai_bibs || []).map((n) => esc(n)).join("、") || "讀不到號碼布"}${p.reviewed ? ' <i class="rv">✓</i>' : ""}</b>
          ${p.status === "uploaded" ? "<small>辨識中……</small>" : p.reason ? `<small class="why">${esc(p.reason)}</small>` : ""}
          <small>${when(p)}</small>
        </div></button>`).join("") : `<p class="muted empty">${st.tab === "approved" ? "未有已公開的相片。" : "沒有待覆核的相片。"}</p>`;
    setSync();
  }

  /* ---------- 覆核一張 ---------- */
  const parseBibs = (s) => [...new Set(String(s).split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n >= 1 && n <= 99999))].sort((a, b) => a - b);
  function openSheet(id) {
    const p = photos.get(id); if (!p) return;
    const f = $("#sheetBody");
    const start = (p.bibs && p.bibs.length ? p.bibs : p.ai_bibs || []);
    f.innerHTML = `<h2>覆核相片</h2>
      <img class="big" alt="" src="${esc(pubUrl(p.full_path))}">
      <p class="muted">拍攝 ${when(p)}${p.camera ? ` · ${esc(p.camera)}` : ""}${p.clock_off_s ? `（相機${esc(fmtOff(p.clock_off_s))}）` : ""} · AI 讀出：${(p.ai_bibs || []).join("、") || "無"}${(p.ai_unsure || []).length ? `（不確定：${p.ai_unsure.join("、")}）` : ""}</p>
      ${p.reason ? `<p class="why">${esc(p.reason)}</p>` : ""}
      <label>相中號碼布（以空格或逗號分隔）<input id="bibsIn" inputmode="numeric" value="${esc(start.join(" "))}"></label>
      <div id="whoList" class="who-list"></div>
      <div class="sheet-btns">
        <button type="button" class="primary" id="approve">批准公開</button>
        <button type="button" class="ghost" id="keep">留待覆核</button>
        <button type="button" class="ghost" id="again">重新辨識</button>
        <button type="button" class="danger" id="remove">移除</button>
        <button type="submit" class="ghost">關閉</button>
      </div>
      <p id="sheetMsg" class="msg" role="alert"></p>`;
    const upd = () => { const b = parseBibs($("#bibsIn").value); $("#whoList").innerHTML = b.map(who).join("") || '<span class="muted">（沒有號碼布：不會被任何人查到）</span>'; $("#approve").disabled = !b.length || b.some((n) => !ROSTER.has(n)); };
    $("#bibsIn").oninput = upd; upd();
    const save2 = async (patch) => {
      $("#sheetMsg").textContent = "儲存中……";
      const { error } = await sb.from("xc_photos").update(patch).eq("id", id);
      if (error) { $("#sheetMsg").textContent = "儲存失敗：" + error.message; return false; }
      mergePhoto({ id, ...patch }); renderAll(); $("#sheet").close(); return true;
    };
    $("#approve").onclick = () => save2({ bibs: parseBibs($("#bibsIn").value), status: "approved", reviewed: true, reason: null });
    $("#keep").onclick = () => save2({ bibs: parseBibs($("#bibsIn").value), status: "pending", reviewed: true });
    $("#again").onclick = async () => {
      $("#sheetMsg").textContent = "重新辨識中……";
      const { error } = await sb.from("xc_photos").update({ reviewed: false, status: "uploaded" }).eq("id", id);
      if (error) { $("#sheetMsg").textContent = "失敗：" + error.message; return; }
      try { const r = await recognise(id); if (r.wait) { $("#sheetMsg").textContent = r.msg; return; } } catch (e) { $("#sheetMsg").textContent = "失敗：" + e.message; return; }
      await pull(); $("#sheet").close();
    };
    $("#remove").onclick = async () => {
      if (!confirm("移除這張相片？檔案會被刪除，已分享的網址即時失效，不能復原。")) return;
      $("#sheetMsg").textContent = "移除中……";
      const { error } = await sb.storage.from(BUCKET).remove([p.full_path, p.thumb_path]);
      if (error) { $("#sheetMsg").textContent = "刪除檔案失敗：" + error.message; return; }
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
  function renderClockList() {
    const c = st.clock || {};
    const names = Object.keys(c);
    $("#clockList").innerHTML = names.length ? names.map((k) => `<li><span><b>${esc(k)}</b> ${esc(fmtOff(c[k]))}</span><button type="button" class="ghost" data-clear="${esc(k)}">清除</button></li>`).join("")
      : '<li class="muted">未有已校正的相機。手機本身影的相片不用校正。</li>';
  }
  function openClock() {
    calib = null;
    $("#clockFile").value = ""; $("#clockSeen").value = ""; $("#clockInfo").textContent = ""; $("#clockMsg").textContent = "";
    renderClockList();
    const tick = () => { $("#clockNow").textContent = hms(Date.now()); };
    tick(); clearInterval(clockTimer); clockTimer = setInterval(tick, 200);
    $("#clock").showModal();
  }
  async function clockPick(file) {
    calib = null; $("#clockMsg").textContent = "";
    const ex = file && await exifInfo(file);
    if (!ex) { $("#clockInfo").textContent = "這張相片沒有拍攝時間資料，請直接用相機原檔（JPEG）。"; return; }
    calib = ex;
    $("#clockInfo").textContent = `相機：${camName(ex.cam)} · 相片記錄的時間 ${hms(ex.ms)}`;
    $("#clockSeen").focus();
  }
  function clockApply() {
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
    msg.textContent = `已套用：${name} ${fmtOff(off)}。之後揀的相片會自動更正時間（已上載的不變）。`;
    renderClockList(); clockLabel();
  }

  /* ---------- 登入 ---------- */
  async function loadStatic() {
    const [site, race] = await Promise.all(["data/site.json", "data/race48.json"].map((u) => fetch(u, { cache: "no-cache" }).then((r) => r.json())));
    SITE = site;
    for (const s of race.schools) SCHOOL.set(s.abbr, s.zh);
    sb = supabase.createClient(site.views.url, site.views.key, { auth: { persistSession: true, autoRefreshToken: true } });
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
    $("#event").onchange = async () => { st.event = $("#event").value; save(); await loadRoster(); await pull(true); };
    $("#files").onchange = (e) => prepare(e.target.files);
    $("#clockBtn").onclick = openClock;
    $("#clockFile").onchange = (e) => clockPick(e.target.files[0]);
    $("#clockApply").onclick = clockApply;
    $("#clockSeen").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); clockApply(); } };
    $("#clockList").onclick = (e) => { const b = e.target.closest("[data-clear]"); if (!b) return; delete st.clock[b.dataset.clear]; save(); renderClockList(); clockLabel(); };
    $("#clock").addEventListener("close", () => clearInterval(clockTimer));
    clockLabel();
    document.querySelectorAll(".tabs button").forEach((b) => { b.onclick = () => { st.tab = b.dataset.tab; save(); renderAll(); }; });
    $("#grid").onclick = (e) => { const c = e.target.closest(".card[data-id]"); if (c) openSheet(c.dataset.id); };
    window.addEventListener("online", () => { online = true; for (const q of queue) q.next_at = 0; work(); });
    const { data } = await sb.auth.getSession();
    if (data && data.session) await afterLogin();
  }
  init();
})();
