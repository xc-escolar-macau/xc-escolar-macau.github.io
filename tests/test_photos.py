"""比賽相片：公眾頁 #/photos 及工作人員上載頁 photo-admin.html（Playwright，Supabase 及 Edge Function 全部以模擬攔截）
用法：python -P -X utf8 -m pytest tests/test_photos.py
"""
import io, itertools, json, pathlib, re, time
from datetime import datetime, timedelta, timezone

import pytest
from PIL import Image
from playwright.sync_api import expect

from test_ui import _fake_jwt, _page, go, no_hscroll   # base_url、browser 來自 conftest.py

CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Expose-Headers": "*"}
MO = timezone(timedelta(hours=8))


def _jpeg(w=3000, h=2000, when="2026:11:29 08:10:00", color=(40, 120, 200), model="TestCam", serial=None):
    """產生含 EXIF 拍攝時間及 GPS 的 JPEG（用來確認上載檔已去除 EXIF）；serial＝機身序號"""
    im = Image.new("RGB", (w, h), color)
    ex = Image.Exif()
    ex[0x0110] = model
    ex.get_ifd(0x8769)[0x9003] = when
    if serial:
        ex.get_ifd(0x8769)[0xA431] = serial
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
    db = {"photos": {}, "files": {}, "rev": itertools.count(1), "fn": [], "removed": [], "fn_mode": ["429", "ok"],
          "ai": True, "auto": False, "hints": [], "near": [], "store": [], "clock": {}, "reclock": [],
          "photo_cfg": {"url": "https://photostest.supabase.co", "key": "sb_publishable_phtest"}}   # ai：site.json 的 photo_ai（正式預設 false＝人手標）
    # photo_cfg：site.json 的 photos（相片檔案所在的獨立相片專案；None＝沿用主專案 storage）
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
            db.setdefault("roster_q", []).append(u)
            return ok(route, _page(u, sorted(roster + db.get("roster_extra", []), key=lambda r: r["bib"])))
        if "/rest/v1/xc_photo_clock" in u:   # 相機時間校正（所有裝置共用）
            if req.method == "GET":
                return ok(route, [{"camera": k, "off_s": v} for k, v in db["clock"].items()])
            if req.method == "POST":
                rows = json.loads(req.post_data)
                for r in rows if isinstance(rows, list) else [rows]:
                    db["clock"][r["camera"]] = r["off_s"]
                return route.fulfill(status=201, body="", headers=CORS)
            if req.method == "DELETE":
                from urllib.parse import unquote_plus
                db["clock"].pop(unquote_plus(u.split("camera=eq.")[1].split("&")[0]), None)
                return route.fulfill(status=204, body="", headers=CORS)
        if "/rpc/xc_photo_reclock" in u:
            q = json.loads(req.post_data); db["reclock"].append(q); n = 0
            for r in db["photos"].values():
                if r["event"] == q["p_event"] and r.get("camera") == q["p_camera"] and r["taken_src"] == "exif" and r["status"] != "removed" and (r.get("clock_off_s") or 0) != q["p_off_s"]:
                    r["taken_ms"] += ((r.get("clock_off_s") or 0) - q["p_off_s"]) * 1000
                    r["clock_off_s"] = q["p_off_s"] or None; r["rev"] = next(db["rev"]); n += 1
            return ok(route, n)
        if "/functions/v1/xc-photo-store" in u:   # 相片專案：核對主專案登入憑證後簽發上載網址／刪除
            q = json.loads(req.post_data); db["store"].append({**q, "token": req.headers.get("x-main-token"), "host": u.split("/")[2]})
            if not (req.headers.get("x-main-token") or "").count("."):
                return ok(route, {"error": "login"}, 401)
            if q["action"] == "sign":
                return ok(route, {"urls": [{"path": pth, "token": f"tok-{pth}"} for pth in q["paths"]]})
            for pth in q["paths"]:
                db["files"].pop(pth, None); db["removed"].append(pth)
            return ok(route, {"removed": len(q["paths"])})
        if "/storage/v1/object/upload/sign/xc-photos/" in u:
            path = u.split("/upload/sign/xc-photos/")[1].split("?")[0]
            db.setdefault("signed_put", []).append(u)
            db["files"][path] = _image_in(req.post_data_buffer)
            db.setdefault("upload_headers", []).append({**req.headers, "host": u.split("/")[2]})
            return ok(route, {"Key": f"xc-photos/{path}"})
        if "/storage/v1/object/public/xc-photos/" in u:
            path = u.split("/object/public/xc-photos/")[1]
            db.setdefault("img_hosts", set()).add(u.split("/")[2])
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
        if "/rpc/xc_photo_hints" in u:
            q = json.loads(req.post_data or "{}"); db["hints"].append(q)
            names = {r["bib"] for r in roster}
            return ok(route, {"taken_ms": db["photos"].get(q["p_id"], {}).get("taken_ms"), "near": db["near"],
                              "check": [{"bib": b, "in_roster": b in names, "on_course": db.get("extra_check", {}).get(b, b != 7)} for b in q.get("p_bibs") or []],
                              "cats": db.get("cats", [{"cat": "MC", "heat": 1}, {"cat": "MC", "heat": 2}])})
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
                return ok(route, _page(u, sorted((r for r in db["photos"].values() if r["rev"] > since), key=lambda r: r["rev"])))
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

    site_json = json.loads((pathlib.Path(__file__).resolve().parents[1] / "docs/data/site.json").read_text(encoding="utf-8"))

    def site(route):
        body = {**site_json, "photo_ai": db["ai"], "photo_auto": db["auto"], "photos": db["photo_cfg"]}
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(body))
    ctx.route("**/data/site.json*", site)
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.dialogs = []
    pg.on("dialog", lambda d: (pg.dialogs.append(d.message), d.accept()))
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
    page.wait_for_load_state("networkidle")   # 等 site.json 載入、登入按鈕綁定
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
    # 上載檔：已壓縮、長邊 1280／400、沒有 EXIF（GPS 等）
    for r in rows:
        full, thumb = page.db["files"][r["full_path"]], page.db["files"][r["thumb_path"]]
        for blob, edge in ((full, 1280), (thumb, 400)):
            assert blob[:4] == b"RIFF" and b"Exif" not in blob and b"TestCam" not in blob
            im = Image.open(io.BytesIO(blob))
            assert max(im.size) == edge
        assert len(full) < 400_000
    assert (rows[1]["w"], rows[1]["h"]) == (853, 1280)   # 直度相片維持直度
    # 檔案放獨立的相片專案：先經 xc-photo-store（附主專案登入憑證）簽發上載網址，再直接上載到相片專案
    signs = [x for x in page.db["store"] if x["action"] == "sign"]
    assert len(signs) == 2 and all(x["host"] == "photostest.supabase.co" and x["token"].count(".") == 2 for x in signs)
    assert {pth for x in signs for pth in x["paths"]} == {r[k] for r in rows for k in ("full_path", "thumb_path")}
    assert len(page.db["signed_put"]) == 4 and all(u.startswith("https://photostest.supabase.co/") and "token=tok-" in u for u in page.db["signed_put"])
    # 快取只設 1 小時：免費方案的 CDN 不會在刪除時清除快取，移除後網址最遲 1 小時內失效
    assert all(h.get("cache-control") == "max-age=3600" and h.get("x-upsert") == "true" and "authorization" not in h for h in page.db["upload_headers"])
    page.click(".tabs button[data-tab='approved']")
    _until(page, lambda: page.db.get("img_hosts"))
    assert page.db["img_hosts"] == {"photostest.supabase.co"}   # 縮圖亦由相片專案讀取
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
    expect(page.locator("#whoList .who-warn")).to_have_count(1)   # 7 號該時段不在跑道上
    page.click("#approve")                                         # 第一次：頁面內提示，不公開
    expect(page.locator("#approve")).to_have_text("仍然公開（再按一次）")
    expect(page.locator("#sheetMsg")).to_contain_text("7 在拍攝時段不在跑道上")
    assert page.db["photos"][pid]["status"] != "approved"
    page.click("#approve")                                         # 第二次（8 秒內）：公開
    _until(page, lambda: page.db["photos"][pid]["status"] == "approved")
    assert page.db["photos"][pid]["bibs"] == [7, 24] and page.db["photos"][pid]["reviewed"] is True
    page.click(".tabs [data-tab='approved']")
    page.click(f".card[data-id='{pid}']")
    n_dialogs = len(page.dialogs)
    page.click("#remove")                                  # 第一次：只提示，不刪除（不用 confirm 彈出視窗）
    expect(page.locator("#remove")).to_have_text("再按一次確定移除")
    page.wait_for_timeout(300)
    assert page.db["photos"][pid]["status"] != "removed" and not page.db["removed"] and len(page.dialogs) == n_dialogs
    page.click("#remove")                                  # 第二次（8 秒內）：刪除
    _until(page, lambda: page.db["photos"][pid]["status"] == "removed")
    assert set(page.db["removed"]) == {page.db["photos"][pid]["full_path"], page.db["photos"][pid]["thumb_path"]}, page.db.get("del_body")
    assert page.db["store"][-1]["action"] == "remove" and "del_body" not in page.db   # 經相片專案的 xc-photo-store 刪除
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


