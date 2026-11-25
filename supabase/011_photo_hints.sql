-- 相片人手標號碼布的提示（免費方案：不用 AI；第 48 屆賽後標）
-- 須在 008_photos.sql、009_live_dns.sql 之後執行；可重複執行
-- xc_photo_hints(相片 id, 已輸入的號碼布) 回傳：
--   near   ：拍攝時間前後 20 秒內經過終點的號碼布（終點計時紀錄，含每圈經過；不含已刪除及缺席），按時間差排列，最多 10 個
--            dt＝終點紀錄時間 − 拍攝時間（秒；負數＝相片影於衝線之後）
--   check  ：每個已輸入的號碼布是否在名單、拍攝時段該組是否在跑道上（防止 355 誤標成 35 之類）
--   cats   ：拍攝時段在跑道上的組別／分組（給標相的人參考）
-- 只限管理員；不回傳姓名（姓名由上載頁已載入的名單顯示）

create or replace function public.xc_photo_hints(p_id uuid, p_bibs int[] default '{}')
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ph public.xc_photos;
  v_near json := '[]'::json;
  v_check json := '[]'::json;
  v_cats json := '[]'::json;
begin
  if not (select public.xc_is_admin()) then raise exception 'not allowed'; end if;
  select * into ph from public.xc_photos where id = p_id;
  if not found then raise exception 'photo not found'; end if;

  if ph.taken_ms is not null then
    select coalesce(json_agg(json_build_object('bib', n.bib, 'dt', n.dt, 'fin', n.fin) order by abs(n.dt), n.bib), '[]'::json)
      into v_near
      from (
        select d.* from (
          select distinct on (e.bib) e.bib, round((e.at_ms - ph.taken_ms) / 1000.0, 1) as dt, e.fin
          from public.xc_live_entries e
          where e.event = ph.event and not e.deleted and not coalesce(e.dns, false) and e.bib is not null
            and e.at_ms between ph.taken_ms - 20000 and ph.taken_ms + 20000
          order by e.bib, abs(e.at_ms - ph.taken_ms)
        ) d
        order by abs(d.dt), d.bib
        limit 10
      ) n;

    select coalesce(json_agg(json_build_object('cat', c.cat, 'heat', c.heat) order by c.cat, c.heat), '[]'::json)
      into v_cats
      from (
        select distinct on (r.cat, coalesce(r.heat, 1)) r.cat, coalesce(r.heat, 1) as heat, r.bib
        from public.xc_live_roster r
        where r.event = ph.event
        order by r.cat, coalesce(r.heat, 1), r.bib
      ) c
      where public.xc_photo_on_course(ph.event, c.bib, ph.taken_ms);
  end if;

  select coalesce(json_agg(json_build_object(
           'bib', b.bib,
           'in_roster', exists (select 1 from public.xc_live_roster r where r.event = ph.event and r.bib = b.bib),
           'on_course', case when ph.taken_ms is null then null else public.xc_photo_on_course(ph.event, b.bib, ph.taken_ms) end)
         order by b.bib), '[]'::json)
    into v_check
    from (select distinct x as bib from unnest(coalesce(p_bibs, '{}')) x where x between 1 and 99999) b;

  return json_build_object('taken_ms', ph.taken_ms, 'near', v_near, 'check', v_check, 'cats', v_cats);
end
$$;
revoke all on function public.xc_photo_hints(uuid, int[]) from public, anon;
grant execute on function public.xc_photo_hints(uuid, int[]) to authenticated;
