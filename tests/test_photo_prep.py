"""scripts/photo_prep.py：電腦批量壓縮比賽相片（上載前）
用法：python -P -X utf8 -m pytest tests/test_photo_prep.py
"""
import json, os, pathlib, sys

import pytest
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))   # 多核心處理要以正常 import 載入（子程序才找得到）
import photo_prep as prep  # noqa: E402


def camera_jpeg(path, w=6000, h=4000, when="2026:11:29 08:10:00", orient=1, model="X-T30", make="FUJIFILM", sub="47"):
    """模擬相機原相：拍攝時間（含小數秒、時區）、牌子型號、GPS、方向"""
    im = Image.new("RGB", (w, h), (40, 120, 200))
    for x in range(0, w, 200):   # 加點細節，壓縮後才有可比較的內容
        im.paste((230, 230, 230), (x, 0, x + 40, h))
    ex = Image.Exif()
    ex[0x010F], ex[0x0110], ex[0x0112] = make, model, orient
    e = ex.get_ifd(0x8769)
    e[0x9003], e[0x9291], e[0x9011] = when, sub, "+08:00"
    ex.get_ifd(0x8825)[2] = (22.0, 9.0, 0.0)   # GPSLatitude
    im.save(path, "JPEG", exif=ex.tobytes(), quality=92)
    os.utime(path, (1795912000, 1795912000))
    return path


def test_compress_keeps_only_needed_exif(tmp_path):
    src = tmp_path / "男A"; src.mkdir()
    f = camera_jpeg(src / "DSCF0001.jpg", orient=6)   # 相機打直影：轉正後變直度相片
    assert prep.main([str(src), "--workers", "1", "--no-bibs"]) == 0
    out = tmp_path / "男A_上載" / "DSCF0001.webp"
    im = Image.open(out)
    assert im.format == "WEBP" and im.size == (1067, 1600)
    ex = im.getexif()
    assert ex[0x010F] == "FUJIFILM" and ex[0x0110] == "X-T30"
    assert ex[0x010E] == f"xc-prep v1 src={f.stat().st_size}"
    assert 0x0112 not in ex   # 已轉正，不再有方向
    assert dict(ex.get_ifd(0x8769)) == {0x9003: "2026:11:29 08:10:00", 0x9291: "47", 0x9011: "+08:00"}
    assert not ex.get_ifd(0x8825)   # 沒有 GPS
    assert b"GPS" not in out.read_bytes()
    assert int(out.stat().st_mtime) == 1795912000   # 保留原檔修改時間
    assert out.stat().st_size < 400_000


def test_rerun_skips_done_and_names_do_not_collide(tmp_path):
    src = tmp_path / "相片"
    (src / "相機1").mkdir(parents=True); (src / "相機2").mkdir()
    camera_jpeg(src / "相機1" / "DSC_0001.jpg", 3000, 2000)
    camera_jpeg(src / "相機2" / "DSC_0001.jpg", 3000, 2000, when="2026:11:29 08:11:00")   # 兩部相機同名
    (src / "壞檔.jpg").write_bytes(b"not a jpeg")
    assert prep.main([str(src), "--workers", "2", "--no-bibs"]) == 1   # 壞檔 → 回傳 1，其餘照做
    out = tmp_path / "相片_上載"
    assert sorted(p.name for p in out.glob("*.webp")) == ["DSC_0001.webp", "DSC_0001_2.webp"]
    man = json.loads((out / "_prep.json").read_text(encoding="utf-8"))
    assert len(man) == 2 and all(v["w"] == 1600 for v in man.values())
    # 重跑：只處理新相片，不重複、不改名
    before = {p.name: p.stat().st_mtime_ns for p in out.glob("*.webp")}
    camera_jpeg(src / "相機1" / "DSC_0002.jpg", 3000, 2000)
    (src / "壞檔.jpg").unlink()
    assert prep.main([str(src), "--workers", "2", "--no-bibs"]) == 0
    after = {p.name: p.stat().st_mtime_ns for p in out.glob("*.webp")}
    assert set(after) == {"DSC_0001.webp", "DSC_0001_2.webp", "DSC_0002.webp"}
    assert all(after[k] == v for k, v in before.items())


def test_small_photo_not_enlarged_and_png_ok(tmp_path):
    src = tmp_path / "s"; src.mkdir()
    Image.new("RGBA", (800, 600), (10, 20, 30, 255)).save(src / "a.png")
    assert prep.main([str(src), "--workers", "1", "--no-bibs"]) == 0
    im = Image.open(tmp_path / "s_上載" / "a.webp")
    assert im.size == (800, 600)
    assert im.getexif()[0x010E].startswith("xc-prep v1 src=")


