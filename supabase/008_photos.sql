-- 比賽相片（第 48 屆起）：比賽中以手機即時上載，Gemini 辨識號碼布，符合條件即自動公開
-- 須在 004–007 之後執行；可重複執行
-- 設計：
--   * 相片檔放公開 bucket xc-photos，檔名為隨機 UUID，不開放列出檔案；只有管理員可上載／刪除
--   * 表 xc_photos 只限管理員讀寫；公眾只能經 xc_photo_lookup()「號碼布＋姓名」兩者對得上才取得該號碼布的已公開相片
--   * 自動公開（xc_photo_judge）：讀出至少一個號碼布、每個號碼布都在秩序冊內、拍攝時間該組別在跑道上、AI 未標示不確定
--   * 2027-08-31 後公眾查詢不再回傳任何相片（保留期一個學年）

-- ---------- 相片 ----------
create table if not exists public.xc_photos (
  id uuid primary key,                         -- 由上載裝置產生（同時是檔名），離線補傳不會重複
  event text not null check (event ~ '^[a-z0-9]{1,12}$'),
  full_path text not null check (full_path ~ '^[a-z0-9]{1,12}/[0-9a-f-]{36}\.(webp|jpg)$'),
  thumb_path text not null check (thumb_path ~ '^[a-z0-9]{1,12}/[0-9a-f-]{36}_t\.(webp|jpg)$'),
  w int check (w between 1 and 4000),
  h int check (h between 1 and 4000),
  taken_ms bigint,                             -- 拍攝時刻（epoch 毫秒）；來源見 taken_src
  taken_src text check (taken_src in ('exif', 'file', 'upload')),
  ai_bibs int[],                               -- Gemini 讀出的號碼布（原始結果）
  ai_unsure int[],                             -- Gemini 標示不確定的號碼布
  ai_raw text check (ai_raw is null or length(ai_raw) <= 4000),
  bibs int[] not null default '{}',            -- 公開查詢用的號碼布（自動判斷或人手改正後）
  status text not null default 'uploaded' check (status in ('uploaded', 'pending', 'approved', 'removed')),
  reason text check (reason is null or length(reason) <= 300),   -- 待覆核原因（給工作人員看）
  reviewed boolean not null default false,     -- 已經人手覆核
  created_by text default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  rev bigint not null default nextval('public.xc_live_rev')
);
create index if not exists xc_photos_bibs on public.xc_photos using gin (bibs);
create index if not exists xc_photos_rev on public.xc_photos (event, rev);

drop trigger if exists xc_photos_bump on public.xc_photos;
create trigger xc_photos_bump before update on public.xc_photos
  for each row execute function public.xc_live_bump();

alter table public.xc_photos enable row level security;
revoke all on public.xc_photos from anon;
revoke delete on public.xc_photos from authenticated;
grant select, insert, update on public.xc_photos to authenticated;

drop policy if exists "photos admin read" on public.xc_photos;
drop policy if exists "photos admin insert" on public.xc_photos;
drop policy if exists "photos admin update" on public.xc_photos;
create policy "photos admin read" on public.xc_photos for select to authenticated using ((select public.xc_is_admin()));
create policy "photos admin insert" on public.xc_photos for insert to authenticated with check ((select public.xc_is_admin()));
create policy "photos admin update" on public.xc_photos for update to authenticated using ((select public.xc_is_admin())) with check ((select public.xc_is_admin()));

-- ---------- 後備時段：未有計時系統起跑紀錄的組別（小學 D／E 組等）按時間表估算 ----------
-- from／to 為 epoch 毫秒；xc_photo_judge 另加 30 分鐘延誤寬限
create table if not exists public.xc_photo_windows (
  event text not null,
  cat text not null check (cat ~ '^[MF][A-E]$'),
  from_ms bigint not null,
  to_ms bigint not null,
  primary key (event, cat)
);
alter table public.xc_photo_windows enable row level security;
revoke all on public.xc_photo_windows from anon, authenticated;

