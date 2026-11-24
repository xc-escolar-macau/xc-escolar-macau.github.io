"""比賽相片：公眾頁 #/photos 及工作人員上載頁 photo-admin.html（Playwright，Supabase 及 Edge Function 全部以模擬攔截）
用法：python -P -X utf8 -m pytest tests/test_photos.py
"""
import io, itertools, json, re, time
from datetime import datetime, timedelta, timezone

import pytest
from PIL import Image
from playwright.sync_api import expect

from test_ui import _fake_jwt, go, no_hscroll   # base_url、browser 來自 conftest.py

CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Expose-Headers": "*"}
MO = timezone(timedelta(hours=8))


def _jpeg(w=3000, h=2000, when="2026:11:29 08:10:00", color=(40, 120, 200)):
    """產生含 EXIF 拍攝時間及 GPS 的 JPEG（用來確認上載檔已去除 EXIF）"""
    im = Image.new("RGB", (w, h), color)
    ex = Image.Exif()
    ex[0x0110] = "TestCam"
    ex.get_ifd(0x8769)[0x9003] = when
    ex.get_ifd(0x8825)[2] = (22.0, 9.0, 0.0)   # GPSLatitude
    buf = io.BytesIO(); im.save(buf, "JPEG", exif=ex.tobytes(), quality=80)
    return buf.getvalue()


def _webp(color=(200, 60, 60), size=(1600, 1067)):
    buf = io.BytesIO(); Image.new("RGB", size, color).save(buf, "WEBP"); return buf.getvalue()


def _image_in(body: bytes):
    """從 multipart 上載內容取出圖片"""
    for sig in (b"RIFF", b"\xff\xd8\xff"):
        i = body.find(sig)
        if i >= 0:
            end = body.find(b"\r\n--", i)
            return body[i:end if end > 0 else None]
    return None


def _ctx(browser, base_url):
    ctx = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="zh-HK")
    ctx.add_init_script("window.XC_NO_PROMO = true")
    ctx.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    ctx.route("https://fonts.gstatic.com/**", lambda r: r.fulfill(status=204, body=""))
    return ctx


# ---------- 公眾頁 ----------

PUBLIC = [{"id": "aaaaaaaa-1111-4111-8111-111111111111", "t": "48/aaaaaaaa-1111-4111-8111-111111111111_t.webp", "f": "48/aaaaaaaa-1111-4111-8111-111111111111.webp", "w": 1600, "h": 1067, "at": 1795912000000},
          {"id": "bbbbbbbb-2222-4222-8222-222222222222", "t": "48/bbbbbbbb-2222-4222-8222-222222222222_t.webp", "f": "48/bbbbbbbb-2222-4222-8222-222222222222.webp", "w": 1600, "h": 1067, "at": 1795912100000}]


@pytest.fixture()
def pub(browser, base_url):
    ctx = _ctx(browser, base_url)
    calls = []

    def handler(route):
        req, u = route.request, route.request.url
        if req.method == "OPTIONS":
            return route.fulfill(status=200, headers=CORS)
        if "/rpc/xc_photo_lookup" in u:
            q = json.loads(req.post_data or "{}"); calls.append(q)
            hit = q.get("p_event") == "48" and q.get("p_bib") == 24 and "".join((q.get("p_name") or "").split()) == "李蕙伃"
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(PUBLIC if hit else []), headers=CORS)
        if "/storage/v1/object/public/xc-photos/" in u:
            return route.fulfill(status=200, content_type="image/webp", body=_webp(), headers=CORS)
        if "/rpc/xc_live_cert_lookup" in u:
            return route.fulfill(status=200, content_type="application/json", headers=CORS,
                                 body=json.dumps({"cat": "FC", "heat": 1, "abbr": "CDSJ5", "pid": "p46FD022", "name": "李蕙伃", "place": 3, "time_ms": 552400, "finishers": 31, "released_at": "2026-11-29T12:00:00Z"}))
        if "/rpc/" in u:
            return route.fulfill(status=200, content_type="application/json", body="[]", headers=CORS)
        return route.fulfill(status=200, content_type="application/json", body="[]", headers=CORS)

    ctx.route("https://*.supabase.co/**", handler)
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and pg.errors.append(m.text))
    pg.base = base_url
    pg.calls = calls
    yield pg
    assert not pg.errors, pg.errors
    ctx.close()


