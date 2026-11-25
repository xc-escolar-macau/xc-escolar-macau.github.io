-- 號碼布對照加「秩序冊次序」：計時頁缺席標記可按大會秩序冊的排列逐行對照
-- 須在 005_live_laps.sql 之後執行；可重複執行
-- seq＝該組（分組）在秩序冊內的次序（由 1 起）；資料由 scripts/live_roster.py 產生（private/，不入 repo）
-- 只限工作人員讀取（沿用 xc_live_roster 的權限）；公眾出戰名單 xc_live_roster_public 不回傳此欄

alter table public.xc_live_roster add column if not exists seq int check (seq is null or seq between 1 and 999);