def test_photo_admin_skips_already_uploaded(adm, tmp_path):
    """相機自動傳相後重複揀同一批：已上載的相片略過；換裝置（本機紀錄清空）亦按伺服器紀錄略過"""
    page = adm
    page.db["fn_mode"] = []
    _login(page)
    f1 = tmp_path / "DSC_0001.jpg"; f1.write_bytes(_jpeg())
    page.set_input_files("#files", [str(f1)])
    _until(page, lambda: len(page.db["photos"]) == 1 and next(iter(page.db["photos"].values()))["status"] != "uploaded")
    row = next(iter(page.db["photos"].values()))
    assert row["src_key"].startswith("x") and row["camera"] == "TestCam"
    f2 = tmp_path / "DSC_0002.jpg"; f2.write_bytes(_jpeg(3000, 2000, "2026:11:29 08:10:01", (10, 200, 10)))
    page.set_input_files("#files", [str(f1), str(f2)])
    expect(page.locator("#prep")).to_contain_text("略過 1 張（之前已上載）")
    _until(page, lambda: len(page.db["photos"]) == 2)
    # 本機紀錄清空（例如換了手機）：仍按伺服器上的 src_key 略過
    page.evaluate("localStorage.removeItem('xc-photo-seen')")
    page.reload()
    expect(page.locator("#app")).to_be_visible()
    expect(page.locator("#nApproved")).to_have_text("2")   # 伺服器紀錄已載入
    page.set_input_files("#files", [str(f1), str(f2)])
    expect(page.locator("#prep")).to_contain_text("已加入 0 張；略過 2 張")
    page.wait_for_timeout(500)
    assert len(page.db["photos"]) == 2