def test_photos_page_needs_bib_and_name(pub):
    page = pub
    go(page, "#/photos")
    expect(page.locator("h1")).to_contain_text("第48屆比賽相片")
    expect(page.locator(".back-btn, .back")).to_have_count(1)
    page.click(".ct-go")
    expect(page.locator("#phOut .banner")).to_contain_text("請輸入號碼布及姓名")
    page.fill("#phBib", "24"); page.fill("#phName", "李蕙仔")   # 一字之差
    page.click(".ct-go")
    expect(page.locator("#phOut .banner")).to_contain_text("暫時未有你的相片")
    expect(page.locator(".ph-tile")).to_have_count(0)
    assert page.calls[-1] == {"p_event": "48", "p_bib": 24, "p_name": "李蕙仔"}
    no_hscroll(page)


def test_photos_page_shows_and_downloads(pub):
    page = pub
    go(page, "#/photos")
    page.fill("#phBib", "24"); page.fill("#phName", "李 蕙伃")
    page.click(".ct-go")
    expect(page.locator(".ph-tile")).to_have_count(2)
    expect(page.locator(".ph-bar b")).to_contain_text("找到 2 張相片")
    no_hscroll(page)
    page.click(".ph-tile >> nth=0")
    modal = page.locator(".ph-modal")
    expect(modal).to_be_visible()
    expect(modal.locator("#phSave")).not_to_have_attribute("aria-disabled", "true")
    assert page.get_attribute("#phSave", "href").startswith("blob:")
    assert page.get_attribute("#phSave", "download") == "第48屆學界越野跑_aaaaaaaa.webp"
    expect(modal).to_contain_text("相片編號 aaaaaaaa")
    expect(modal.locator("a[href*='docs.google.com/forms']")).to_contain_text("申請移除此相片")
    expect(modal.locator("#phPrev")).to_be_disabled()
    page.click("#phNext")
    expect(modal).to_contain_text("相片 2／2")
    expect(modal.locator("#phNext")).to_be_disabled()
    page.click("#phClose")
    expect(page.locator(".ph-modal")).to_have_count(0)
    # 號碼布及姓名不寫入網址
    assert "24" not in page.url and "%E6" not in page.url


def test_photos_links_and_cert_handoff(pub):
    page = pub
    go(page, "#/preview")
    expect(page.locator(".link-row a[href='#/photos']")).to_have_count(1)
    go(page, "#/cert")
    page.fill("#ctBib", "24"); page.fill("#ctName", "李蕙伃")
    page.click(".ct-go")
    page.click("#ctPhotos")
    # 由紀念卡進入：自動帶入剛才的號碼布及姓名並查詢
    expect(page.locator(".ph-tile")).to_have_count(2)
    assert page.input_value("#phBib") == "24"


def test_photos_page_after_expiry(pub):
    page = pub
    page.add_init_script("window.XC_NOW = Date.parse('2027-09-01T00:00:01+08:00')")
    go(page, "#/photos")
    expect(page.locator(".banner")).to_contain_text("現已下架")
    expect(page.locator("#phForm")).to_have_count(0)


# ---------- 工作人員上載頁 ----------

