# 澳門學界越野跑成績（非官方）

手機優先的靜態網站，整理教育及青年發展局公布的學界越野跑比賽成績。第一期收錄第 38–47 屆（2016/17–2025/26）。

## 結構

| 路徑 | 用途 |
|---|---|
| `scripts/sources.json` | 各屆官方檔案 id（新增一屆在此加一行） |
| `scripts/fetch.py` | 下載官方 xls／PDF 到指定資料夾（原始檔不入 repo） |
| `scripts/parse.py` | 解析 xls／PDF → `docs/data/results.json` |
| `scripts/enrich.py` | 統一校名、跨年同一人配對，輸出存疑清單 `review_persons.csv`（不入 repo） |
| `scripts/check.py` | 內部完整性檢查（人數、名次、時間、團體冠軍重算） |
| `scripts/preview.py` | 第 48 屆參賽名單配對往績 → `docs/data/preview48.json`（名單本身在 `private/`，不入 repo） |
| `scripts/redactions.json` | 應要求隱藏的學生編號 |
| `docs/data/race48.json` | 第 48 屆賽程、距離（秩序冊／章程）、各校人數 |
| `docs/data/crests.json` | 真校徽圖片對照（代碼 → `img/crest/…`），未登記者自動生成盾形徽章 |
| `docs/data/site.json` | 網站設定（移除申請渠道） |
| `scripts/forecast.py` | 第 48 屆比賽當日天氣預測（地球物理氣象局七天天氣預報 XML）→ `docs/data/forecast48.json`；比賽日不在七天內時輸出 `available: false` |
| `scripts/weather.py` | 歷屆比賽當日天氣（澳門國際機場 METAR，經 Ogimet）→ `docs/data/weather.json`；比賽日期及其來源寫在腳本內 |
| `docs/` | 網站本體（GitHub Pages 發布此資料夾） |

## 更新資料

```powershell
python -P -X utf8 scripts/fetch.py <暫存資料夾>
python -P -X utf8 scripts/parse.py <暫存資料夾> docs/data/results.json
python -P -X utf8 scripts/enrich.py docs/data/results.json review_persons.csv
python -P -X utf8 scripts/check.py docs/data/results.json
python -P -X utf8 scripts/preview.py docs/data/results.json docs/data/race48.json private/startlist48.csv docs/data/preview48.json private/preview48_review.csv
python -P -X utf8 scripts/predict.py docs/data/results.json docs/data/preview48.json   # 預測排名＋回測（須在 preview.py 之後）
python -P -X utf8 scripts/weather.py docs/data/weather.json   # 新增一屆時先在 RACES 加入比賽日期
python -P -X utf8 scripts/forecast.py docs/data/race48.json docs/data/forecast48.json   # 比賽前每日重跑一次再 push（預報每日更新；瀏覽器不能直接讀氣象局 XML）
```

學生編號（pid）固定為「第一次出賽的屆數＋組別＋名次」（如 `p47MB002`），重建資料不會改變，連結與隱藏清單長期有效。

需要：`pip install xlrd pdfplumber`

## 自動測試

```powershell
python -P -X utf8 -m pytest tests/
```

- `tests/test_data.py`：結構、名次、時間、團體冠軍按章程重算、已知值、跨年配對合理性
- `tests/test_ui.py`：Playwright＋本機 Chrome，手機 375×812，逐頁功能、無橫向捲動、觸控尺寸、語言切換
- 設 `XC_RAW=<原始檔資料夾>` 會再逐筆核對官方 xls／PDF（共 78 項）

需要：`pip install pytest playwright`

## 設計規則

- 深色底＋品牌綠（`--accent`）只用於操作及選取；金銀銅只表示名次；藍／粉只表示男子／女子組
- 圓角：容器 16px、小方塊 12px、可按的膠囊及圓鈕全圓
- 圖表配色已用 dataviz 驗證器在深色底驗證（`--series-1/2/3`）
- 介面不使用長破折號；數字用 Barlow Condensed，其餘用系統中文字體
- 介面文字一律用書面語（不用口語，如「搵」「冇」「一次過」「爆冷」）；範圍用「至」，不用破折號

## 本機預覽

```powershell
python -m http.server 8765 --directory docs
```

## 換卡片相片

首頁資訊卡目前用 CSS 圖形底紋。取得授權相片後，放入 `docs/img/`，在 `styles.css` 對應卡片加 `--photo: url(img/xxx.jpg);` 即可。

## 私隱

網站設 `noindex` 及 `robots.txt` 禁止搜尋引擎收錄，頁尾有非官方聲明及移除申請連結。