def test_photo_admin_camera_clock(adm, tmp_path):
    """相機時間校正：影本頁時鐘 → 揀相 → 輸入相中時間；之後同型號相片自動更正，其他型號（手機）不變"""
    page = adm
    page.db["fn_mode"] = []
    _login(page)
    expect(page.locator("#clockBtn")).to_have_text("相機時間：未校正")
    page.click("#clockBtn")
    expect(page.locator("#clock")).to_be_visible()
    expect(page.locator("#clockNow")).to_have_text(re.compile(r"^\d{2}:\d{2}:\d{2}$"))
    assert page.evaluate("document.activeElement.id") != "clockSeen"   # 開啟時不自動彈出鍵盤
    shot = tmp_path / "clock.jpg"; shot.write_bytes(_jpeg(1200, 800, "2026:11:29 08:10:00", (0, 0, 0), "Canon EOS R6"))
    page.set_input_files("#clockFile", [str(shot)])
    expect(page.locator("#clockInfo")).to_contain_text("Canon EOS R6")
    expect(page.locator("#clockInfo")).to_contain_text("08:10:00")
    page.fill("#clockSeen", "12:34")
    page.click("#clockApply")
    expect(page.locator("#clockMsg")).to_contain_text("例如 081048")
    page.fill("#clockSeen", "080948")   # 相機快 12 秒
    page.click("#clockApply")
    expect(page.locator("#clockMsg")).to_contain_text("快 12 秒")
    expect(page.locator("#clockList")).to_contain_text("Canon EOS R6")
    no_hscroll(page)
    page.click("#clock .clock-head button")
    expect(page.locator("#clockBtn")).to_have_text("相機時間：已校正 1 部")
    assert page.db["clock"] == {"Canon EOS R6": 12}   # 存資料庫，所有上載裝置共用
    # 重新整理後仍在
    page.reload()
    expect(page.locator("#clockBtn")).to_have_text("相機時間：已校正 1 部")
    cam = tmp_path / "cam.jpg"; cam.write_bytes(_jpeg(3000, 2000, "2026:11:29 09:00:00", (200, 30, 30), "Canon EOS R6"))
    phone = tmp_path / "phone.jpg"; phone.write_bytes(_jpeg(3000, 2000, "2026:11:29 09:00:00", (30, 30, 200), "iPhone 15"))
    page.set_input_files("#files", [str(cam), str(phone)])
    _until(page, lambda: len(page.db["photos"]) == 2)
    by = {r["camera"]: r for r in page.db["photos"].values()}
    base = int(datetime(2026, 11, 29, 9, 0, tzinfo=MO).timestamp() * 1000)
    assert by["Canon EOS R6"]["taken_ms"] == base - 12000 and by["Canon EOS R6"]["clock_off_s"] == 12
    assert by["iPhone 15"]["taken_ms"] == base and by["iPhone 15"]["clock_off_s"] is None
    # 清除校正
    page.click("#clockBtn")
    page.click("#clockList [data-clear='Canon EOS R6']")
    expect(page.locator("#clockList")).to_contain_text("未有已校正的相機")
    assert page.db["clock"] == {}


