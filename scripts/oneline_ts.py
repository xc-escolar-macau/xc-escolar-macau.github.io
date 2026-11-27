"""把 Edge Function 原始碼轉成單行（去掉註解），方便貼進 Supabase 網頁編輯器（逐字輸入多行會自動補括號）
用法：python -P -X utf8 scripts/oneline_ts.py supabase/photos-project/functions/xc-photo-store/index.ts > out.ts"""
import re, sys

out = []
for line in open(sys.argv[1], encoding="utf-8").read().splitlines():
    s = line.strip()
    if not s or s.startswith("//"):
        continue
    out.append(re.sub(r"\s+//\s.*$", "", s))
one = " ".join(out)
assert "//" not in one.replace("https://", "").replace("http://", ""), "行內仍有註解"
sys.stdout.write(one)
