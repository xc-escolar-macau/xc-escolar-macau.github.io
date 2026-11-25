"""產生即時成績用的號碼布對照 SQL（不含姓名）。

輸入：private/startlist48.csv（需有 bib 欄：號碼布）＋ private/preview48_review.csv（preview.py 的配對結果）
輸出：private/live_roster48.sql —— 號碼布、組別、分組、秩序冊次序（seq）、學校代碼、已公開往績者的學生編號（pid）、姓名（秩序冊已公開；
      scripts/redactions.json 內應要求隱藏者不輸出姓名）
      檔案放在 private/（不入 repo），再於 Supabase 執行一次即可。

用法：python -P -X utf8 scripts/live_roster.py private/startlist48.csv private/preview48_review.csv private/live_roster48.sql [event]
"""
import csv, json, re, sys, pathlib

start_p, review_p, out_p = sys.argv[1:4]
event = sys.argv[4] if len(sys.argv) > 4 else "48"

rows = list(csv.DictReader(open(start_p, encoding="utf-8-sig")))
if not rows or "bib" not in rows[0]:
    sys.exit("startlist 未有 bib 欄：請先在 private/startlist48.csv 加上一欄 bib（號碼布號碼）")

# (組別, 中文名, 拼音) → pid（只取 preview.py 已配對者）
pid_of = {}
for r in csv.DictReader(open(review_p, encoding="utf-8-sig")):
    if r["狀態"].startswith("配對") and r.get("pid"):
        pid_of[(r["組別"], r["中文名"], r["拼音"])] = r["pid"]

hidden = {x["pid"] for x in json.load(open(pathlib.Path(__file__).with_name("redactions.json"), encoding="utf-8"))["items"]}
sq = lambda s: "'" + s.replace("'", "''") + "'"

seen, out, problems = set(), [], []
for r in rows:
    bib = (r.get("bib") or "").strip()
    if not bib:
        problems.append(f"缺號碼布：{r['cat']} 第{r['seq']}位")
        continue
    if not re.fullmatch(r"\d{1,5}", bib):
        problems.append(f"號碼布格式不符：{bib}")
        continue
    if bib in seen:
        problems.append(f"號碼布重複：{bib}")
        continue
    seen.add(bib)
    pid = pid_of.get((r["cat"], r["name_zh"], r["name_pt"]))
    heat = r.get("heat") or ""
    name = (r.get("name_zh") or r.get("name_pt") or "").strip()[:60]
    if pid in hidden:
        name = ""
    seq = int(r["seq"]) if (r.get("seq") or "").strip().isdigit() else None
    out.append((int(bib), r["cat"], int(heat) if heat.strip().isdigit() else None, r["abbr"], pid, name, seq))

if problems:
    print("\n".join(problems))
    sys.exit(f"有 {len(problems)} 個問題，未輸出")

sql = ["-- 第 %s 屆號碼布對照（含秩序冊姓名及次序，只限工作人員讀取；須先執行 005_live_laps.sql、010_roster_seq.sql）；由 scripts/live_roster.py 產生" % event,
       "insert into public.xc_live_roster (event, bib, cat, heat, abbr, pid, name, seq) values"]
vals = [f"('{event}', {b}, '{c}', {h if h else 'null'}, '{a}', {sq(p) if p else 'null'}, {sq(n) if n else 'null'}, {q if q else 'null'})" for b, c, h, a, p, n, q in sorted(out)]
sql.append(",\n".join(vals))
sql.append("on conflict (event, bib) do update set cat = excluded.cat, heat = excluded.heat, abbr = excluded.abbr, pid = excluded.pid, name = excluded.name, seq = excluded.seq;")
pathlib.Path(out_p).write_text("\n".join(sql) + "\n", encoding="utf-8")
print(f"已輸出 {len(out)} 個號碼布（其中 {sum(1 for x in out if x[4])} 人有公開往績）→ {out_p}")