def test_photo_admin_clock_formats_and_midnight(adm, tmp_path):
    """輸入「8:10:48」格式；相機慢時顯示「慢」；相差跨越午夜時取最近的差距"""
    page = adm
    _login(page)
    page.click("#clockBtn")
    a = tmp_path / "a.jpg"; a.write_bytes(_jpeg(1200, 800, "2026:11:29 08:10:00", (0, 0, 0), "Sony ILCE-7M4"))
    page.set_input_files("#clockFile", [str(a)])
    expect(page.locator("#clockInfo")).to_contain_text("Sony ILCE-7M4")
    page.fill("#clockSeen", "8:11:30")
    page.click("#clockApply")
    expect(page.locator("#clockMsg")).to_contain_text("慢 1 分 30 秒")
    b = tmp_path / "b.jpg"; b.write_bytes(_jpeg(1200, 800, "2026:11:30 00:00:05", (0, 0, 0), "Nikon Z 6_2"))
    page.set_input_files("#clockFile", [str(b)])
    expect(page.locator("#clockInfo")).to_contain_text("Nikon Z 6_2")
    page.fill("#clockSeen", "235955")
    page.click("#clockApply")
    expect(page.locator("#clockMsg")).to_contain_text("快 10 秒")
    expect(page.locator("#clockList li")).to_have_count(2)


def test_photo_admin_manual_mode_upload(adm, tmp_path):
    """人手模式（預設）：上載後不呼叫 AI，直接成為「未標號碼布」待覆核；不顯示 Gemini 訊息"""
    page = adm
    page.db["ai"] = False
    _login(page)
    f = tmp_path / "m.jpg"; f.write_bytes(_jpeg())
    page.set_input_files("#files", [str(f)])
    _until(page, lambda: len(page.db["photos"]) == 1)
    expect(page.locator("#nQueue")).to_have_text("0")
    row = next(iter(page.db["photos"].values()))
    assert row["status"] == "pending" and row["reason"] == "未標號碼布" and page.db["fn"] == []
    expect(page.locator("#nPending")).to_have_text("1")
    expect(page.locator(".card[data-id] .meta b")).to_have_text("未標號碼布")
    expect(page.locator(".card[data-id] .why")).to_have_count(0)
    expect(page.locator("#queueMsg")).to_be_hidden()
    page.click(".card[data-id]")
    expect(page.locator("#again")).to_have_count(0)
    expect(page.locator("#sheet")).not_to_contain_text("AI 讀出")


def test_photo_admin_manual_tag_hints_and_next(adm, tmp_path):
    """人手標：終點紀錄提示一按加入、在跑道上組別、不在跑道上警告；批准後自動跳到下一張（按拍攝時間）；Enter＝批准"""
    page = adm
    page.db["ai"] = False
    page.db["near"] = [{"bib": 405, "dt": -1.2, "fin": True}, {"bib": 999, "dt": 2.0, "fin": True}, {"bib": 24, "dt": 6.4, "fin": False}]
    _login(page)
    a = tmp_path / "a.jpg"; a.write_bytes(_jpeg(when="2026:11:29 11:20:00"))
    b = tmp_path / "b.jpg"; b.write_bytes(_jpeg(when="2026:11:29 11:20:07", color=(10, 200, 10)))
    page.set_input_files("#files", [str(b), str(a)])
    _until(page, lambda: len(page.db["photos"]) == 2)
    first, second = sorted(page.db["photos"].values(), key=lambda r: r["taken_ms"])
    expect(page.locator(".card[data-id]")).to_have_count(2)
    assert page.locator(".card[data-id]").first.get_attribute("data-id") == first["id"]   # 按拍攝時間排列
    page.locator(".card[data-id]").first.click()
    chips = page.locator("#hints [data-add]")
    expect(chips).to_have_count(2)                       # 999 不在名單，不提示
    expect(chips.first).to_contain_text("405")
    expect(chips.first).to_contain_text("陳浩天")
    expect(chips.first).to_contain_text("相片前 1 秒衝線")
    expect(chips.nth(1)).to_contain_text("中途經過")
    expect(page.locator("#hints")).to_contain_text("男C C1、男C C2")
    chips.first.click()
    expect(page.locator("#bibsIn")).to_have_value("405")
    expect(chips.first).to_have_class(re.compile(r"(^|\s)on(\s|$)"))
    page.fill("#bibsIn", "405 7")
    expect(page.locator("#whoList")).to_contain_text("該時段不在跑道上")
    expect(page.locator("#whoList .who-warn")).to_have_count(1)
    page.press("#bibsIn", "Enter")                                 # 第一次：頁面內提示（不用彈出視窗）
    expect(page.locator("#sheetMsg")).to_contain_text("7 在拍攝時段不在跑道上")
    page.wait_for_timeout(200)
    assert page.db["photos"][first["id"]]["status"] != "approved"
    page.press("#bibsIn", "Enter")                                 # 再按 Enter：公開
    _until(page, lambda: page.db["photos"][first["id"]]["status"] == "approved")
    assert page.db["photos"][first["id"]]["bibs"] == [7, 405] and page.db["photos"][first["id"]]["reviewed"] is True
    assert not page.dialogs                                        # 整個流程沒有彈出視窗
    # 自動開下一張
    expect(page.locator("#sheet")).to_be_visible()
    expect(page.locator("#sheet .big")).to_have_attribute("src", re.compile(second["full_path"]))
    page.fill("#bibsIn", "24")
    page.press("#bibsIn", "Enter")
    _until(page, lambda: page.db["photos"][second["id"]]["status"] == "approved")
    assert page.db["photos"][second["id"]]["bibs"] == [24]
    expect(page.locator("#sheet")).to_be_hidden()        # 已是最後一張
    expect(page.locator("#nApproved")).to_have_text("2")
    no_hscroll(page)


