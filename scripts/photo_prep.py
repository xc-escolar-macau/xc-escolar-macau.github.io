"""比賽相片：電腦批量壓縮（上載前）
相機原相（約 10MB）→ 長邊 1600px WebP（約 350KB），上載頁 photo-admin.html 直接上載、不再壓縮第二次。

用法：
    python -P -X utf8 scripts/photo_prep.py <相片資料夾> [--out 輸出資料夾] [--workers N]
    （Windows 可把資料夾拖到 scripts/photo_prep.bat 上）

- 輸出預設放在「<相片資料夾>_上載」；之後在上載頁揀該資料夾內全部 .webp
- 多核心同時處理；JPEG 先以一半尺寸解碼（仍不少於 1600px），再用 Lanczos 縮圖：速度快、畫質不受影響
- 只保留上載頁需要的 EXIF：拍攝時間（含小數秒、時區）、相機牌子及型號（相機時間校正用）；
  GPS 位置等其他資料全部不寫入。上載頁讀出時間後會把 EXIF 整段移除才上載，公開的相片不含任何 EXIF
- ImageDescription 寫入「xc-prep v1 src=<原檔大小>」：上載頁據此認出已壓縮的相片，並以原檔大小判斷是否已上載過
  （原相經上載頁壓縮、或經本程式壓縮後再上載，都當作同一張）
- 輸出檔保留原檔的修改時間；已處理的相片記於輸出資料夾 _prep.json，重跑只處理新相片
- 相片不會上載、不會刪除或改動原相
"""
import argparse, json, os, sys, time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps

FULL, QUALITY, VERSION = 1600, 82, "v1"
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
try:   # iPhone HEIC（如有安裝 pillow-heif）
    import pillow_heif
    pillow_heif.register_heif_opener()
    EXTS |= {".heic", ".heif"}
except ImportError:
    pillow_heif = None

T_MAKE, T_MODEL, T_DESC, T_EXIF_IFD = 0x010F, 0x0110, 0x010E, 0x8769
T_ORIG, T_DIGI, T_SUB_ORIG, T_SUB_DIGI, T_OFF_ORIG = 0x9003, 0x9004, 0x9291, 0x9292, 0x9011


def keep_exif(src: Image.Exif, src_size: int) -> Image.Exif:
    """只抄上載頁需要的欄位"""
    out = Image.Exif()
    for t in (T_MAKE, T_MODEL):
        v = src.get(t)
        if isinstance(v, str) and v.strip():
            out[t] = v.strip()[:60]
    out[T_DESC] = f"xc-prep {VERSION} src={src_size}"
    ex = src.get_ifd(T_EXIF_IFD)
    when = ex.get(T_ORIG) or ex.get(T_DIGI) or src.get(0x0132)   # DateTimeOriginal → DateTimeDigitized → DateTime
    if when:
        o = out.get_ifd(T_EXIF_IFD)
        o[T_ORIG] = str(when).strip()
        sub = ex.get(T_SUB_ORIG) if ex.get(T_ORIG) else ex.get(T_SUB_DIGI)
        if sub:
            o[T_SUB_ORIG] = str(sub).strip()
        if ex.get(T_OFF_ORIG):
            o[T_OFF_ORIG] = str(ex[T_OFF_ORIG]).strip()
    return out


def prep_one(src: str, dst: str, size: int = FULL, quality: int = QUALITY):
    st = os.stat(src)
    with Image.open(src) as im:
        exif = im.getexif()
        if im.format == "JPEG":
            im.draft("RGB", (size, size))   # 以 1/2、1/4… 解碼，結果兩邊仍不少於 size
        icc = im.info.get("icc_profile")
        im = ImageOps.exif_transpose(im)  # 按相機方向轉正（之後不再需要 Orientation）
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.thumbnail((size, size), Image.LANCZOS)
        tmp = dst + ".part"
        im.save(tmp, "WEBP", quality=quality, method=4, exif=keep_exif(exif, st.st_size).tobytes(), **({"icc_profile": icc} if icc else {}))
        w, h = im.size
    os.replace(tmp, dst)
    os.utime(dst, (st.st_atime, st.st_mtime))
    return {"w": w, "h": h, "bytes": os.path.getsize(dst)}