-- 2026-11-29（澳門時間）：檢錄前 15 分鐘起，至 分組數 ×（第 47 屆最慢時間＋3 分鐘）＋15 分鐘
insert into public.xc_photo_windows (event, cat, from_ms, to_ms) values
  ('48', 'MA', 1795909500000, 1795913160000),   -- 07:45 至 08:46（1 組；第 47 屆最慢 28:00）
  ('48', 'MB', 1795911600000, 1795915200000),   -- 08:20 至 09:20（1 組；第 47 屆最慢 26:29）
  ('48', 'FB', 1795913400000, 1795916700000),   -- 08:50 至 09:45（1 組；第 47 屆最慢 21:44）
  ('48', 'MD', 1795914900000, 1795920060000),   -- 09:15 至 10:41（4 組；第 47 屆最慢 10:16）
  ('48', 'FD', 1795917300000, 1795921620000),   -- 09:55 至 11:07（3 組；第 47 屆最慢 10:10）
  ('48', 'ME', 1795919100000, 1795922160000),   -- 10:25 至 11:16（3 組；第 47 屆最慢 3:59）
  ('48', 'FE', 1795920300000, 1795923060000),   -- 10:45 至 11:31（2 組；第 47 屆最慢 4:48）
  ('48', 'MC', 1795921200000, 1795926240000),   -- 11:00 至 12:24（3 組；第 47 屆最慢 14:31）
  ('48', 'FC', 1795923600000, 1795927560000),   -- 11:40 至 12:46（2 組；第 47 屆最慢 14:38）
  ('48', 'FA', 1795925400000, 1795929180000)    -- 12:10 至 13:13（1 組；第 47 屆最慢 29:30）
on conflict (event, cat) do update set from_ms = excluded.from_ms, to_ms = excluded.to_ms;