def test_photo_admin_many_photos_paged(adm):
    """相片多時（負荷測試：1,500 張待標會令手機卡死）：紀錄及名單分批讀（每批 1000 行）；格內只畫 60 張＋「顯示更多」；批准後仍跳到下一張"""
    page = adm
    page.db["ai"] = False
    page.db["roster_extra"] = [{"bib": 2000 + i, "cat": "MA", "heat": 1, "abbr": "X", "name": f"測試{i}"} for i in range(1100)]
    base = int(datetime(2026, 11, 29, 9, 0, tzinfo=MO).timestamp() * 1000)
    for i in range(1250):
        pid = f"00000000-0000-4000-8000-{i:012d}"
        page.db["photos"][pid] = {"id": pid, "event": "48", "full_path": f"48/{pid}.webp", "thumb_path": f"48/{pid}_t.webp", "w": 1600, "h": 1067,
                                  "taken_ms": base + i * 5000, "taken_src": "exif", "camera": None, "clock_off_s": None, "src_key": f"k{i}",
                                  "ai_bibs": None, "ai_unsure": None, "bibs": [], "status": "pending", "reason": "未標號碼布", "reviewed": False,
                                  "created_at": "2026-11-29T00:00:00Z", "rev": next(page.db["rev"])}
        if i < 2:
            page.db["files"][f"48/{pid}.webp"] = _webp()
    _login(page)
    expect(page.locator("#nPending")).to_have_text("1250")
    expect(page.locator("#sync")).to_contain_text("名單 1103")
    assert any("offset=1000" in q for q in page.db["roster_q"])
    cards = page.locator("#grid .card[data-id]")
    expect(cards).to_have_count(60)
    expect(page.locator("#moreBtn")).to_contain_text("尚有 1190 張")
    page.click("#moreBtn")
    expect(cards).to_have_count(120)
    page.click(".tabs [data-tab='approved']"); page.click(".tabs [data-tab='pending']")
    expect(cards).to_have_count(60)                       # 轉分頁後回到 60 張
    first = "00000000-0000-4000-8000-000000000000"
    cards.first.click()
    page.fill("#bibsIn", "2005")
    page.press("#bibsIn", "Enter")
    _until(page, lambda: page.db["photos"][first]["status"] == "approved")
    expect(page.locator("#sheet .big")).to_have_attribute("src", re.compile("000000000001"))
    expect(page.locator("#nPending")).to_have_text("1249")
    # 放大看號碼布：按一下放大三倍並可捲動，再按還原
    wrap = page.locator("#bigWrap")
    wrap.click(position={"x": 200, "y": 60})
    expect(wrap).to_have_class(re.compile(r"(^|\s)z(\s|$)"))
    ratio = page.evaluate("document.querySelector('#bigWrap img').offsetWidth / document.querySelector('#bigWrap').clientWidth")
    assert ratio > 2.9, ratio
    page.wait_for_function("document.querySelector('#bigWrap').scrollLeft > 0", timeout=5000)   # 下一格畫面才捲動到按下的位置
    wrap.click()
    expect(wrap).not_to_have_class(re.compile(r"(^|\s)z(\s|$)"))
    no_hscroll(page)


def test_sql_photo_hints_admin_only():
    """011_photo_hints.sql：只限管理員；不回傳姓名；終點提示排除已刪除及缺席；limit 在子查詢內"""
    import pathlib
    sql = (pathlib.Path(__file__).resolve().parents[1] / "supabase/011_photo_hints.sql").read_text(encoding="utf-8")
    assert "if not (select public.xc_is_admin()) then raise exception" in sql
    assert "revoke all on function public.xc_photo_hints(uuid, int[]) from public, anon" in sql
    assert "'name'" not in sql and "not e.deleted and not coalesce(e.dns, false)" in sql
    assert re.search(r"limit 10\s*\)\s*n;", sql)


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