def scan(src: Path, out: Path):
    if src.is_file():
        return [src]
    files = []
    for p in sorted(src.rglob("*")):
        if p.is_file() and p.suffix.lower() in EXTS and out not in p.parents and not p.name.startswith("."):
            files.append(p)
    return files


def main(argv=None):
    ap = argparse.ArgumentParser(description="比賽相片批量壓縮（上載前）")
    ap.add_argument("src", help="相片資料夾（會包括子資料夾）")
    ap.add_argument("--out", help="輸出資料夾（預設：<相片資料夾>_上載）")
    ap.add_argument("--workers", type=int, default=os.cpu_count() or 4)
    ap.add_argument("--size", type=int, default=FULL)
    ap.add_argument("--quality", type=int, default=QUALITY)
    a = ap.parse_args(argv)

    src = Path(a.src).resolve()
    if not src.exists():
        sys.exit(f"找不到：{src}")
    out = Path(a.out).resolve() if a.out else src.with_name(src.name + "_上載") if src.is_dir() else src.parent / "_上載"
    out.mkdir(parents=True, exist_ok=True)
    man_path = out / "_prep.json"
    man = json.loads(man_path.read_text(encoding="utf-8")) if man_path.exists() else {}
    used = {v["out"] for v in man.values()}

    files = scan(src, out)
    jobs = []
    for f in files:
        st = f.stat()
        key = f"{f.relative_to(src) if src.is_dir() else f.name}|{st.st_size}|{int(st.st_mtime)}"
        if key in man and (out / man[key]["out"]).exists():
            continue
        name, n = f"{f.stem}.webp", 2
        while name in used:   # 不同相機或記憶卡的同名檔（例如 DSC_0001）
            name, n = f"{f.stem}_{n}.webp", n + 1
        used.add(name)
        jobs.append((key, f, name))

    skipped = len(files) - len(jobs)
    if not files:
        sys.exit(f"{src} 內沒有相片（支援：{'、'.join(sorted(EXTS))}）")
    print(f"相片 {len(files)} 張：要壓縮 {len(jobs)} 張" + (f"，略過已處理 {skipped} 張" if skipped else "") + f"；輸出到 {out}")
    if pillow_heif is None and any(p.suffix.lower() in {".heic", ".heif"} for p in src.rglob("*") if src.is_dir()):
        print("提示：有 HEIC 相片，但未安裝 pillow-heif（pip install pillow-heif），這些相片已略過")

    t0, done, fails, total = time.time(), 0, [], 0
    with ProcessPoolExecutor(max(1, a.workers)) as ex:
        futs = {ex.submit(prep_one, str(f), str(out / name), a.size, a.quality): (key, f, name) for key, f, name in jobs}
        for fut in as_completed(futs):
            key, f, name = futs[fut]
            try:
                r = fut.result()
                man[key] = {"out": name, **r}
                total += r["bytes"]
            except Exception as e:   # 壞檔、格式不支援：記下，其餘照做
                fails.append((f.name, str(e)[:120]))
            done += 1
            if done % 25 == 0 or done == len(jobs):
                rate = done / max(time.time() - t0, 1e-6)
                print(f"  {done}／{len(jobs)}（每秒 {rate:.1f} 張，尚餘約 {(len(jobs) - done) / rate:.0f} 秒）", flush=True)
                man_path.write_text(json.dumps(man, ensure_ascii=False, indent=0), encoding="utf-8")
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=0), encoding="utf-8")

    ok = len(jobs) - len(fails)
    secs = time.time() - t0
    print(f"完成：{ok} 張，用時 {secs:.0f} 秒" + (f"，平均每張 {total / ok / 1024:.0f}KB" if ok else ""))
    for n, e in fails:
        print(f"  未能處理：{n}（{e}）")
    print(f"下一步：在上載頁按「揀相片」，揀 {out} 內全部 .webp")
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