第 48 屆賽前預覽（學校名單）及即時成績按大會秩序冊顯示參賽者姓名、學校及分組（`xc_live_roster_public`，不含號碼布）；私隱頁文字已按此說明。

## 熱門人氣（Supabase）

- 資料庫結構：`supabase/001_xc_views.sql`（`xc_pids` 學生名單、`xc_views` 瀏覽次數、`xc_hit()` 唯一寫入函數，每次 +1、只接受名單內編號；公眾只可讀）
- 學生名單：`supabase/002_seed_pids.sql`（由 results.json 產生；新增屆數後重新產生並執行）
- 網站設定：`docs/data/site.json` 的 `views = { url, key }`（key 為公開的 publishable key，可放在前端）；未設定時網站自動用「示範模式」只計本機
- 只存學生編號及次數，不記錄瀏覽者身份

## 即時成績（第 48 屆起）

- **分段計時**：終點每記一次同一號碼＝完成一圈，記滿該組圈數（`race48.json` 的 `laps`：男A 5、男B 4、女A 4、女B 3、男C 2、女C 2）即完賽；相隔少於該組最快一圈一半視為重複（多部裝置同時記錄亦只計一次）
- 公眾頁：`#/live`（正式）、`#/live?ev=test`（演練）、`#/live?demo=47`（以第 47 屆成績合成多圈資料本機示範重播；2026-11-23 起網站不再提供入口，只供內部測試）；個人即時排名（顯示姓名、圈數，按一下看各圈用時）＋團體即時排名（途中按跑位推算，標「暫計」）
- 工作人員頁：`live-admin.html`（不在網站任何位置連結；須登入）：只需輸入號碼尾數；第一圈輸入號碼後，在「跑道上」清單按一下即記一圈（按預計到達排序，可鎖定）；「撤銷上一下」；「先記時間」稍後補號碼；看不到號碼可按學校記完賽
- 公眾頁畫面：個人即時排名（預設）／團體即時排名分開切換；分組組別可選第 1、2、3 組或全組合併（未指定時按最新進度）；「更新」按鈕立即重新下載；名次變動以 ▲／▼ 及移位動畫顯示約 6 秒
- 團體即時排名：按學校展開出戰名單（按分組列出各隊員狀態）及奪冠條件（`live-core.js` 的 `titleRace`：只以已到達終點者的名次計算「已鎖定團體冠軍」「已無法奪得團體冠軍」或「餘下 N 名計分隊員名次總和須不多於 X」；分組未全部完成時不判斷鎖定／出局）
- 出戰名單：`supabase/006_roster_public.sql` 的 `xc_live_roster_public()`（姓名、學校、分組，不含號碼布）；賽前預覽「學校名單」分頁亦使用；未能載入時只列出有往績者
- 練習模式：`live-admin.html?practice=1`（不需登入、不連資料庫，以第 47 屆成績模擬經過終點的號碼，可選 1／2／4 倍速，即時顯示漏記／多記）
- 資料庫：`supabase/004_live.sql`＋`supabase/005_live_laps.sql`（姓名、完賽標記、公眾 feed 以號碼布雜湊歸類各圈）（`xc_live_heats` 起跑時間／狀態、`xc_live_entries` 終點紀錄、`xc_live_roster` 號碼布對照、`xc_live_admins` 授權電郵）
  - 只有 `xc_live_admins` 內的電郵可讀寫；公眾只能經 `xc_live_feed()` 取得**不含號碼布**的增量資料
  - 號碼布對照含秩序冊姓名（只限工作人員讀取）；公眾頁顯示姓名，但不公開號碼布；`scripts/redactions.json` 內應要求隱藏者不輸出姓名
