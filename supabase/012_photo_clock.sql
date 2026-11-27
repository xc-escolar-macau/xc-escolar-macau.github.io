-- 相機時間校正：各相機的時間誤差存資料庫，所有上載裝置共用；並可更正已上載相片的拍攝時間
-- 須在 008_photos.sql 之後執行；可重複執行
--
-- xc_photo_clock：每部相機一行（camera＝上載頁的相機名稱：牌子＋型號，有機身序號時加「 #序號尾 6 位」）
--   off_s：相機時間 − 實際時間（秒；正數＝相機快）。相片拍攝時間＝EXIF 時間 − off_s
-- xc_photo_reclock(event, camera, off_s)：把該相機已上載相片（只限 EXIF 時間）改用新的誤差重新計算拍攝時間
--   taken_ms 原本已扣除舊誤差 clock_off_s，所以新時間＝taken_ms ＋（舊誤差 − 新誤差）× 1000；回傳更正張數

create table if not exists public.xc_photo_clock (
  camera text primary key check (length(camera) between 1 and 80),
  off_s int not null check (abs(off_s) <= 86400),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.xc_photo_clock enable row level security;
revoke all on public.xc_photo_clock from anon;
grant select, insert, update, delete on public.xc_photo_clock to authenticated;
drop policy if exists "photo clock admin" on public.xc_photo_clock;
create policy "photo clock admin" on public.xc_photo_clock for all to authenticated
  using ((select public.xc_is_admin())) with check ((select public.xc_is_admin()));

create or replace function public.xc_photo_reclock(p_event text, p_camera text, p_off_s int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if not (select public.xc_is_admin()) then raise exception 'not allowed'; end if;
  if abs(coalesce(p_off_s, 0)) > 86400 then raise exception 'offset too large'; end if;
  update public.xc_photos
     set taken_ms = taken_ms + (coalesce(clock_off_s, 0) - coalesce(p_off_s, 0))::bigint * 1000,
         clock_off_s = nullif(coalesce(p_off_s, 0), 0)
   where event = p_event
     and camera is not distinct from p_camera
     and taken_src = 'exif'
     and taken_ms is not null
     and status <> 'removed'
     and coalesce(clock_off_s, 0) <> coalesce(p_off_s, 0);
  get diagnostics n = row_count;
  return n;
end
$$;
revoke all on function public.xc_photo_reclock(text, text, int) from public, anon;
grant execute on function public.xc_photo_reclock(text, text, int) to authenticated;
