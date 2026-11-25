// 即時成績核心（docs/live-core.js）的獨立檢查，由 tests/test_live_core.py 以 node 執行，輸出 JSON 結果
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "docs/live-core.js"));
const L = globalThis.XCLive;
const out = {};

// ---------- 1. 迴歸：第 44 至 47 屆官方團體冠軍（以多圈合成資料重算） ----------
const LAPS = { MA: 5, MB: 4, FB: 3, MC: 2, FC: 2, FA: 4, MD: 2, FD: 2, ME: 1, FE: 1 };
const res = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/data/results.json"), "utf8"));
let checked = 0, agree = 0;
const bad = [];
for (const ed of res.editions) {
  if (ed.edition < 44) continue;
  for (const [cat, c] of Object.entries(ed.categories)) {
    if (!("team_champion" in c)) continue;
    const laps = LAPS[cat], entered = {}, entries = [];
    c.individual.forEach((r) => { entered[r.school_zh] = (entered[r.school_zh] || 0) + 1; });
    c.individual.forEach((r, j) => {
      for (let i = 1; i <= laps; i++) entries.push({ id: `${j}-${i}`, bib: 1000 + j, heat: 1, abbr: r.school_zh, at_ms: Math.round(r.seconds * 1000 * i / laps) + r.rank, deleted: false });
    });
    entries.sort((a, b) => a.at_ms - b.at_ms).forEach((e, i) => { e.seq = i + 1; });
    const { runners } = L.buildRunners(entries, { 1: { start_ms: 0 } }, { laps, minGap: 0, done: true });
    const S = L.teamStandings(cat, runners, entered, true);
    // 官方未公布團體冠軍者略過；報名人數以完成者推算，只得一隊時仍比對該隊（官方實際報名隊數較多）
    const official = c.team_champion ? c.team_champion.school_zh : null;
    if (!official) continue;
    const mine = S.teams[0] && S.teams[0].pos === 1 ? S.teams[0].abbr : null;
    checked++;
    if (mine === official && runners.every((r) => r.fin && r.laps === laps)) agree++; else bad.push(`${ed.edition}${cat}: ${mine} vs ${official}`);
  }
}
out.regression = { checked, agree, bad };

// ---------- 2. 分段計時情境 ----------
const H = { 1: { start_ms: 0, status: "running" } };
const S = 1000;
let seq = 0;
const E = (bib, sec, extra) => ({ id: `e${++seq}`, bib, heat: 1, abbr: bib < 2000 ? "YW" : "HK", at_ms: sec * S, seq, deleted: false, ...extra });
const B = (entries, opt) => L.buildRunners(entries, H, { laps: 5, minGap: 119, ...opt });