- 計分：`docs/live-core.js`（章程 5.6–5.12；以第 44–47 屆官方團體冠軍驗證 36/36 一致，`tests/test_live_core.py` 以 node 自動核對）
- 號碼布名單（第 48 屆已匯入 690 人）：號碼由秩序冊第 7–34 頁抄錄至 `private/bibs48.txt`（按學校編配 1–690，女子先、男子後；已核對號碼唯一、各校連續、與逐格 OCR 比對），合併為 `private/startlist48_bib.csv` → `python -P -X utf8 scripts/live_roster.py private/startlist48_bib.csv private/preview48_review.csv private/live_roster48.sql 48` → 在 Supabase 執行輸出的 SQL
- 分組出發：男C 分 C1–C3、女C 分 C1–C2（中學組）；各組時間合併定名次，個人另顯示分組名次；每完成一組更新，全部分組完成前團體分標「暫計」
- 點名／缺席：計時頁「點名」按鈕（有缺席時顯示「缺席 N」）。預設「點名（按有到）」：按有到的號碼，點完按「點名完成」，未點名者一次過標記缺席（可「取消點名完成」；點名進度存於本裝置，重新整理不遺失；已有經過紀錄者自動當有到）。另可切換「按缺席」直接按沒有到的號碼。名單可按「秩序冊次序」（一行一人，須執行 `010_roster_seq.sql` 並寫入次序）或「按學校」排列。按缺席模式下：本組名單按號碼標記沒有起跑者（再按取消，可撤銷；已有經過紀錄者不能標記；其後記錄該號碼經過會詢問並取消缺席）。資料存於 `xc_live_entries` 的 `dns` 欄（`supabase/009_live_dns.sql`，**須先執行才可使用**；未執行時缺席標記會被拒並提示，不影響其他紀錄上傳）
- 不能計分的隊員（`live-core.js` 的 `notScoring`）：標記缺席；或該分組已過達標時間／已完成而沒有任何經過紀錄。學校扣除後不足計分人數即顯示「N 人缺席或未能完成，人數不足，不計分」、不再計算奪冠形勢；出戰名單顯示「缺席」或「已過達標時間，未有紀錄」
- 新增工作人員：在 Supabase Authentication 建立帳戶（勾選 Auto Confirm），再執行 `insert into public.xc_live_admins(email) values ('電郵小寫');`

## 運動員榮譽卡

- 運動員頁「匯出榮譽卡」：`docs/card.js` 以 Canvas 即時繪製 1080×1350（4:5）PNG，版面依示範圖（`陳曉晴_榮譽卡.png.jpg`，不入 repo）
- 三個版本：冠軍（金框＋皇冠）、獎牌（銀／銅框）、參賽紀念（綠框，標題「歷屆成績」）
- QR 碼連去該運動員頁面（`qrcode-generator@1.4.4`，按下匯出時才載入；載入失敗則不畫 QR 碼）
- 只用已公開資料；檔名「姓名_榮譽卡.png」；手機支援「分享」存入相簿

## 賽前預覽補充（第 48 屆）

- 首頁宣傳海報：每次進入首頁彈出（`showPromo`），按海報進入賽前預覽；右上角關閉按鈕 3 秒後才可按；比賽日之後不再顯示。測試以 `window.XC_NO_PROMO = true` 關閉
- 資訊卡次序：比賽日（含天氣預測一行）→ 時間表 → 各組冠軍預測 → 人氣運動員 → 新晉焦點
- 男C／女C：往績、預測、資訊卡以 `C1`–`C3` 標示分組
- 學校名單按預測團體名次排列：每校取預測名次最前的 n 人（A、B 組 5 人，C、D、E 組 4 人）相加；未能預測的隊員當作排在全部已預測者之後；不足 n 人者排最後
- 運動員頁「今屆出賽」按鈕（只限已配對往績者）：組別、分組、檢錄及起跑時間 → `#/preview?c=<組別>&me=<編號>`，頂部螢光提示卡（檢錄／起跑時間、分組說明、按身份挑選的打氣語，可「換一句」）及名單行螢光
- 時間表只有每組第 1 組的起跑時間；第 2 組起顯示「第 1 組出發後各組隨即順序起跑」
- 比賽當日天氣預測：賽前預覽、首頁比賽日卡、紀錄頁「歷屆比賽天氣」最頂一行；跑步影響按預報最高／最低氣溫及濕度平均值估算（算法同歷屆）

## 觀賽邀請卡及網站搬遷

- 比賽日提示卡（`#/preview?c=<組別>&me=<編號>`）有「匯出邀請卡」：`card.js` 的 `XCCard.invite` 繪製 1080×1350 PNG，內容為姓名、學校、組別／分組、圈數及距離、日期、地點、檢錄及起跑時間，QR 碼連到該組賽前預覽；背景為校徽斜向平鋪圖案，主色及強調色由校徽像素即時取色（黃色主色改作強調色）
- 榮譽卡及邀請卡上的網址、QR 碼跟隨目前網址（`siteUrl()`），網站搬到其他 GitHub 帳戶或自訂網域後無須改程式；本機測試時用預設網址
- 校徽白底內距改按校徽尺寸計算（原本用百分比，放在闊容器內會把校徽壓成空白）

## 榮譽卡款式（四款）

- 匯出視窗頂部可選：衝線（預設）、山徑、號碼布（`docs/card-styles.js`，`XCCardStyles.dash／trail／bib`）及經典（`docs/card.js`）；選擇記在瀏覽器（`xc-card-style`）
- 四款共用 `cardData` 資料；QR 碼四邊留 4 格白邊（標準靜區）
- 衝線款用 Barlow Condensed 斜體（`index.html` 字體連結已加 `ital` 800）