-- ---------- 該號碼布在拍攝時刻是否在跑道上 ----------
-- 優先用計時系統的實際起跑時間（xc_live_heats）：起跑前 15 分鐘至（本組完成 → 最後一筆終點紀錄後 10 分鐘；
-- 未完成 → 起跑後 90 分鐘）；沒有起跑紀錄才用 xc_photo_windows（另加 30 分鐘寬限）
create or replace function public.xc_photo_on_course(p_event text, p_bib int, p_ms bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with r as (
    select cat, coalesce(heat, 1) as heat from public.xc_live_roster where event = p_event and bib = p_bib
  ), h as (
    select x.start_ms, x.status,
           (select max(e.at_ms) from public.xc_live_entries e
             where e.event = x.event and e.cat = x.cat and e.heat = x.heat and not e.deleted) as last_ms
    from public.xc_live_heats x join r on x.cat = r.cat and x.heat = r.heat
    where x.event = p_event and x.start_ms is not null
  )
  select case
    when not exists (select 1 from r) then false
    when exists (select 1 from h) then exists (
      select 1 from h
      where p_ms >= h.start_ms - 15 * 60000
        and p_ms <= case when h.status = 'done' then coalesce(h.last_ms, h.start_ms) + 10 * 60000 else h.start_ms + 90 * 60000 end)
    else exists (
      select 1 from public.xc_photo_windows w join r on w.cat = r.cat
      where w.event = p_event and p_ms between w.from_ms and w.to_ms + 30 * 60000)
  end;
$$;
revoke all on function public.xc_photo_on_course(text, int, bigint) from public, anon, authenticated;

-- ---------- 寫入 AI 結果並判斷是否自動公開（由 Edge Function 以管理員身份呼叫） ----------
create or replace function public.xc_photo_judge(p_id uuid, p_bibs int[], p_unsure int[], p_raw text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  ph public.xc_photos;
  b int;
  v_bibs int[] := array(select distinct x from unnest(coalesce(p_bibs, '{}')) x where x between 1 and 99999 order by x);
  v_unsure int[] := array(select distinct x from unnest(coalesce(p_unsure, '{}')) x where x between 1 and 99999 order by x);
  v_why text[] := '{}';
  st text;
begin
  if not (select public.xc_is_admin()) then raise exception 'not allowed'; end if;
  select * into ph from public.xc_photos where id = p_id for update;
  if not found then raise exception 'photo not found'; end if;
  if ph.status = 'removed' then return json_build_object('status', 'removed'); end if;
  if ph.reviewed then  -- 已人手覆核者不被重新辨識覆蓋，只更新 AI 原始結果
    update public.xc_photos set ai_bibs = v_bibs, ai_unsure = v_unsure, ai_raw = left(p_raw, 4000) where id = p_id;
    return json_build_object('status', ph.status, 'bibs', ph.bibs, 'reason', ph.reason);
  end if;

  if cardinality(v_bibs) = 0 then v_why := v_why || '讀不到號碼布'::text; end if;
  if cardinality(v_unsure) > 0 then v_why := v_why || ('AI 不確定：' || array_to_string(v_unsure, '、')); end if;
  if ph.taken_ms is null then v_why := v_why || '沒有拍攝時間'::text;
  elsif coalesce(ph.taken_src, '') <> 'exif' then v_why := v_why || '拍攝時間只按檔案時間'::text; end if;
  foreach b in array v_bibs loop
    if not exists (select 1 from public.xc_live_roster where event = ph.event and bib = b) then
      v_why := v_why || (b || ' 不在名單');
    elsif ph.taken_ms is not null and not public.xc_photo_on_course(ph.event, b, ph.taken_ms) then
      v_why := v_why || (b || ' 該時段不在跑道上');
    end if;
  end loop;

  st := case when cardinality(v_why) = 0 then 'approved' else 'pending' end;
  update public.xc_photos
     set ai_bibs = v_bibs, ai_unsure = v_unsure, ai_raw = left(p_raw, 4000),
         bibs = array(select x from unnest(v_bibs) x where x <> all(v_unsure)),
         status = st, reason = nullif(array_to_string(v_why, '；'), '')
   where id = p_id;
  return json_build_object('status', st, 'bibs', v_bibs, 'reason', nullif(array_to_string(v_why, '；'), ''));
end
$$;
revoke all on function public.xc_photo_judge(uuid, int[], int[], text) from public, anon;
grant execute on function public.xc_photo_judge(uuid, int[], int[], text) to authenticated;

-- ---------- 公眾查詢：號碼布＋姓名（比較方式同完賽紀念卡） ----------
create or replace function public.xc_photo_lookup(p_event text, p_bib int, p_name text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object('id', p.id, 't', p.thumb_path, 'f', p.full_path, 'w', p.w, 'h', p.h, 'at', p.taken_ms)
                           order by p.taken_ms nulls last, p.created_at), '[]'::json)
  from public.xc_live_roster r
  join public.xc_photos p on p.event = r.event and p.bibs @> array[r.bib] and p.status = 'approved'
  where r.event = p_event and r.bib = p_bib
    and now() < timestamptz '2027-09-01 00:00:00+08'
    and coalesce(r.name, '') <> ''
    and length(coalesce(p_name, '')) between 2 and 60
    and regexp_replace(lower(r.name), '[[:space:][:punct:]・，、]', '', 'g') = regexp_replace(lower(p_name), '[[:space:][:punct:]・，、]', '', 'g');
$$;
revoke all on function public.xc_photo_lookup(text, int, text) from public;
grant execute on function public.xc_photo_lookup(text, int, text) to anon, authenticated;

-- ---------- Storage：公開 bucket（只可憑完整檔名讀取），只限 WebP／JPEG、每檔 2MB ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('xc-photos', 'xc-photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 公開 bucket 的檔案經 /object/public/ 讀取，不經以下政策；以下政策只開放給管理員（不設公眾 select → 不能列出檔案）
drop policy if exists "xc photos admin read" on storage.objects;
drop policy if exists "xc photos admin insert" on storage.objects;
drop policy if exists "xc photos admin update" on storage.objects;
drop policy if exists "xc photos admin delete" on storage.objects;
create policy "xc photos admin read" on storage.objects for select to authenticated using (bucket_id = 'xc-photos' and (select public.xc_is_admin()));
create policy "xc photos admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'xc-photos' and (select public.xc_is_admin()));
create policy "xc photos admin update" on storage.objects for update to authenticated using (bucket_id = 'xc-photos' and (select public.xc_is_admin()));
create policy "xc photos admin delete" on storage.objects for delete to authenticated using (bucket_id = 'xc-photos' and (select public.xc_is_admin()));
