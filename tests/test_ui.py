"""介面自動測試（Playwright＋本機 Chrome，手機尺寸 375×812）。
用法：python -P -X utf8 -m pytest tests/test_ui.py
"""
import json, pathlib, re, socket, subprocess, sys, time

import pytest
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/data/results.json").read_text(encoding="utf-8"))
EDS = {e["edition"]: e for e in DATA["editions"]}
PRED_MA_TOP = next(x["pid"] for x in json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))["categories"]["MA"]["prediction"] if x.get("pid"))


# base_url、browser 兩個共用 fixture 在 tests/conftest.py


@pytest.fixture()
def page(browser, base_url):
    ctx = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="zh-HK")
    ctx.add_init_script("window.XC_NO_PROMO = true")   # 首頁海報只在專門測試開啟
    # 測試不依賴外部網絡：Google 字體以空樣式表代替
    ctx.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    ctx.route("https://fonts.gstatic.com/**", lambda r: r.fulfill(status=204, body=""))
    # 測試絕不寫入真實人氣資料庫：攔截 Supabase 請求，以記憶體模擬 xc_hit／xc_views
    views = {}
    def fake_supabase(route):
        req = route.request
        if "/rpc/xc_hit" in req.url:
            pid = json.loads(req.post_data or "{}").get("p_pid")
            views[pid] = views.get(pid, 0) + 1
            return route.fulfill(status=200, content_type="application/json", body=str(views[pid]))
        if "/rpc/xc_live_roster_public" in req.url:
            return route.fulfill(status=200, content_type="application/json", body="[]")
        if "/rpc/xc_live_cert_cats" in req.url:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps([{"cat": "FC", "n": 1, "at": "2026-11-29T12:00:00Z"}]))
        if "/rpc/xc_live_cert_lookup" in req.url:
            q = json.loads(req.post_data or "{}")
            hit = q.get("p_bib") == 24 and "".join((q.get("p_name") or "").split()) == "李蕙伃"
            body = json.dumps({"cat": "FC", "heat": 1, "abbr": "CDSJ5", "pid": "p46FD022", "name": "李蕙伃", "place": 3, "time_ms": 552400,
                               "finishers": 31, "released_at": "2026-11-29T12:00:00Z"} if hit else None)
            return route.fulfill(status=200, content_type="application/json", body=body)
        if "/rest/v1/xc_views" in req.url:
            if "pid=eq." in req.url:
                pid = req.url.split("pid=eq.")[1].split("&")[0]
                body = json.dumps([{"pid": pid, "views": views[pid]}] if pid in views else [])
            else:
                body = json.dumps(sorted(({"pid": k, "views": v} for k, v in views.items()), key=lambda r: -r["views"]))
            return route.fulfill(status=200, content_type="application/json", body=body)
        return route.fulfill(status=404, body="")
    ctx.route("https://*.supabase.co/**", fake_supabase)
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and pg.errors.append(m.text))
    pg.base = base_url
    yield pg
    assert not pg.errors, pg.errors
    ctx.close()


def go(page, hash_):
    page.goto(f"{page.base}/{hash_}")
    # 等資料載入完成（載入骨架消失）才開始檢查，避免只等到骨架
    page.wait_for_function("document.querySelector('#view > *') && !document.querySelector('#view .skeleton:not(#popBoard .skeleton)')")


def no_hscroll(page):
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "出現橫向捲動"


# ---------- 私隱設定 ----------
def test_noindex_and_robots(page):
    go(page, "#/")
    assert page.locator('meta[name="robots"]').get_attribute("content") == "noindex, nofollow"
    assert "Disallow: /" in page.request.get(f"{page.base}/robots.txt").text()
    robots = page.request.get(f"{page.base}/robots.txt").text().replace("\r\n", "\n")
    assert "User-agent: *\nDisallow: /" in robots and "User-agent: facebookexternalhit\nAllow: /" in robots


def test_share_preview_tags(page):
    """分享預覽：og 標籤齊全，預覽圖存在且為 1200×630"""
    go(page, "#/")
    og = lambda k: page.locator(f'meta[property="og:{k}"]').get_attribute("content")
    assert og("title") and og("description") and og("image").endswith("/og.png")
    r = page.request.get(f"{page.base}/og.png")
    assert r.ok and r.headers["content-type"] == "image/png"
    body = r.body()
    assert int.from_bytes(body[16:20], "big") == 1200 and int.from_bytes(body[20:24], "big") == 630
    expect(page.locator(".disclaimer")).to_contain_text("非官方")
    assert page.locator(".disclaimer a").nth(1).get_attribute("href") == "#/privacy"


# ---------- 首頁 ----------
def test_home(page):
    go(page, "#/")
    expect(page.locator(".card")).to_have_count(5)
    expect(page.locator(".dots i")).to_have_count(5)
    expect(page.locator(".quick a")).to_have_count(10)
    expect(page.locator(".dock a")).to_have_count(4)
    expect(page.locator('.dock a[data-nav="home"]')).to_have_class("on")
    champ = EDS[47]["categories"]["MA"]["individual"][0]
    last = page.locator("#carousel .card").last         # 各組冠軍放最尾，標題寫明學年及屆數
    expect(last.locator("h3")).to_have_text(f"{EDS[47]['year']}學年第47屆學界越野跑各組冠軍")
    expect(last).to_contain_text(champ["name_zh"])
    expect(last).to_contain_text(champ["time"])
    expect(last).not_to_contain_text("最新一屆")
    no_hscroll(page)


def test_carousel_dots_follow_scroll(page):
    go(page, "#/")
    page.locator(".carousel").evaluate("el => el.scrollTo({left: el.firstElementChild.offsetWidth * 2 + 24})")
    page.wait_for_timeout(300)
    expect(page.locator(".dots i").nth(2)).to_have_class("on")


# ---------- 搜尋 ----------
def test_search_person_and_profile(page):
    go(page, "#/")
    page.fill("#q", "洪子樂")
    first = page.locator(".result").first
    expect(first).to_contain_text("洪子樂")
    first.click()
    expect(page.locator(".hero h1")).to_have_text("洪子樂")
    assert page.input_value("#q") == ""
    pid = page.url.split("/p/")[1]
    n = sum(1 for e in DATA["editions"] for c in e["categories"].values() for r in c["individual"] if r["pid"] == pid)
    expect(page.locator(".tl")).to_have_count(n)
    expect(page.locator(".stat b").first).to_have_text(str(n))
    no_hscroll(page)


def test_search_by_romanisation_and_school(page):
    go(page, "#/")
    page.fill("#q", "hong chi lok")
    expect(page.locator(".result").first).to_contain_text("洪子樂")
    page.fill("#q", "粵華")
    expect(page.locator(".result").first).to_contain_text("粵華")
    page.fill("#q", "zzzzzz")
    expect(page.locator(".empty")).to_be_visible()


# ---------- 排行榜 ----------
def test_rank_full_year_row_count(page):
    go(page, "#/rank?t=ind&e=47&c=MD")
    rows = EDS[47]["categories"]["MD"]["individual"]
    expect(page.locator(".board .row")).to_have_count(len(rows))
    expect(page.locator(".banner")).to_have_count(0)
    expect(page.locator(".board .row").first).to_contain_text(rows[0]["name_zh"])
    no_hscroll(page)


def test_rank_top10_banner(page):
    go(page, "#/rank?t=ind&e=40&c=FA")
    expect(page.locator(".banner")).to_be_visible()
    expect(page.locator(".board .row")).to_have_count(10)


def test_rank_filters_update(page):
    go(page, "#/rank")
    page.click('[data-g="F"]')
    expect(page.locator(".board-head h2")).to_have_text("女子A組")
    page.click('[data-c="FE"]')
    expect(page.locator(".board-head h2")).to_have_text("女子E組")
    page.click('[data-e="45"]')
    expect(page.locator(".board-head .meta")).to_contain_text("第45屆")
    first = EDS[45]["categories"]["FE"]["individual"][0]
    expect(page.locator(".board .row").first).to_contain_text(first["time"])


def test_rank_school_tab(page):
    go(page, "#/rank?t=team&e=47")
    expect(page.locator(".team")).to_have_count(10)
    expect(page.locator(".team").nth(5)).to_contain_text("未設團體獎")
    total = sum(1 for e in DATA["editions"] for c in e["categories"].values() if c["team_champion"])
    shown = page.locator(".medal .total").all_inner_texts()
    assert sum(int(x) for x in shown) == total


def test_transfer_school_order(page):
    """轉校生：學校按時間由舊到新排列（舊校 → 新校）"""
    order = []
    for ed in sorted(EDS):
        for c in EDS[ed]["categories"].values():
            for r in c["individual"]:
                if r["pid"] == "p45MB012" and (not order or order[-1] != r["school_zh"]):
                    order.append(r["school_zh"])
    assert len(order) >= 2
    go(page, "#/p/p45MB012")
    links = page.locator(".hero .schools a")
    expect(links.first).to_have_text(order[0])
    expect(links.last).to_have_text(order[-1])


def test_highlight_from_profile(page):
    go(page, "#/rank?e=47&c=MA&hl=" + EDS[47]["categories"]["MA"]["individual"][4]["pid"])
    expect(page.locator(".row.mine")).to_have_count(1)


# ---------- 紀錄與趨勢 ----------
def test_records_page(page):
    go(page, "#/records?c=MA")
    expect(page.locator('.dock a[data-nav="records"]')).to_have_class("on")
    all_ma = [r for e in DATA["editions"] for r in e["categories"]["MA"]["individual"]]
    best = min(all_ma, key=lambda r: r["seconds"])
    expect(page.locator(".rec-time")).to_have_text(best["time"])
    expect(page.locator("#trend polyline")).to_have_count(2)
    expect(page.locator("#trend circle")).to_have_count(20)
    expect(page.locator(".board").first.locator(".row")).to_have_count(10)
    expect(page.locator("#fin .bar")).to_have_count(4)
    expect(page.locator(".board").nth(1).locator(".medal")).to_have_count(10)
    page.click("#trend summary")
    expect(page.locator("#trend tbody tr")).to_have_count(10)
    no_hscroll(page)


def test_records_chart_keyboard_tooltip(page):
    go(page, "#/records?c=FB")
    page.focus("#trend svg")
    expect(page.locator("#trend .tip")).to_be_visible()
    page.keyboard.press("ArrowLeft")
    expect(page.locator("#trend .tip .th")).to_have_text("24/25")


def test_records_category_switch(page):
    go(page, "#/records?c=MA")
    page.click('[data-c="MC"]')
    expect(page.locator(".record .label")).to_contain_text("男子C組")