// 2a. 同一人記 5 次＝完賽；分段時間正確
{
  const es = [250, 500, 750, 1000, 1250].map((s) => E(1001, s));
  const r = B(es).runners[0];
  out.fiveLaps = { fin: r.fin, laps: r.laps, t: r.t, splits: r.splits };
}
// 2b. 相隔太短＝重複（忽略）；force 例外；完賽後再記錄亦忽略
{
  const es = [E(1001, 250), E(1001, 253), E(1001, 260, { force: true })];
  const x = B(es);
  out.dup = { laps: x.runners[0].laps, ignored: [...x.ignored.values()] };
  const es2 = [250, 500, 750, 1000, 1250, 1500].map((s) => E(1002, s));
  const y = B(es2);
  out.after = { laps: y.runners[0].laps, ignored: [...y.ignored.values()] };
}
// 2c. 途中名次：圈數多者先；同圈數按最近一次經過較早者先；已完賽者最前
{
  const es = [E(1001, 250), E(2001, 255), E(1001, 500), E(2002, 510), E(2001, 520), E(1003, 600)];
  const x = B(es, { laps: 2 });
  out.midOrder = x.runners.map((r) => [r.bib, r.laps, r.fin, r.place]);
}
// 2d. 全組完成：未完賽者不設名次
{
  const es = [E(1001, 250), E(1001, 500), E(2001, 300)];
  const x = B(es, { laps: 2, done: true });
  out.dnf = x.runners.map((r) => [r.bib, r.place, r.dnf]);
}
// 2e. 空位不計；按學校記錄（無號碼）視為完賽者；標明完賽（fin）即完賽
{
  const es = [E(1001, 250), { id: "slot", heat: 1, abbr: "?", bib: null, at_ms: 400 * S, seq: ++seq, deleted: false },
    { id: "anon", heat: 1, abbr: "HK", bib: null, at_ms: 450 * S, seq: ++seq, deleted: false }, E(1002, 300), E(1002, 700, { fin: true })];
  const x = B(es);
  out.slots = { slots: x.slots.length, runners: x.runners.map((r) => [r.anon ? "anon" : r.bib, r.fin, r.place]) };
}
// 2f. 公眾頁沒有號碼布：以 k 分組
{
  const es = [E(1001, 250), E(1001, 500)].map(({ bib, ...e }) => ({ ...e, k: "abc" }));
  const x = B(es, { laps: 2 });
  out.byKey = { n: x.runners.length, fin: x.runners[0].fin };
}
// 2g. 團體途中按跑位推算（C 組取 4 人）
{
  const es = [];
  // 學校甲 4 人、乙 3 人跑完第一圈，未有人完賽
  [["甲", 1], ["乙", 2], ["甲", 3], ["甲", 4], ["乙", 5], ["甲", 6], ["乙", 7]].forEach(([a, i]) => es.push({ id: `t${i}`, bib: 3000 + i, heat: 1, abbr: a, at_ms: (200 + i) * S, seq: i, deleted: false }));
  const x = L.buildRunners(es, H, { laps: 2, minGap: 116 });
  const T = L.teamStandings("MC", x.runners, { 甲: 6, 乙: 5 }, false);
  out.teamMid = T.teams.map((t) => [t.abbr, t.pos, t.score, t.projected, t.complete, t.missing]);
}
// 2h. 預計到達
{
  const x = B([E(1001, 250), E(1001, 500)]);
  out.eta = L.eta(x.runners[0], H) / S;
}
// 2i. 分組出發（男C：C1、C2，各 2 圈）：合併時間定名次、分組名次；未完成全部分組前團體分只屬暫計
{
  const HS = { 1: { start_ms: 0, status: "done" }, 2: { start_ms: 2000 * S, status: "running" } };
  const es = [];
  const add = (bib, heat, abbr, t1, t2) => { es.push({ id: `${bib}a`, bib, heat, abbr, at_ms: t1 * S, seq: es.length + 1, deleted: false });
    if (t2) es.push({ id: `${bib}b`, bib, heat, abbr, at_ms: t2 * S, seq: es.length + 1, deleted: false }); };
  // C1（0 秒起跑）：甲 4 人完賽 500–530 秒；乙 1 人只跑一圈（C1 已完成 → 未完成）
  add(1, 1, "甲", 250, 500); add(2, 1, "甲", 255, 510); add(3, 1, "甲", 260, 520); add(4, 1, "甲", 265, 530); add(5, 1, "乙", 300);
  // C2（2000 秒起跑）：乙 4 人，時間 490–495 秒（比 C1 全部快）
  add(6, 2, "乙", 2245, 2490); add(7, 2, "乙", 2246, 2491); add(8, 2, "乙", 2247, 2492); add(9, 2, "乙", 2248, 2495);
  const x = L.buildRunners(es, HS, { laps: 2, minGap: 116, multiHeat: true });
  out.heats = x.runners.map((r) => [r.bib, r.place, r.heatPlace, r.dnf]);
  const T1 = L.teamStandings("MC", x.runners, { 甲: 4, 乙: 5 }, false, true);
  const T2 = L.teamStandings("MC", x.runners, { 甲: 4, 乙: 5 }, true, false);
  out.heatTeams = { pending: T1.teams.map((t) => [t.abbr, t.score, t.complete]), final: T2.teams.map((t) => [t.abbr, t.pos, t.score, t.complete]) };
}
// 2j. 奪冠形勢（C 組每隊 4 人；只以已完賽者計）
{
  const H1 = { 1: { start_ms: 0, status: "running" } };
  const mk = (list) => list.map(([abbr, place], i) => ({ id: `w${i}`, bib: 5000 + i, heat: 1, abbr, at_ms: (100 + place) * S, seq: place, deleted: false }));
  const tr = (list, entered, pending) => { const x = L.buildRunners(mk(list), H1, { laps: 1 }); return L.titleRace("MC", x.runners, entered, pending); };
  // 甲 1、6、7、8＝22 分已齊；乙 2、3、5 已完賽，尚欠 1 人：最佳 10＋9＝19，仍有機會；須取得第 11 名或更前（22−10−1）
  const A = [["甲", 1], ["乙", 2], ["乙", 3], ["丙", 4], ["乙", 5], ["甲", 6], ["甲", 7], ["甲", 8]];
  out.title1 = tr(A, { 甲: 4, 乙: 4, 丙: 4 }, false);
  // 甲 1–4＝10 分已齊；其他學校最佳亦不可能少於 10 → 甲已鎖定，乙丙已無法奪冠
  const B = [["甲", 1], ["甲", 2], ["甲", 3], ["甲", 4], ["乙", 5], ["丙", 6]];
  out.title2 = tr(B, { 甲: 4, 乙: 4, 丙: 4 }, false);
  // 分組未完成：不判斷鎖定／出局
  out.title3 = tr(B, { 甲: 4, 乙: 4, 丙: 4 }, true);
}
// 2k. 語音輸入：口語號碼解析及拆分
{
  const cases = ["四零五", "四百零五", "六十", "三十五", "一百二", "廿三", "二百五", "405, 353", "4 0 5", "四零五，三五三", "十二號", "三五三 六十", "啊"];
  out.spoken = cases.map((c) => L.spokenGroups(c));
  const v = new Set(["405", "353", "60", "40", "5", "35"]);
  out.seg = [L.segmentBibs("405353", v), L.segmentBibs("4035", v), L.segmentBibs("405", v), L.segmentBibs("999", v)];
}
// 2l. 語音分隔：「號」「、」「，」後即當講完
out.sep = ["四零五號三五三", "四零五、三五三，六十", "四零五", "四零五號"].map((x) => L.voiceSegments(x));
// 2m. 缺席標記：不計名次；學校人數不足即列為不計分；奪冠形勢不再計算
{
  const S = 1000, H = { 1: { start_ms: 0, status: "running" } };
  // 男C（每隊 4 人）：甲報 4 人、乙報 5 人；甲 5003 缺席、乙 6004 缺席
  const ev = [
    ["a1", 5001, "甲", 300], ["b1", 6001, "乙", 310], ["a2", 5002, "甲", 320], ["b2", 6002, "乙", 330], ["b3", 6003, "乙", 340],
  ].map(([id, bib, abbr, sec], i) => ({ id, bib, heat: 1, abbr, at_ms: sec * S, seq: i + 1, deleted: false }));
  ev.push({ id: "d1", bib: 5003, heat: 1, abbr: "甲", at_ms: 0, seq: 9, deleted: false, dns: true });
  ev.push({ id: "d2", bib: 6004, heat: 1, abbr: "乙", at_ms: 0, seq: 10, deleted: false, dns: true });
  ev.push({ id: "d3", bib: 6005, heat: 1, abbr: "乙", at_ms: 0, seq: 11, deleted: true, dns: true });   // 已撤銷
  const x = L.buildRunners(ev, H, { laps: 2 });
  const members = [5001, 5002, 5003, 5004].map((b) => ({ key: `b${b}`, abbr: "甲", heat: 1 })).concat([6001, 6002, 6003, 6004, 6005].map((b) => ({ key: `b${b}`, abbr: "乙", heat: 1 })));
  const g = L.notScoring("MC", x.runners, x.absent, members, H, 400 * S);
  const T = L.teamStandings("MC", x.runners, { 甲: 4, 乙: 5 }, false, false, g.count);
  const TR = L.titleRace("MC", x.runners, { 甲: 4, 乙: 5 }, false, g.count);
  out.dns = {
    runners: x.runners.length, absent: [...x.absent.keys()].sort(), places: x.runners.map((r) => r.place),
    gone: g.count, why: Object.fromEntries(g.why),
    teams: T.teams.map((t) => [t.abbr, t.pos, t.out, t.short, t.gone]),
    title: { 甲: TR["甲"].state, 乙: TR["乙"].state },
  };
  // 過了達標時間（男C 720 秒）仍無紀錄 → 不能計分；之後有經過紀錄則以紀錄為準
  const late = L.notScoring("MC", x.runners, x.absent, members, H, 800 * S);
  out.dnsLate = Object.fromEntries(late.why);
  const ev2 = ev.concat([{ id: "p9", bib: 5003, heat: 1, abbr: "甲", at_ms: 350 * S, seq: 12, deleted: false }]);
  const y = L.buildRunners(ev2, H, { laps: 2 });
  out.dnsVoid = { absent: [...y.absent.keys()].sort(), voided: y.runners.filter((r) => r.dnsVoid).map((r) => r.key) };
  // 分組未完成（pending）：缺席令人數不足者亦即時列為無法奪冠
  out.dnsPending = L.titleRace("MC", x.runners, { 甲: 4, 乙: 5 }, true, g.count)["甲"].state;
}
process.stdout.write(JSON.stringify(out));