## 發布位置（2026-11-23 起）

- 主網址：https://xc-escolar-macau.github.io/（repo `xc-escolar-macau/xc-escolar-macau.github.io`，GitHub Pages：branch `main`、資料夾 `/docs`）
- 舊網址繼續同步：https://kongchilok.github.io/macau-xc-results/
- `git push origin main` 會同時推送兩個 repo（origin 設有兩個 push 網址）；新 repo 由 kongchilok 以協作者身份推送
- 即時成績及計時頁兩個網址都可用，資料同一個 Supabase；計時頁登入狀態按網址分開記住，比賽日固定用主網址，事前登入

## 完賽紀念卡（第 48 屆，非官方）

- 公眾頁 `#/cert`（測試：`#/cert?ev=test`）：輸入號碼布＋秩序冊姓名，兩者都對得上才顯示組別、名次、完賽人數、完成時間，並可匯出紀念卡（衝線、山徑、號碼布、經典四款，與榮譽卡同一設計，只含今屆成績，卡上加賽事資料一塊）
- 入口：賽前預覽「即時成績」旁、即時成績頁說明下方
- 開放方式：計時頁每個組別全部分組「本組完成」後，出現「核對後開放紀念卡」；工作人員與官方成績核對無誤後按「已核對，開放」，系統把當時的名次及時間快照寫入 `xc_live_cert`；之後如修正紀錄，再按「按目前紀錄更新」；亦可「取消開放」
- 資料庫：`supabase/007_live_cert.sql`（`xc_live_cert` 只限管理員；`xc_live_cert_lookup` 號碼布＋姓名查詢，不能單憑號碼布查出姓名；`xc_live_cert_cats` 已開放組別）
- 卡上資料來源寫「終點紀錄（已與官方成績核對）」，並註明非官方


## 比賽相片（第 48 屆起，非官方）

- 工作人員頁 `photo-admin.html`（不在網站任何位置連結；與終點輸入同一套帳戶）：一次揀多張相片 → 手機內壓縮成長邊 1600px 大圖＋400px 縮圖（WebP，Safari 不支援時改 JPEG；重新編碼後不含任何 EXIF／GPS）→ 上載 → Edge Function 辨識號碼布；壓縮後的檔案先存於本機 IndexedDB 佇列，斷網或重新整理都不會遺失
- 自動公開條件（`supabase/008_photos.sql` 的 `xc_photo_judge`）：讀出至少一個號碼布、全部在秩序冊內、AI 沒有標示不確定、拍攝時間（EXIF）該組在跑道上——優先用計時系統 `xc_live_heats` 的實際起跑時間（起跑前 15 分鐘至本組最後一筆終點紀錄後 10 分鐘），沒有起跑紀錄的組別用 `xc_photo_windows`（按時間表估算，另加 30 分鐘寬限）；其餘留在「待覆核」，改正號碼布後「批准公開」或「移除」（刪除檔案）
- 公眾頁 `#/photos`（測試：`#/photos?ev=test`）：號碼布＋秩序冊姓名兩者對得上才回傳該號碼布的已公開相片（`xc_photo_lookup`，不回傳同框其他人的號碼布）；可下載、分享、申請移除（顯示相片編號）；入口：賽前預覽、即時成績、完賽紀念卡結果
- 免費方案（現行）：電腦先以 `scripts/photo_prep.py` 壓縮及掃描號碼布，再上載；`docs/data/site.json` 的 `photo_auto: true` 時，清楚的三位數號碼經名單及拍攝時段核對（`xc_photo_hints`）後自動公開，演練（event test）只核對名單；其餘留在「待覆核」
- 略過重複上載：比對拍攝時間、原檔大小及原檔名（部分相機不記秒以下時間，連拍相片的時間及大小相同）
- 保留期：2027-08-31 之後公眾查詢不再回傳相片（資料庫及網頁兩邊都有日期），屆時刪除 bucket `xc-photos` 內的檔案
- Edge Function：`supabase/functions/xc-photo-bibs/`（以呼叫者的登入身份讀寫，不用 service role）；Gemini 金鑰只存 Supabase secrets `GEMINI_API_KEY`，型號可用 `GEMINI_MODEL` 改；配額用完（429）時上載頁按建議時間自動重試
- 部署：在 Supabase 執行 `008_photos.sql` → `supabase functions deploy xc-photo-bibs` → 後台 Edge Functions secrets 加入 `GEMINI_API_KEY`
- 測試：`tests/test_photos.py`（壓縮尺寸、去除 EXIF、拍攝時間、配額重試、斷網續傳、覆核、移除、公眾查詢）