def test_photo_admin_prepared_on_computer_not_recompressed(adm, tmp_path):
    """電腦先用 scripts/photo_prep.py 壓縮：大圖照原檔上載（畫質不變、不壓縮第二次），只移除 EXIF；
    拍攝時間、相機型號照讀；之後再揀原相 → 當作同一張略過"""
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
    import photo_prep
    page = adm
    page.db["ai"] = False
    _login(page)
    orig = tmp_path / "DSCF0001.jpg"; orig.write_bytes(_jpeg(6000, 4000, "2026:11:29 08:10:00"))
    pre = tmp_path / "DSCF0001.webp"
    photo_prep.prep_one(str(orig), str(pre))
    raw = pre.read_bytes()
    assert b"EXIF" in raw and b"TestCam" in raw   # 壓縮檔本身帶 EXIF（給上載頁讀時間）
    page.set_input_files("#files", [str(pre)])
    _until(page, lambda: len(page.db["photos"]) == 1)
    row = next(iter(page.db["photos"].values()))
    assert row["taken_ms"] == int(datetime(2026, 11, 29, 8, 10, tzinfo=MO).timestamp() * 1000) and row["taken_src"] == "exif"
    assert row["camera"] == "TestCam" and row["src_key"] == f"x{row['taken_ms']}|{orig.stat().st_size}|dscf0001"
    assert (row["w"], row["h"]) == (1280, 853)
    full, thumb = page.db["files"][row["full_path"]], page.db["files"][row["thumb_path"]]
    # 大圖：沒有 EXIF、不含相機型號；影像資料與壓縮檔逐位相同（沒有重新編碼）
    assert b"EXIF" not in full and b"TestCam" not in full and b"Exif" not in full
    assert len(full) < len(raw) and raw.find(b"VP8 ") > 0 and full[full.find(b"VP8 "):] == raw[raw.find(b"VP8 "):raw.find(b"EXIF")]
    a, b = Image.open(io.BytesIO(full)), Image.open(pre)
    assert a.size == b.size == (1280, 853) and a.tobytes() == b.tobytes()
    assert not a.getexif()
    assert max(Image.open(io.BytesIO(thumb)).size) == 400 and b"TestCam" not in thumb
    # 再揀原相（或在另一部機揀原相）：同一張，略過
    page.set_input_files("#files", [str(orig)])
    expect(page.locator("#prep")).to_contain_text("略過 1 張（之前已上載）")
    page.wait_for_timeout(300)
    assert len(page.db["photos"]) == 1


def test_photo_admin_prefills_computer_bib_scan(adm, tmp_path):
    """photo_prep.py 掃描號碼布（ocr=）：上載時存作建議（ai_bibs／ai_unsure，未公開）；覆核時只預先填入名單內、
    拍攝時段在跑道上的三位數號碼，其餘剔除並列明原因；不肯定或 1–2 位數的列作「可能」一按加入；Enter 確認才公開"""
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
    import photo_prep
    page = adm
    page.db["ai"] = False
    _login(page)
    src = Image.open(io.BytesIO(_jpeg(when="2026:11:29 08:10:00")))
    ex = photo_prep.keep_exif(src.getexif(), 4321, [(405, 97), (7, 95), (999, 99), (24, 60), (26, 55)])
    f = tmp_path / "IMG_9.webp"
    src.convert("RGB").resize((1280, 853)).save(f, "WEBP", quality=80, exif=ex.tobytes())
    page.set_input_files("#files", [str(f)])
    _until(page, lambda: len(page.db["photos"]) == 1)
    row = next(iter(page.db["photos"].values()))
    assert row["ai_bibs"] == [405, 999] and row["ai_unsure"] == [7, 24, 26]   # 1–2 位數即使信心高亦只列作「可能」
    assert row["status"] == "pending" and row["bibs"] == []          # 只是建議，未公開
    assert b"xc-prep" not in page.db["files"][row["full_path"]]      # 公開的大圖不帶掃描結果
    card = page.locator(".card[data-id]")
    expect(card).to_contain_text("建議 405、999")
    card.click()
    # 999、26 不在名單；7 在名單但該時段不在跑道上（測試假資料：7 號不在跑道上）→ 提示載入後剔除
    expect(page.locator("#bibsIn")).to_have_value("405")
    expect(page.locator("#hints")).to_contain_text("電腦掃描建議")
    expect(page.locator("#hints")).to_contain_text("999（不在名單）")
    expect(page.locator("#hints")).to_contain_text("7（不肯定；該時段不在跑道上）")
    expect(page.locator("#hints")).to_contain_text("26（不在名單）")
    assert {7, 24} <= set(page.db["hints"][-1]["p_bibs"])            # 不肯定的建議亦核對是否在跑道上
    expect(page.locator("#hints [data-add='7']")).to_have_count(0)
    maybe = page.locator("#hints [data-add='24']")
    expect(maybe).to_contain_text("可能（不肯定）")
    expect(maybe).to_contain_text("李蕙伃")
    maybe.click()
    expect(page.locator("#bibsIn")).to_have_value("405 24")
    page.press("#bibsIn", "Enter")
    _until(page, lambda: page.db["photos"][row["id"]]["status"] == "approved")
    assert page.db["photos"][row["id"]]["bibs"] == [24, 405]
    expect(page.locator(".card[data-id]")).to_have_count(0)
    page.locator(".tabs button[data-tab='approved']").click()
    expect(page.locator(".card[data-id]")).to_contain_text("24、405")
    expect(page.locator(".card[data-id]")).not_to_contain_text("建議")