@pytest.fixture()
def adm(browser, base_url):
    ctx = _ctx(browser, base_url)
    db = {"photos": {}, "files": {}, "rev": itertools.count(1), "fn": [], "removed": [], "fn_mode": ["429", "ok"]}
    roster = [{"bib": 24, "cat": "FC", "heat": 1, "abbr": "CDSJ5", "name": "李蕙伃"},
              {"bib": 405, "cat": "MC", "heat": 1, "abbr": "IV", "name": "陳浩天"},
              {"bib": 7, "cat": "MC", "heat": 2, "abbr": "CAM", "name": "羅焯饒"}]
    email = "helper@example.invalid"
    user = {"id": "u1", "aud": "authenticated", "role": "authenticated", "email": email, "app_metadata": {}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"}

    def ok(route, body, status=200):
        return route.fulfill(status=status, content_type="application/json", body=json.dumps(body), headers=CORS)

    def handler(route):
        req, u = route.request, route.request.url
        if req.method == "OPTIONS":
            return route.fulfill(status=200, headers=CORS)
        if "/auth/v1/token" in u:
            return ok(route, {"access_token": _fake_jwt(email), "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "refresh_token": "r1", "user": user})
        if "/auth/v1/user" in u:
            return ok(route, user)
        if "/rpc/xc_is_admin" in u:
            return ok(route, True)
        if db.get("offline"):   # 模擬斷網（Playwright 的 set_offline 不影響已攔截的請求）
            return route.abort("internetdisconnected")
        if "/rest/v1/xc_live_roster" in u:
            return ok(route, roster)
        if "/storage/v1/object/public/xc-photos/" in u:
            path = u.split("/object/public/xc-photos/")[1]
            body = db["files"].get(path)
            return route.fulfill(status=200 if body else 404, content_type="image/webp", body=body or b"", headers=CORS)
        if "/storage/v1/object/xc-photos" in u:
            if req.method == "DELETE":
                db["del_body"] = req.post_data
                for pth in json.loads(req.post_data)["prefixes"]:
                    db["files"].pop(pth, None); db["removed"].append(pth)
                return ok(route, [])
            path = u.split("/object/xc-photos/")[1]
            db["files"][path] = _image_in(req.post_data_buffer)
            db.setdefault("upload_headers", []).append(req.headers)
            return ok(route, {"Key": f"xc-photos/{path}"})
        if "/functions/v1/xc-photo-bibs" in u:
            pid = json.loads(req.post_data)["id"]
            db["fn"].append(pid)
            mode = db["fn_mode"].pop(0) if db["fn_mode"] else "ok"
            if mode == "429":
                return ok(route, {"error": "quota", "retry_after": 1}, 429)
            p = db["photos"][pid]
            n = len(db["fn"])
            res = {"status": "approved", "bibs": [24, 405], "reason": None} if n <= 2 else {"status": "pending", "bibs": [7], "reason": "AI 不確定：7"}
            p.update({"ai_bibs": res["bibs"], "ai_unsure": [7] if res["status"] == "pending" else [], "bibs": res["bibs"] if res["status"] == "approved" else [],
                      "status": res["status"], "reason": res["reason"], "rev": next(db["rev"])})
            return ok(route, res)
        if "/rest/v1/xc_photos" in u:
            if req.method == "GET":
                since = int(u.split("rev=gt.")[1].split("&")[0]) if "rev=gt." in u else 0
                return ok(route, sorted((r for r in db["photos"].values() if r["rev"] > since), key=lambda r: r["rev"]))
            if req.method == "POST":
                rows = json.loads(req.post_data)
                for r in rows if isinstance(rows, list) else [rows]:
                    if r["id"] not in db["photos"]:   # ignoreDuplicates
                        db["photos"][r["id"]] = {"ai_bibs": None, "ai_unsure": None, "bibs": [], "status": "uploaded", "reason": None, "reviewed": False, "created_at": "2026-11-29T00:00:00Z", **r, "rev": next(db["rev"])}
                return route.fulfill(status=201, body="", headers=CORS)
            if req.method == "PATCH":
                pid = u.split("id=eq.")[1].split("&")[0]
                db["photos"][pid].update({**json.loads(req.post_data), "rev": next(db["rev"])})
                return route.fulfill(status=204, body="", headers=CORS)
        return route.fulfill(status=404, body="", headers=CORS)

    ctx.route("https://*.supabase.co/**", handler)
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.on("dialog", lambda d: d.accept())
    pg.base = base_url
    pg.db = db
    yield pg
    assert not pg.errors, pg.errors
    ctx.close()


def _until(page, cond, ms=15000):
    for _ in range(ms // 100):
        if cond():
            return
        page.wait_for_timeout(100)
    assert cond()


def _login(page):
    page.goto(f"{page.base}/photo-admin.html")
    page.fill("#email", "helper@example.invalid")
    page.fill("#pw", "x")
    page.click("#loginBtn")
    expect(page.locator("#app")).to_be_visible()


def test_photo_admin_upload_compress_and_recognise(adm, tmp_path):
    page = adm
    _login(page)
    f1 = tmp_path / "IMG_0001.jpg"; f1.write_bytes(_jpeg())
    f2 = tmp_path / "IMG_0002.jpg"; f2.write_bytes(_jpeg(2000, 3000, "2026:11:29 11:20:30", (90, 90, 30)))
    page.set_input_files("#files", [str(f1), str(f2)])
    # 兩張都上載完成；第一次辨識遇到配額已滿（429）→ 稍後自動重試
    _until(page, lambda: len(page.db["photos"]) == 2 and all(p["status"] != "uploaded" for p in page.db["photos"].values()))
    assert len(page.db["fn"]) == 3
    rows = sorted(page.db["photos"].values(), key=lambda r: r["taken_ms"])
    want = int(datetime(2026, 11, 29, 8, 10, tzinfo=MO).timestamp() * 1000)
    assert rows[0]["taken_ms"] == want and rows[0]["taken_src"] == "exif"
    assert rows[0]["event"] == "48" and re.fullmatch(r"48/[0-9a-f-]{36}\.webp", rows[0]["full_path"])
    assert rows[0]["thumb_path"] == rows[0]["full_path"].replace(".webp", "_t.webp")
    # 上載檔：已壓縮、長邊 1600／400、沒有 EXIF（GPS 等）
    for r in rows:
        full, thumb = page.db["files"][r["full_path"]], page.db["files"][r["thumb_path"]]
        for blob, edge in ((full, 1600), (thumb, 400)):
            assert blob[:4] == b"RIFF" and b"Exif" not in blob and b"TestCam" not in blob
            im = Image.open(io.BytesIO(blob))
            assert max(im.size) == edge
        assert len(full) < 400_000
    assert (rows[1]["w"], rows[1]["h"]) == (1067, 1600)   # 直度相片維持直度
    # 本機佇列已清空；已公開 1、待覆核 1
    expect(page.locator("#nQueue")).to_have_text("0")
    expect(page.locator("#nApproved")).to_have_text("1")
    expect(page.locator("#nPending")).to_have_text("1")
    assert page.evaluate("new Promise((ok) => { const r = indexedDB.open('xc-photo-queue'); r.onsuccess = () => { const q = r.result.transaction('items').objectStore('items').count(); q.onsuccess = () => ok(q.result); }; })") == 0


def test_photo_admin_review_approve_and_remove(adm, tmp_path):
    page = adm
    page.db["fn_mode"] = ["ok", "ok", "ok"]
    page.db["fn"] = ["x", "y"]   # 令下一次模擬辨識回傳「待覆核」
    _login(page)
    f = tmp_path / "a.jpg"; f.write_bytes(_jpeg())
    page.set_input_files("#files", [str(f)])
    _until(page, lambda: any(p["status"] == "pending" for p in page.db["photos"].values()))
    pid = next(iter(page.db["photos"]))
    page.click(f".card[data-id='{pid}']")
    expect(page.locator("#sheet")).to_be_visible()
    expect(page.locator("#sheet .why")).to_contain_text("AI 不確定：7")
    page.fill("#bibsIn", "7, 999")
    expect(page.locator("#whoList")).to_contain_text("999 不在名單")
    expect(page.locator("#approve")).to_be_disabled()
    page.fill("#bibsIn", "7 24")
    expect(page.locator("#whoList")).to_contain_text("羅焯饒")
    page.click("#approve")
    _until(page, lambda: page.db["photos"][pid]["status"] == "approved")
    assert page.db["photos"][pid]["bibs"] == [7, 24] and page.db["photos"][pid]["reviewed"] is True
    page.click(".tabs [data-tab='approved']")
    page.click(f".card[data-id='{pid}']")
    page.click("#remove")
    _until(page, lambda: page.db["photos"][pid]["status"] == "removed")
    assert set(page.db["removed"]) == {page.db["photos"][pid]["full_path"], page.db["photos"][pid]["thumb_path"]}, page.db.get("del_body")
    expect(page.locator(f".card[data-id='{pid}']")).to_have_count(0)


def test_photo_admin_offline_queue_survives_reload(adm, tmp_path):
    """上載途中斷網：佇列存於 IndexedDB，重新整理後恢復網絡即續傳"""
    page = adm
    _login(page)
    page.db["offline"] = True
    f = tmp_path / "b.jpg"; f.write_bytes(_jpeg())
    page.set_input_files("#files", [str(f)])
    expect(page.locator("#nQueue")).to_have_text("1")
    expect(page.locator("#sync")).to_contain_text("離線")
    page.db["offline"] = False
    page.reload()
    expect(page.locator("#app")).to_be_visible()
    _until(page, lambda: len(page.db["photos"]) == 1 and next(iter(page.db["photos"].values()))["status"] != "uploaded")
    expect(page.locator("#nQueue")).to_have_text("0")


def test_photo_admin_layout_phone(adm):
    page = adm
    _login(page)
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    box = page.locator("#pick").bounding_box()
    assert box["height"] >= 56 and box["y"] < 300


def test_sql_lookup_requires_name_and_hides_bibs():
    """008_photos.sql：公眾查詢必須號碼布＋姓名、只回傳已公開相片、設保留期；相片表不對公眾開放"""
    import pathlib
    sql = (pathlib.Path(__file__).resolve().parents[1] / "supabase/008_photos.sql").read_text(encoding="utf-8")
    fn = sql[sql.index("function public.xc_photo_lookup"):sql.index("revoke all on function public.xc_photo_lookup")]
    assert "p.status = 'approved'" in fn and "coalesce(r.name, '') <> ''" in fn and "2027-09-01" in fn
    assert "'bibs'" not in fn   # 不回傳同框其他人的號碼布
    assert "revoke all on public.xc_photos from anon" in sql
    assert re.search(r"grant execute on function public\.xc_photo_judge\(uuid, int\[\], int\[\], text\) to authenticated", sql)
    assert "if not (select public.xc_is_admin()) then raise exception" in sql
    assert not re.search(r"on storage\.objects for select to (anon|public)", sql)
