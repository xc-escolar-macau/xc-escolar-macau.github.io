-- 即時成績：缺席標記
-- 須在 005_live_laps.sql 之後執行；可重複執行
-- 改動：
--   * 終點紀錄加 dns：工作人員標記該號碼缺席（沒有起跑）；此行不是一次經過，不計圈數、不計名次
--     撤銷缺席＝把此行標為 deleted（與撤銷一般紀錄相同）
--   * 公眾 feed 加回傳 dns，公眾頁據此把缺席者剔出團體計分人數，並在出戰名單顯示「缺席」

alter table public.xc_live_entries add column if not exists dns boolean not null default false;

create or replace function public.xc_live_feed(p_event text, p_since bigint default 0)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'now', (extract(epoch from clock_timestamp()) * 1000)::bigint,
    'heats', coalesce((select json_agg(json_build_object('cat', h.cat, 'heat', h.heat, 'start_ms', h.start_ms, 'status', h.status, 'rev', h.rev))
                       from public.xc_live_heats h where h.event = p_event and h.rev > coalesce(p_since, 0)), '[]'::json),
    'entries', coalesce((select json_agg(json_build_object('id', e.id, 'cat', e.cat, 'heat', e.heat, 'abbr', e.abbr, 'pid', e.pid,
                                                          'k', case when e.bib is null then null else left(md5(e.event || ':' || e.bib::text), 12) end,
                                                          'name', e.name, 'fin', e.fin, 'force', e.force, 'dns', e.dns,
                                                          'at_ms', e.at_ms, 'seq', e.seq, 'deleted', e.deleted, 'rev', e.rev) order by e.rev)
                         from public.xc_live_entries e where e.event = p_event and e.rev > coalesce(p_since, 0)), '[]'::json)
  );
$$;
revoke all on function public.xc_live_feed(text, bigint) from public;
grant execute on function public.xc_live_feed(text, bigint) to anon, authenticated;