# ---------- 語言 ----------
def test_language_toggle_persists(page):
    go(page, "#/rank")
    page.click("#langBtn")
    expect(page.locator(".seg button").first).to_have_text("Individual")
    expect(page.locator("#q")).to_have_attribute("placeholder", "Search name, romanised name or school")
    page.reload(); page.wait_for_selector("#view > *")
    expect(page.locator(".dock .lbl").first).to_have_text("Home")
    page.click("#langBtn")
    expect(page.locator(".dock .lbl").first).to_have_text("首頁")


# ---------- 錯誤路徑 ----------
def test_not_found_routes(page):
    go(page, "#/nothing")
    expect(page.locator(".wip h2")).to_be_visible()
    go(page, "#/p/p99999")
    expect(page.locator(".wip h2")).to_be_visible()


# ---------- 所有頁面無橫向捲動、底部按鈕不遮內容 ----------
@pytest.mark.parametrize("h", ["#/", "#/rank?t=team&e=44", "#/records?c=FE", "#/athletes", "#/athletes?tab=schools", "#/s/YW", "#/p/" + EDS[47]["categories"]["FA"]["individual"][0]["pid"]])
def test_layout_fits_phone(page, h):
    go(page, h)
    no_hscroll(page)
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(200)
    footer_bottom = page.locator(".disclaimer").evaluate("el => el.getBoundingClientRect().bottom")
    dock_top = page.locator(".dock").evaluate("el => el.getBoundingClientRect().top")
    assert footer_bottom <= dock_top + 1, "頁尾被底部按鈕遮住"


# ---------- 設計規範（美觀審查後加入的回歸測試） ----------
@pytest.mark.parametrize("h", ["#/", "#/rank?e=47&c=MA", "#/records?c=MA", "#/athletes", "#/s/YW"])
def test_touch_targets_at_least_40px(page, h):
    """主要可按控制（按鈕、膠囊、組別鈕、底部導覽）高度不少於 40px。"""
    go(page, h)
    small = page.evaluate("""() => [...document.querySelectorAll('button, .chip, .dock a, .quick a, .row, .tl, .lang, .seg button')]
        .map(e => ({t: (e.textContent || '').trim().slice(0, 12), h: e.getBoundingClientRect().height}))
        .filter(x => x.h && x.h < 40)""")
    assert not small, small


def test_no_dash_characters_in_visible_text(page):
    for h in ["#/", "#/rank?t=team&e=44", "#/records?c=FA", "#/athletes", "#/s/KP", "#/rank?e=46&c=FD", "#/live?demo=47"]:
        go(page, h)
        txt = page.evaluate("document.body.innerText")
        assert "—" not in txt and "–" not in txt, h


def test_dock_marks_current_page(page):
    go(page, "#/rank")
    assert page.locator('.dock a[aria-current="page"]').get_attribute("data-nav") == "rank"


# ---------- 第 48 屆預覽、校徽、在讀／畢業 ----------
def test_home_promo_poster(page):
    """每次進入首頁彈出海報；關閉按鈕 3 秒後才可按；按海報進入賽前預覽"""
    race = json.loads((ROOT / "docs/data/race48.json").read_text(encoding="utf-8"))
    import datetime
    if datetime.date.fromisoformat(race["date"]) < datetime.date.today():
        pytest.skip("比賽日已過，海報不再顯示")
    page.add_init_script("window.XC_NO_PROMO = false")
    go(page, "#/")
    expect(page.locator(".promo")).to_be_visible()
    expect(page.locator(".promo-card")).to_contain_text("第四十八屆學界越野跑比賽")
    expect(page.locator(".promo-x")).to_be_disabled()
    page.wait_for_timeout(1500)
    expect(page.locator(".promo-x")).to_be_disabled()
    expect(page.locator(".promo-x")).to_be_enabled(timeout=3000)
    page.click(".promo-x")
    expect(page.locator(".promo")).to_have_count(0)
    no_hscroll(page)
    page.click('.dock a[data-nav="rank"]')   # 再回首頁：再次彈出
    page.wait_for_function("location.hash.startsWith('#/rank')")
    page.click('.dock a[data-nav="home"]')
    expect(page.locator(".promo")).to_be_visible()
    page.click(".promo-card")
    page.wait_for_function("location.hash.startsWith('#/preview')")
    expect(page.locator(".promo")).to_have_count(0)
    expect(page.locator(".pv-title")).to_be_visible()


def test_home_race_banner(page):
    go(page, "#/")
    expect(page.locator(".race-banner")).to_be_visible()
    expect(page.locator(".race-banner")).to_contain_text("第48屆")


def test_preview_page(page):
    pv = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))
    go(page, "#/preview?c=FB")
    expect(page.locator(".pv-row")).to_have_count(len(pv["categories"]["FB"]["starters"]))
    expect(page.locator(".dist-pair")).to_contain_text("4,110")
    expect(page.locator(".dist-pair")).to_contain_text("4,500")
    expect(page.locator(".pv-row .crest").first).to_be_visible()
    no_hscroll(page)


def test_crests_in_leaderboard(page):
    go(page, "#/rank?e=47&c=MB")
    expect(page.locator(".row .crest")).to_have_count(len(EDS[47]["categories"]["MB"]["individual"]))
    assert page.locator(".row").nth(1).locator(".crest").get_attribute("title") == "濠江中學"


def test_status_on_profiles(page):
    # 第 47 屆男A冠軍若不在今屆名單 → 已畢業；在今屆名單 → 在讀・今屆參賽
    pv = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))
    entered = {s["pid"] for v in pv["categories"].values() for s in v["starters"]}
    for r in EDS[47]["categories"]["MA"]["individual"][:5]:
        go(page, f"#/p/{r['pid']}")
        expect(page.locator(".st-line .st")).to_have_text("在讀・今屆參賽" if r["pid"] in entered else "已畢業")


# ---------- 嚴謹核對：網頁實際顯示與資料逐行一致 ----------
def test_all_leaderboards_render_exactly(page):
    """全部 10 屆 × 10 組排行榜：畫面上每行的名次、姓名、學校、校徽、成績與資料完全一致。"""
    bad = []
    for ed in range(38, 48):
        for c in ["MA", "MB", "MC", "MD", "ME", "FA", "FB", "FC", "FD", "FE"]:
            go(page, f"#/rank?t=ind&e={ed}&c={c}")
            got = page.evaluate("""() => [...document.querySelectorAll('.board .row')].map(r => [
                r.querySelector('.rank').textContent.trim(),
                r.querySelector('.nm').childNodes[0].textContent.trim(),
                r.querySelector('.sch').textContent.trim(),
                r.querySelector('.crest').getAttribute('title'),
                r.querySelector('.tm').childNodes[0].textContent.trim()])""")
            exp = [[str(r["rank"]), r["name_zh"] or r["name_pt"], r["school_zh"], r["school_zh"], r["time"]] for r in EDS[ed]["categories"][c]["individual"]]
            if got != exp:
                bad.append((ed, c, next((g, e) for g, e in zip(got + [None] * 99, exp) if g != e)))
    assert not bad, bad[:5]


def test_all_preview_rows_render_exactly(page):
    """10 組預覽：每行的姓名、今屆學校、校徽與預覽資料一致，點入個人檔案後姓名相同。"""
    pv = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))
    name_of = {}
    for e in DATA["editions"]:
        for cat in e["categories"].values():
            for r in cat["individual"]:
                name_of[r["pid"]] = r["name_zh"] or r["name_pt"]
    for c, v in pv["categories"].items():
        go(page, f"#/preview?c={c}")
        got = page.evaluate("""() => [...document.querySelectorAll('.pv-row')].map(r => [r.getAttribute('href').slice(4),
            r.querySelector('.nm').childNodes[0].textContent.trim(), [...r.querySelector('.sch').childNodes].filter((n) => !(n.classList && n.classList.contains('pv-heat'))).map((n) => n.textContent).join('').split(' · ')[0].trim(),
            r.querySelector('.crest').getAttribute('title')])""")
        exp = {s["pid"]: s["school_zh"] for s in v["starters"]}
        assert len(got) == len(exp), c
        for pid, nm, sch, cr in got:
            assert nm == name_of[pid] and sch == exp[pid] and cr == exp[pid], (c, pid, nm, sch, cr)


def test_privacy_page_and_back_button(page):
    go(page, "#/")
    page.click('.disclaimer a[href="#/privacy"]')
    expect(page.locator(".page-title")).to_have_text("私隱及資料使用")
    expect(page.locator("#remove")).to_be_visible()
    page.click("#backBtn")
    expect(page.locator(".race-banner")).to_be_visible()


def test_back_button_direct_link_goes_home(page):
    go(page, "#/p/" + EDS[47]["categories"]["MA"]["individual"][0]["pid"])
    expect(page.locator("#backBtn")).to_be_visible()
    page.click("#backBtn")
    expect(page.locator(".carousel")).to_be_visible()


def test_real_crests_used_where_available(page):
    crests = json.loads((ROOT / "docs/data/crests.json").read_text(encoding="utf-8"))["images"]
    assert len(crests) >= 17
    go(page, "#/rank?e=47&c=MA")
    rows = page.evaluate("""() => [...document.querySelectorAll('.board .row')].map(r => [r.querySelector('.sch').textContent.trim(), !!r.querySelector('.crest img')])""")
    schools = json.loads((ROOT / "docs/data/results.json").read_text(encoding="utf-8"))["schools"]
    for sch, has_img in rows:
        assert has_img == (schools[sch]["abbr"] in crests), sch
    for f in crests.values():
        assert page.request.get(f"{page.base}/{f}").ok, f


def test_removal_form_link(page):
    site = json.loads((ROOT / "docs/data/site.json").read_text(encoding="utf-8"))
    go(page, "#/privacy")
    a = page.locator(".btn-primary")
    expect(a).to_be_visible()
    assert a.get_attribute("href") == site["removal_url"] and "docs.google.com/forms" in site["removal_url"]
    assert a.get_attribute("rel") == "noopener" and a.get_attribute("target") == "_blank"


def test_prediction_view(page):
    pv = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))
    go(page, "#/preview?c=MA")
    page.click('[data-v="pred"]')
    expect(page.locator(".pd-row")).to_have_count(len(pv["categories"]["MA"]["prediction"]))
    expect(page.locator(".pd-note")).to_contain_text("推算預測")
    expect(page.locator(".pd-note")).to_contain_text("濠江")
    expect(page.locator(".pd-row").first).to_contain_text("預測首名")
    no_hscroll(page)


