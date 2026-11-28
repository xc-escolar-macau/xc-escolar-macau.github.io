/* 運動員榮譽卡：以 Canvas 繪製 1080×1350（4:5）PNG
   版面依使用者提供的示範圖（陳曉晴_榮譽卡）：頂部標誌、主角區（姓名／拼音／校徽／狀態）、四格數據、
   榮譽紀錄（最多 5 行；獎牌＝頭十名）、最佳成績、網址＋資料來源＋QR 碼（連到個人頁，開啟即累積人氣）。
   三種版本：冠軍（金框＋皇冠）、獎牌（銀／銅框）、參賽紀念（綠框，標題改「歷屆成績」）。 */
(function (root) {
  "use strict";
  const W = 1080, H = 1350, M = 58;
  const C = { bg: "#0c0e12", surface: "#161a20", surface2: "#1f242c", line: "#262b34", text: "#f1f3f6", muted: "#8f97a6",
    accent: "#4cc38a", ink: "#03140c", gold: "#f6c544", silver: "#c8d0db", bronze: "#d58b4f", male: "#4fb3ff", female: "#ff6fae" };
  const CJK = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Heiti TC", sans-serif';
  const NUM = '"Barlow Condensed", "Roboto Condensed", "Arial Narrow", sans-serif';
  const QR_SRC = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function fit(ctx, text, max, size, min, weight, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(text).width <= max) return s; s -= 2; } while (s >= min);
    return s;
  }
  function seeded(seed) { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }

  function contours(ctx, seed) {
    const rnd = seeded(seed);
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.045)"; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const cx = rnd() * W, cy = rnd() * H, a = rnd() * 6;
      for (let r = 60; r < 560; r += 46) {
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const th = (i / 72) * Math.PI * 2;
          const rad = r * (1 + 0.16 * Math.sin(3 * th + a) + 0.08 * Math.sin(5 * th + a * 2));
          const x = cx + rad * Math.cos(th), y = cy + rad * 0.82 * Math.sin(th);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function crown(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = C.gold; ctx.strokeStyle = "#8a6400"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-26, 14); ctx.lineTo(-30, -14); ctx.lineTo(-14, 0); ctx.lineTo(0, -20); ctx.lineTo(14, 0); ctx.lineTo(30, -14); ctx.lineTo(26, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(-26, 16, 52, 7);
    for (const [cx, cy] of [[-30, -16], [0, -22], [30, -16]]) { ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function loadImg(src) { return new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  function loadQR() {
    if (root.qrcode) return Promise.resolve(root.qrcode);
    return new Promise((res) => { const s = document.createElement("script"); s.src = QR_SRC; s.onload = () => res(root.qrcode || null); s.onerror = () => res(null); document.head.appendChild(s); setTimeout(() => res(root.qrcode || null), 6000); });
  }
  function shield(ctx, x, y, size, abbr, hue) {
    ctx.save(); ctx.translate(x, y);
    const w = size * 0.86, h = size;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h * 0.55); ctx.quadraticCurveTo(w, h * 0.85, w / 2, h); ctx.quadraticCurveTo(0, h * 0.85, 0, h * 0.55); ctx.closePath();
    ctx.fillStyle = `hsl(${hue} 55% 36%)`; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = `hsl(${hue} 60% 62%)`; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    fit(ctx, abbr, w - 14, 40, 16, 800, NUM); ctx.fillText(abbr, w / 2, h * 0.45);
    ctx.restore();
  }

  function FITF(ctx, t, maxW, size, min, weight) { let s = size; do { ctx.font = `${weight} ${s}px ${CJK}`; s -= 2; } while (ctx.measureText(t).width > maxW && s >= min); }
  // 完賽紀念卡（d.cert）：在紀錄下方的空位加一塊賽事資料（賽事、日期、組別名次、完賽人數、時間）
  function certPanel(ctx, d, x, y, w, h, c) {
    const k = d.cert; if (!k) return;
    ctx.save();
    rr(ctx, x, y, w, h, 18); ctx.fillStyle = c.bg; ctx.fill(); if (c.line) { ctx.lineWidth = 2; ctx.strokeStyle = c.line; ctx.stroke(); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    const z = c.small ? [22, 40, 24, 34, 84, 20] : [28, 64, 32, 50, h * .58, 30];   // 字級（小、大、中）及三行位置
    ctx.fillStyle = c.muted; FITF(ctx, k.event, w - 56, z[0], 16, 700); ctx.fillText(k.event, x + 28, y + z[3]);
    ctx.fillStyle = c.fg; FITF(ctx, `${k.cat}　第 ${k.place} 名`, w - 56, z[1], 28, 900); ctx.fillText(`${k.cat}　第 ${k.place} 名`, x + 28, y + z[4]);
    ctx.fillStyle = c.accent; const ln = k.line || `完賽 ${k.finishers} 人・完成時間 ${k.time}`; FITF(ctx, ln, w - 56, z[2], 18, 800); ctx.fillText(ln, x + 28, y + h - z[5]);
    ctx.restore();
  }
  async function render(d) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    try { await Promise.all([document.fonts.load(`800 60px ${NUM}`), document.fonts.load(`700 60px ${NUM}`)]); } catch (e) { /* 字體載入失敗時用後備字體 */ }
    const [crestImg, qrLib] = await Promise.all([loadImg(d.crestImg), d.qrUrl ? loadQR() : null]);
    const tier = d.tier === "gold" ? C.gold : d.tier === "silver" ? C.silver : d.tier === "bronze" ? C.bronze : C.accent;

    // 背景
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    contours(ctx, d.seed || d.name);

    // 頂部標誌
    rr(ctx, M, 38, 62, 62, 12); ctx.fillStyle = C.accent; ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = `800 36px ${NUM}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("XC", M + 31, 70);
    ctx.textAlign = "left"; ctx.fillStyle = C.text; ctx.font = `800 44px ${CJK}`; ctx.fillText("澳門學界越野跑", M + 80, 70);
    ctx.textAlign = "right"; ctx.fillStyle = C.muted; ctx.font = `500 30px ${CJK}`; ctx.fillText("非官方整理", W - M, 70);
    ctx.fillStyle = C.accent; ctx.fillRect(M, 120, W - 2 * M, 3);

    // 主角區
    const hy = 175, hh = 222;
    rr(ctx, M, hy, W - 2 * M, hh, 20); ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = tier; ctx.stroke();
    if (d.tier === "gold") { crown(ctx, M + 12, hy - 14, 1); crown(ctx, W - M - 12, hy - 14, 1); }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = C.text;
    fit(ctx, d.name, 440, 88, 48, 800, CJK); ctx.fillText(d.name, M + 44, hy + 118);
    if (d.namePt) { ctx.fillStyle = C.muted; fit(ctx, d.namePt, 440, 42, 26, 600, NUM); ctx.fillText(d.namePt, M + 46, hy + 178); }
    // 學校白卡
    const sx = 562, sy = hy + 30, sw = W - M - 28 - sx, sh = hh - 60;
    rr(ctx, sx, sy, sw, sh, 18); ctx.fillStyle = "#ffffff"; ctx.fill();
    const cs = 112;
    if (crestImg) { const r = Math.min(cs / crestImg.width, cs / crestImg.height); const w = crestImg.width * r, h = crestImg.height * r; ctx.drawImage(crestImg, sx + 18 + (cs - w) / 2, sy + (sh - h) / 2, w, h); }
    else shield(ctx, sx + 26, sy + (sh - cs) / 2, cs, d.crestAbbr || "?", d.crestHue || 150);
    const tx = sx + 18 + cs + 16, tw = sx + sw - 16 - tx;
    ctx.fillStyle = "#14181e"; ctx.textAlign = "left";
    const sch = d.school || "";
    let fs = fit(ctx, sch, tw, 40, 26, 800, CJK);
    if (ctx.measureText(sch).width > tw) { // 校名太長：分兩行
      const half = Math.ceil(sch.length / 2); fs = fit(ctx, sch.slice(0, half), tw, 32, 20, 800, CJK);
      ctx.fillText(sch.slice(0, half), tx, sy + 52); ctx.fillText(sch.slice(half), tx, sy + 52 + fs + 4);
    } else ctx.fillText(sch, tx, sy + 64);
    if (d.status) {
      ctx.font = `700 26px ${CJK}`; const pw = Math.min(ctx.measureText(d.status).width + 32, tw);
      rr(ctx, tx, sy + sh - 62, pw, 44, 10); ctx.fillStyle = d.statusMuted ? "#e3e7ec" : C.accent; ctx.fill();
      ctx.fillStyle = d.statusMuted ? "#3b424d" : C.ink; ctx.textBaseline = "middle"; fit(ctx, d.status, pw - 24, 26, 18, 700, CJK); ctx.fillText(d.status, tx + 16, sy + sh - 40); ctx.textBaseline = "alphabetic";
    }

    // 四格數據
    const by = 418, bh = 182;
    rr(ctx, M, by, W - 2 * M, bh, 18); ctx.fillStyle = C.surface; ctx.fill();
    const cw = (W - 2 * M) / 4;
    const cells = [d.cert ? [d.cert.finLabel || "完賽人數", String(d.cert.finVal ?? d.cert.finishers), C.text, NUM] : ["參賽", String(d.stats.races), C.text, NUM], ["冠軍", String(d.stats.wins), d.stats.wins ? C.gold : C.text, NUM], ["獎牌", String(d.stats.medals), C.text, NUM], [d.cert ? "名次" : "最佳", `第${d.stats.best}名`, C.text, CJK]];
    cells.forEach(([lab, val, col, fam], i) => {
      const cx = M + cw * i + cw / 2;
      if (i) { ctx.fillStyle = C.line; ctx.fillRect(M + cw * i, by + 30, 2, bh - 60); }
      ctx.textAlign = "center"; ctx.fillStyle = C.muted; ctx.font = `500 40px ${CJK}`; ctx.fillText(lab, cx, by + 70);
      ctx.fillStyle = col; fit(ctx, val, cw - 30, fam === NUM ? 92 : 76, 40, 800, fam); ctx.fillText(val, cx, by + 152);
    });

    // 榮譽紀錄
    const ty = 680;
    ctx.fillStyle = C.accent; ctx.fillRect(M, ty - 30, 4, 30); ctx.fillRect(M, ty - 30, 22, 4);
    ctx.textAlign = "left"; ctx.font = `800 48px ${CJK}`; ctx.fillText(d.title, M + 40, ty);
    const rows = d.rows.slice(0, 5);
    const rowH = rows.length >= 5 ? 80 : Math.min(112, 420 / Math.max(rows.length, 1)), ry = ty + 26; // 少於 5 行時加大行距，避免中間留空
    rows.forEach((r, i) => {
      const y = ry + i * rowH + rowH / 2;
      const medal = r.place <= 3 ? [C.gold, C.silver, C.bronze][r.place - 1] : null;
      const award = !medal && r.place <= 10;   // 第 4 至 10 名亦獲獎牌：綠色獎牌，內寫名次
      ctx.beginPath(); ctx.arc(M + 50, y, 36, 0, Math.PI * 2);
      ctx.fillStyle = medal || (award ? C.accent : C.surface2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = medal || award ? "rgba(0,0,0,.25)" : C.line; ctx.stroke();
      ctx.fillStyle = medal ? "#2a1e00" : award ? C.ink : C.text; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (medal) { ctx.font = `800 34px ${CJK}`; ctx.fillText(["金", "銀", "銅"][r.place - 1], M + 50, y + 1); }
      else { fit(ctx, String(r.place), 56, 36, 22, 800, NUM); ctx.fillText(String(r.place), M + 50, y + 2); }
      ctx.textAlign = "left"; ctx.fillStyle = C.text; ctx.font = `700 46px ${NUM}`;
      const yr = r.year; ctx.fillText(yr, M + 112, y + 2);
      const yw = ctx.measureText(yr).width;
      ctx.font = `700 42px ${CJK}`; ctx.fillText(`・第${r.edition}屆`, M + 112 + yw + 4, y + 2);
      // 組別膠囊
      const pill = r.cat; ctx.font = `700 32px ${CJK}`; const pw = ctx.measureText(pill).width + 30;
      rr(ctx, 640, y - 25, pw, 50, 10); ctx.fillStyle = r.gender === "M" ? C.male : C.female; ctx.fill();
      ctx.fillStyle = r.gender === "M" ? "#04121f" : "#23040f"; ctx.fillText(pill, 655, y + 1);
      ctx.textAlign = "right"; ctx.fillStyle = C.text; ctx.font = `800 64px ${NUM}`; ctx.fillText(r.time, W - M - 18, y + 4);
      ctx.textBaseline = "alphabetic";
    });

    if (d.cert && rows.length <= 2) certPanel(ctx, d, M, ry + rows.length * rowH + 20, W - 2 * M, 240, { bg: C.surface, line: C.line, fg: C.text, accent: C.accent, muted: C.muted });
    // 最佳成績
    const py = H - 176;
    if (d.pb) {
      ctx.textAlign = "left"; ctx.fillStyle = C.accent; ctx.font = `700 44px ${CJK}`;
      const a = d.pb.text ? `${d.pb.text} ` : `${d.pb.label}最佳 `; ctx.fillText(a, M + 20, py);
      let x = M + 20 + ctx.measureText(a).width;
      ctx.font = `800 48px ${NUM}`; ctx.fillText(d.pb.time, x, py); x += ctx.measureText(d.pb.time).width + 10;
      ctx.fillStyle = C.muted; ctx.font = `600 42px ${NUM}`; ctx.fillText(`(${d.pb.year})`, x, py);
    }

    // 頁尾
    const qr = qrLib && d.qrUrl ? (() => { try { const q = qrLib(0, "M"); q.addData(d.qrUrl); q.make(); return q; } catch (e) { return null; } })() : null;
    // QR 碼四邊留 4 格白邊（標準靜區），每格約 5px
    const qn = qr ? qr.getModuleCount() : 33, qcell = 4.9, qs = Math.round(qcell * (qn + 8)), qx = W - M - qs, qy = H - 30 - qs;   // 4 行紀錄時最後一行底約 y=1100，QR 頂須在其下
    ctx.fillStyle = C.accent; ctx.fillRect(M, H - 128, (qr ? qx - 24 : W - M) - M, 3);
    ctx.textAlign = "left"; ctx.fillStyle = C.muted; ctx.font = `500 30px ${NUM}`; ctx.fillText(d.url, M, H - 80);
    ctx.font = `500 27px ${CJK}`; ctx.fillText(d.source || "資料來源：教育及青年發展局公布成績", M, H - 40);
    if (qr) {
      ctx.textAlign = "right"; ctx.fillStyle = C.accent; ctx.font = `700 28px ${CJK}`; ctx.fillText("掃描查看個人頁 ›", qx - 24, H - 142);
      ctx.textAlign = "left";
      rr(ctx, qx, qy, qs, qs, 14); ctx.fillStyle = "#fff"; ctx.fill();
      const n = qn, cell = qs / (n + 8), pad = cell * 4;
      ctx.fillStyle = "#000";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(qx + pad + c * cell, qy + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
    }
    return cv;
  }

  /* ---------- 觀賽邀請卡：背景用校徽圖案，配色取自校徽 ---------- */
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  const hsl = (h, s, l, a = 1) => `hsla(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}% / ${a})`;
  // 校徽主色及副色：按色相分組（每 20 度），以飽和度加權，略去白、黑及灰色
  function crestPalette(img, hueFallback) {
    const fb = { p: [hueFallback || 150, .6, .45], s: null };
    if (!img) return fb;
    try {
      const n = 56, c = document.createElement("canvas"); c.width = c.height = n;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, n, n);
      const px = x.getImageData(0, 0, n, n).data, bins = new Map();
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 200) continue;
        const [h, sa, l] = rgb2hsl(px[i], px[i + 1], px[i + 2]);
        if (sa < .28 || l < .12 || l > .88) continue;
        const k = Math.floor(h / 20) % 18, b = bins.get(k) || { w: 0, h: 0, s: 0, l: 0, hx: 0, hy: 0 };
        b.w += sa; b.s += sa * sa; b.l += l * sa; b.hx += Math.cos(h * Math.PI / 180) * sa; b.hy += Math.sin(h * Math.PI / 180) * sa; bins.set(k, b);
      }
      const list = [...bins.values()].filter((b) => b.w > 6).sort((a, b) => b.w - a.w)
        .map((b) => [(Math.atan2(b.hy, b.hx) * 180 / Math.PI + 360) % 360, b.s / b.w, b.l / b.w]);
      if (!list.length) return fb;
      const p0 = list[0], dh = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
      const s0 = list.find((c) => dh(c[0], p0[0]) >= 40) || null;
      // 黃色作底色會變成啡綠色：有副色時黃色改作強調色
      if (s0 && p0[0] >= 38 && p0[0] <= 75) return { p: s0, s: p0 };
      return { p: p0, s: s0 };
    } catch (e) { return fb; }
  }

  async function invite(d) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    try { await Promise.all([document.fonts.load(`800 60px ${NUM}`), document.fonts.load(`700 60px ${NUM}`)]); } catch (e) { /* 後備字體 */ }
    const [img, qrLib] = await Promise.all([loadImg(d.crestImg), d.qrUrl ? loadQR() : null]);
    const pal = crestPalette(img, d.crestHue);
    const [ph, ps] = pal.p, sat = Math.min(Math.max(ps, .35), .8);
    // 強調色：副色（無副色時用主色）調亮，確保在深色底上清楚
    const acc = pal.s ? [pal.s[0], Math.min(Math.max(pal.s[1], .55), .95), Math.max(pal.s[2], .62)] : [ph, Math.min(sat + .15, .95), .66];
    const ACC = hsl(...acc), ACC_INK = hsl(acc[0], .6, .1);

    // 背景：校徽主色深色漸變
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, hsl(ph, sat, .1)); g.addColorStop(.55, hsl(ph, sat, .2)); g.addColorStop(1, hsl(ph, sat * .9, .3));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W * .85, H * .08, 20, W * .85, H * .08, 700);
    rg.addColorStop(0, hsl(acc[0], acc[1], acc[2], .32)); rg.addColorStop(1, hsl(acc[0], acc[1], acc[2], 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    // 校徽圖案：斜向交錯平鋪＋右下角大水印
    if (img) {
      const r = Math.min(1, img.width / img.height), tw = 104 * r, th = 104 / Math.max(r, img.width / img.height) * (img.height / img.width) * r || 104;
      const sc = 104 / Math.max(img.width, img.height), iw = img.width * sc, ih = img.height * sc;
      ctx.save(); ctx.globalAlpha = .07; ctx.translate(W / 2, H / 2); ctx.rotate(-14 * Math.PI / 180);
      for (let row = -9, k = 0; row <= 9; row++, k++) for (let col = -7; col <= 7; col++) {
        const x = col * 190 + (row % 2 ? 95 : 0), y = row * 170;
        ctx.drawImage(img, x - iw / 2, y - ih / 2, iw, ih);
      }
      ctx.restore();
      const big = 760 / Math.max(img.width, img.height);
      ctx.save(); ctx.globalAlpha = .1; ctx.drawImage(img, W - img.width * big * .72, H - img.height * big * .78, img.width * big, img.height * big); ctx.restore();
    } else contours(ctx, d.seed || d.name);
    // 底部壓暗，令文字清楚
    const sh = ctx.createLinearGradient(0, H * .5, 0, H); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.45)");
    ctx.fillStyle = sh; ctx.fillRect(0, H * .5, W, H * .5);

    // 頂部
    rr(ctx, M, 40, 58, 58, 12); ctx.fillStyle = C.accent; ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = `800 34px ${NUM}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("XC", M + 29, 70);
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = `800 38px ${CJK}`; ctx.fillText("澳門學界越野跑", M + 74, 70);
    ctx.font = `800 28px ${CJK}`; const tag = "觀賽邀請"; const tw2 = ctx.measureText(tag).width + 40;
    rr(ctx, W - M - tw2, 44, tw2, 52, 26); ctx.fillStyle = ACC; ctx.fill();
    ctx.fillStyle = ACC_INK; ctx.textAlign = "center"; ctx.fillText(tag, W - M - tw2 / 2, 71);

    // 校徽白底
    const cs = 204, cx = (W - cs) / 2, cy = 128;
    ctx.save(); ctx.shadowColor = hsl(acc[0], acc[1], acc[2], .55); ctx.shadowBlur = 60;
    rr(ctx, cx, cy, cs, cs, 48); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = ACC; rr(ctx, cx - 10, cy - 10, cs + 20, cs + 20, 56); ctx.stroke();
    if (img) { const r = Math.min((cs - 44) / img.width, (cs - 44) / img.height); ctx.drawImage(img, cx + (cs - img.width * r) / 2, cy + (cs - img.height * r) / 2, img.width * r, img.height * r); }
    else shield(ctx, cx + 50, cy + 30, cs - 60, d.crestAbbr || "?", d.crestHue || 150);

    // 標題及姓名
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = ACC; ctx.font = `900 56px ${CJK}`; ctx.fillText("邀請你來為我打氣！", W / 2, 420);
    ctx.fillStyle = "#fff"; fit(ctx, d.name, W - 2 * M - 40, 120, 60, 900, CJK); ctx.fillText(d.name, W / 2, 552);
    let y = 552;
    if (d.namePt) { ctx.fillStyle = "rgba(255,255,255,.72)"; fit(ctx, d.namePt, W - 2 * M, 44, 26, 700, NUM); ctx.fillText(d.namePt, W / 2, 606); y = 606; }
    ctx.fillStyle = "#fff"; fit(ctx, d.school, W - 2 * M, 40, 26, 700, CJK); ctx.fillText(d.school, W / 2, y + 56);
    // 組別膠囊
    const pills = [d.cat, d.heat ? `第 ${d.heat} 組` : null, d.laps && d.distance ? `${d.laps}・${(d.distance / 1000).toFixed(2).replace(/0$/, "")} 公里` : null].filter(Boolean);
    ctx.font = `800 32px ${CJK}`; const pw = pills.map((t) => ctx.measureText(t).width + 44), tot = pw.reduce((a, b) => a + b, 0) + (pills.length - 1) * 14;
    let px = (W - tot) / 2; const py = y + 86;
    pills.forEach((t, i) => {
      rr(ctx, px, py, pw[i], 58, 29); ctx.fillStyle = i === 0 ? ACC : "rgba(255,255,255,.12)"; ctx.fill();
      if (i) { ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.stroke(); }
      ctx.fillStyle = i === 0 ? ACC_INK : "#fff"; ctx.textBaseline = "middle"; ctx.fillText(t, px + pw[i] / 2, py + 31); ctx.textBaseline = "alphabetic"; px += pw[i] + 14;
    });

    // 資料面板：日期、地點、檢錄、起跑
    const by = py + 90, bh = d.note ? 330 : 296;
    rr(ctx, M, by, W - 2 * M, bh, 30); ctx.fillStyle = "rgba(0,0,0,.42)"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.stroke();
    const half = (W - 2 * M) / 2;
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(M + half, by + 28, 2, 112); ctx.fillRect(M + 36, by + 156, W - 2 * M - 72, 2);
    const cell = (lab, val, x, yy, big) => {
      ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.66)"; ctx.font = `700 28px ${CJK}`; ctx.fillText(lab, x, yy);
      ctx.fillStyle = big ? ACC : "#fff";
      if (big) { ctx.font = `800 92px ${NUM}`; ctx.fillText(val, x, yy + 92); } else { fit(ctx, val, half - 40, 42, 26, 900, CJK); ctx.fillText(val, x, yy + 58); }
    };
    cell("日期", d.date, M + half / 2, by + 56, false);
    cell("地點", d.venue, M + half * 1.5, by + 56, false);
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.66)"; ctx.font = `700 28px ${CJK}`;
    ctx.fillText("檢錄", M + half / 2, by + 200); ctx.fillText(d.startLabel, M + half * 1.5, by + 200);
    ctx.fillStyle = ACC; ctx.font = `800 86px ${NUM}`; ctx.fillText(d.call, M + half / 2, by + 280); ctx.fillText(d.start, M + half * 1.5, by + 280);
    if (d.note) { ctx.fillStyle = "rgba(255,255,255,.8)"; fit(ctx, d.note, W - 2 * M - 60, 26, 18, 700, CJK); ctx.fillText(d.note, W / 2, by + 316); }

    // 頁尾：QR 碼
    const qr = qrLib && d.qrUrl ? (() => { try { const q = qrLib(0, "M"); q.addData(d.qrUrl); q.make(); return q; } catch (e) { return null; } })() : null;
    // QR 碼四邊留 4 格白邊（標準靜區）
    const qn = qr ? qr.getModuleCount() : 37, qs = Math.round(4.3 * (qn + 8)), qx = W - M - qs, qy = H - 24 - qs;   // 須低於資料框底（有分組說明時約 y=1114）
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = `800 34px ${CJK}`; ctx.fillText("比賽日一同到松山打氣！", M, H - 150);
    ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.font = `600 26px ${CJK}`; ctx.fillText(qr ? "掃描 QR 碼：賽前預覽及比賽日即時成績" : "賽前預覽及比賽日即時成績", M, H - 104);
    ctx.font = `500 26px ${NUM}`; ctx.fillText(d.url, M, H - 68);
    ctx.font = `500 22px ${CJK}`; ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillText(`第 ${d.edition} 屆學界越野跑比賽・非官方整理`, M, H - 36);
    if (qr) {
      rr(ctx, qx, qy, qs, qs, 16); ctx.fillStyle = "#fff"; ctx.fill();
      const n = qn, cell2 = qs / (n + 8), pad = cell2 * 4;
      ctx.fillStyle = "#000";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(qx + pad + c * cell2, qy + pad + r * cell2, Math.ceil(cell2), Math.ceil(cell2));
    }
    return cv;
  }

  root.XCCard = { render, invite, W, H };
})(window);
