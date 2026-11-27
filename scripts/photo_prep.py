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
- 號碼布掃描（如有安裝 rapidocr：pip install rapidocr）：壓縮時順手用較大的圖（長邊 OCR_SIDE）辨識相中數字，
  1–3 位數字寫入 ImageDescription「ocr=號碼:信心,…」（例如 ocr=24:97,405:81；讀不到＝「ocr=」）。
  上載頁只當作「建議」：再按名單、拍攝時段在跑道上的組別、終點紀錄過濾，由工作人員確認才公開。
  全部在本機進行，相片不會傳去任何 AI 服務。不想掃描可加 --no-bibs
  速度：每個核心每張約 3–5 秒；每個掃描程序約用 600MB 記憶體，按當時可用記憶體自動決定同時處理幾張
  （記憶體用盡會令其他程式中斷）；未能處理的相片最後逐張重試一次
- 新電腦第一次使用：執行 scripts/photo_prep_setup.bat（安裝 Pillow、rapidocr 及下載約 5MB 模型）
"""
import argparse, json, math, os, re, sys, time

# 多個子程序同時運算：每個子程序只開 1 條計算執行緒（否則 numpy／OpenBLAS 每個程序按核心數預留記憶體，8 個程序會分配失敗）
for _v in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_v, "1")
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

OCR_SIDE, MAX_BIB = 2000, 999
try:   # 本機文字辨識（PP-OCR，ONNX，CPU）
    import numpy as np
    from rapidocr import LangDet, ModelType, OCRVersion, RapidOCR
except ImportError:
    RapidOCR = None

T_MAKE, T_MODEL, T_DESC, T_EXIF_IFD = 0x010F, 0x0110, 0x010E, 0x8769
T_ORIG, T_DIGI, T_SUB_ORIG, T_SUB_DIGI, T_OFF_ORIG = 0x9003, 0x9004, 0x9291, 0x9292, 0x9011


def keep_exif(src: Image.Exif, src_size: int, bibs=None) -> Image.Exif:
    """只抄上載頁需要的欄位；bibs＝號碼布掃描結果 [(號碼, 信心 0–99)]，None＝沒有掃描"""
    out = Image.Exif()
    for t in (T_MAKE, T_MODEL):
        v = src.get(t)
        if isinstance(v, str) and v.strip():
            out[t] = v.strip()[:60]
    out[T_DESC] = f"xc-prep {VERSION} src={src_size}" + ("" if bibs is None else " ocr=" + ",".join(f"{b}:{c}" for b, c in bibs))
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


_ENGINE = None


def ocr_engine():
    """每個子程序載入一次模型；每個子程序只用 1 條執行緒（多張相同時處理，比單張用多條執行緒快）
    文字位置偵測用 PP-OCRv4 mobile（比 rapidocr 預設的 PP-OCRv6 small 快約 3 倍，號碼布一樣找到）；
    第一次使用會從 modelscope.cn 下載約 5MB 模型，之後離線可用"""
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = RapidOCR(params={"Global.max_side_len": OCR_SIDE, "Global.log_level": "error",
                                   "Det.ocr_version": OCRVersion.PPOCRV4, "Det.model_type": ModelType.MOBILE, "Det.lang_type": LangDet.CH,
                                   "EngineConfig.onnxruntime.intra_op_num_threads": 1,
                                   "EngineConfig.onnxruntime.inter_op_num_threads": 1})
    return _ENGINE


def read_bibs(im: Image.Image, max_bib: int = MAX_BIB):
    """相中 1–3 位數字（整個文字框只有數字），回傳 [(號碼, 信心 0–99)]，信心高者先；同一號碼取最高信心"""
    r = ocr_engine()(np.asarray(im)[:, :, ::-1])   # RGB → BGR
    found = {}
    for txt, sc in zip(r.txts or (), r.scores or ()):
        s = re.sub(r"\s", "", str(txt))
        if re.fullmatch(r"\d{1,3}", s) and 1 <= int(s) <= max_bib:
            n, c = int(s), min(99, round(float(sc) * 100))
            found[n] = max(found.get(n, 0), c)
    return sorted(found.items(), key=lambda x: (-x[1], x[0]))


def prep_one(src: str, dst: str, size: int = FULL, quality: int = QUALITY, bibs: bool = False, max_bib: int = MAX_BIB):
    st = os.stat(src)
    found = None
    with Image.open(src) as im:
        exif = im.getexif()
        if im.format == "JPEG":
            if bibs:   # 掃描號碼布要較大的圖：按比例要求長邊不少於 OCR_SIDE
                k = max(size, OCR_SIDE) / max(im.size)
                im.draft("RGB", (math.ceil(im.width * k), math.ceil(im.height * k)))
            else:
                im.draft("RGB", (size, size))   # 以 1/2、1/4… 解碼，結果兩邊仍不少於 size
        icc = im.info.get("icc_profile")
        im = ImageOps.exif_transpose(im)  # 按相機方向轉正（之後不再需要 Orientation）
        if im.mode != "RGB":
            im = im.convert("RGB")
        if bibs:
            o = im
            if max(o.size) > OCR_SIDE:
                o = im.copy()
                o.thumbnail((OCR_SIDE, OCR_SIDE), Image.LANCZOS)
            found = read_bibs(o, max_bib)
        im.thumbnail((size, size), Image.LANCZOS)
        tmp = dst + ".part"
        im.save(tmp, "WEBP", quality=quality, method=4, exif=keep_exif(exif, st.st_size, found).tobytes(), **({"icc_profile": icc} if icc else {}))
        w, h = im.size
    os.replace(tmp, dst)
    os.utime(dst, (st.st_atime, st.st_mtime))
    return {"w": w, "h": h, "bytes": os.path.getsize(dst), **({} if found is None else {"ocr": found})}


OCR_MB, RESERVE_MB = 650, 1500   # 每個掃描號碼布的子程序約用 600MB；留 1.5GB 給其他程式（實測記憶體用盡會令 Google Drive 等程式中斷）


def avail_commit_mb():
    """Windows：仍可分配的記憶體（含分頁檔，即「認可」上限餘額）；其他系統：可用實體記憶體"""
    try:
        if os.name == "nt":
            import ctypes

            class MS(ctypes.Structure):
                _fields_ = [("len", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [(n, ctypes.c_ulonglong) for n in
                            ("tphys", "aphys", "tpage", "apage", "tvirt", "avirt", "aext")]
            m = MS(); m.len = ctypes.sizeof(MS)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
            return m.apage // 2**20
        return os.sysconf("SC_AVPHYS_PAGES") * os.sysconf("SC_PAGE_SIZE") // 2**20
    except Exception:
        return None


def auto_workers(bibs: bool) -> int:
    cpu = os.cpu_count() or 2
    if not bibs:
        return cpu
    mb = avail_commit_mb()
    by_mem = cpu if mb is None else (mb - RESERVE_MB) // OCR_MB
    return int(max(1, min(cpu - 1, by_mem)))   # 留一個核心給上載頁等其他工作


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
    ap.add_argument("--workers", type=int, help="同時處理幾張（預設按核心數及可用記憶體自動決定）")
    ap.add_argument("--size", type=int, default=FULL)
    ap.add_argument("--quality", type=int, default=QUALITY)
    ap.add_argument("--no-bibs", action="store_true", help="不掃描號碼布（只壓縮）")
    ap.add_argument("--max-bib", type=int, default=MAX_BIB, help=f"號碼布最大號碼（預設 {MAX_BIB}）")
    a = ap.parse_args(argv)
    bibs = not a.no_bibs and RapidOCR is not None

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
            if bibs and "ocr" not in man[key]:   # 之前只壓縮、未掃描號碼布：重做一次（沿用同一檔名）
                jobs.append((key, f, man[key]["out"]))
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
    if not a.no_bibs and RapidOCR is None:
        print("提示：未安裝號碼布掃描（pip install rapidocr），這次只壓縮；上載後要逐張人手輸入號碼布")
    elif bibs and jobs:
        print("同時掃描號碼布（本機辨識，相片不會傳出電腦）")

    workers = a.workers or auto_workers(bibs)
    if bibs and not a.workers and workers < max(1, (os.cpu_count() or 2) - 1):
        print(f"提示：電腦可用記憶體不多，只同時處理 {workers} 張（關閉 Chrome 等程式可加快）")
    t0, every = time.time(), 10 if bibs else 25
    state = {"done": 0, "bytes": 0}

    def run(batch, n):
        """回傳未能處理的 [(key, f, name, 錯誤)]"""
        bad = []
        with ProcessPoolExecutor(max(1, n)) as ex:
            futs = {ex.submit(prep_one, str(f), str(out / name), a.size, a.quality, bibs, a.max_bib): (key, f, name) for key, f, name in batch}
            for fut in as_completed(futs):
                key, f, name = futs[fut]
                try:
                    r = fut.result()
                    man[key] = {"out": name, **r}
                    state["bytes"] += r["bytes"]
                    state["done"] += 1
                except Exception as e:   # 壞檔、格式不支援、記憶體不足：記下，其餘照做
                    msg = [s for s in str(e).strip().splitlines() if s.strip()]
                    bad.append((key, f, name, (msg[-1] if msg else type(e).__name__)[:120]))
                d = state["done"] + len(bad)
                if d % every == 0 or d == len(batch):
                    rate = max(state["done"], 1) / max(time.time() - t0, 1e-6)
                    print(f"  {d}／{len(batch)}（每秒 {rate:.1f} 張，尚餘約 {(len(batch) - d) / rate / 60:.1f} 分鐘）", flush=True)
                    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=0), encoding="utf-8")
        return bad

    bad = run(jobs, workers)
    if bad:   # 重試一次（逐張處理）：記憶體不足、子程序中斷等臨時問題通常會過；真正的壞檔會再失敗
        print(f"重試 {len(bad)} 張未能處理的相片（逐張處理）……", flush=True)
        state["done"] = 0
        bad = run([(k, f, n) for k, f, n, _ in bad], 1)
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=0), encoding="utf-8")
    fails = [(f.name, e) for _, f, _, e in bad]

    ok = len(jobs) - len(fails)
    secs = time.time() - t0
    print(f"完成：{ok} 張，用時 {secs:.0f} 秒" + (f"，平均每張 {state['bytes'] / ok / 1024:.0f}KB" if ok else ""))
    if bibs and ok:
        got = [man[k]["ocr"] for k, _, _ in jobs if "ocr" in man.get(k, {})]
        n1 = sum(1 for g in got if g)
        print(f"號碼布：{n1} 張讀到數字，{len(got) - n1} 張讀不到（上載後要人手看）")
    for n, e in fails:
        print(f"  未能處理：{n}（{e}）")
    print(f"下一步：在上載頁按「揀相片」，揀 {out} 內全部 .webp")
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