def test_popularity_tab_demo(page):
    go(page, "#/p/" + EDS[47]["categories"]["MA"]["individual"][0]["pid"])
    expect(page.locator("#lvCorner")).to_be_visible()
    expect(page.locator("#popViews")).to_have_text("1")
    go(page, "#/rank?t=pop")
    expect(page.locator(".live.on")).to_be_visible()  # 已接資料庫：顯示「實時」
    expect(page.locator(".podium")).to_have_count(1)


def test_preview_title_and_hero(page):
    go(page, "#/preview?c=MA")
    expect(page.locator(".pv-title")).to_contain_text("第四十八屆學界越野跑比賽")
    expect(page.locator(".pv-title small")).to_have_text("48° Campeonato Escolar de Corta-Mato")
    # 次序：比賽日 → 比賽時間表 → 各組冠軍預測 → 人氣運動員 → 新晉焦點（上屆回顧已刪除）
    assert page.locator("#pvCarousel .card h3").all_inner_texts() == ["比賽日", "比賽時間表", "各組冠軍預測", "人氣運動員", "新晉焦點"]
    for img in ["arch", "start", "champ", "runner", "girls"]:
        assert page.request.get(f"{page.base}/img/race/{img}.jpg").ok, img
    expect(page.locator("#pvCarousel .card").nth(2).locator(".mini-row")).to_have_count(10)
    no_hscroll(page)


def test_preview_heat_badges(page):
    """男C／女C 分組出發：往績及預測名單均列出所屬分組（C1、C2…）；不分組的組別不顯示"""
    pv = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))["categories"]
    go(page, "#/preview?c=MC")
    expect(page.locator(".pv-row")).to_have_count(len(pv["MC"]["starters"]))
    expect(page.locator(".pv-row .pv-heat")).to_have_count(len(pv["MC"]["starters"]))
    assert set(page.locator(".pv-row .pv-heat").all_inner_texts()) <= {"C1", "C2", "C3"}
    go(page, "#/preview?c=FC&v=pred")
    rows = page.locator(".pd-row")
    expect(rows.first).to_be_visible()
    assert rows.count() == rows.locator(".pv-heat").count()   # 包括未有學界往績的新人
    assert set(rows.locator(".pv-heat").all_inner_texts()) <= {"C1", "C2"}
    go(page, "#/preview?c=MA")
    expect(page.locator(".pv-row").first).to_be_visible()
    expect(page.locator(".pv-heat")).to_have_count(0)


def _race_open():
    import datetime
    race = json.loads((ROOT / "docs/data/race48.json").read_text(encoding="utf-8"))
    return datetime.date.fromisoformat(race["date"]) >= datetime.date.today(), race


def test_athlete_race_button_and_glow_card(page):
    """今屆出賽者：運動員頁有出賽按鈕（組別、分組、檢錄／起跑時間）→ 賽前預覽螢光提示卡、打氣語、名單行螢光"""
    open_, race = _race_open()
    if not open_:
        pytest.skip("比賽日已過")
    pv = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))["categories"]
    sch = {x["cat"]: x for x in race["schedule"]}
    s = next(x for x in pv["MC"]["starters"] if x.get("heat") == "2")
    go(page, f"#/p/{s['pid']}")
    btn = page.locator(".me-race")
    expect(btn).to_contain_text("男子C組 · 第 2 組")
    expect(btn).to_contain_text(f"檢錄 {sch['MC']['call']}")
    expect(btn).to_contain_text(sch["MC"]["start"])
    btn.click()
    page.wait_for_function("location.hash.includes('me=')")
    card = page.locator("#meCard")
    expect(card).to_be_visible()
    expect(card.locator(".mc-times")).to_contain_text(sch["MC"]["call"])
    expect(card.locator(".mc-note")).to_contain_text("第 2 組")
    first = card.locator("#meCheer").inner_text()
    assert first.strip()
    page.click("#meMore")
    assert card.locator("#meCheer").inner_text() != first
    expect(page.locator(f'.pv-row.me-glow[href="#/p/{s["pid"]}"]')).to_have_count(1)
    page.click('[data-v="pred"]')                     # 切換預測：保留提示卡
    expect(page.locator("#meCard")).to_be_visible()
    no_hscroll(page)
    # 不分組的組別：沒有分組提示
    a = pv["MA"]["starters"][0]
    go(page, f"#/preview?c=MA&me={a['pid']}")
    expect(page.locator("#meCard .mc-times")).to_contain_text(sch["MA"]["start"])
    expect(page.locator("#meCard .mc-note")).to_have_count(0)
    # 不合格式或非本組參賽者：不顯示
    go(page, '#/preview?c=MA&me=x"]')
    expect(page.locator("#meCard")).to_have_count(0)


def test_invite_card_export_and_crest_visible(page):
    """比賽日提示卡：校徽正常顯示（不會被 % 內距壓成空白）；匯出觀賽邀請卡 1080×1350"""
    open_, race = _race_open()
    if not open_:
        pytest.skip("比賽日已過")
    pv = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))["categories"]
    s = next(x for x in pv["MA"]["starters"] if x.get("pid"))
    go(page, f"#/preview?c=MA&me={s['pid']}")
    expect(page.locator("#meCard")).to_be_visible()
    img = page.locator("#meCard .crest img")
    if img.count():
        assert img.bounding_box()["width"] > 40
    page.click("#meInv")
    modal = page.locator(".card-modal")
    expect(modal.locator("img")).to_be_visible(timeout=15000)
    assert modal.locator("img").evaluate("i => [i.naturalWidth, i.naturalHeight]") == [1080, 1350]
    assert modal.locator("#cmSave").get_attribute("download").endswith("_觀賽邀請卡.png")
    page.keyboard.press("Escape")
    expect(modal).to_have_count(0)


def test_athlete_without_entry_has_no_race_button(page):
    pv = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))["categories"]
    entered = {s["pid"] for c in pv.values() for s in c["starters"]}
    pid = next(r["pid"] for r in EDS[38]["categories"]["MA"]["individual"] if r["pid"] not in entered and not r.get("hidden"))
    go(page, f"#/p/{pid}")
    expect(page.locator(".hero h1")).to_be_visible()
    expect(page.locator(".me-race")).to_have_count(0)


def test_race_day_forecast(page):
    """比賽當日天氣預測：賽前預覽、首頁資訊卡、紀錄頁歷屆比賽天氣（與往年同一格式）"""
    open_, race = _race_open()
    fc = json.loads((ROOT / "docs/data/forecast48.json").read_text(encoding="utf-8"))
    assert fc["date"] == race["date"] and fc["source"].startswith("澳門地球物理氣象局")
    if not open_ or not fc.get("available"):
        pytest.skip("沒有有效預報")
    assert fc["temp_min"] <= fc["temp_max"] and fc["rh_min"] <= fc["rh_max"] and fc["level"] in ("good", "mild", "hard", "severe")
    rng = f"{fc['temp_min']}-{fc['temp_max']}°C"
    go(page, "#/preview?c=MA")
    expect(page.locator(".wx-fc summary")).to_contain_text(rng)
    page.click(".wx-fc summary")
    expect(page.locator(".wx-fc")).to_contain_text("地球物理氣象局七天天氣預報")
    expect(page.locator('.wx-fc a[href^="https://www.dsmg.gov.mo/"]')).to_have_count(1)
    expect(page.locator("#pvCarousel .hero-card .hc-fc")).to_contain_text(f"{fc['temp_min']}–{fc['temp_max']}°C")
    go(page, "#/records?c=MA&go=wx")
    expect(page.locator(".wxrow.fc-row")).to_contain_text("預測")
    no_hscroll(page)


# ---------- 第六輪：運動員／學校名錄、互相連結、比賽天氣 ----------
WX = json.loads((ROOT / "docs/data/weather.json").read_text(encoding="utf-8"))


def test_dock_has_four_tabs(page):
    go(page, "#/")
    expect(page.locator(".dock a")).to_have_count(4)
    assert page.locator(".dock .lbl").all_inner_texts() == ["首頁", "歷屆成績", "運動員", "紀錄與趨勢"]
    expect(page.locator(".entry a")).to_have_count(4)
    expect(page.locator(".card-more")).to_have_count(5)


def test_athlete_directory_filters(page):
    go(page, "#/athletes?k=champ&g=F")
    expect(page.locator('.dock a[aria-current="page"]')).to_have_attribute("data-nav", "athletes")
    champs = {r["pid"] for e in DATA["editions"] for c, v in e["categories"].items() if c[0] == "F" for r in v["individual"] if r["rank"] == 1 and not r.get("hidden")}
    expect(page.locator(".board-head h2")).to_have_text(f"共 {len(champs)} 名運動員")
    hrefs = page.locator("#athList a").evaluate_all("els => els.map(e => e.getAttribute('href').slice(4))")
    assert set(hrefs) <= champs and len(hrefs) == min(40, len(champs))
    page.select_option("#athSchool", "KP")
    page.wait_for_function("location.hash.includes('s=KP')")
    for t in page.locator("#athList .sch").all_inner_texts():
        assert t  # 每行有校名
    no_hscroll(page)


def test_school_page_counts(page):
    go(page, "#/s/YW")
    names = {zh for zh, s in DATA["schools"].items() if s.get("abbr") == "YW"}
    titles = sum(1 for e in DATA["editions"] for v in e["categories"].values() if v["team_champion"] and v["team_champion"]["school_zh"] in names)
    expect(page.locator(".stats4 .stat b").first).to_have_text(str(titles))
    expect(page.locator(".back")).to_be_visible()
    no_hscroll(page)


def test_links_between_pages(page):
    go(page, "#/rank?t=team&e=47")
    page.locator(".team a.sl-link").first.click()
    page.wait_for_function("location.hash.startsWith('#/s/')")
    expect(page.locator(".school-hero h1")).to_be_visible()
    go(page, "#/rank?e=47&c=MA")
    page.click(".link-row a >> nth=0")
    page.wait_for_function("location.hash.startsWith('#/records?c=MA')")
    go(page, "#/")
    page.locator(".card .bars a").first.click()
    page.wait_for_function("location.hash.startsWith('#/s/')")


def test_weather_on_rank_and_records(page):
    go(page, "#/rank?e=46&c=FD")
    w = next(x for x in WX["races"] if x["edition"] == 46 and x.get("cats") == "DE")
    expect(page.locator(".wx summary")).to_contain_text(f"濕度 {w['rh_avg']}%")
    go(page, "#/rank?e=46&c=MA")
    w = next(x for x in WX["races"] if x["edition"] == 46 and x.get("cats") == "ABC")
    expect(page.locator(".wx summary")).to_contain_text("有雨")
    page.click(".wx summary")
    expect(page.locator(".wx .wx-note")).to_contain_text("天雨延期")
    go(page, "#/records?c=MA&go=wx")
    expect(page.locator(".wxrow:not(.fc-row)")).to_have_count(len(DATA["editions"]))   # 另加今屆預測一行（比賽日前）
    no_hscroll(page)