def test_quality_close_to_direct_resize(tmp_path):
    """先以一半尺寸解碼再縮圖：與直接由原相縮圖的結果幾乎一樣（平均每個顏色值相差 < 2）"""
    src = tmp_path / "q"; src.mkdir()
    f = camera_jpeg(src / "q.jpg")
    assert prep.main([str(src), "--workers", "1", "--quality", "100", "--no-bibs"]) == 0
    a = Image.open(tmp_path / "q_上載" / "q.webp").convert("RGB")
    b = Image.open(f).convert("RGB"); b.thumbnail((1600, 1600), Image.LANCZOS)
    assert a.size == b.size
    diff = sum(abs(x - y) for pa, pb in zip(a.getdata(), b.getdata()) for x, y in zip(pa, pb)) / (a.size[0] * a.size[1] * 3)
    assert diff < 2, diff


def test_desc_records_ocr_result():
    ex = prep.keep_exif(Image.Exif(), 123, [(405, 97), (24, 61)])
    assert ex[0x010E] == "xc-prep v1 src=123 ocr=405:97,24:61"
    assert prep.keep_exif(Image.Exif(), 123, [])[0x010E] == "xc-prep v1 src=123 ocr="   # 掃描過、讀不到
    assert prep.keep_exif(Image.Exif(), 123)[0x010E] == "xc-prep v1 src=123"           # 沒有掃描


def bib_photo(path, num, w=6000, h=4000, bib_w=260):
    """草地背景上一名跑手，胸前號碼布（原相上約 bib_w px 闊），另有終點橫額「2026」等干擾字"""
    im = Image.effect_noise((w // 8, h // 8), 40).convert("RGB").resize((w, h))
    im = Image.blend(im, Image.new("RGB", (w, h), (70, 120, 50)), 0.7)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 300, w, 650), fill=(20, 60, 160))
    d.text((w // 2, 475), "FINISH 2026", font=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 240), fill="white", anchor="mm")
    cx, cy = w // 2, h * 2 // 3
    d.rounded_rectangle((cx - bib_w, cy - bib_w * 1.4, cx + bib_w, cy + bib_w * 1.6), radius=bib_w // 3, fill=(200, 40, 40))
    bh = int(bib_w * 0.72)
    d.rectangle((cx - bib_w // 2, cy - bh // 2, cx + bib_w // 2, cy + bh // 2), fill=(250, 250, 250))
    d.text((cx, cy + bh // 10), str(num), font=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(bh * 0.55)), fill=(15, 15, 15), anchor="mm")
    ex = Image.Exif(); ex.get_ifd(0x8769)[0x9003] = "2026:11:29 08:10:00"
    im.save(path, "JPEG", quality=90, exif=ex.tobytes())
    return path


@pytest.mark.skipif(prep.RapidOCR is None or not os.path.exists("C:/Windows/Fonts/arialbd.ttf"), reason="未安裝 rapidocr（或沒有 Arial 字型）")
def test_bib_scan_writes_ocr_and_rerun_adds_scan(tmp_path):
    """壓縮時順手掃描號碼布：讀出 357 寫入 ocr=；「2026」（4 位數）不當號碼布；
    之前用 --no-bibs 只壓縮過的相片，之後不加 --no-bibs 重跑會補做掃描（檔名不變）"""
    src = tmp_path / "女B"; src.mkdir()
    bib_photo(src / "IMG_1.jpg", 357)
    assert prep.main([str(src), "--workers", "1", "--no-bibs"]) == 0
    out = tmp_path / "女B_上載"
    assert "ocr=" not in Image.open(out / "IMG_1.webp").getexif()[0x010E]
    assert prep.main([str(src), "--workers", "1"]) == 0
    assert sorted(p.name for p in out.glob("*.webp")) == ["IMG_1.webp"]
    desc = Image.open(out / "IMG_1.webp").getexif()[0x010E]
    got = [int(x.split(":")[0]) for x in desc.split(" ocr=")[1].split(",") if x]
    assert got == [357], desc
    man = json.loads((out / "_prep.json").read_text(encoding="utf-8"))
    assert [b for b, _ in next(iter(man.values()))["ocr"]] == [357]
    assert Image.open(out / "IMG_1.webp").size == (1600, 1067)
