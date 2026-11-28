/* 運動員榮譽卡：運動風三款（與 card.js 的「經典」款並列，匯出視窗內選擇）
   dash  衝線：黑底、斜切橙色帶、螢光綠、速度線、松山地勢線、衝線格仔帶
   trail 山徑：等高線地圖、泥土及青草色、山徑指示牌、歷屆成績＝路線檢查點
   bib   號碼布：號碼布紙、泥點、斜紋、大字最佳名次、計時晶片成績條
   資料與 card.js 相同（app.js cardData）；QR 碼四邊留 4 格白邊（標準靜區）。 */
(function (root) {
  "use strict";
  const W = 1080, H = 1350;
  const ORANGE = "#ff6a1f", ORANGE2 = "#ff8f3a", LIME = "#c8ff3a", MUD = "#7a4a26", SAND = "#e9dcb8", MOSS = "#0e1f14";
  const GOLD = "#f6c544", SILVER = "#c8d0db", BRONZE = "#d58b4f";
  const MED = { 1: [GOLD, "#fff1b8", "#9c7200", "金"], 2: [SILVER, "#ffffff", "#7d8796", "銀"], 3: [BRONZE, "#ffd2ac", "#86502a", "銅"] };
  const CJK = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Heiti TC", sans-serif';
  const NUM = '"Barlow Condensed", "Roboto Condensed", "Arial Narrow", sans-serif';
  const QR_SRC = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
  const T9 = Math.tan(9 * Math.PI / 180);
  const tierCol = (t, base) => ({ gold: GOLD, silver: SILVER, bronze: BRONZE }[t] || base);

  // ---------- 共用 ----------
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function fit(ctx, text, max, size, min, font) {
    let s = size;
    do { ctx.font = font(s); if (ctx.measureText(text).width <= max) return s; s -= 2; } while (s >= min);
    return s;
  }
  function seeded(seed) { let h = 2166136261; for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
  function loadImg(src) { return new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  function loadQR() {
    if (root.qrcode) return Promise.resolve(root.qrcode);
    return new Promise((res) => { const s = document.createElement("script"); s.src = QR_SRC; s.onload = () => res(root.qrcode || null); s.onerror = () => res(null); document.head.appendChild(s); setTimeout(() => res(root.qrcode || null), 6000); });
  }
  function makeQR(lib, url) { if (!lib || !url) return null; try { const q = lib(0, "M"); q.addData(url); q.make(); return q; } catch (e) { return null; } }
  // QR 碼：四邊留 4 格靜區
  function drawQR(ctx, q, x, y, size, fg, bg, radius) {
    const n = q.getModuleCount(), cell = size / (n + 8), pad = cell * 4;
    rr(ctx, x, y, size, size, radius); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = fg;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x + pad + c * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
  }
  function contours(ctx, seed, color, w = W, h = H, n = 4) {
    const rnd = seeded(seed);
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    for (let k = 0; k < n; k++) {
      const cx = rnd() * w, cy = rnd() * h, a = rnd() * 6;
      for (let r = 60; r < 620; r += 44) {
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const th = (i / 72) * Math.PI * 2, rad = r * (1 + 0.16 * Math.sin(3 * th + a) + 0.08 * Math.sin(5 * th + a * 2));
          const x = cx + rad * Math.cos(th), y = cy + rad * 0.82 * Math.sin(th);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function mountain(ctx, x, y, s, color, lw) {   // 網站標誌：山形＋太陽（32×32 座標）
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(5, 23); ctx.lineTo(12, 13); ctx.lineTo(16, 18); ctx.lineTo(21, 10); ctx.lineTo(27, 23); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(21, 6.5, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function crestBox(ctx, img, d, x, y, size, tile) {
    if (tile) { rr(ctx, x, y, size, size, size * .22); ctx.fillStyle = "#fff"; ctx.fill(); }
    const inner = tile ? size * .8 : size;
    if (img) {
      const r = Math.min(inner / img.width, inner / img.height), w = img.width * r, h = img.height * r;
      ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
    } else {
      // 無校徽圖：以學校代碼畫盾形
      const w = inner * .86, h = inner, sx = x + (size - w) / 2, sy = y + (size - h) / 2;
      ctx.save(); ctx.translate(sx, sy);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h * .55); ctx.quadraticCurveTo(w, h * .85, w / 2, h); ctx.quadraticCurveTo(0, h * .85, 0, h * .55); ctx.closePath();
      ctx.fillStyle = `hsl(${d.crestHue || 150} 55% 36%)`; ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const ab = d.crestAbbr || "?"; fit(ctx, ab, w - 8, h * .38, 10, (s) => `800 ${s}px ${NUM}`); ctx.fillText(ab, w / 2, h * .45);
      ctx.restore(); ctx.textBaseline = "alphabetic";
    }
  }
  // 名次獎章：前三名金銀銅；第 4 至 10 名綠色（亦獲獎牌）；其餘深色
  function medal(ctx, x, y, r, place, darkBase) {
    ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (MED[place]) {
      const [c, hi, dk, zh] = MED[place], g = ctx.createRadialGradient(x - r * .3, y - r * .4, 1, x, y, r);
      g.addColorStop(0, hi); g.addColorStop(.55, c); g.addColorStop(1, dk); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = "#2a1e00"; ctx.font = `900 ${Math.round(r * .9)}px ${CJK}`; ctx.fillText(zh, x, y + 1);
    } else if (place <= 10) {
      const g = ctx.createRadialGradient(x - r * .3, y - r * .4, 1, x, y, r);
      g.addColorStop(0, "#a9ffd8"); g.addColorStop(.55, "#3fcf88"); g.addColorStop(1, "#0b8f55"); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = "#03140c"; ctx.font = `800 ${Math.round(r)}px ${NUM}`; ctx.fillText(String(place), x, y + 2);
    } else {
      ctx.fillStyle = darkBase ? "#232a33" : "#2b2b2b"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = darkBase ? "#39414c" : "#555"; ctx.stroke();
      ctx.fillStyle = "#e4e8ee"; fit(ctx, String(place), r * 1.6, r, r * .6, (s) => `800 ${s}px ${NUM}`); ctx.fillText(String(place), x, y + 2);
    }
    ctx.restore();
  }
  function skewX(ctx, deg, px, py) { ctx.translate(px, py); ctx.transform(1, 0, Math.tan(deg * Math.PI / 180), 1, 0, 0); ctx.translate(-px, -py); }
  function skewY(ctx, deg, px, py) { ctx.translate(px, py); ctx.transform(1, Math.tan(deg * Math.PI / 180), 0, 1, 0, 0); ctx.translate(-px, -py); }
  function catPill(ctx, text, x, cy, g, size, light) {
    ctx.save(); ctx.font = `900 ${size}px ${CJK}`;
    const w = ctx.measureText(text).width + size * 1.1, h = size * 1.5;
    skewX(ctx, -12, x, cy);
    ctx.fillStyle = g === "M" ? (light ? "#2f86d6" : "#4fb3ff") : (light ? "#e0447f" : "#ff6fae"); ctx.fillRect(x, cy - h / 2, w, h);
    ctx.fillStyle = light ? "#fff" : "#0a0a0c"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x + w / 2, cy + 1);
    ctx.restore(); return w;
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
  function heroStat(d) { if (d.cert) return { pre: "#", big: String(d.cert.place), post: "", lab: `第 ${d.cert.edition} 屆名次` }; return d.stats.wins ? { pre: "", big: String(d.stats.wins), post: "×", lab: "冠軍" } : { pre: "#", big: String(d.stats.best), post: "", lab: "最佳名次" }; }
  function statList(d) {
    const s = d.cert ? [[d.cert.finLabel || "完賽人數", String(d.cert.finVal ?? d.cert.finishers)], ["獎牌", String(d.stats.medals)], ["名次", `#${d.cert.place}`]]
      : [["參賽", String(d.stats.races)], ["獎牌", String(d.stats.medals)], ["最佳", `#${d.stats.best}`]];
    s.push(d.pb ? [d.pb.text || `${d.pb.label}最佳`, d.pb.time] : ["冠軍", String(d.stats.wins)]);
    return s;
  }
  async function prep(d) {
    try { await Promise.all([document.fonts.load(`800 60px ${NUM}`), document.fonts.load(`italic 800 60px ${NUM}`), document.fonts.load(`700 60px ${NUM}`)]); } catch (e) { /* 後備字體 */ }
    const [img, lib] = await Promise.all([loadImg(d.crestImg), d.qrUrl ? loadQR() : null]);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    return { cv, ctx: cv.getContext("2d"), img, qr: makeQR(lib, d.qrUrl) };
  }

  // ---------- 衝線 ----------
  async function dash(d) {
    const { cv, ctx, img, qr } = await prep(d);
    const tc = tierCol(d.tier, LIME), ink = "#120700";
    ctx.fillStyle = "#0a0a0c"; ctx.fillRect(0, 0, W, H);
    // 速度線
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.025)"; ctx.lineWidth = 4;
    for (let k = -H; k < W + H; k += 50) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k - H * .53, H); ctx.stroke(); }
    ctx.restore();
    // 斜切色帶（skewY -9°，以 x=580 為中心）
    const band = (top, h, fill) => {
      ctx.beginPath(); ctx.moveTo(0, top + T9 * 580); ctx.lineTo(W, top - T9 * 500); ctx.lineTo(W, top - T9 * 500 + h); ctx.lineTo(0, top + T9 * 580 + h); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    };
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, ORANGE); g.addColorStop(.55, ORANGE2); g.addColorStop(1, tc);
    band(96, 370, g);
    ctx.save(); band(96, 370, "rgba(0,0,0,0)"); ctx.clip(); ctx.fillStyle = "rgba(0,0,0,.06)"; for (let x = 28; x < W; x += 30) ctx.fillRect(x, 0, 2, 560); ctx.restore();
    band(478, 14, tc);
    // 頂部
    mountain(ctx, 60, 48, 44, LIME, 3);
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.fillStyle = LIME; ctx.font = `italic 800 44px ${NUM}`; ctx.fillText("XC", 114, 72);
    ctx.fillStyle = "#fff"; ctx.font = `900 30px ${CJK}`; ctx.fillText("澳門學界越野跑", 174, 72);
    ctx.textBaseline = "alphabetic";
    // 右上小字沿色帶傾斜，保持在色帶內
    ctx.save(); skewY(ctx, -9, 580, 281); ctx.textAlign = "right"; ctx.fillStyle = ink; ctx.font = `italic 800 28px ${NUM}`; ctx.fillText("CROSS COUNTRY・ATHLETE", W - 60, 140); ctx.restore();
    // 主角（隨色帶傾斜）
    const hs = heroStat(d);
    ctx.save(); skewY(ctx, -9, 330, 300);
    ctx.save(); skewX(ctx, -8, 60, 262);
    ctx.fillStyle = ink; ctx.textAlign = "left"; fit(ctx, d.name, 560, 118, 60, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.name, 60, 262);
    ctx.restore();
    ctx.textAlign = "left";
    if (d.namePt) { ctx.fillStyle = "rgba(18,7,0,.78)"; fit(ctx, d.namePt, 560, 44, 26, (s) => `italic 800 ${s}px ${NUM}`); ctx.fillText(d.namePt, 64, 316); }
    crestBox(ctx, img, d, 60, 336, 64, true);
    ctx.fillStyle = ink; fit(ctx, d.school, 480, 32, 20, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.school, 138, 380);
    ctx.restore();
    // 大數字（右上）
    ctx.save(); skewY(ctx, -9, 880, 250); skewX(ctx, -8, 880, 300);
    ctx.textAlign = "right"; ctx.fillStyle = ink;
    ctx.font = `italic 800 120px ${NUM}`; const postW = hs.post ? ctx.measureText(hs.post).width : 0;
    if (hs.post) ctx.fillText(hs.post, W - 58, 318);
    ctx.font = `italic 800 250px ${NUM}`; ctx.fillText(hs.big, W - 58 - postW - (hs.post ? 4 : 0), 318);
    if (hs.pre) { const bw = ctx.measureText(hs.big).width; ctx.font = `italic 800 120px ${NUM}`; ctx.fillText(hs.pre, W - 58 - bw - 6, 318); }
    ctx.font = `900 40px ${CJK}`; ctx.letterSpacing = "12px"; ctx.fillText(hs.lab, W - 58, 378); ctx.letterSpacing = "0px";
    ctx.restore();
    // 狀態
    if (d.status) {
      ctx.save(); ctx.font = `900 26px ${CJK}`; const sw = ctx.measureText(d.status).width + 36;
      skewX(ctx, -12, 60, 538); ctx.fillStyle = d.statusMuted ? "#d9dde3" : LIME; ctx.fillRect(60, 516, sw, 44);
      ctx.fillStyle = "#0a0a0c"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(d.status, 78, 539); ctx.restore();
    }
    // 松山地勢線
    const rnd = seeded("D" + d.seed), ks = [0, 1, 2, 3, 4].map((k) => [0.6 + rnd() * .8, rnd() * 6, .3 + rnd() * .7]);
    const ele = []; for (let x = 0; x <= W; x += 12) { const t = x / W * Math.PI * 2; ele.push([x, 640 - 34 * ks.reduce((a, [f, ph, am], k) => a + am * Math.sin(f * (k + 1) * t + ph) / (k + 1), 0)]); }
    const eg = ctx.createLinearGradient(0, 560, 0, 740); eg.addColorStop(0, "rgba(47,107,58,.55)"); eg.addColorStop(1, "rgba(10,10,12,0)");
    ctx.beginPath(); ctx.moveTo(0, 740); ele.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(W, 740); ctx.closePath(); ctx.fillStyle = eg; ctx.fill();
    ctx.save(); ctx.setLineDash([2, 10]); ctx.lineCap = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(200,255,58,.7)";
    ctx.beginPath(); ele.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
    // 四格數據
    const sts = statList(d), unit = (W - 120) / 3.8, ws = [.8, .8, .8, 1.4].map((f) => f * unit);
    let sx = 60;
    sts.forEach(([lab, val], i) => {
      ctx.save(); skewX(ctx, -10, sx, 650);
      ctx.fillStyle = ORANGE; ctx.fillRect(sx, 606, 6, 92);
      ctx.restore();
      ctx.textAlign = "left"; ctx.fillStyle = ORANGE; fit(ctx, lab, ws[i] - 30, 24, 16, (s) => `900 ${s}px ${CJK}`); ctx.fillText(lab, sx + 22, 630);
      ctx.fillStyle = "#fff"; fit(ctx, val, ws[i] - 30, 74, 40, (s) => `italic 800 ${s}px ${NUM}`); ctx.fillText(val, sx + 18, 694);
      sx += ws[i];
    });
    // 紀錄
    ctx.textAlign = "left"; ctx.fillStyle = tc; ctx.font = `italic 800 40px ${NUM}`; ctx.letterSpacing = "5px";
    const head = d.stats.medals ? "HALL OF FAME" : "RACE HISTORY"; ctx.fillText(head, 60, 778);
    const hw = ctx.measureText(head).width; ctx.letterSpacing = "0px";
    ctx.fillStyle = "#fff"; ctx.font = `900 30px ${CJK}`; ctx.fillText(d.title, 60 + hw + 18, 776);
    const rows = d.rows.slice(0, 5), rh = rows.length >= 5 ? 62 : 76;
    rows.forEach((r, i) => {
      const y = 800 + i * (rh + 7), cy = y + rh / 2;
      const rg = ctx.createLinearGradient(60, 0, W - 60, 0); rg.addColorStop(0, "rgba(255,255,255,.08)"); rg.addColorStop(1, "rgba(255,255,255,.016)");
      ctx.beginPath(); ctx.moveTo(74, y); ctx.lineTo(W - 60, y); ctx.lineTo(W - 74, y + rh); ctx.lineTo(60, y + rh); ctx.closePath(); ctx.fillStyle = rg; ctx.fill();
      medal(ctx, 104, cy, rh * .44, r.place, true);
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.fillStyle = "#fff"; ctx.font = `italic 800 42px ${NUM}`; ctx.fillText(r.year, 152, cy + 2);
      const yw = ctx.measureText(r.year).width;
      ctx.fillStyle = "#9aa0a8"; ctx.font = `700 26px ${CJK}`; ctx.fillText(`第${r.edition}屆`, 152 + yw + 12, cy + 2);
      catPill(ctx, r.cat, 520, cy, r.gender, 26, false);
      ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = `italic 800 58px ${NUM}`; ctx.fillText(r.time, W - 86, cy + 4);
      ctx.textBaseline = "alphabetic";
    });
    certPanel(ctx, d, 60, 800 + rows.length * (rh + 7) + 26, W - 120, 230, { bg: "rgba(255,255,255,.05)", line: "rgba(255,255,255,.12)", fg: "#fff", accent: tc, muted: "#9aa0a8" });
    // 頁尾＋QR
    ctx.textAlign = "left"; ctx.fillStyle = "#8a9099"; ctx.font = `700 22px ${CJK}`;
    ctx.fillText("非官方整理・" + (d.source || "資料來源：教育及青年發展局公布成績"), 60, H - 92);
    ctx.font = `600 24px ${NUM}`; ctx.fillText(d.url, 60, H - 60);
    if (qr) {
      const qs = 150, qx = W - 60 - qs, qy = H - 40 - qs;
      drawQR(ctx, qr, qx, qy, qs, "#000", "#fff", 8);
      ctx.textAlign = "right"; ctx.fillStyle = "#8a9099"; ctx.font = `700 22px ${CJK}`; ctx.fillText("掃描查看", qx - 14, qy + qs - 36); ctx.fillText("個人頁 ›", qx - 14, qy + qs - 8);
    }
    // 衝線格仔帶
    for (let x = 0, k = 0; x < W; x += 28, k++) { ctx.fillStyle = k % 2 ? "#0a0a0c" : "#fff"; ctx.fillRect(x, H - 28, 28, 14); ctx.fillStyle = k % 2 ? "#fff" : "#0a0a0c"; ctx.fillRect(x, H - 14, 28, 14); }
    return cv;
  }

  // ---------- 山徑 ----------
  async function trail(d) {
    const { cv, ctx, img, qr } = await prep(d);
    const tc = tierCol(d.tier, ORANGE);
    ctx.fillStyle = MOSS; ctx.fillRect(0, 0, W, H);
    const rad = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
    rad(W * .8, H * .2, 700, "rgba(44,90,55,.9)"); rad(W * .1, H * .9, 650, "rgba(74,52,24,.65)");
    ctx.fillStyle = "rgba(233,220,184,.04)"; for (let x = 0; x < W; x += 120) ctx.fillRect(x, 0, 2, H); for (let y = 0; y < H; y += 120) ctx.fillRect(0, y, W, 2);
    contours(ctx, "E" + d.seed, "rgba(233,220,184,.09)");
    // 路線及檢查點（舊 → 新）
    const rows = d.rows.slice(0, 5).slice().reverse(), n = rows.length;
    const pts = rows.map((r, i) => { const t = n > 1 ? i / (n - 1) : 0; return [130 + t * 600 + 40 * Math.sin(t * 7), 1140 - t * 340 + 30 * Math.cos(t * 5)]; });
    const route = () => {
      ctx.beginPath(); ctx.moveTo(40, 1220); let px = 40, py = 1220;
      pts.forEach(([x, y]) => { ctx.quadraticCurveTo((px + x) / 2 + 50, (py + y) / 2 + 40, x, y); px = x; py = y; });
    };
    ctx.save(); ctx.lineCap = "round"; route(); ctx.strokeStyle = MOSS; ctx.lineWidth = 16; ctx.stroke();
    route(); ctx.setLineDash([18, 14]); ctx.strokeStyle = ORANGE; ctx.lineWidth = 7; ctx.stroke(); ctx.restore();
    pts.forEach(([x, y], i) => {
      const r = rows[i], col = MED[r.place] ? MED[r.place][0] : r.place <= 10 ? LIME : SAND;
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = MOSS; ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#1a1205"; fit(ctx, String(r.place), 46, 34, 22, (s) => `800 ${s}px ${NUM}`); ctx.fillText(String(r.place), x, y + 2);
      rr(ctx, x + 38, y - 34, 190, 68, 10); ctx.fillStyle = "rgba(14,31,20,.93)"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(233,220,184,.33)"; ctx.stroke();
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#fff"; ctx.font = `800 34px ${NUM}`; ctx.fillText(r.time, x + 54, y - 4);
      ctx.fillStyle = SAND; fit(ctx, `${r.year.slice(2)}・${r.cat}`, 160, 20, 14, (s) => `700 ${s}px ${CJK}`); ctx.fillText(`${r.year.slice(2)}・${r.cat}`, x + 54, y + 24);
    });
    certPanel(ctx, d, 400, 890, W - 460, 230, { bg: "rgba(14,31,20,.9)", line: "rgba(233,220,184,.33)", fg: "#fff", accent: ORANGE, muted: SAND });
    // 頂部
    mountain(ctx, 60, 48, 44, ORANGE, 3);
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.fillStyle = ORANGE; ctx.font = `800 44px ${NUM}`; ctx.fillText("XC", 114, 72);
    ctx.fillStyle = SAND; ctx.font = `900 30px ${CJK}`; ctx.fillText("澳門學界越野跑", 170, 72);
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(233,220,184,.6)"; ctx.font = `700 26px ${NUM}`; ctx.fillText("22.19°N 113.55°E・松山", W - 60, 72);
    ctx.textBaseline = "alphabetic";
    // 指示牌
    const pg = ctx.createLinearGradient(92, 0, 118, 0); pg.addColorStop(0, "#5a3a1d"); pg.addColorStop(.5, MUD); pg.addColorStop(1, "#4a2e15");
    ctx.fillStyle = pg; rr(ctx, 92, 140, 26, 560, 4); ctx.fill();
    const sx = 44, sy = 140, sw = 760, sh = 236;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw * .86, sy); ctx.lineTo(sx + sw, sy + sh / 2); ctx.lineTo(sx + sw * .86, sy + sh); ctx.lineTo(sx, sy + sh); ctx.closePath();
    const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh); sg.addColorStop(0, ORANGE); sg.addColorStop(1, "#e2531a"); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(sx + 18 + 9, sy + sh / 2, 9, 0, Math.PI * 2); ctx.fillStyle = "rgba(26,11,2,.67)"; ctx.fill();
    ctx.fillStyle = "#1a0b02"; ctx.textAlign = "left"; fit(ctx, d.name, 520, 112, 56, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.name, sx + 58, sy + 138);
    if (d.namePt) { ctx.fillStyle = "rgba(26,11,2,.85)"; fit(ctx, d.namePt, 540, 42, 24, (s) => `800 ${s}px ${NUM}`); ctx.fillText(d.namePt, sx + 60, sy + 196); }
    // 徽章
    const hs = heroStat(d), bx = W - 54 - 115, by = 265;
    ctx.beginPath(); ctx.arc(bx, by, 129, 0, Math.PI * 2); ctx.fillStyle = tc + "88"; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, 125, 0, Math.PI * 2); ctx.fillStyle = MOSS; ctx.fill();
    const bg = ctx.createRadialGradient(bx - 40, by - 50, 5, bx, by, 115); bg.addColorStop(0, "rgba(255,255,255,.35)"); bg.addColorStop(.6, tc); bg.addColorStop(1, tc);
    ctx.beginPath(); ctx.arc(bx, by, 115, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = "#1a1205"; ctx.textAlign = "center";
    const bigTxt = hs.pre + hs.big + hs.post; fit(ctx, bigTxt, 190, 120, 60, (s) => `800 ${s}px ${NUM}`); ctx.fillText(bigTxt, bx, by + 30);
    ctx.font = `900 28px ${CJK}`; ctx.letterSpacing = "5px"; ctx.fillText(hs.lab, bx + 3, by + 72); ctx.letterSpacing = "0px";
    // 學校＋狀態
    crestBox(ctx, img, d, 150, 412, 76, true);
    ctx.textAlign = "left"; ctx.fillStyle = SAND; fit(ctx, d.school, 420, 34, 22, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.school, 244, 462);
    if (d.status) {
      const scw = ctx.measureText(d.school).width; ctx.font = `700 24px ${CJK}`; const tw = ctx.measureText(d.status).width + 24;
      const tx = Math.min(244 + scw + 14, W - 60 - tw), ty = 434;
      if (244 + scw + 14 + tw <= W - 60) { rr(ctx, tx, ty, tw, 38, 6); ctx.fillStyle = SAND; ctx.fill(); ctx.fillStyle = MOSS; ctx.fillText(d.status, tx + 12, ty + 28); }
    }
    // 圖例（四格數據）
    let lx = 150; const sts = statList(d);
    sts.forEach(([lab, val], i) => {
      ctx.font = `700 22px ${CJK}`; const lw1 = ctx.measureText(lab).width; ctx.font = `800 52px ${NUM}`; const lw2 = ctx.measureText(val).width;
      const tw = Math.max(lw1, lw2) + 40;
      rr(ctx, lx, 530, tw, 100, 14); ctx.fillStyle = "rgba(14,31,20,.8)"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(233,220,184,.27)"; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = "rgba(233,220,184,.73)"; ctx.font = `700 22px ${CJK}`; ctx.fillText(lab, lx + tw / 2, 564);
      ctx.fillStyle = i === 3 ? LIME : "#fff"; ctx.font = `800 52px ${NUM}`; ctx.fillText(val, lx + tw / 2, 616);
      lx += tw + 16;
    });
    ctx.textAlign = "left"; ctx.fillStyle = ORANGE; ctx.font = `800 34px ${NUM}`; ctx.letterSpacing = "5px"; ctx.fillText("TRAIL RECORD", 60, 734);
    const tw0 = ctx.measureText("TRAIL RECORD").width; ctx.letterSpacing = "0px";
    ctx.fillStyle = SAND; ctx.font = `900 28px ${CJK}`; ctx.fillText(d.title, 60 + tw0 + 14, 733);
    // 頁尾
    ctx.fillStyle = "rgba(233,220,184,.67)"; ctx.font = `700 22px ${CJK}`; ctx.fillText("非官方整理・" + (d.source || "資料來源：教育及青年發展局公布成績"), 60, H - 80);
    ctx.font = `600 24px ${NUM}`; ctx.fillText(d.url, 60, H - 48);
    if (qr) drawQR(ctx, qr, W - 60 - 150, H - 40 - 150, 150, MOSS, "#f3ead2", 10);
    return cv;
  }

  // ---------- 號碼布 ----------
  async function bib(d) {
    const { cv, ctx, img, qr } = await prep(d);
    const tc = tierCol(d.tier, LIME), ink = "#111", PW = 972, PH = 1250;
    const gg = ctx.createRadialGradient(W / 2, H * .4, 50, W / 2, H * .4, 900); gg.addColorStop(0, "#3a2a1a"); gg.addColorStop(1, "#120c07");
    ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(1.2 * Math.PI / 180); ctx.translate(-PW / 2, -PH / 2);
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = 80; ctx.shadowOffsetY = 36; rr(ctx, 0, 0, PW, PH, 18); ctx.fillStyle = "#f6f4ef"; ctx.fill(); ctx.restore();
    rr(ctx, 0, 0, PW, PH, 18); ctx.clip();
    // 頂帶
    ctx.fillStyle = ink; ctx.fillRect(0, 0, PW, 170);
    ctx.save(); ctx.beginPath(); ctx.rect(PW - 380, 0, 380, 170); ctx.clip(); ctx.fillStyle = tc;
    for (let x = PW - 480; x < PW + 200; x += 52) { ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(x + 26, 170); ctx.lineTo(x + 26 + 98, 0); ctx.lineTo(x + 98, 0); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.textAlign = "left"; ctx.fillStyle = tc; ctx.font = `italic 800 28px ${NUM}`; ctx.letterSpacing = "4px"; ctx.fillText("MACAU SCHOOLS CROSS COUNTRY", 54, 72); ctx.letterSpacing = "0px";
    ctx.fillStyle = "#fff"; ctx.font = `900 40px ${CJK}`; ctx.fillText("澳門學界越野跑・榮譽卡", 54, 124);
    ctx.save(); skewX(ctx, -10, PW - 150, 85); ctx.fillStyle = tc; ctx.fillRect(PW - 260, 45, 206, 82); ctx.restore();
    mountain(ctx, PW - 248, 56, 58, ink, 3); ctx.fillStyle = ink; ctx.font = `italic 800 76px ${NUM}`; ctx.fillText("XC", PW - 184, 114);
    // 泥點
    const rnd = seeded("F" + d.seed);
    for (let i = 0; i < 38; i++) {
      const x = rnd() < .5 ? -20 + rnd() * 180 : 800 + rnd() * 200, y = 170 + rnd() * 1080, s = 6 + rnd() * 40;
      ctx.save(); ctx.globalAlpha = .25 + rnd() * .45; ctx.translate(x, y); ctx.rotate(rnd() * Math.PI);
      ctx.beginPath(); ctx.ellipse(0, 0, s / 2, s * (.3 + rnd() * .2), 0, 0, Math.PI * 2); ctx.fillStyle = MUD; ctx.fill(); ctx.restore();
    }
    // 扣針孔
    for (const x of [39, PW - 39]) for (const y of [209, 849]) { ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fillStyle = "#1a120b"; ctx.fill(); }
    // 大字最佳名次（上黑下橙）
    ctx.textAlign = "center"; ctx.fillStyle = "#777"; ctx.font = `900 30px ${CJK}`; ctx.letterSpacing = "12px"; ctx.fillText(d.cert ? `第 ${d.cert.edition} 屆名次` : "最佳名次", PW / 2 + 6, 228); ctx.letterSpacing = "0px";
    const best = String(d.cert ? d.cert.place : d.stats.best), bs = best.length < 2 ? 380 : 330, base = 520;
    ctx.font = `italic 800 ${bs}px ${NUM}`; const bw = ctx.measureText(best).width;
    ctx.font = `italic 800 150px ${NUM}`; const hw = ctx.measureText("#").width;
    const x0 = PW / 2 - (bw + hw + 8) / 2;
    const ng = ctx.createLinearGradient(0, base - bs * .72, 0, base); ng.addColorStop(0, ink); ng.addColorStop(.62, ink); ng.addColorStop(.62, ORANGE); ng.addColorStop(1, ORANGE);
    ctx.textAlign = "left"; ctx.fillStyle = ng; ctx.fillText("#", x0, base - bs * .3);
    ctx.font = `italic 800 ${bs}px ${NUM}`; ctx.fillText(best, x0 + hw + 8, base);
    // 校徽、姓名、QR
    crestBox(ctx, img, d, 72, 566, 110, false);
    ctx.textAlign = "center"; ctx.fillStyle = ink; fit(ctx, d.school, 170, 24, 14, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.school, 127, 712);
    ctx.textAlign = "left"; fit(ctx, d.name, 500, 96, 50, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.name, 228, 654);
    if (d.namePt) { ctx.fillStyle = "#666"; fit(ctx, d.namePt, 500, 40, 22, (s) => `italic 800 ${s}px ${NUM}`); ctx.fillText(d.namePt, 230, 704); }
    if (qr) { drawQR(ctx, qr, PW - 54 - 150, 548, 150, ink, "#fff", 8); ctx.textAlign = "center"; ctx.fillStyle = "#555"; ctx.font = `900 20px ${CJK}`; ctx.fillText("掃描看個人頁", PW - 54 - 75, 724); }
    // 數據條（斜）
    const sts = [d.cert ? [d.cert.finLabel || "完賽人數", String(d.cert.finVal ?? d.cert.finishers), false] : ["參賽", String(d.stats.races), false], ["冠軍", String(d.stats.wins), !!d.stats.wins], ["獎牌", String(d.stats.medals), false]];
    const last = d.pb ? [d.pb.text || `${d.pb.label}最佳`, d.pb.time] : ["最佳", `#${d.stats.best}`];
    const unit = (PW - 108) / 4.6; let bx = 54;
    [...sts, [last[0], last[1], false]].forEach(([lab, val, hl], i) => {
      const w = i === 3 ? unit * 1.6 : unit;
      ctx.save(); skewX(ctx, -10, bx, 802); ctx.fillStyle = i === 3 ? ORANGE : ink; ctx.fillRect(bx, 752, w - (i === 3 ? 0 : 4), 100); ctx.restore();
      ctx.textAlign = "center"; ctx.fillStyle = i === 3 ? "rgba(17,17,17,.75)" : "rgba(255,255,255,.75)"; fit(ctx, lab, w - 24, 22, 14, (s) => `900 ${s}px ${CJK}`); ctx.fillText(lab, bx + w / 2, 786);
      ctx.fillStyle = i === 3 ? ink : hl ? tc : "#fff"; fit(ctx, val, w - 24, 56, 30, (s) => `italic 800 ${s}px ${NUM}`); ctx.fillText(val, bx + w / 2, 840);
      bx += w;
    });
    // 計時晶片成績條
    ctx.fillStyle = "#ebe8e0"; ctx.fillRect(0, 880, PW, PH - 880);
    ctx.save(); ctx.setLineDash([16, 10]); ctx.lineWidth = 5; ctx.strokeStyle = "#bdb7a9"; ctx.beginPath(); ctx.moveTo(0, 882); ctx.lineTo(PW, 882); ctx.stroke(); ctx.restore();
    ctx.textAlign = "left"; ctx.fillStyle = "#555"; ctx.font = `italic 800 30px ${NUM}`; ctx.letterSpacing = "4px"; ctx.fillText("TIMING CHIP", 54, 934); ctx.letterSpacing = "0px";
    ctx.textAlign = "right"; ctx.fillStyle = ink; ctx.font = `900 30px ${CJK}`; ctx.fillText(d.title, PW - 54, 934);
    const rows = d.rows.slice(0, 5), rh = Math.min(64, 220 / Math.max(rows.length, 1));
    rows.forEach((r, i) => {
      const y = 946 + i * rh, cy = y + rh / 2;
      ctx.fillStyle = "#d9d4c8"; ctx.fillRect(54, y + rh - 2, PW - 108, 2);
      medal(ctx, 54 + 24, cy, Math.min(24, rh * .42), r.place, false);
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.fillStyle = ink; ctx.font = `italic 800 34px ${NUM}`; ctx.fillText(r.year, 120, cy + 2);
      const yw = ctx.measureText(r.year).width;
      ctx.fillStyle = "#777"; ctx.font = `700 22px ${CJK}`; ctx.fillText(`第${r.edition}屆`, 120 + yw + 12, cy + 2);
      catPill(ctx, r.cat, 390, cy, r.gender, 22, true);
      ctx.textAlign = "right"; ctx.fillStyle = ink; ctx.font = `italic 800 46px ${NUM}`; ctx.fillText(r.time, PW - 54, cy + 3);
      ctx.textBaseline = "alphabetic";
    });
    if (d.cert && rows.length <= 2) certPanel(ctx, d, 54, 946 + rows.length * rh + 12, PW - 108, 150, { bg: "#f6f4ef", line: "#d9d4c8", fg: ink, accent: ORANGE, muted: "#666", small: true });
    ctx.textAlign = "left"; ctx.fillStyle = "#777"; ctx.font = `700 20px ${CJK}`;
    ctx.fillText(`${d.status ? d.status + "・" : ""}非官方整理・${d.source || "資料來源：教育及青年發展局公布成績"}`, 54, PH - 44);
    ctx.font = `600 22px ${NUM}`; ctx.fillText(d.url, 54, PH - 18);
    ctx.restore();
    return cv;
  }

  // ================= 完賽紀念卡：相片／插畫背景（第 48 屆；只供紀念卡） =================
  // 背景圖 docs/img/cert/*.jpg（1080×1350）；版面以 928 寬的邏輯座標繪畫（與示範稿一致），再按比例放大
  const LW = 928, LK = W / LW, LH = H / LK;
  async function photoPrep(d, key) {
    const base = await prep(d);
    const bg = await loadImg(`img/cert/${key}.jpg`);
    const { ctx } = base;
    if (bg) { const s = Math.max(W / bg.width, H / bg.height), w = bg.width * s, h = bg.height * s; ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h); }
    else { ctx.fillStyle = "#0b1410"; ctx.fillRect(0, 0, W, H); }
    ctx.save(); ctx.scale(LK, LK);
    return base;
  }
  function shade(ctx, stops) { const g = ctx.createLinearGradient(0, 0, 0, LH); for (const [p, c] of stops) g.addColorStop(p, c); ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH); }
  function brandXC(ctx, x, y, xc, fg, bg) {
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.font = `italic 800 34px ${NUM}`; const xw = ctx.measureText("XC").width;
    ctx.font = `900 26px ${CJK}`; const tw = ctx.measureText("澳門學界越野跑").width;
    if (bg) { rr(ctx, x - 16, y - 22, xw + tw + 44, 44, 22); ctx.fillStyle = bg; ctx.fill(); }
    ctx.fillStyle = xc; ctx.font = `italic 800 34px ${NUM}`; ctx.fillText("XC", x, y + 1);
    ctx.fillStyle = fg; ctx.font = `900 26px ${CJK}`; ctx.fillText("澳門學界越野跑", x + xw + 10, y);
    ctx.textBaseline = "alphabetic";
  }
  function pill(ctx, text, x, top, bg, fg, size = 22, align = "left") {
    ctx.font = `900 ${size}px ${CJK}`; const w = ctx.measureText(text).width + size * 1.4, h = size * 1.75;
    const x0 = align === "center" ? x - w / 2 : x;
    rr(ctx, x0, top, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, x0 + size * .7, top + h / 2 + 1); ctx.textBaseline = "alphabetic";
    return w;
  }
  function certInfo(d) {
    const k = d.cert, top = !!k.finLabel, hasTime = !!k.time && k.time !== "-";
    return { k, top, hasTime, finLab: k.finLabel || "完賽人數", finVal: String(k.finVal ?? k.finishers),
             sub: top ? "大會公佈頭十名" : `完賽 ${k.finishers} 人`, foot: `非官方整理・${k.event}` };
  }
  // 姓名＋校徽＋學校（左下）
  function nameBlock(ctx, d, x, y, maxW, size, fg, sub, crestImg) {
    ctx.textAlign = "left"; ctx.fillStyle = fg; fit(ctx, d.name, maxW, size, size * .55, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.name, x, y);
    const sy = y + size * .5 + 4;
    crestBox(ctx, crestImg, d, x, sy - 30, 38, true);
    ctx.fillStyle = sub; fit(ctx, d.school, maxW - 48, 30, 18, (s) => `700 ${s}px ${CJK}`); ctx.fillText(d.school, x + 48, sy);
  }
  // 數據列：[標題, 數值, 顏色, 中文?]
  function statsRow(ctx, items, x, labY, valY, lab, fg) {
    let cx = x;
    for (const [l, v, c, zh] of items) {
      ctx.textAlign = "left"; ctx.fillStyle = lab; ctx.font = `700 20px ${CJK}`; ctx.fillText(l, cx, zh ? valY - 56 : labY);
      ctx.fillStyle = c || fg; ctx.font = zh ? `900 52px ${CJK}` : `800 92px ${NUM}`; ctx.fillText(v, cx, valY);
      cx += Math.max(ctx.measureText(v).width, 80) + 44;
    }
  }
  function footRow(ctx, left, right, y, col) {
    ctx.fillStyle = col; ctx.textAlign = "left";
    FITF(ctx, left, LW - 96 - 270, 18, 12, 700); ctx.fillText(left, 48, y);
    ctx.textAlign = "right"; ctx.font = `600 20px ${NUM}`; ctx.fillText(right, LW - 48, y);
  }
  function finish(ctx, cv) { ctx.restore(); return cv; }

  // ---------- 松山山徑（中學） ----------
  async function cTrail(d) {
    const { cv, ctx, img } = await photoPrep(d, "trail"), I = certInfo(d);
    shade(ctx, [[0, "rgba(0,0,0,.45)"], [.22, "rgba(0,0,0,0)"], [.45, "rgba(0,0,0,0)"], [.78, "rgba(4,14,8,.92)"], [1, "rgba(4,14,8,.96)"]]);
    brandXC(ctx, 48, 60, "#4ade80", "#fff");
    const yn = LH - 330;
    pill(ctx, `第 ${I.k.edition} 屆完賽紀念`, 48, yn - 132, "#4ade80", "#0b1a10");
    nameBlock(ctx, d, 48, yn, LW - 96, 92, "#fff", "rgba(255,255,255,.9)", img);
    const it = [[I.k.cat, `#${I.k.place}`]];
    if (I.hasTime) it.push(["完成時間", I.k.time]);
    it.push([I.finLab, I.finVal]);
    statsRow(ctx, it, 48, yn + 96, yn + 186, "rgba(255,255,255,.8)", "#fff");
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = `500 22px ${CJK}`; ctx.textAlign = "left"; ctx.fillText(`${I.k.event}・松山`, 48, yn + 232);
    footRow(ctx, "非官方整理・" + (d.source || "").replace(/^資料來源：/, ""), d.url, LH - 38, "rgba(255,255,255,.75)");
    return finish(ctx, cv);
  }
  // ---------- 陽光衝線（中學） ----------
  async function cSun(d) {
    const { cv, ctx, img } = await photoPrep(d, "sun"), I = certInfo(d);
    shade(ctx, [[0, "rgba(0,0,0,.55)"], [.26, "rgba(0,0,0,.15)"], [.4, "rgba(0,0,0,0)"], [.58, "rgba(0,0,0,.25)"], [.78, "rgba(0,0,0,.9)"], [1, "rgba(0,0,0,.95)"]]);
    brandXC(ctx, 48, 60, "#4ade80", "#fff");
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 6;
    ctx.textAlign = "right"; ctx.fillStyle = "#fb923c"; fit(ctx, `#${I.k.place}`, 520, 230, 120, (s) => `italic 800 ${s}px ${NUM}`); ctx.fillText(`#${I.k.place}`, LW - 44, 292);
    ctx.font = `900 24px ${CJK}`; ctx.letterSpacing = "6px"; ctx.fillStyle = "#fff"; ctx.fillText(`第 ${I.k.edition} 屆名次`, LW - 44, 336); ctx.letterSpacing = "0px";
    ctx.restore();
    const yn = LH - 300;
    pill(ctx, `第 ${I.k.edition} 屆完賽紀念`, 48, yn - 128, "#4ade80", "#0b1a10");
    nameBlock(ctx, d, 48, yn, LW - 96, 92, "#fff", "rgba(255,255,255,.9)", img);
    const it = [["組別", I.k.cat, null, true]];
    if (I.hasTime) it.push(["完成時間", I.k.time]);
    it.push([I.finLab, I.finVal]);
    statsRow(ctx, it, 48, yn + 96, yn + 186, "rgba(255,255,255,.8)", "#fff");
    footRow(ctx, I.foot, d.url, LH - 38, "rgba(255,255,255,.75)");
    return finish(ctx, cv);
  }
  // ---------- 終點拱門（小學插畫） ----------
  async function cArch(d) {
    const { cv, ctx } = await photoPrep(d, "arch"), I = certInfo(d);
    const banner = `第 ${I.k.edition} 屆學界越野跑`;
    ctx.textAlign = "center"; ctx.fillStyle = "#15803d"; FITF(ctx, banner, 560, 46, 28, 900); ctx.fillText(banner, LW / 2, 300);
    ctx.fillStyle = "#13324a"; ctx.font = `700 22px ${CJK}`; ctx.fillText(`${I.k.event.split("・")[1] || ""}・松山`, LW / 2, 336);
    brandXC(ctx, 52, 56, "#16a34a", "#13324a", "rgba(255,255,255,.85)");
    const top = LH - 290, px = 36, pw = LW - 72, R = px + pw - 28;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12; rr(ctx, px, top, pw, 254, 28); ctx.fillStyle = "rgba(255,255,255,.94)"; ctx.fill(); ctx.restore();
    pill(ctx, `第 ${I.k.edition} 屆完賽紀念`, 68, top + 24, "#16a34a", "#fff");
    ctx.textAlign = "left"; ctx.fillStyle = "#13324a"; fit(ctx, d.name, 470, 76, 44, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.name, 68, top + 136);
    FITF(ctx, `${d.school}・${I.k.cat}`, 470, 28, 18, 700); ctx.fillText(`${d.school}・${I.k.cat}`, 68, top + 180);
    ctx.textAlign = "right"; ctx.fillStyle = "#ef4444"; ctx.font = `italic 800 170px ${NUM}`; ctx.fillText(`#${I.k.place}`, R, top + 166);
    ctx.fillStyle = "#13324a"; ctx.font = `900 22px ${CJK}`; ctx.fillText(I.hasTime ? `${I.sub}・${I.k.time}` : I.sub, R, top + 200);
    ctx.globalAlpha = .75; ctx.font = `700 18px ${CJK}`; ctx.textAlign = "left"; ctx.fillText("非官方整理", 68, top + 234);
    ctx.textAlign = "right"; ctx.font = `600 20px ${NUM}`; ctx.fillText(d.url, R, top + 234); ctx.globalAlpha = 1;
    return finish(ctx, cv);
  }
  // ---------- 葉仔三角山（小學插畫） ----------
  async function cLeaf(d) {
    const { cv, ctx } = await photoPrep(d, "leaf"), I = certInfo(d);
    brandXC(ctx, 48, 62, "#16a34a", "#1f3a2a");
    const fy = LH - 74;
    ctx.strokeStyle = "rgba(31,42,34,.15)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(56, fy - 32); ctx.lineTo(LW - 56, fy - 32); ctx.stroke();
    ctx.fillStyle = "#56705e"; ctx.textAlign = "left"; FITF(ctx, I.foot, LW - 112 - 270, 18, 12, 700); ctx.fillText(I.foot, 56, fy);
    ctx.textAlign = "right"; ctx.font = `600 20px ${NUM}`; ctx.fillText(d.url, LW - 56, fy);
    const sy = fy - 70;
    ctx.textAlign = "left"; ctx.fillStyle = "#3f5a48"; FITF(ctx, `${d.school}・${I.k.cat}`, 520, 30, 18, 700); ctx.fillText(`${d.school}・${I.k.cat}`, 56, sy);
    ctx.fillStyle = "#1f2a22"; fit(ctx, d.name, 520, 88, 48, (s) => `900 ${s}px ${CJK}`); ctx.fillText(d.name, 56, sy - 50);
    pill(ctx, `第 ${I.k.edition} 屆完賽紀念`, 56, sy - 178, "#facc15", "#1f2a22");
    ctx.textAlign = "right"; ctx.fillStyle = "#3f5a48"; ctx.font = `900 22px ${CJK}`; ctx.fillText(I.hasTime ? `${I.sub}・${I.k.time}` : I.sub, LW - 56, sy);
    ctx.fillStyle = "#16a34a"; ctx.font = `italic 800 200px ${NUM}`; ctx.fillText(`#${I.k.place}`, LW - 56, sy - 38);
    return finish(ctx, cv);
  }
  // ---------- 光環頒獎台（頭三名；金銀銅各一張背景） ----------
  const PODIUM = { 1: ["冠軍", ["#fff7c2", "#ffd34d", "#c98a12"], "#ffd34d"], 2: ["亞軍", ["#ffffff", "#d9e4ef", "#8fa3b8"], "#dbe7f3"], 3: ["季軍", ["#ffe0c2", "#e39a5c", "#9a5426"], "#f0a868"] };
  async function cPodium(d) {
    const p = Math.min(Math.max(d.cert.place, 1), 3), [title, gs, acc] = PODIUM[p];
    const { cv, ctx, img } = await photoPrep(d, `podium${p}`), I = certInfo(d);
    shade(ctx, [[0, "rgba(0,0,0,.35)"], [.18, "rgba(0,0,0,0)"], [.58, "rgba(0,0,0,0)"], [.8, "rgba(0,8,4,.88)"], [1, "rgba(0,8,4,.94)"]]);
    brandXC(ctx, 48, 60, "#4ade80", "#fff");
    pill(ctx, `第 ${I.k.edition} 屆${title}`, LW / 2, 120, acc, "#1a1406", 26, "center");
    const big = `#${I.k.place}`, by = 412;
    ctx.save(); ctx.textAlign = "center"; ctx.font = `italic 800 300px ${NUM}`;
    ctx.shadowColor = acc; ctx.shadowBlur = 40; ctx.fillStyle = acc; ctx.globalAlpha = .55; ctx.fillText(big, LW / 2, by); ctx.globalAlpha = 1;
    ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    const g = ctx.createLinearGradient(0, by - 250, 0, by); g.addColorStop(0, gs[0]); g.addColorStop(.45, gs[1]); g.addColorStop(1, gs[2]);
    ctx.fillStyle = g; ctx.fillText(big, LW / 2, by); ctx.restore();
    const yn = LH - 300;
    nameBlock(ctx, d, 48, yn, LW - 96, 92, "#fff", "rgba(255,255,255,.9)", img);
    const it = [["組別", I.k.cat, null, true]];
    if (I.hasTime) it.push(["完成時間", I.k.time, acc]);
    it.push([I.finLab, I.finVal]);
    statsRow(ctx, it, 48, yn + 96, yn + 186, "rgba(255,255,255,.8)", "#fff");
    footRow(ctx, I.foot, d.url, LH - 38, "rgba(255,255,255,.75)");
    return finish(ctx, cv);
  }

  root.XCCardStyles = { dash, trail, bib, cTrail, cSun, cArch, cLeaf, cPodium };
})(window);