def test_weather_data_sane():
    eds = {e["edition"] for e in DATA["editions"]}
    assert eds <= {w["edition"] for w in WX["races"]}
    for w in WX["races"]:
        assert 5 <= w["temp_min"] <= w["temp_max"] <= 35, w
        assert 20 <= w["rh_avg"] <= 100 and w["obs"] >= 4, w
        assert w["basis"] in ("actual", "planned")


# ---------- 同頁切換篩選：不跳回頁頂、不增加瀏覽紀錄 ----------
@pytest.mark.parametrize("h, clicks", [
    ("#/preview?c=MA", ['[data-g="F"]', '.cats [data-c="FC"]', '[data-v="pred"]', '[data-v="past"]', '[data-g="M"]']),
    ("#/rank?e=47&c=MA", ['[data-g="F"]', '.cats [data-c="FB"]', '[data-e="45"]']),
    ("#/records?c=MA", ['[data-g="F"]', '.cats [data-c="FD"]']),
])
def test_filters_keep_scroll_position(page, h, clicks):
    """以 dispatch_event 觸發點擊（不經 Playwright 自動捲動），檢查網站本身不會跳回頁頂。
    若新內容較短，瀏覽器會把捲動位置限制在最底，此情況以「最大可捲動距離」為準。"""
    go(page, h)
    page.evaluate("window.scrollTo(0, 400)")
    page.wait_for_timeout(100)
    y0 = page.evaluate("window.scrollY")
    assert y0 >= 300, "測試前未能向下捲動"
    hist0 = page.evaluate("history.length")
    for sel in clicks:
        before = page.evaluate("location.hash")
        page.locator(sel).first.dispatch_event("click")
        page.wait_for_function(f"location.hash !== {json.dumps(before)}")
        page.wait_for_timeout(80)
        y, ymax = page.evaluate("[window.scrollY, document.documentElement.scrollHeight - window.innerHeight]")
        assert abs(y - min(y0, ymax)) <= 2, (sel, y, y0, ymax)
        y0 = y
    assert page.evaluate("history.length") == hist0, "篩選切換不應增加瀏覽紀錄"


def test_new_page_still_starts_at_top(page):
    go(page, "#/rank?e=47&c=MA")
    page.evaluate("window.scrollTo(0, 600)")
    page.locator(".board .row").first.click()
    page.wait_for_function("location.hash.startsWith('#/p/')")
    page.wait_for_timeout(80)
    assert page.evaluate("window.scrollY") == 0


# ---------- 即時成績：終點輸入（工作人員頁）＋公眾即時頁 ----------
# 以記憶體模擬 Supabase（登入、讀寫、公眾 feed），絕不連真實資料庫
import base64, itertools


def _fake_jwt(email):
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")
    return f"{enc({'alg': 'HS256', 'typ': 'JWT'})}.{enc({'sub': 'u1', 'email': email, 'role': 'authenticated', 'exp': int(time.time()) + 3600})}.sig"


def _page(url, rows):
    """模擬 PostgREST：offset／limit，且每次最多回傳 1000 行（Supabase 預設 max_rows）"""
    q = dict(p.split("=", 1) for p in url.split("?", 1)[1].split("&") if "=" in p) if "?" in url else {}
    off = int(q.get("offset", 0))
    lim = min(int(q.get("limit", 1000)), 1000)
    return rows[off:off + lim]