def test_photo_admin_without_photo_project_uses_main_storage(adm, tmp_path):
    """site.json 未設 photos：沿用主專案 storage 上載（舊設定仍可用）"""
    page = adm
    page.db["photo_cfg"] = None
    page.db["ai"] = False
    _login(page)
    f = tmp_path / "a.jpg"; f.write_bytes(_jpeg())
    page.set_input_files("#files", [str(f)])
    _until(page, lambda: len(page.db["photos"]) == 1)
    row = next(iter(page.db["photos"].values()))
    assert row["full_path"] in page.db["files"] and row["thumb_path"] in page.db["files"]
    assert not page.db["store"] and not page.db.get("signed_put")


def test_photo_admin_scan_kept_when_camera_time_looks_wrong(adm, tmp_path):
    """拍攝時間沒有任何組別在跑道上（多數是相機時間未校正）：電腦建議不按時段剔除，並提示先校正相機時間"""
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
    import photo_prep
    page = adm
    page.db["ai"] = False
    page.db["cats"] = []
    _login(page)
    src = Image.open(io.BytesIO(_jpeg(when="2026:11:29 03:10:00")))
    ex = photo_prep.keep_exif(src.getexif(), 4321, [(405, 97), (7, 95)])
    f = tmp_path / "IMG_8.webp"
    src.convert("RGB").resize((1280, 853)).save(f, "WEBP", quality=80, exif=ex.tobytes())
    page.set_input_files("#files", [str(f)])
    _until(page, lambda: len(page.db["photos"]) == 1)
    page.locator(".card[data-id]").click()
    expect(page.locator("#hints .why")).to_contain_text("相機時間未校正")
    expect(page.locator("#bibsIn")).to_have_value("405")
    expect(page.locator("#hints [data-add='7']")).to_have_count(1)   # 7 號不肯定，仍列作「可能」，沒有因時段被剔除
    expect(page.locator("#hints")).not_to_contain_text("已剔除")


def test_photo_admin_clock_shared_serial_and_fix_uploaded(adm, tmp_path):
    """校正存資料庫（另一部裝置已校正，本機直接套用）；同型號兩部相機按機身序號分開校正；
    上載後才校正的相機，可按「更正已上載 N 張」重新計算拍攝時間"""
    page = adm
    page.db["ai"] = False
    page.db["clock"] = {"Canon EOS R6 #000123": 30}   # 另一部裝置做的校正
    _login(page)
    expect(page.locator("#clockBtn")).to_have_text("相機時間：已校正 1 部")
    a = tmp_path / "a.jpg"; a.write_bytes(_jpeg(when="2026:11:29 09:00:00", model="Canon EOS R6", serial="77000123"))
    b = tmp_path / "b.jpg"; b.write_bytes(_jpeg(when="2026:11:29 09:00:00", color=(9, 9, 9), model="Canon EOS R6", serial="55999999"))
    page.set_input_files("#files", [str(a), str(b)])
    _until(page, lambda: len(page.db["photos"]) == 2)
    by = {r["camera"]: r for r in page.db["photos"].values()}
    base = int(datetime(2026, 11, 29, 9, 0, tzinfo=MO).timestamp() * 1000)
    assert set(by) == {"Canon EOS R6 #000123", "Canon EOS R6 #999999"}
    assert by["Canon EOS R6 #000123"]["taken_ms"] == base - 30000 and by["Canon EOS R6 #000123"]["clock_off_s"] == 30
    assert by["Canon EOS R6 #999999"]["taken_ms"] == base and by["Canon EOS R6 #999999"]["clock_off_s"] is None   # 同型號另一部：未校正
    # 上載後才校正第二部相機（慢 12 秒）
    page.click("#clockBtn")
    shot = tmp_path / "clock.jpg"; shot.write_bytes(_jpeg(1200, 800, "2026:11:29 08:10:00", (0, 0, 0), "Canon EOS R6", "55999999"))
    page.set_input_files("#clockFile", [str(shot)])
    expect(page.locator("#clockInfo")).to_contain_text("Canon EOS R6 #999999")
    page.fill("#clockSeen", "081012")
    page.click("#clockApply")
    expect(page.locator("#clockMsg")).to_contain_text("慢 12 秒")
    expect(page.locator("#clockMsg")).to_contain_text("已上載的 1 張")
    assert page.db["clock"] == {"Canon EOS R6 #000123": 30, "Canon EOS R6 #999999": -12}
    fix = page.locator("#clockList [data-fix='Canon EOS R6 #999999']")
    expect(fix).to_have_text("更正已上載 1 張")
    expect(page.locator("#clockList [data-fix='Canon EOS R6 #000123']")).to_have_count(0)   # 已用正確誤差，不用更正
    fix.click()
    expect(page.locator("#clockMsg")).to_contain_text("已更正 1 張")
    assert page.db["reclock"] == [{"p_event": "48", "p_camera": "Canon EOS R6 #999999", "p_off_s": -12}]
    assert by["Canon EOS R6 #999999"]["taken_ms"] == base + 12000 and by["Canon EOS R6 #999999"]["clock_off_s"] == -12
    expect(page.locator("#clockList [data-fix]")).to_have_count(0)