@pytest.fixture()
def live(browser, base_url):
    ctx = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="zh-HK")
    ctx.add_init_script("window.XC_NO_PROMO = true")   # 首頁海報只在專門測試開啟
    ctx.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    ctx.route("https://fonts.gstatic.com/**", lambda r: r.fulfill(status=204, body=""))
    db = {"entries": {}, "heats": {}, "cert": {}, "rev": itertools.count(1)}
    ma = EDS[47]["categories"]["MA"]["individual"]
    roster = [{"bib": 1001, "cat": "MA", "heat": None, "abbr": "YW", "pid": ma[0]["pid"], "name": None, "seq": 3},
              {"bib": 1002, "cat": "MA", "heat": None, "abbr": "HK", "pid": None, "name": "測試甲", "seq": 4},
              {"bib": 1012, "cat": "MA", "heat": None, "abbr": "HK", "pid": None, "name": "測試乙", "seq": 1},
              {"bib": 1003, "cat": "MA", "heat": None, "abbr": "YW", "pid": PRED_MA_TOP, "name": None, "seq": 2},
              {"bib": 2001, "cat": "FB", "heat": None, "abbr": "HK", "pid": None, "name": None},
              # 男C 分組（第 48 屆實際號碼：C1 陳浩天 405；C2 羅焯饒 7）
              {"bib": 405, "cat": "MC", "heat": 1, "abbr": "IV", "pid": None, "name": "陳浩天"},
              {"bib": 40, "cat": "MC", "heat": 1, "abbr": "IV", "pid": None, "name": "測試丙"},
              {"bib": 7, "cat": "MC", "heat": 2, "abbr": "CAM", "pid": None, "name": "羅焯饒"}]
    email = "helper@example.invalid"
    user = {"id": "u1", "aud": "authenticated", "role": "authenticated", "email": email, "app_metadata": {}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"}
    cors = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*"}

    def ok(route, body, status=200):
        return route.fulfill(status=status, content_type="application/json", body=json.dumps(body), headers=cors)

    def handler(route):
        req = route.request
        u = req.url
        if req.method == "OPTIONS":
            return route.fulfill(status=200, headers=cors)
        if "/auth/v1/token" in u:
            return ok(route, {"access_token": _fake_jwt(email), "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "refresh_token": "r1", "user": user})
        if "/auth/v1/user" in u:
            return ok(route, user)
        if "/auth/v1/logout" in u:
            return route.fulfill(status=204, headers=cors)
        if "/rpc/xc_is_admin" in u:
            return ok(route, True)
        if "/rpc/xc_now" in u:
            return ok(route, int(time.time() * 1000))
        if "/rpc/xc_live_feed" in u:
            since = json.loads(req.post_data or "{}").get("p_since") or 0
            return ok(route, {"now": int(time.time() * 1000),
                              "heats": [h for h in db["heats"].values() if h["rev"] > since],
                              "entries": [{**{k: v for k, v in e.items() if k != "bib"}, "k": f"h{e['bib']}" if e.get("bib") else None}
                                          for e in db["entries"].values() if e["rev"] > since]})
        if "/rpc/xc_live_roster_public" in u:
            db["roster_calls"] = db.get("roster_calls", 0) + 1
            return ok(route, [{"k": f"h{r['bib']}", **{k: v for k, v in r.items() if k != "bib"}} for r in roster])
        if "/rest/v1/xc_live_roster" in u:
            db.setdefault("roster_q", []).append(u)
            rows = sorted(db.get("roster_big") or roster, key=lambda r: r["bib"])
            return ok(route, _page(u, rows))
        if "/rpc/xc_live_cert_cats" in u:
            cats = {}
            for r in db["cert"].values():
                cats[r["cat"]] = cats.get(r["cat"], 0) + 1
            return ok(route, [{"cat": c, "n": n, "at": "2026-11-29T12:00:00Z"} for c, n in sorted(cats.items())])
        if "/rest/v1/xc_live_cert" in u:
            if req.method == "DELETE":
                cat = u.split("cat=eq.")[1].split("&")[0]
                db["cert"] = {k: v for k, v in db["cert"].items() if v["cat"] != cat}
                return route.fulfill(status=204, headers=cors)
            if req.method == "POST":
                for r in json.loads(req.post_data):
                    db["cert"][(r["cat"], r["bib"])] = r
                return route.fulfill(status=201, body="", headers=cors)
        for table, key in (("xc_live_entries", "id"), ("xc_live_heats", None)):
            if f"/rest/v1/{table}" in u:
                store = db["entries" if key else "heats"]
                if req.method == "GET":
                    since = int(u.split("rev=gt.")[1].split("&")[0]) if "rev=gt." in u else 0
                    db.setdefault("get_q", []).append((table, since))
                    return ok(route, _page(u, sorted((r for r in store.values() if r["rev"] > since), key=lambda r: r["rev"])))
                rows = json.loads(req.post_data)
                for r in rows if isinstance(rows, list) else [rows]:
                    k = r[key] if key else f"{r['cat']}|{r['heat']}"
                    store[k] = {**store.get(k, {}), **r, "rev": next(db["rev"])}
                return route.fulfill(status=201, body="", headers=cors)
        return route.fulfill(status=404, body="")

    ctx.route("https://*.supabase.co/**", handler)
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.on("dialog", lambda d: d.accept())  # 確認框一律按「確定」
    pg.base = base_url
    pg.db = db
    yield pg
    assert not pg.errors, pg.errors
    ctx.close()


def _type_bib(page, bib):
    for ch in str(bib):
        page.click(f'#pad [data-k="{ch}"]')
    page.click('#pad [data-k="ok"]')


def _synced(page):
    page.wait_for_function("document.querySelector('#sync').classList.contains('ok')")


def _until(page, cond, ms=5000):
    """等候模擬資料庫達到條件（上傳是非同步的）"""
    for _ in range(ms // 50):
        if cond():
            return
        page.wait_for_timeout(50)
    assert cond()


def _login_ma(page):
    page.goto(f"{page.base}/live-admin.html")
    page.fill("#email", "helper@example.invalid")
    page.fill("#pw", "x")
    page.click("#loginBtn")
    expect(page.locator("#app")).to_be_visible()
    page.select_option("#event", "test")
    page.select_option("#grp", "MA|1")


def _passes(page, bib):
    return sorted((r for r in page.db["entries"].values() if r.get("bib") == bib and not r.get("deleted") and not r.get("dns")), key=lambda r: r["at_ms"])


def test_live_admin_reads_past_1000_rows(live):
    """Supabase 每次最多回傳 1000 行：名單及終點紀錄要分批讀；分組（heats）較新的 rev 不可令未讀的紀錄被跳過"""
    page = live
    extra = [{"bib": 3000 + i, "cat": "MA", "heat": None, "abbr": "HK", "pid": None, "name": None, "seq": None} for i in range(1100)]
    page.db["roster_big"] = extra + [  # 原有 8 人
        {"bib": 1002, "cat": "MA", "heat": None, "abbr": "HK", "pid": None, "name": "測試甲", "seq": 4},
        {"bib": 1012, "cat": "MA", "heat": None, "abbr": "HK", "pid": None, "name": "測試乙", "seq": 1}]
    t0 = int(time.time() * 1000) - 3_600_000
    for i in range(1198):   # 已刪除的舊紀錄，填滿第一批
        page.db["entries"][f"x{i}"] = {"id": f"x{i}", "event": "test", "cat": "MA", "heat": 1, "bib": 3000 + i % 1100, "at_ms": t0 + 600_000 + i, "seq": 1,
                                       "abbr": "HK", "pid": None, "name": None, "fin": False, "deleted": True, "rev": next(page.db["rev"])}
    for i, (bib, sec) in enumerate([(1002, 1200), (1012, 1250)], 1):   # 第 1199、1200 筆：兩人衝線
        page.db["entries"][f"c{i}"] = {"id": f"c{i}", "event": "test", "cat": "MA", "heat": 1, "bib": bib, "at_ms": t0 + sec * 1000, "seq": i,
                                       "abbr": "HK", "pid": None, "name": None, "fin": True, "deleted": False, "rev": next(page.db["rev"])}
    page.db["heats"]["MA|1"] = {"event": "test", "cat": "MA", "heat": 1, "start_ms": t0, "status": "done", "rev": next(page.db["rev"])}
    _login_ma(page)
    _synced(page)
    expect(page.locator("#sync")).to_contain_text("名單 1102")
    assert any("offset=1000" in q for q in page.db["roster_q"])
    page.click("#certBtn")
    expect(page.locator("#sheet")).to_contain_text("完賽 2 人")
    assert ("xc_live_entries", 1000) in page.db["get_q"]


def test_live_admin_cert_release(live):
    """全組完成後「核對後開放紀念卡」：把名次及時間快照寫入 xc_live_cert；可取消開放"""
    page = live
    t0 = int(time.time() * 1000) - 3_600_000
    page.db["heats"]["MA|1"] = {"event": "test", "cat": "MA", "heat": 1, "start_ms": t0, "status": "done", "rev": next(page.db["rev"])}
    for i, (bib, sec) in enumerate([(1002, 1200), (1012, 1250)], 1):
        page.db["entries"][f"c{i}"] = {"id": f"c{i}", "event": "test", "cat": "MA", "heat": 1, "bib": bib, "at_ms": t0 + sec * 1000, "seq": i,
                                       "abbr": "HK", "pid": None, "name": None, "fin": True, "deleted": False, "rev": next(page.db["rev"])}
    _login_ma(page)
    btn = page.locator("#certBtn")
    expect(btn).to_be_visible()
    expect(btn).to_have_text("核對後開放紀念卡")
    btn.click()
    expect(page.locator("#sheet")).to_contain_text("完賽 2 人")
    expect(page.locator("#sheet .cert-top li").first).to_contain_text("測試甲")
    page.click('#sheet button[value="ok"]')
    _until(page, lambda: len(page.db["cert"]) == 2)
    rows = sorted(page.db["cert"].values(), key=lambda r: r["place"])
    assert [(r["bib"], r["place"], r["time_ms"]) for r in rows] == [(1002, 1, 1_200_000), (1012, 2, 1_250_000)]
    assert all(r["event"] == "test" and r["cat"] == "MA" for r in rows)
    expect(btn).to_have_text("紀念卡已開放（2 人）")
    btn.click()
    page.click('#sheet button[value="off"]')
    _until(page, lambda: len(page.db["cert"]) == 0)
    expect(btn).to_have_text("核對後開放紀念卡")


def test_live_admin_cert_hidden_until_done(live):
    page = live
    _login_ma(page)
    expect(page.locator("#certBtn")).to_be_hidden()
    page.click("#startBtn")
    expect(page.locator("#certBtn")).to_be_hidden()


def test_live_admin_flow(live):
    page = live
    _login_ma(page)
    expect(page.locator("#who")).to_contain_text("只需輸入尾 2 位")
    page.click("#startBtn")
    _until(page, lambda: "MA|1" in page.db["heats"])
    heat = page.db["heats"]["MA|1"]
    assert heat["status"] == "running" and heat["event"] == "test" and heat["start_ms"] > 0

    # 1. 只輸入尾數：「01」配對 1001；「2」同時符合 1002、1012，要再輸入
    for ch in "01":
        page.click(f'#pad [data-k="{ch}"]')
    expect(page.locator("#who")).to_contain_text("粵華")
    expect(page.locator("#who")).to_contain_text("第 1 圈")
    page.click('#pad [data-k="ok"]')
    expect(page.locator("#list.runners li[data-key]")).to_have_count(1)
    page.click('#pad [data-k="2"]')
    expect(page.locator("#who")).to_contain_text("符合 2 個號碼")
    page.click('#pad [data-k="del"]')

    # 2. 先按「先記時間」再輸入號碼：填入空位
    page.click("#markBtn")
    expect(page.locator("#slotNote")).to_be_visible()
    _type_bib(page, "02")
    expect(page.locator("#slotNote")).to_be_hidden()
    expect(page.locator("#list.runners li[data-key]")).to_have_count(2)
    _until(page, lambda: len(_passes(page, 1002)) == 1 and len(_passes(page, 1001)) == 1)
    assert _passes(page, 1002)[0]["name"] == "測試甲"

    # 3. 防誤按：剛記錄又按同一人 → 提示疑似重複；按「取消」不記錄
    page.evaluate("window._c = window.confirm; window.confirm = () => false")
    page.locator('#list.runners .tap[data-bib="1001"]').click()
    expect(page.locator("#who")).to_contain_text("疑似重複")
    page.evaluate("window.confirm = window._c")
    page.wait_for_timeout(300)
    assert len(_passes(page, 1001)) == 1

    # 4. 按清單記圈（確認框按「確定」＝強制記錄）：記滿 5 圈即完賽
    for _ in range(4):
        page.locator('#list.runners .tap[data-bib="1001"]').click()
    _until(page, lambda: len(_passes(page, 1001)) == 5)
    assert all(r["force"] for r in _passes(page, 1001)[1:])
    expect(page.locator("#list.runners li[data-key]")).to_have_count(1)
    expect(page.locator("#listTabs")).to_contain_text("已完賽 1")
    # 完賽後再輸入：不加圈
    _type_bib(page, "01")
    expect(page.locator("#who")).to_contain_text("已完賽")
    page.wait_for_timeout(300)
    assert len(_passes(page, 1001)) == 5

    # 5. 撤銷上一下：撤銷第 5 圈，1001 回到跑道上
    expect(page.locator("#undoBtn")).to_contain_text("1001 完賽")
    page.click("#undoBtn")
    _until(page, lambda: len(_passes(page, 1001)) == 4)
    expect(page.locator("#list.runners li[data-key]")).to_have_count(2)
    page.locator('#list.runners .tap[data-bib="1001"]').click()
    _until(page, lambda: len(_passes(page, 1001)) == 5)

    # 6. 另一部裝置幾乎同時記錄 1002：視為重複，不計圈
    first = _passes(page, 1002)[0]
    page.db["entries"]["other-device"] = {**first, "id": "other-device", "at_ms": first["at_ms"] + 2000, "seq": 99, "force": False, "rev": next(page.db["rev"])}
    page.click('#listTabs [data-tab="all"]')
    expect(page.locator("#list.records")).to_contain_text("重複，不計", timeout=6000)
    page.click('#listTabs [data-tab="course"]')
    expect(page.locator('#list.runners li[data-key="b1002"] .lp b')).to_have_text("1")

    # 7. 名單外號碼：確認後以「待確認」記錄，再在全部紀錄刪除
    _type_bib(page, 9999)
    _until(page, lambda: len(_passes(page, 9999)) == 1)
    page.click('#listTabs [data-tab="all"]')
    page.locator("#list.records li", has_text="9999").first.click()
    page.click('#sheet button[value="delete"]')
    _until(page, lambda: len(_passes(page, 9999)) == 0)

    # 公眾頁：同一份資料、不含號碼布；個人榜顯示姓名（有往績者及秩序冊姓名）、圈數；團體榜暫計
    page.goto(f"{page.base}/#/live?ev=test&c=MA")
    page.wait_for_selector("#lvBody .lv-run")
    rows = page.locator("#lvBody .lv-run")
    expect(rows).to_have_count(2)
    expect(rows.nth(0)).to_contain_text(EDS[47]["categories"]["MA"]["individual"][0]["name_zh"])
    expect(rows.nth(1)).to_contain_text("測試甲")
    expect(rows.nth(1)).to_contain_text("1／5 圈")
    body = page.locator("#lvBody").inner_text()
    assert "1002" not in body and "1001" not in body
    expect(page.locator(".lv-team")).to_have_count(0)            # 預設只顯示個人即時排名
    # 按一下展開各圈用時：1001 共 5 次經過，最後一次為完賽
    rows.nth(0).locator("button").click()
    expect(page.locator(".lv-splits span")).to_have_count(5)
    expect(page.locator(".lv-splits")).to_contain_text("完賽")
    no_hscroll(page)
    # 切換至團體即時排名；按學校展開出戰名單（含未起跑者）
    page.click('[data-lv="team"]')
    expect(page.locator("#lvBody .lv-run")).to_have_count(0)
    hk = page.locator(".lv-tw", has_text="濠江中學")
    expect(hk.locator(".lv-team")).to_contain_text("暫計")
    hk.locator(".lv-team").click()
    expect(hk.locator(".lv-roster")).to_contain_text("測試甲")
    expect(hk.locator(".lv-roster")).to_contain_text("已完成 1／5 圈")
    expect(hk.locator(".lv-roster")).to_contain_text("測試乙")
    expect(hk.locator(".lv-roster")).to_contain_text("未有經過終點紀錄")
    # 更新按鈕：重新下載出戰名單及即時紀錄
    n0 = page.db.get("roster_calls", 0)
    page.click("#lvRefresh")
    _until(page, lambda: page.db.get("roster_calls", 0) > n0)
    no_hscroll(page)


def test_live_admin_heats_and_full_bibs(live):
    """號碼按學校編配（同組沒有共同前綴）：須輸入完整號碼；分組比賽按組顯示，他組號碼會提示"""
    page = live
    _login_ma(page)
    expect(page.locator('#grp option[value^="MC|"]')).to_have_count(3)   # 男C 第 1、2、3 組逐一列出
    expect(page.locator('#grp option[value^="FC|"]')).to_have_count(2)   # 女C 第 1、2 組
    page.select_option("#grp", "MC|1")
    expect(page.locator("#grpLabel")).to_have_text("男C 第 1 組 · 2 圈")
    expect(page.locator("#who")).to_contain_text("男C 第 1 組 共 2 人")
    page.click('#pad [data-k="4"]')
    expect(page.locator("#who")).to_contain_text("輸入中")
    page.click('#pad [data-k="0"]')
    expect(page.locator("#who")).to_contain_text("測試丙")          # 40 完全相符，不會誤配 405
    page.click('#pad [data-k="5"]')
    expect(page.locator("#who")).to_contain_text("陳浩天")
    page.click('#pad [data-k="del"]'); page.click('#pad [data-k="del"]'); page.click('#pad [data-k="del"]')
    page.click('#pad [data-k="7"]')
    expect(page.locator("#who")).to_contain_text("屬男C 第 2 組")
    page.click('#pad [data-k="del"]')
    page.click("#startBtn")
    _type_bib(page, 405)
    _until(page, lambda: len(_passes(page, 405)) == 1)
    r = _passes(page, 405)[0]
    assert r["cat"] == "MC" and r["heat"] == 1 and r["name"] == "陳浩天"


def test_live_admin_first_lap_bubbles(live):
    """第一圈泡泡：預測排名最前、未記第一圈者；按一下即記第一圈並消失"""
    page = live
    _login_ma(page)
    page.click("#startBtn")
    first = page.locator("#bubbles [data-pb]").first
    expect(first).to_have_attribute("data-pb", "1003")
    first.click()
    _until(page, lambda: len(_passes(page, 1003)) == 1)
    expect(page.locator('#bubbles [data-pb="1003"]')).to_have_count(0)
    expect(page.locator('#list.runners li[data-key="b1003"]')).to_have_count(1)


FAKE_SR = """
window.webkitSpeechRecognition = class {
  start() { window.__sr = this; this.started = (this.started || 0) + 1; }
  stop() { this.stopped = true; }
  abort() {}
};
window.SpeechRecognition = window.webkitSpeechRecognition;
window.__say = (text) => { const r = [{ transcript: text }]; r.isFinal = true; window.__sr.onresult({ resultIndex: 0, results: [r] }); };
window.__part = (text, final, i = 0) => { const r = [{ transcript: text }]; r.isFinal = !!final; const results = []; results[i] = r; window.__sr.onresult({ resultIndex: i, results }); };
"""


def test_live_admin_voice_input(live):
    """語音輸入（以模擬識別測試）：粵語數字轉號碼、他組號碼不記錄、「撤銷」"""
    page = live
    page.add_init_script(FAKE_SR)
    _login_ma(page)
    page.select_option("#grp", "MC|1")
    page.click("#startBtn")
    page.click("#micBtn")
    expect(page.locator("#micBtn")).to_have_class(re.compile("on"))
    page.evaluate("__say('四零五')")
    _until(page, lambda: len(_passes(page, 405)) == 1)
    expect(page.locator("#vlog")).to_contain_text("405")
    page.evaluate("__say('七')")
    expect(page.locator("#vlog")).to_contain_text("屬男C 第 2 組，未記錄")
    page.evaluate("__say('四十')")
    _until(page, lambda: len(_passes(page, 40)) == 1)
    page.evaluate("__say('撤銷')")
    _until(page, lambda: len(_passes(page, 40)) == 0)
    page.evaluate("__say('四零五')")   # 剛記錄：疑似重複，不彈確認框、不記錄
    expect(page.locator("#vlog")).to_contain_text("疑似重複")
    assert len(_passes(page, 405)) == 1
    page.click("#micBtn")
    expect(page.locator("#micBtn")).not_to_have_class(re.compile("on"))


def test_live_admin_voice_instant_on_separator(live):
    """未完句時一聽到「號」／「、」即記錄已講完的號碼；完句時不重複記錄"""
    page = live
    page.add_init_script(FAKE_SR)
    _login_ma(page)
    page.select_option("#grp", "MC|1")
    page.click("#startBtn")
    page.click("#micBtn")
    page.evaluate("__part('四零')")
    page.wait_for_timeout(200)
    assert not _passes(page, 405)                       # 未講完：不記錄
    page.evaluate("__part('四零五號')")
    _until(page, lambda: len(_passes(page, 405)) == 1)  # 一聽到「號」即記錄
    expect(page.locator("#vlog")).to_contain_text("⚡")
    page.evaluate("__part('四零五號四十')")
    page.wait_for_timeout(200)
    assert not _passes(page, 40)                        # 最後一段未有分隔：等完句
    page.evaluate("__part('四零五號四十', true)")
    _until(page, lambda: len(_passes(page, 40)) == 1)
    assert len(_passes(page, 405)) == 1                 # 完句不重複記錄 405
    page.evaluate("__part('四十、', false, 1)")          # 下一句（結果編號 1）：「、」亦即時記錄（相隔太短→疑似重複，不記錄）
    expect(page.locator("#vlog")).to_contain_text("疑似重複")
    page.evaluate("__part('四十、', true, 1)")
    page.wait_for_timeout(200)
    assert len(_passes(page, 40)) == 1


def test_live_admin_number_grid(live):
    page = live
    _login_ma(page)
    page.select_option("#grp", "MC|1")
    page.click("#startBtn")
    page.click('#listTabs [data-tab="grid"]')
    expect(page.locator("#list.grid [data-gb]")).to_have_count(2)       # 男C 第 1 組：405、40
    page.click('#list.grid [data-gb="40"]')
    _until(page, lambda: len(_passes(page, 40)) == 1)
    expect(page.locator('#list.grid li.run [data-gb="40"]')).to_contain_text("1／2")
    expect(page.locator("#bubbles")).to_be_hidden()
    no_hscroll(page)


def test_live_admin_fixed_layout(live):
    """輸入版面固定：整頁不捲動，數字鍵及確認鍵一直在畫面內"""
    page = live
    _login_ma(page)
    for _ in range(3):
        page.click("#markBtn")   # 加幾行紀錄
    assert page.evaluate("document.scrollingElement.scrollHeight <= innerHeight + 1"), "整頁出現捲動"
    assert page.evaluate("document.querySelector('#pad [data-k=ok]').getBoundingClientRect().bottom <= innerHeight"), "確認鍵不在畫面內"
    assert page.evaluate("document.querySelector('#undoBtn').getBoundingClientRect().bottom <= innerHeight"), "撤銷鍵不在畫面內"
    no_hscroll(page)


def test_live_practice_real_roster_when_logged_in(live):
    page = live
    _login_ma(page)
    page.goto(f"{page.base}/live-admin.html?practice=1")
    expect(page.locator("#pSrc")).to_have_text("今屆真實名單")
    page.select_option("#grp", "MC|1")
    expect(page.locator("#who")).to_contain_text("男C 第 1 組 共 2 人")
    page.click("#startBtn")
    _type_bib(page, 405)
    expect(page.locator("#list.runners li[data-key]")).to_have_count(1)
    expect(page.locator("#list.runners")).to_contain_text("陳浩天")
    assert not page.db["entries"]   # 練習模式不寫入資料庫


def test_live_practice_mode(live):
    page = live
    calls = []
    page.on("request", lambda r: "supabase.co" in r.url and calls.append(r.url))
    page.goto(f"{page.base}/live-admin.html?practice=1")
    expect(page.locator("#app")).to_be_visible()
    expect(page.locator("#practiceBar")).to_be_visible()
    expect(page.locator("#who")).to_contain_text("號碼 1001–1045")
    page.click("#startBtn")
    _type_bib(page, "01")
    expect(page.locator("#list.runners li[data-key]")).to_have_count(1)
    expect(page.locator("#pScore")).to_contain_text("應記")
    assert not page.db["entries"] and not calls  # 練習模式不連資料庫
    no_hscroll(page)


KEYPAD_CLEAR = """(() => {
  const pad = document.querySelector('#pad').getBoundingClientRect();
  const head = document.querySelector('.list').getBoundingClientRect();
  const k1 = document.querySelector('#pad [data-k="1"]').getBoundingClientRect();
  const hit = document.elementFromPoint(k1.left + k1.width / 2, k1.top + 6);
  return { listBottom: head.bottom, padTop: pad.top, hit1: !!(hit && hit.closest('[data-k="1"]')),
    ok: document.querySelector('#pad [data-k=ok]').getBoundingClientRect().bottom, undo: document.querySelector('#undoBtn').getBoundingClientRect().bottom, h: innerHeight };
})()"""


def test_live_practice_keypad_not_covered_on_short_iphone(live):
    """iPhone Safari 可見高度約 664：練習模式＋語音紀錄＋泡泡同時顯示，數字鍵不被清單分頁遮蓋，底行仍在畫面內"""
    page = live
    page.add_init_script(FAKE_SR)
    page.set_viewport_size({"width": 390, "height": 664})
    page.goto(f"{page.base}/live-admin.html?practice=1")
    expect(page.locator("#practiceBar")).to_be_visible()
    page.click("#startBtn")
    page.click("#micBtn")
    page.evaluate("window.__sr.onerror({ error: 'network' })")   # 長錯誤訊息令語音紀錄出現
    expect(page.locator("#vlog")).to_be_visible()
    expect(page.locator("#bubbles")).to_be_visible()
    m = page.evaluate(KEYPAD_CLEAR)
    assert m["listBottom"] <= m["padTop"] + 1, m
    assert m["hit1"], m
    assert m["ok"] <= m["h"] and m["undo"] <= m["h"], m
    assert page.evaluate("document.scrollingElement.scrollHeight <= innerHeight + 1")
    no_hscroll(page)


def test_live_admin_reset_key_hide_pad_no_zoom(live):
    """「重新輸入」清除整個號碼；收起鍵盤令清單變高；按鍵不會連按兩下放大"""
    page = live
    _login_ma(page)
    page.select_option("#grp", "MC|1")
    for ch in "405":
        page.click(f'#pad [data-k="{ch}"]')
    expect(page.locator("#who")).to_contain_text("陳浩天")
    page.click('#pad [data-k="del"]')
    expect(page.locator("#bib")).to_have_text("")
    expect(page.locator("#who")).to_contain_text("男C 第 1 組 共 2 人")
    assert page.evaluate("getComputedStyle(document.querySelector('#pad [data-k=\"1\"]')).touchAction") == "manipulation"
    h0 = page.evaluate("document.querySelector('#list').getBoundingClientRect().height")
    page.click("#padBtn")
    expect(page.locator("#pad")).to_be_hidden()
    expect(page.locator("#padBtn")).to_contain_text("顯示")
    assert page.evaluate("document.querySelector('#list').getBoundingClientRect().height") > h0 + 150
    expect(page.locator("#undoBtn")).to_be_visible()
    page.click("#padBtn")
    expect(page.locator("#pad")).to_be_visible()
    no_hscroll(page)


def test_live_admin_voice_fallback_and_errors(live):
    """粵語代碼不獲接受：改用 zh-HK 並請使用者再按一次；之後的權限錯誤顯示錯誤碼及設定提示"""
    page = live
    page.add_init_script(FAKE_SR)
    _login_ma(page)
    page.click("#startBtn")
    page.click("#micBtn")
    assert page.evaluate("window.__sr.lang") == "yue-Hant-HK"
    page.evaluate("window.__sr.onerror({ error: 'service-not-allowed' })")
    expect(page.locator("#micBtn")).not_to_have_class(re.compile("on"))
    expect(page.locator("#vlog")).to_contain_text("已改用 zh-HK")
    page.click("#micBtn")
    assert page.evaluate("window.__sr.lang") == "zh-HK"
    page.evaluate("window.__sr.onerror({ error: 'not-allowed' })")
    expect(page.locator("#vlog")).to_contain_text("未獲准使用麥克風（not-allowed）")
    expect(page.locator("#micBtn")).not_to_have_class(re.compile("on"))
    # 收聽一段時間後自動重新開始被拒（iPhone 須由按鍵啟動）：提示再按一次，而非權限問題
    page.click("#micBtn")
    page.evaluate("window.__sr.onstart(); window.__sr.onend(); window.__sr.onerror({ error: 'not-allowed' })")
    expect(page.locator("#vlog")).to_contain_text("請再按一次麥克風")
    expect(page.locator("#micBtn")).not_to_have_class(re.compile("on"))


def test_preview_has_no_demo_link(page):
    """賽前預覽不再顯示「示範重播」入口（?demo= 網址保留作內部測試）"""
    go(page, "#/preview?c=MA")
    expect(page.locator(".link-row a")).to_have_count(3)   # 即時成績、完賽紀念卡、比賽相片
    expect(page.locator('a[href*="demo="]')).to_have_count(0)


def test_finisher_card_lookup_and_export(page):
    """完賽紀念卡：號碼布＋姓名對得上才顯示；匯出第 48 屆紀念卡（四款）"""
    go(page, "#/preview?c=MA")
    expect(page.locator('.link-row a[href="#/cert"]')).to_have_count(1)
    go(page, "#/cert")
    expect(page.locator("h1")).to_contain_text("完賽紀念卡")
    expect(page.locator("#ctCats")).to_contain_text("女C")
    page.fill("#ctBib", "24"); page.fill("#ctName", "李蕙仔"); page.click(".ct-go")
    expect(page.locator("#ctOut")).to_contain_text("找不到紀錄")
    page.fill("#ctName", "李 蕙伃"); page.click(".ct-go")
    res = page.locator(".ct-res")
    expect(res).to_contain_text("女子C組")
    expect(res).to_contain_text("第 3 名")
    expect(res).to_contain_text("完賽 31 人")
    expect(res).to_contain_text("9:12")
    expect(res.locator('a[href="#/p/p46FD022"]')).to_have_count(1)
    no_hscroll(page)
    page.click("#ctExport")
    page.wait_for_function("document.querySelector('.card-modal img') && !document.querySelector('.cm-img.busy')")
    expect(page.locator(".cm-styles button")).to_have_count(4)
    assert "完賽紀念卡" in page.get_attribute("#cmSave", "download")
    page.click('.cm-styles [data-k="classic"]')
    page.wait_for_function("!document.querySelector('.cm-img.busy') && document.querySelector('.card-modal img')")


def test_finisher_card_needs_name(page):
    go(page, "#/cert")
    page.fill("#ctBib", "24"); page.click(".ct-go")
    expect(page.locator("#ctOut")).to_contain_text("請輸入號碼布及姓名")


def test_live_demo_replay(page):
    # 示範以 30 倍速播放；先把時鐘撥快一小時，令全部運動員已到達
    page.add_init_script("(() => { const o = Date.now.bind(Date); let first = null; Date.now = () => { const n = o(); if (first === null) first = n; return n + (n - first > 50 ? 3600 * 1000 : 0); }; })()")
    go(page, "#/live?demo=47&c=MA&v=team")
    page.wait_for_function("document.querySelectorAll('#lvBody .lv-team').length >= 3", timeout=15000)
    page.wait_for_function("document.querySelector('.lv-status.done')", timeout=15000)
    champ = EDS[47]["categories"]["MA"]["team_champion"]["school_zh"]
    expect(page.locator(".lv-team").first).to_contain_text(champ)
    expect(page.locator(".lv-team").first).to_contain_text("團體冠軍")
    expect(page.locator(".lv-team .rank.r1")).to_have_count(1)
    go(page, "#/live?demo=47&c=MA")
    page.wait_for_function("document.querySelectorAll('#lvBody .lv-run').length >= 40", timeout=15000)
    # 個人榜：多圈合成後最終名次與官方一致（首名在頂、顯示官方時間）
    win = EDS[47]["categories"]["MA"]["individual"][0]
    expect(page.locator("#lvBody .lv-run").first).to_contain_text(win["name_zh"])
    expect(page.locator("#lvBody .lv-run").first).to_contain_text(win["time"])
    # 分組組別（男C 分 3 組）：全部完成後合併時間，首名＝官方冠軍，顯示分組名次；團體冠軍與官方一致
    go(page, "#/live?demo=47&c=MC&h=all")
    page.wait_for_function("document.querySelectorAll('#lvBody .lv-run').length >= 40", timeout=15000)
    expect(page.locator("#lvBody .board-head").first).to_contain_text("已完成 3／3 組")
    mc = EDS[47]["categories"]["MC"]
    expect(page.locator("#lvBody .lv-run").first).to_contain_text(mc["individual"][0]["name_zh"])
    expect(page.locator("#lvBody .lv-run").first).to_contain_text("C1 第 1 名")
    # 分組切換：第 1／2／3 組＋全組合併；選第 2 組只顯示該組，名次為分組名次
    expect(page.locator(".lv-heats .chip")).to_have_count(4)
    page.click('.lv-heats [data-lh="2"]')
    expect(page.locator("#lvBody .lv-run").first).to_contain_text("全組第")
    expect(page.locator("#lvBody .lv-run .rank").first).to_have_text("1")
    go(page, "#/live?demo=47&c=MC&v=team")
    expect(page.locator(".lv-team").first).to_contain_text(mc["team_champion"]["school_zh"])
    expect(page.locator(".lv-team").first).not_to_contain_text("暫計")
    # 下拉名單按分組列出
    page.locator(".lv-team").first.click()
    expect(page.locator(".lv-roster .lv-rh").first).to_contain_text("組（已完成）")   # 只列出有隊員的分組
    no_hscroll(page)


def test_live_defaults_and_moves(page):
    """未指定分組時按最新進度（示範開始時第 1 組進行中）；排位變動顯示 ▲／▼"""
    go(page, "#/live?demo=47&c=MC")
    expect(page.locator(".lv-heats .chip.on")).to_contain_text("第 1 組")
    expect(page.locator('[data-lv="ind"]')).to_have_class(re.compile("on"))
    go(page, "#/live?demo=47&c=MA")
    page.wait_for_selector("#lvBody .lv-mv", timeout=20000)
    no_hscroll(page)


def test_preview_school_roster(live):
    page = live
    page.goto(f"{page.base}/#/preview?c=MC&v=sch")
    page.wait_for_selector(".pv-sch")
    n_sch = sum(1 for s in json.loads((ROOT / "docs/data/race48.json").read_text(encoding="utf-8"))["schools"] if (s.get("n") or {}).get("MC"))
    expect(page.locator(".pv-sch")).to_have_count(n_sch)
    iv = page.locator(".pv-sch", has_text="青洲")
    iv.locator("summary").click()
    expect(iv).to_contain_text("陳浩天")
    expect(iv).to_contain_text("C1")
    n0 = page.db.get("roster_calls", 0)
    page.click("#pvRefresh")
    _until(page, lambda: page.db.get("roster_calls", 0) > n0)
    no_hscroll(page)


def _team_order(cat):
    """按預測團體名次的學校次序（與 app.js previewSchools 相同規則）"""
    race = json.loads((ROOT / "docs/data/race48.json").read_text(encoding="utf-8"))
    info = json.loads((ROOT / "docs/data/preview48.json").read_text(encoding="utf-8"))["categories"][cat]
    n = 5 if cat[1] in "AB" else 4
    abbr = {s["zh"]: s["abbr"] for s in race["schools"]}
    sch_of = {s["pid"]: s["school_zh"] for s in info["starters"]}
    pred = info.get("prediction") or []
    places = {}
    for i, x in enumerate(pred):
        places.setdefault(abbr.get(sch_of[x["pid"]] if x["pid"] else x["school_zh"]), []).append(i + 1)
    def key(s):
        k = s["n"][cat]; pl = places.get(s["abbr"], [])[:n]
        score = sum(pl) + (n - len(pl)) * (len(pred) + 1)
        return (0, score, (places.get(s["abbr"]) or [float("inf")])[0], -k, s["abbr"]) if k >= n else (1, 0, 0, -k, s["abbr"])
    return [s["zh"] for s in sorted([s for s in race["schools"] if (s.get("n") or {}).get(cat)], key=key)]


@pytest.mark.parametrize("cat", ["MA", "MC", "FB", "FC"])
def test_preview_schools_ordered_by_team_prediction(live, cat):
    page = live
    page.goto(f"{page.base}/#/preview?c={cat}&v=sch")
    page.wait_for_selector(".pv-sch")
    got = page.locator(".pv-sch .ps-n b").all_inner_texts()
    assert got == _team_order(cat), (got[:6], _team_order(cat)[:6])


# ---------- 榮譽卡 ----------
def _card_png(page, pid, style="classic"):
    go(page, f"#/p/{pid}")
    page.evaluate(f"localStorage.setItem('xc-card-style', '{style}')")   # 經典款：以下 QR 位置按 card.js
    page.click("#cardBtn")
    page.wait_for_selector(".cm-img img", timeout=15000)
    info = page.evaluate("""async () => {
        const img = document.querySelector('.cm-img img');
        await img.decode();
        const b = await (await fetch(img.src)).blob();
        const buf = new Uint8Array(await b.arrayBuffer());
        let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
        const qrCorner = [...cx.getImageData(1080 - 58 - 184 + 5, 1350 - 40 - 184 + 5, 1, 1).data];   // QR 碼白底
        return { w: img.naturalWidth, h: img.naturalHeight, name: document.querySelector('#cmSave').download, b64: btoa(s), qrCorner };
    }""")
    out = __import__("os").environ.get("XC_CARD_OUT")
    if out:
        pathlib.Path(out).mkdir(parents=True, exist_ok=True)
        (pathlib.Path(out) / f"{pid}.png").write_bytes(base64.b64decode(info["b64"]))
        page.screenshot(path=str(pathlib.Path(out) / f"modal_{pid}.png"))
    return info


def _pid_by(pred):
    people = {}
    for e in DATA["editions"]:
        for c, v in e["categories"].items():
            for r in v["individual"]:
                people.setdefault(r["pid"], []).append(r)
    return next(pid for pid, recs in people.items() if pred(recs))


def test_honours_card_styles_picker(page):
    """榮譽卡四款（衝線、山徑、號碼布、經典）：可切換、尺寸 1080×1350、QR 碼有白色靜區、記住上次選擇"""
    pid = _pid_by(lambda recs: sum(r["rank"] == 1 for r in recs) >= 2 and not recs[0].get("hidden"))
    go(page, f"#/p/{pid}")
    page.evaluate("localStorage.removeItem('xc-card-style')")
    page.click("#cardBtn")
    expect(page.locator('.cm-styles [data-k="dash"]')).to_have_attribute("aria-checked", "true")   # 預設衝線
    # 各款 QR 碼靜區內一點（應為純白）；號碼布的紙張略旋轉，取 QR 左上角內側
    probe = {"dash": (875, 1165), "trail": None, "bib": (827, 608), "classic": None}
    seen = set()
    for k in ("dash", "trail", "bib", "classic"):
        if page.get_attribute(f'.cm-styles [data-k="{k}"]', "aria-checked") != "true":
            page.click(f'.cm-styles [data-k="{k}"]')
        page.wait_for_function("document.querySelector('.cm-img img') && !document.querySelector('.cm-img.busy') && !document.querySelector('#cmSave[aria-disabled]')", timeout=15000)
        info = page.evaluate("""async (pt) => {
            const img = document.querySelector('.cm-img img'); await img.decode();
            const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
            const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
            return { w: img.naturalWidth, h: img.naturalHeight, src: img.src, px: pt ? [...cx.getImageData(pt[0], pt[1], 1, 1).data] : null };
        }""", probe[k])
        assert (info["w"], info["h"]) == (1080, 1350), k
        if info["px"]:
            assert info["px"][:3] == [255, 255, 255], f"{k}：QR 碼沒有白色靜區"
        seen.add(info["src"])
    assert len(seen) == 4
    assert page.evaluate("localStorage.getItem('xc-card-style')") == "classic"
    page.keyboard.press("Escape")
    page.click("#cardBtn")   # 重開：沿用上次款式
    expect(page.locator('.cm-styles [data-k="classic"]')).to_have_attribute("aria-checked", "true")


@pytest.mark.parametrize("kind", ["champion", "medal", "top10", "base"])
def test_honours_card_export(page, kind):
    preds = {
        "champion": lambda recs: sum(r["rank"] == 1 for r in recs) >= 3 and not recs[0].get("hidden"),
        "medal": lambda recs: min(r["rank"] for r in recs) == 2 and len(recs) >= 3 and not recs[0].get("hidden"),
        "top10": lambda recs: 4 <= min(r["rank"] for r in recs) <= 10 and len(recs) >= 3 and not recs[0].get("hidden"),
        "base": lambda recs: min(r["rank"] for r in recs) > 10 and len(recs) >= 3 and not recs[0].get("hidden"),
    }
    pid = _pid_by(preds[kind])
    info = _card_png(page, pid)
    assert (info["w"], info["h"]) == (1080, 1350)
    assert info["name"].endswith("_榮譽卡.png")
    assert info["qrCorner"][:3] == [255, 255, 255], "榮譽卡沒有 QR 碼"
    page.click("#cmClose")
    expect(page.locator(".card-modal")).to_have_count(0)


def _dns_rows(page, bib):
    return [r for r in page.db["entries"].values() if r.get("bib") == bib and r.get("dns")]


def test_live_admin_absent_marking_and_public_team(live):
    """缺席標記：計時頁按號碼標記／取消；公眾頁團體榜扣除缺席者後不足人數即「不計分」，出戰名單顯示缺席；其後記錄經過會取消缺席"""
    page = live
    _login_ma(page)
    page.click("#startBtn")
    page.click("#dnsBtn")
    expect(page.locator("#sheet")).to_be_visible()
    page.click('#sheet [data-m="absent"]')               # 按缺席（記住選擇）
    page.fill("#dnsFind", "10")
    page.click('#sheet [data-db="1012"]')
    page.click('#sheet [data-db="1002"]')
    page.click('#sheet [data-db="1002"]')          # 再按一下取消
    expect(page.locator("#dnsN")).to_have_text("1")
    _until(page, lambda: any(not r["deleted"] for r in _dns_rows(page, 1012)) and all(r["deleted"] for r in _dns_rows(page, 1002)))
    page.click('#sheet button[value="close"]')
    expect(page.locator("#dnsBtn")).to_have_text("缺席 1")
    page.click('#listTabs [data-tab="grid"]')
    expect(page.locator('#list.grid li.dns [data-gb="1012"]')).to_contain_text("缺席")
    page.click('#listTabs [data-tab="all"]')
    expect(page.locator("#list.records")).to_contain_text("缺席")
    # 濠江中學男A 報 6 人：再標記 1002 缺席 → 只餘 4 人，不足 5 人計分
    page.click("#dnsBtn")
    page.click('#sheet [data-db="1002"]')
    page.click('#sheet button[value="close"]')
    _until(page, lambda: any(not r["deleted"] for r in _dns_rows(page, 1002)))

    page.goto(f"{page.base}/#/live?ev=test&c=MA")
    page.wait_for_selector("#lvBody")
    page.click('[data-lv="team"]')
    hk = page.locator(".lv-tw", has_text="濠江中學")
    expect(hk.locator(".lv-team")).to_contain_text("2 人缺席或未能完成，人數不足，不計分")
    expect(hk.locator(".lv-sc b")).to_have_text("-")
    hk.locator(".lv-team").click()
    expect(hk.locator(".lv-roster li", has_text="測試甲")).to_contain_text("缺席")
    expect(page.locator("#lvBody .lv-run")).to_have_count(0)
    no_hscroll(page)

    # 回到計時頁：記錄已標記缺席的 1012 → 確認後取消缺席標記並記第 1 圈
    page.goto(f"{page.base}/live-admin.html")
    expect(page.locator("#app")).to_be_visible()
    page.select_option("#grp", "MA|1")
    _type_bib(page, 1012)
    _until(page, lambda: len(_passes(page, 1012)) == 1 and all(r["deleted"] for r in _dns_rows(page, 1012)))
    expect(page.locator("#dnsBtn")).to_have_text("缺席 1")


def test_live_admin_absent_programme_order(live):
    """缺席名單預設按秩序冊次序（一行一人，可與印刷本逐行對照）；可切換按學校，並記住選擇"""
    page = live
    _login_ma(page)
    _synced(page)                                          # 等號碼布名單載入
    page.click("#dnsBtn")
    page.wait_for_selector("#sheet .dns-rows [data-db]")
    order = page.eval_on_selector_all("#sheet .dns-rows [data-db]", "els => els.map(e => e.dataset.db)")
    assert order == ["1012", "1003", "1001", "1002"]
    expect(page.locator("#sheet .dns-rows button").first).to_contain_text("測試乙")
    expect(page.locator('#sheet .dns-order [data-o="prog"]')).to_have_attribute("aria-checked", "true")
    page.click('#sheet [data-m="absent"]')
    page.click('#sheet .dns-order [data-o="school"]')
    expect(page.locator("#sheet .dns-rows")).to_have_count(0)
    expect(page.locator("#sheet .dns-sch").first).to_be_visible()
    page.click('#sheet [data-db="1003"]')
    _until(page, lambda: any(not r["deleted"] for r in _dns_rows(page, 1003)))
    page.click('#sheet button[value="close"]')
    page.click("#dnsBtn")                                  # 記住上次選擇
    expect(page.locator('#sheet .dns-order [data-o="school"]')).to_have_attribute("aria-checked", "true")
    page.click('#sheet .dns-order [data-o="prog"]')
    expect(page.locator('#sheet .dns-rows [data-db="1003"]')).to_have_class("on")
    expect(page.locator('#sheet .dns-rows [data-db="1003"]')).to_contain_text("缺席")
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")


def test_live_admin_roll_call(live):
    """點名（預設）：按有到的號碼 → 點名完成，未點名者一次過標記缺席；可取消點名完成；點名進度重新整理後保留"""
    page = live
    _login_ma(page)
    _synced(page)
    expect(page.locator("#dnsBtn")).to_have_text("點名")
    page.click("#dnsBtn")
    expect(page.locator('#sheet [data-m="present"]')).to_have_attribute("aria-checked", "true")
    page.click('#sheet [data-db="1012"]')
    page.click('#sheet [data-db="1003"]')
    page.click('#sheet [data-db="1001"]')
    page.click('#sheet [data-db="1001"]')                  # 再按取消
    expect(page.locator('#sheet [data-db="1012"]')).to_contain_text("有到")
    expect(page.locator("#dnsHere")).to_have_text("2")
    assert not any(r.get("dns") for r in page.db["entries"].values())   # 點名本身不寫入資料庫
    page.click("#rcDone")                                   # 確認框自動按「確定」
    _until(page, lambda: sorted(r["bib"] for r in page.db["entries"].values() if r.get("dns") and not r["deleted"]) == [1001, 1002])
    expect(page.locator("#dnsN")).to_have_text("2")
    expect(page.locator("#rcUndo")).to_be_visible()
    # 有到的人其後改為缺席 → 按一下即取消缺席並當有到
    page.click('#sheet [data-db="1002"]')
    _until(page, lambda: all(r["deleted"] for r in _dns_rows(page, 1002)))
    expect(page.locator('#sheet [data-db="1002"]')).to_contain_text("有到")
    page.click('#sheet button[value="close"]')
    expect(page.locator("#dnsBtn")).to_have_text("缺席 1")
    # 重新整理：點名進度保留
    page.reload()
    expect(page.locator("#app")).to_be_visible()
    _synced(page)
    page.click("#dnsBtn")
    expect(page.locator('#sheet [data-db="1012"]')).to_contain_text("有到")
    expect(page.locator('#sheet [data-db="1001"]')).to_contain_text("缺席")
    page.click("#rcUndo")
    _until(page, lambda: not any(r.get("dns") and not r["deleted"] for r in page.db["entries"].values()))
    expect(page.locator("#rcDone")).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