def test_photo_admin_burst_same_time_and_size_all_uploaded(adm, tmp_path):
    """連拍：拍攝時間（無秒以下）及檔案大小完全相同、檔名不同的相片全部上載；同一檔再揀才略過"""
    page = adm
    page.db["ai"] = False
    _login(page)
    data = _jpeg()
    files = [tmp_path / f"BCF0030{i}.jpg" for i in (8, 9)]
    for f in files:
        f.write_bytes(data)
    page.set_input_files("#files", [str(f) for f in files])
    _until(page, lambda: len(page.db["photos"]) == 2)
    assert len({r["src_key"] for r in page.db["photos"].values()}) == 2
    page.set_input_files("#files", [str(f) for f in files])
    expect(page.locator("#prep")).to_contain_text("已加入 0 張；略過 2 張")
    assert len(page.db["photos"]) == 2


def _scanned(tmp_path, name, bibs, when="2026:11:29 08:10:00"):
    """模擬 photo_prep.py 的輸出：帶掃描結果的 WebP"""
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
    import photo_prep
    src = Image.open(io.BytesIO(_jpeg(when=when)))
    ex = photo_prep.keep_exif(src.getexif(), 4321, bibs)
    f = tmp_path / name
    src.convert("RGB").resize((1280, 853)).save(f, "WEBP", quality=80, exif=ex.tobytes())
    return f


@pytest.mark.parametrize("event,published", [("48", [405]), ("test", [405])])
def test_photo_admin_auto_publish_clear_bibs(adm, tmp_path, event, published):
    """photo_auto：只公開清楚的三位數號碼（在名單；正式資料另要時段相符）；不肯定、不在名單的不公開"""
    page = adm
    page.db["ai"] = False
    page.db["auto"] = True
    _login(page)
    page.select_option("#event", event)
    expect(page.locator("#sync")).to_contain_text("已同步")
    f = _scanned(tmp_path, "A1.webp", [(405, 97), (999, 99), (24, 99), (301, 50)])
    page.set_input_files("#files", [str(f)])
    _until(page, lambda: any(r["status"] == "approved" for r in page.db["photos"].values()))
    row = next(iter(page.db["photos"].values()))
    assert row["event"] == event and row["bibs"] == published and row["reviewed"] is False and row["reason"] is None
    assert page.db["hints"][-1]["p_bibs"] == [405, 999]   # 1–2 位數及低信心讀數不會自動公開
    expect(page.locator("#nApproved")).to_have_text("1")


def test_photo_admin_auto_publish_checks_time_only_for_official(adm, tmp_path):
    """號碼在名單但拍攝時段不在跑道上（假資料 on_course＝False）：正式留在待覆核，演練照樣公開"""
    page = adm
    page.db["ai"] = False
    page.db["auto"] = True
    page.db["extra_check"] = {405: False}
    _login(page)
    page.set_input_files("#files", [str(_scanned(tmp_path, "B1.webp", [(405, 97)]))])
    _until(page, lambda: any(r.get("reason") == "號碼不在名單或拍攝時段不符" for r in page.db["photos"].values()))
    assert next(iter(page.db["photos"].values()))["status"] == "pending"
    page.select_option("#event", "test")
    page.set_input_files("#files", [str(_scanned(tmp_path, "B2.webp", [(405, 97)], "2025:11:30 08:10:00"))])
    _until(page, lambda: any(r["event"] == "test" and r["status"] == "approved" for r in page.db["photos"].values()))


def test_photo_admin_auto_publish_leaves_unclear_pending(adm, tmp_path):
    """沒有清楚的三位數號碼、或沒有掃描結果：不公開"""
    page = adm
    page.db["ai"] = False
    page.db["auto"] = True
    _login(page)
    plain = tmp_path / "C1.jpg"; plain.write_bytes(_jpeg())
    page.set_input_files("#files", [str(_scanned(tmp_path, "C2.webp", [(7, 99), (405, 40)], "2026:11:29 08:10:05")), str(plain)])
    expect(page.locator("#nPending")).to_have_text("2")
    expect(page.locator("#nQueue")).to_have_text("0")
    assert all(r["status"] == "pending" and r["bibs"] == [] for r in page.db["photos"].values())
    assert not page.db["hints"]
