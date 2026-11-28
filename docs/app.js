/* 澳門學界越野跑成績：單頁應用（首頁／排行榜／個人檔案／紀錄與趨勢） */
(() => {
  "use strict";

  const I18N = {
    zh: {
      brand: "澳門學界越野跑", searchPh: "搜尋運動員、葡文拼音或學校", navHome: "首頁", navRank: "歷屆成績", navAthletes: "運動員", navRecords: "紀錄與趨勢",
      disclaimer: "本網站為非官方整理，資料來自教育及青年發展局「學界比賽」網頁公布的成績，如有出入，以官方公布為準。",
      source: "官方資料來源", removal: "申請移除個人資料",
      male: "男子", female: "女子", group: "組", secondary: "中學", primary: "小學",
      edition: (n) => `第${n}屆`, latestChamps: (y, n) => `${y}學年第${n}屆學界越野跑各組冠軍`, medalTitle: "學校團體冠軍榜",
      medalNote: (a, b) => `只計算團體冠軍，統計期間為 ${a} 至 ${b}`, fastest: "近十年最快成績", fastestNote: "各屆賽道距離或有不同，成績未按距離調整。",
      streak: "團體冠軍連續衛冕", streakNote: "由最新一屆起向前計算連續奪得團體冠軍的屆數", kings: "個人冠軍次數最多",
      kingsNote: "近十年個人賽奪冠次數", times: "次", years: "連冠", quick: "最新一屆成績", quickAll: "全部成績",
      individual: "個人賽", team: "團體賽", top10: "該屆官方只公布每組前十名。", runners: (n) => `${n} 人完成賽事`,
      teamChamps: "各組團體冠軍", noTeam: "參賽隊伍不足，未設團體獎", medalAll: "團體冠軍總數（近十年）",
      secShort: "中學", priShort: "小學", total: "合計",
      noResult: "沒有符合的運動員或學校", races: "參賽次數", best: "最佳名次", wins: "冠軍次數",
      history: "歷屆成績", rankTrend: "名次變化", schoolLbl: "學校", wipTitle: "紀錄與趨勢", wipText: "本頁尚在開發：待補齊各屆章程所列的比賽距離後，將提供各組歷屆紀錄及冠軍成績趨勢。",
      season: "學年", lowerFaster: "縱軸已倒置：位置愈高代表成績愈快；成績未按距離調整", tableView: "以表格顯示",
      distBanner: (k, d, r) => `${d ? `第 48 屆本組距離：秩序冊為 ${d.toLocaleString()} 米，章程${r ? "為 " + r.toLocaleString() + " 米" : "未有列明"}${r && r !== d ? "（兩者不一致，以秩序冊為準）" : ""}。` : ""}${k ? `已知 ${k} 屆的比賽距離，其餘從缺。` : "過往各屆距離未有資料，"}以下紀錄及趨勢未按距離調整。`,
      distSched: "秩序冊", distRules: "章程", distDiffer: "兩者不一致，以比賽當日秩序冊為準", distSame: "兩者一致",
      recordTitle: (c) => `${c} · 近十年最快成績`, trendTitle: "冠軍及第十名成績走勢", champTime: "冠軍", tenthTime: "第十名",
      top10Title: "近十年最快十名", finTitle: "完成人數", finNote: "第 38 至 43 屆官方只公布每組前十名，故未有完整人數。", teamHist: "歷屆團體冠軍", streakNow: (n) => `現已連續 ${n} 屆奪冠`,
      rangeSub: (a, b) => `${a} 至 ${b}`, asOf: (n) => `截至第${n}屆`, skip: "跳至主要內容", searchLabel: "搜尋運動員或學校", navLabel: "主選單",
      langAria: "Switch to English", loadFail: "資料載入失敗", loadFailText: "請檢查網絡連線後再試。", retry: "重新載入",
      pvTitle: (n) => `第${n}屆賽前預覽`, pvBanner: (n) => `第${n}屆學界越野跑比賽`, pvWhen: (d, t, v) => `${d} ${t} · ${v}`,
      pvDays: (n) => n > 1 ? `距離比賽尚有 ${n} 日` : n === 1 ? "明日舉行" : n === 0 ? "今日舉行" : "比賽已結束，成績有待公布", pvGo: "賽前預覽",
      fcTitle: "比賽當日天氣預測", fcPub: (s) => `地球物理氣象局七天天氣預報（${s} 發布）`, fcWind: "風力", fcSky: "天氣", fcRow: "預測", fcShort: (a, b) => `天氣預測 ${a}–${b}°C`,
      fcNote: "預報每日更新，比賽前會再核對；跑步影響按預報最高及最低氣溫、濕度的平均值粗略估算，算法與歷屆比賽天氣相同。",
      meTag: (n) => `第 ${n} 屆出賽`, meHeat: (h) => `第 ${h} 組`, meCall: "檢錄", meStart: "起跑", meStart1: "第 1 組起跑", meGo: "查看賽前預覽",
      meLater: (h) => `你在第 ${h} 組：第 1 組出發後，各組隨即順序起跑，請留意大會廣播。`, meMore: "換一句打氣", meHi: "比賽日提示",
      meCheers: {
        defend: ["衛冕之戰，捍衛榮耀！", "冠軍再臨，全場都在看你！", "保持節奏，終點線等你再次第一個衝過！"],
        top3: ["上屆登上頒獎台，今年再上一層樓！", "頒獎台記得你，今年再來！", "目標更高，衝刺更快！"],
        up: ["升組新挑戰，用實力說話！", "新組別、新起點，跑出你的節奏！", "升組第一戰，勇敢迎戰更強的對手！"],
        back: ["重返賽道，跑出更強的自己！", "再次出發，每一步都比以前更穩！"],
        top10: ["預測前十，全力爭取獎牌！", "獎牌就在前方，堅持到最後一步！"],
        close: ["實力接近，最後一段決勝負！", "旗鼓相當，誰撐得住誰就贏！"],
        all: ["加油！每一步都算數！", "穩住呼吸，享受比賽！", "上斜不放棄，落斜放開跑！", "為學校、為自己，全力以赴！", "跑出最好的自己！", "最後 200 米，咬緊牙關衝線！", "起步別太急，後段才發力！", "全校都在終點為你打氣！"],
      },
      prTag: "賽前預覽", prCta: "查看預測、時間表及學校名單", prClose: "關閉", prWait: (n) => `${n} 秒後可關閉`, prDays: "日", prToGo: "倒數",
      pvCall: "檢錄", pvStart: "起跑", pvDist: "距離", pvRunners: "參賽人數", pvHeats: (n) => n > 1 ? `分 ${n} 組起跑` : "全組同時起跑",
      pvKnown: (k, n) => `共 ${n} 人參賽，其中 ${k} 人有往績`, pvNew: (n) => `另有 ${n} 人未有公開往績（首次參賽或未能確認身份），不予列出。`,
      pvSame: "上屆同組參賽", pvUp: "今屆升組", pvOlder: "較早屆別往績", pvLast: "上屆", pvBest: "最佳",
      pvDefend: "衛冕者", pvTop3: "上屆前三名", pvUpTag: (c) => `由${c}升組`, pvHeat: (h) => `第 ${h} 組`,
      pvNote: "按往績排列，並非賽果預測；只列出曾於官方成績出現的參賽者。",
      pvNone: "本組參賽者均未有公開往績。", dateFmt: (d) => `${d.getMonth() + 1}月${d.getDate()}日（星期${"日一二三四五六"[d.getDay()]}）`,
      prevSchool: "上屆代表學校：",
      st_active: "在讀・今屆參賽", st_unsure: "未能確認", st_grad: "已畢業", st_gradEst: "推斷已畢業", st_idle: "推斷在讀",
      stEntered: (n) => `已報名第${n}屆`, stAYear: (n) => `A組第${n}年`, stLast: "最後參賽", stOver4: "A 組參賽已逾 4 年，請核對",
      stUnsureWhy: "今屆名單有同名參賽者，未能確認是否同一人",
      stHow: "在讀及畢業狀態按第 48 屆參賽名單推斷：A 組最多參賽 4 年，今屆 A 組名單未見其姓名者視為已畢業；其他組別按年齡組別推算。",
      hiddenName: "（應要求隱藏）", hiddenText: "此運動員的資料已應要求隱藏。",
      pvyTitle: "私隱及資料使用", pvyApply: "填寫申請表", pvyPending: "申請渠道正在設立。如需移除或更正資料，請先聯絡所屬學校的體育老師代為轉達。",
      pvySrcH: "資料來源", pvySrc: "本網站的歷屆成績均整理自教育及青年發展局「學界比賽」網頁公開發布的越野跑成績，屬非官方整理，如有出入，以官方公布為準。第 48 屆預測另參考澳門中華學生聯合總會公開的「全澳學生環山跑比賽」獲獎名單（前十名）。比賽當日天氣取自澳門國際機場氣象站的航空天氣報告。",
      pvyShowH: "顯示的資料", pvyShow: "只顯示官方已公開的資料，包括姓名（中文及葡文拼音）、學校、組別、名次及成績。第 48 屆賽前預覽及即時成績按大會秩序冊列出參賽者的姓名、學校及分組，預測另參考公開的環山跑成績；運動員頁面的瀏覽次數只用於人氣排名，不會記錄瀏覽者身份。",
      pvyNoH: "不顯示的資料", pvyNo: "不顯示號碼布號碼、出生日期、聯絡方式或任何未經官方公布的個人資料。本網站亦已設定不被搜尋引擎收錄。",
      pvyStatusH: "在讀及畢業標示",
      pvyRemoveH: "申請移除或更正", pvyRemove: (d) => `運動員本人、家長或學校老師均可申請隱藏姓名或更正錯誤資料，本網站會於收到申請後 ${d} 日內處理。`,
      pvyStep1: "請提供運動員姓名、學校、參賽年份及組別，以便查找相關紀錄。", pvyStep2: "選擇「隱藏姓名」或「更正資料」，並留下聯絡方式以便回覆（毋須提交身份證明文件）。",
      pvyStep3: "處理完成後，該運動員所有成績的姓名均顯示為「應要求隱藏」，名次及成績保留，其他運動員的排名不受影響。",
      pvyNote: "註：隱藏只適用於本網站，官方網頁公布的成績不受影響。",
      privacyLink: "私隱及移除申請",
      pdPast: "往績", pdPred: "預測", pdHead: (k, n) => `共 ${n} 人參賽，其中 ${k} 人可作推算`, pdTop: "預測首名", pdClose: "實力相若",
      pdNone: "本組未有足夠往績作推算。", pdAecm: (r, tm) => `環山跑第${r}名（${tm}）`, pdNewbie: "首次參加學界賽", pdNoForm: "未有近期成績", pdNoHist: "未有學界往績",
      pdNoteAecm: (n, w, d) => `已納入一星期前「${n}」的近期成績（佔 ${w}%）：${d}。該賽事的距離及路面與學界越野跑不同，只作參考；於該賽事躋身前十名而首次參加學界賽的運動員，亦一併推算。`,
      pdNoteHK: "注意：傳統強校濠江中學大部分組別未有參加該賽事，其運動員只按往績推算，未有近期成績可供參考，實力不容忽視。", pdNoteTitle: "以下為推算預測，並非賽果。",
      pdNote1: (c) => `按各人歷屆「成績與該場冠軍的比例」計算實力指數，並計及同組第二年平均進步約 2.5%、升組首年平均退步約 3.9% 的趨勢；預測差距少於 ${c}% 的運動員標示為「實力相若」，名次互換的機會約為一半。`,
      pdNote2: (r, h) => `以第 46、47 屆回測：預測與實際名次的相關係數為 ${r}，前三名命中 ${h}。`,
      pdNote3: (n) => `另有 ${n} 人因往績不足或欠缺近期成績（首次參賽、往績過舊或轉換組別）而未列入推算，賽果仍可能出現意外。`,
      popTab: "人氣", popLive: "實時", popDemo: "示範模式", popViews: " 次瀏覽", popNext: (n, l) => `尚差 ${n} 次瀏覽升至 Lv.${l}`, popMax: "已達最高等級",
      popDemoNote: "示範模式：目前只計算本裝置的瀏覽次數。正式啟用資料庫後，將累計全站瀏覽次數並實時更新。",
      popRule: "每次進入運動員頁面累計 1 次瀏覽（同一裝置 60 秒內重複進入不另計算），排名每 15 秒自動更新。瀏覽次數愈多，等級愈高，依次為銅級、銀級、金級、白金級及鑽石級。",
      popEmpty: "暫未有瀏覽紀錄。進入任何運動員頁面即開始累計人氣。", popFail: "暫時未能讀取人氣數據，請稍後再試。", popUpdated: (s) => `更新於 ${s}`,
      tier_bronze: "銅級", tier_silver: "銀級", tier_gold: "金級", tier_plat: "白金級", tier_diamond: "鑽石級",
      pvTitleZh: "第四十八屆學界越野跑比賽", pvTitlePt: "48° Campeonato Escolar de Corta-Mato",
      hcTitle: "比賽日", hcRunners: "運動員", hcSchools: "學校", hcCats: "組別", hcChamps: "各組冠軍預測", hcChampsSub: "按往績及近期成績推算，點選可查看該組預測",
      hcPredNote: "推算結果並非賽果，僅供參考。", hcPopular: "人氣運動員", hcHorse: "新晉焦點", hcHorseSub: "一星期前環山跑前三名、未有學界往績的運動員",
      hcSched: "比賽時間表", hcSchedSub: "按起跑時間排列",
      pdAecmShort: (r) => `環山跑第${r}名`, pvRunnersUnit: " 人",
      back: "返回", notFound: "找不到此頁面", placeShort: (n) => `第${n}名`, searchSchool: "學校",
      more: "查看全部", seeRecords: "本組紀錄與趨勢", seeRank: "查看該屆成績", seeSchool: "查看學校資料",
      athTitle: "運動員名錄", athTabPeople: "運動員", athTabSchools: "學校", athAll: "全部", athActive: "今屆參賽", athChamp: "曾獲冠軍", athPodium: "曾入前三名",
      athCount: (n) => `共 ${n} 名運動員`, athMore: (n) => `顯示更多（尚有 ${n} 名）`, athAllSchools: "所有學校", athSortNote: "按冠軍次數、獎牌數目及最佳名次排列。",
      athWins: (n) => `冠軍 ${n} 次`, athMedals: (n) => `獎牌 ${n} 面`, athBest: (n) => `最佳第${n}名`, athNone: "沒有符合篩選條件的運動員。",
      schCount: (n) => `共 ${n} 間學校`, schTitles: "團體冠軍", schAthletes: "參賽運動員", schIndWins: "個人冠軍", schMedals: "個人獎牌",
      schTeamList: "團體冠軍紀錄", schMedalList: "個人獎牌得主（前三名）", schCurrent: (n) => `第${n}屆參賽運動員`, schRoster: "歷屆參賽運動員", schNoTitle: "近十年未有團體冠軍。", schNoMedal: "近十年未有個人獎牌。", schSortNote: "按團體冠軍數目及參賽人數排列。",
      schFormer: "舊校名：", schViewRank: "查看團體賽成績",
      wxTitle: "比賽當日天氣", wxTemp: "氣溫", wxRh: "相對濕度", wxWind: "風速", wxRainY: "有雨", wxRainN: "無雨", wxImpact: "估計影響",
      wxSlow: (a, b) => b === 0 ? "幾乎無影響" : `約慢 ${a}% 至 ${b}%`, wx_good: "有利", wx_mild: "略受影響", wx_hard: "受影響", wx_severe: "明顯受影響",
      wxPlanned: "日期按《學校運作指南》的計劃舉行日期推定", wxPlannedFoot: "＊日期按《學校運作指南》的計劃舉行日期推定，未能以賽後報道核實。", wxDE: "D、E 組延期補賽", wxABC: "D、E 組因天雨延期",
      wxNote: "天氣資料取自澳門國際機場氣象站每半小時發布的航空天氣報告（METAR）。氣象站位於氹仔，與松山相距約 5 公里，數值只供比較各屆比賽條件之用。估計影響按長跑常用的「氣溫＋露點」配速調整經驗表推算，氣溫及濕度愈高，成績一般愈慢。",
      wxRecTitle: "歷屆比賽天氣", wxRecSub: "比較各屆成績時，可參考當日氣溫及濕度", wxDate: "比賽日期", wxShort: (t, h) => `約 ${t}°C · 濕度 ${h}%`,
      wxDayFmt: (s) => { const [y, m, d] = s.split("-").map(Number); return `${y}年${m}月${d}日`; },
      lvTitle: (n) => `第${n}屆即時成績`, lvGo: "即時成績", lvLive: "直播中", lvDemo: "示範重播", lvNote: "非官方即時紀錄：由工作人員於終點人手輸入，或有錯漏；名次及成績以教育及青年發展局公布為準。",
      lvDemoNote: (n) => `示範重播：以第${n}屆的官方成績模擬即時更新，並非今屆賽果。`, lvWait: "比賽尚未開始，開賽後本頁會自動更新。", lvReady: "未開始", lvRunning: "進行中", lvDone: "已完成",
      lvElapsed: "比賽用時", lvCutoff: "距達標時間", lvCutoffOver: "已到達標時間", lvHeat: (h, n) => `第 ${h} 組（共 ${n} 組）`,
      lvTeam: "團體即時排名", lvInd: "個人即時排名", lvFin: (k, c) => c ? `${k} 人完賽 · ${c} 人在賽道上` : `${k} 人完賽`,
      lvLaps: (n, l) => `${n}／${l} 圈`, lvLapN: (i) => `第 ${i} 圈`, lvFinish: "完賽", lvDnf: "未完成", lvTotal: "累計", lvProfile: "運動員頁", lvTapHint: "按一下可看各圈用時。", lvCourse: (l) => `全程 ${l} 圈`, lvNoAward: "本組參賽隊伍不足兩隊，不設團體獎。",
      lvScore: "分數", lvProv: "暫計", lvComplete: "已齊", lvMissing: (k) => `尚欠 ${k} 人`, lvOut: "人數不足，不計分", lvUnknown: "號碼待確認", lvRunner: "運動員",
      lvRule: (a, c) => `計分方法：A、B 組取每校首 ${a} 名、C 組取每校首 ${c} 名的名次相加，分數最低者勝；同分時以首名隊員名次較前者為勝。比賽途中按目前跑位推算（完成圈數較多者在前，同圈數按經過終點次序），以「暫計」顯示；未有足夠隊員經過終點的隊伍，假設餘下隊員緊接目前最後一名之後。`,
      lvHeatsRule: (n) => `本組分 ${n} 組出發，按章程合併各組時間定名次（人手計時，或與官方晶片計時略有出入）。每完成一組即更新；全部分組完成前，名次及團體分只屬暫計。`,
      lvHeatsDone: (d, n) => `已完成 ${d}／${n} 組`, lvHeatPlace: (g, p) => `${g} 第 ${p} 名`,
      pdSchools: "學校名單", pvSchHead: (s, r) => `${s} 間學校 · ${r} 名運動員`, pvSchCount: (n) => `${n} 人`, pvTeamYes: "計團體成績", pvTeamNo: (n) => `不足 ${n} 人，不計團體成績`,
      pvFirstTime: "未有往績", pvMore: (n) => `另有 ${n} 名未有往績的隊員（完整名單載入後顯示）`, pvRosterFallback: "暫時未能載入完整出戰名單，現只列出有往績的運動員。", pvSchNote: "名單依據大會秩序冊；按學校可展開出戰隊員。",
      lvHeatTab: (h) => `第 ${h} 組`, lvAllHeats: "全組合併", lvOverall: (p) => `全組第 ${p} 名`, lvHeatNotStarted: "本分組尚未開始。",
      lvRefresh: "更新", lvMvUp: (n) => `名次上升 ${n} 位`, lvMvDown: (n) => `名次下跌 ${n} 位`,
      lvLocked: "已鎖定團體冠軍", lvNoTitle: "已無法奪得團體冠軍", lvChampion: "團體冠軍", lvLeadProv: "暫列第 1 名", lvBehind: (d) => `暫計落後第 1 名 ${d} 分`,
      lvNeed1: (p, s, v) => `餘下 1 名計分隊員須取得第 ${p} 名或更前，方可超越${s}（${v} 分）`,
      lvNeedN: (r, m, s, v) => `餘下 ${r} 名計分隊員名次總和須不多於 ${m}，方可超越${s}（${v} 分）`,
      lvTeamHint: "按學校可查看出戰名單及奪冠條件。奪冠條件以已到達終點者的名次計算。",
      lvRoster: "出戰名單", lvEntered: (n) => `報名 ${n} 人`, lvRosterErr: "暫時未能載入出戰名單。", lvSchoolPage: "學校資料",
      lvMemFin: (p, tm) => `第 ${p} 名 · ${tm}`, lvMemLap: (n, l, p) => `已完成 ${n}／${l} 圈 · 暫列第 ${p} 名`, lvMemNotStarted: "未起跑", lvMemNoPass: "未有經過終點紀錄", lvMemNoFin: "未有完賽紀錄", lvScorer: "計分",
      lvMemDns: "缺席", lvMemCutoff: "已過達標時間，未有紀錄", lvShort: (g) => `${g} 人缺席或未能完成，人數不足，不計分`,
      lvHeatGroup: (h, s) => `第 ${h} 組（${s}）`,
      lvUpdated: (s) => `更新於 ${s}`, lvOffline: "暫時未能連線，稍後自動重試。", lvTimeNote: "人手計時，只供參考",
      ctBtn: "完賽紀念卡", ctTitle: (n) => `第${n}屆完賽紀念卡`,
      ctNote: "非官方紀念卡：各組成績由工作人員按終點紀錄整理，並與官方成績核對後逐組開放；正式成績以教育及青年發展局公布為準。",
      ctOpen: "已開放：", ctWait: "比賽後，各組成績經核對後逐組開放。", ctBib: "號碼布", ctName: "姓名（秩序冊上的中文姓名；沒有中文姓名請輸入葡文姓名）",
      ctGo: "查詢", ctNone: "找不到紀錄：請檢查號碼布及姓名，或該組別尚未開放。", ctNet: "暫時未能連線，請稍後再試。", ctNeed: "請輸入號碼布及姓名。",
      ctCat: "組別", ctPlace: "名次", ctTime: "完成時間", ctOf: (n) => `完賽 ${n} 人`, ctExport: "匯出完賽紀念卡", ctHist: "查看歷屆成績",
      ctHeat: (h) => `第 ${h} 組`, ctPlaceV: (p) => `第 ${p} 名`,
      phBtn: "比賽相片", phTitle: (n) => `第${n}屆比賽相片`,
      phNote: "非官方相片，由網站管理員在比賽中拍攝。輸入號碼布及姓名，即可找到有你號碼布的相片並下載；相片號碼布由電腦辨識，可能有遺漏或錯誤。",
      phNeed: "請輸入號碼布及姓名。", phNone: "暫時未有你的相片：請檢查號碼布及姓名；比賽期間相片會陸續加入，可稍後按「更新」。",
      phCount: (n) => `找到 ${n} 張相片`, phOpen: (i, n) => `相片 ${i}／${n}`, phDl: "下載相片", phPrev: "上一張", phNext: "下一張",
      phRemove: "申請移除此相片", phCode: (c) => `相片編號 ${c}（申請移除時請填寫）`, phExpired: "相片保留至 2027 年 8 月 31 日，現已下架。",
      phKeep: "相片保留至 2027 年 8 月 31 日。", phFail: "未能載入相片，請稍後再試。",
      invBtn: "匯出邀請卡", csLabel: "榮譽卡款式", cs_dash: "衝線", cs_trail: "山徑", cs_bib: "號碼布", cs_classic: "經典", cardBtn: "匯出榮譽卡", cardSave: "下載圖片", cardShare: "分享", cardClose: "關閉", cardFail: "未能產生圖片，請稍後再試。",
      cardNote: "圖片只使用本網站已公開的成績資料。手機可按「分享」儲存至相簿或傳送給朋友。",
    },
    en: {
      brand: "Macau Schools XC", searchPh: "Search name, romanised name or school", navHome: "Home", navRank: "Results", navAthletes: "Athletes", navRecords: "Records",
      disclaimer: "Unofficial site. Results are compiled from the School Sports Competitions pages of the Education and Youth Development Bureau (DSEDJ); official publications prevail.",
      source: "Official source", removal: "Request removal",
      male: "Boys", female: "Girls", group: "", secondary: "Secondary", primary: "Primary",
      edition: (n) => `${n}th edition`, latestChamps: (y, n) => `${y} · ${n}th Inter-school Cross Country: category champions`, medalTitle: "School team titles",
      medalNote: (a, b) => `Team titles only, ${a} to ${b}`, fastest: "Fastest times, last 10 years", fastestNote: "Course distance may differ between years; times are not distance-adjusted.",
      streak: "Active team streaks", streakNote: "Consecutive team titles up to the latest edition", kings: "Most individual titles",
      kingsNote: "Individual wins in the last 10 years", times: "×", years: "in a row", quick: "Latest results", quickAll: "All results",
      individual: "Individual", team: "Teams", top10: "Only the top 10 per category were published this year.", runners: (n) => `${n} finishers`,
      teamChamps: "Team champions", noTeam: "Not awarded (too few teams)", medalAll: "Team titles (last 10 years)",
      secShort: "Sec", priShort: "Pri", total: "Total",
      noResult: "No matching student or school", races: "Races", best: "Best place", wins: "Wins",
      history: "Results by year", rankTrend: "Placing trend", schoolLbl: "School", wipTitle: "Records & trends", wipText: "Coming soon: category records and winning-time trends will be added once course distances for each year are confirmed.",
      season: "Season", lowerFaster: "Axis inverted: higher is faster; not distance-adjusted", tableView: "Table view",
      distBanner: (k, d, r) => `${d ? `Edition 48 distance for this category: ${d.toLocaleString()} m in the race schedule, ${r ? r.toLocaleString() + " m" : "not listed"} in the rules${r && r !== d ? " (they differ; the race schedule applies)" : ""}. ` : ""}${k ? `Known for ${k} past editions. ` : "Past distances are not available, so "}records and trends are not distance-adjusted.`,
      distSched: "Race schedule", distRules: "Rules", distDiffer: "They differ; the race-day schedule applies", distSame: "Both agree",
      recordTitle: (c) => `${c} · fastest in 10 years`, trendTitle: "Winning and 10th-place times", champTime: "Winner", tenthTime: "10th place",
      top10Title: "Ten fastest, last 10 years", finTitle: "Finishers", finNote: "Only the top 10 per category were published for editions 38 to 43, so totals are unavailable.", teamHist: "Team champions by year", streakNow: (n) => `${n} in a row`,
      rangeSub: (a, b) => `${a} to ${b}`, asOf: (n) => `Up to edition ${n}`, skip: "Skip to main content", searchLabel: "Search students or schools", navLabel: "Main menu",
      langAria: "切換至中文", loadFail: "Data failed to load", loadFailText: "Check your connection and try again.", retry: "Reload",
      pvTitle: (n) => `Edition ${n} preview`, pvBanner: (n) => `Edition ${n} Schools Cross-Country`, pvWhen: (d, t, v) => `${d} ${t} · ${v}`,
      pvDays: (n) => n > 1 ? `${n} days to go` : n === 1 ? "Tomorrow" : n === 0 ? "Race day" : "Race finished, results pending", pvGo: "Preview",
      fcTitle: "Race-day forecast", fcPub: (s) => `SMG 7-day forecast (issued ${s})`, fcWind: "Wind", fcSky: "Sky", fcRow: "Forecast", fcShort: (a, b) => `Forecast ${a}–${b}°C`,
      fcNote: "The forecast is updated daily and will be checked again before the race. The running effect is a rough estimate from the average of the forecast high and low, using the same method as past race-day weather.",
      meTag: (n) => `Racing in edition ${n}`, meHeat: (h) => `Heat ${h}`, meCall: "Call", meStart: "Start", meStart1: "Heat 1 start", meGo: "Open race preview",
      meLater: (h) => `You are in heat ${h}: heats start one after another once heat 1 is off. Listen for the announcements.`, meMore: "Another cheer", meHi: "Race-day reminder",
      meCheers: {
        defend: ["Defend the title!", "The champion is back. Everyone is watching!", "Hold your rhythm and cross the line first again!"],
        top3: ["Podium last year. Aim one step higher!", "The podium remembers you. Go again!", "Aim higher, finish faster!"],
        up: ["New category, new challenge. Let your legs do the talking!", "New start, your own rhythm!", "First race up a category. Take on the best!"],
        back: ["Back on the course and stronger than ever!", "A fresh start. Every step steadier than before!"],
        top10: ["Predicted top ten. Go for a medal!", "A medal is within reach. Keep going to the last step!"],
        close: ["Neck and neck. The last stretch decides it!", "Evenly matched. Whoever holds on wins!"],
        all: ["Go! Every step counts!", "Steady breathing, enjoy the race!", "Push up the hills, fly down the slopes!", "For your school and for yourself!", "Run your best race!", "Last 200 metres. Dig deep!", "Start steady, finish strong!", "Your whole school is cheering at the finish!"],
      },
      prTag: "Race preview", prCta: "Predictions, schedule and schools", prClose: "Close", prWait: (n) => `Close in ${n}s`, prDays: "days", prToGo: "In",
      pvCall: "Call", pvStart: "Start", pvDist: "Distance", pvRunners: "Runners", pvHeats: (n) => n > 1 ? `${n} heats` : "Single start",
      pvKnown: (k, n) => `${n} runners, ${k} with past results`, pvNew: (n) => `${n} more have no published results yet (first race or name not confirmed) and are not listed.`,
      pvSame: "Same category last year", pvUp: "Moving up", pvOlder: "Earlier results", pvLast: "Last year", pvBest: "Best",
      pvDefend: "Defending", pvTop3: "Top 3 last year", pvUpTag: (c) => `Up from ${c}`, pvHeat: (h) => `Heat ${h}`,
      pvNote: "Ordered by past results, not a prediction. Only runners who appear in published results are listed.",
      pvNone: "No runner in this category has published results yet.", dateFmt: (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      prevSchool: "Previously: ",
      st_active: "Active, racing this year", st_unsure: "Unconfirmed", st_grad: "Graduated", st_gradEst: "Graduated (est.)", st_idle: "Still in school (est.)",
      stEntered: (n) => `Entered edition ${n}`, stAYear: (n) => `A-group year ${n}`, stLast: "Last race", stOver4: "More than 4 years in A, please check",
      stUnsureWhy: "A runner with the same name is entered this year; not confirmed as the same person",
      stHow: "Status is inferred from the edition 48 entry list: A group allows up to 4 years, and anyone not on this year's A list is treated as graduated; other groups are estimated from age bands.",
      hiddenName: "(Hidden on request)", hiddenText: "This student's details have been hidden on request.",
      pvyTitle: "Privacy and data use", pvyApply: "Open the request form", pvyPending: "The request channel is being set up. Meanwhile, please ask the school's PE teacher to pass on removal or correction requests.",
      pvySrcH: "Source", pvySrc: "Past results are compiled from cross-country results published on the DSEDJ School Sports Competitions pages. This is an unofficial site; official publications prevail. The edition 48 projection also uses the publicly posted top-10 award lists of the Macau Students Round-the-Hill Race (AECM).",
      pvyShowH: "What is shown", pvyShow: "Details already published in official results: name (Chinese and romanised), school, category, placing and time. The edition 48 preview and live results list entrants' names, schools and heats from the official start list; predictions also use published hill-race results. Profile view counts are used only for the popularity ranking and never record who is viewing.",
      pvyNoH: "What is not shown", pvyNo: "No bib numbers, birth dates, contact details or other unpublished personal data. The site is also set not to be indexed by search engines.",
      pvyStatusH: "Active / graduated labels",
      pvyRemoveH: "Request removal or correction", pvyRemove: (d) => `Students, parents or teachers can ask to hide a name or correct an error. Requests are handled within ${d} days.`,
      pvyStep1: "Give the student's name, school, year and category so the record can be found.", pvyStep2: "Choose \"hide name\" or \"correct details\" and leave a contact for the reply (no ID documents needed).",
      pvyStep3: "Once done, the name shows as \"Hidden on request\" in every result; placings and times stay, so other students' rankings are unchanged.",
      pvyNote: "Note: hiding only affects this site; the official results pages are not changed.",
      privacyLink: "Privacy & removal",
      pdPast: "Past results", pdPred: "Prediction", pdHead: (k, n) => `Predicted order (${k} of ${n} runners)`, pdTop: "Predicted lead", pdClose: "Too close to call",
      pdNone: "Not enough past results in this category to predict.", pdAecm: (r, tm) => `Round-the-hill #${r} ${tm}`, pdNewbie: "New to schools XC", pdNoForm: "No recent form", pdNoHist: "No schools XC history",
      pdNoteAecm: (n, w, d) => `Includes last week's "${n}" as recent form (${w}% weight): ${d}. The distance and surface differ from the schools cross-country, so treat it as a guide; top-10 finishers new to schools cross-country are projected too.`,
      pdNoteHK: "Note: Hou Kong, a traditionally strong school, skipped most categories of that race, so its runners are projected from history only. Do not underestimate them.", pdNoteTitle: "A projection, not a result. ",
      pdNote1: (c) => `Based on each runner's time relative to the winner in past races, adjusted for the typical change in a second year in the same category (about 2.5% faster) or a first year after moving up (about 3.9% slower). Runners within ${c}% of each other are marked too close to call; their order flips about half the time.`,
      pdNote2: (r, h) => `Back-tested on editions 46 and 47: rank correlation ${r}, top-3 hits ${h}.`,
      pdNote3: (n) => `Watch for dark horses: ${n} runners have too little history (newcomers, old results or category changes) and are not projected. Anyone can spring a surprise.`,
      popTab: "Popular", popLive: "Live", popDemo: "Demo mode", popViews: " views", popNext: (n, l) => `${n} more views to Lv.${l}`, popMax: "Max level reached",
      popDemoNote: "Demo mode: only views on this device are counted. Once the database is enabled, everyone's views add up and update live.",
      popRule: "Each visit to a runner's page adds 1 view (repeat visits from the same device within 60 seconds are not counted). Updates every 15 seconds. More views, higher level: bronze, silver, gold, platinum, diamond.",
      popEmpty: "No views yet. Open any runner's page to start.", popFail: "Popularity data is unavailable right now.", popUpdated: (s) => `Updated ${s}`,
      tier_bronze: "Bronze", tier_silver: "Silver", tier_gold: "Gold", tier_plat: "Platinum", tier_diamond: "Diamond",
      pvTitleZh: "第四十八屆學界越野跑比賽", pvTitlePt: "48° Campeonato Escolar de Corta-Mato",
      hcTitle: "Race day", hcRunners: "Runners", hcSchools: "Schools", hcCats: "Categories", hcChamps: "Predicted winners", hcChampsSub: "From past results and recent form; tap for the full projection",
      hcPredNote: "A projection, not a result. Watch for dark horses.", hcPopular: "Most viewed", hcHorse: "Ones to watch", hcHorseSub: "Top 3 in last week's round-the-hill race, new to schools XC",
      hcSched: "Race schedule", hcSchedSub: "By start time",
      pdAecmShort: (r) => `RTH #${r}`, pvRunnersUnit: " runners",
      back: "Back", notFound: "Page not found", placeShort: (n) => `#${n}`, searchSchool: "School",
      more: "See all", seeRecords: "Records for this category", seeRank: "See results", seeSchool: "School profile",
      athTitle: "Athletes", athTabPeople: "Athletes", athTabSchools: "Schools", athAll: "All", athActive: "Racing this year", athChamp: "Champions", athPodium: "Podium finishers",
      athCount: (n) => `${n} athletes`, athMore: (n) => `Show more (${n} left)`, athAllSchools: "All schools", athSortNote: "Sorted by wins, medals and best placing.",
      athWins: (n) => `${n} win${n > 1 ? "s" : ""}`, athMedals: (n) => `${n} medal${n > 1 ? "s" : ""}`, athBest: (n) => `Best #${n}`, athNone: "No athletes match these filters.",
      schCount: (n) => `${n} schools`, schTitles: "Team titles", schAthletes: "Athletes", schIndWins: "Individual wins", schMedals: "Medals",
      schTeamList: "Team titles", schMedalList: "Individual medallists (top 3)", schCurrent: (n) => `Entered for edition ${n}`, schRoster: "All athletes", schNoTitle: "No team titles in the last 10 years.", schNoMedal: "No individual medals in the last 10 years.", schSortNote: "Sorted by team titles and number of athletes.",
      schFormer: "Former name: ", schViewRank: "See team results",
      wxTitle: "Race-day weather", wxTemp: "Temperature", wxRh: "Humidity", wxWind: "Wind", wxRainY: "Rain", wxRainN: "Dry", wxImpact: "Estimated effect",
      wxSlow: (a, b) => b === 0 ? "Negligible" : `About ${a}% to ${b}% slower`, wx_good: "Favourable", wx_mild: "Slightly affected", wx_hard: "Affected", wx_severe: "Strongly affected",
      wxPlanned: "Date taken from the planned schedule in the School Operations Guide", wxPlannedFoot: "* Planned date from the School Operations Guide, not confirmed by a post-race report. ", wxDE: "Rescheduled D and E races", wxABC: "D and E races postponed for rain",
      wxNote: "Weather comes from the half-hourly aviation reports (METAR) of the Macau International Airport station in Taipa, about 5 km from Guia Hill, and is meant only for comparing conditions between years. The estimated effect uses the common temperature-plus-dew-point pace adjustment table for distance running: hotter, more humid days are slower.",
      wxRecTitle: "Race-day weather by year", wxRecSub: "Useful when comparing times between years", wxDate: "Race date", wxShort: (t, h) => `About ${t}°C · ${h}% humidity`,
      wxDayFmt: (s) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      lvTitle: (n) => `Edition ${n} live results`, lvGo: "Live results", lvLive: "Live", lvDemo: "Demo replay", lvNote: "Unofficial live record entered by hand at the finish and may contain errors. Official results from DSEDJ prevail.",
      lvDemoNote: (n) => `Demo replay of edition ${n} official results, not this year's race.`, lvWait: "The race has not started. This page updates automatically.", lvReady: "Not started", lvRunning: "Running", lvDone: "Finished",
      lvElapsed: "Elapsed", lvCutoff: "To cut-off", lvCutoffOver: "Cut-off reached", lvHeat: (h, n) => `Heat ${h} of ${n}`,
      lvTeam: "Live team standings", lvInd: "Live individual standings", lvFin: (k, c) => c ? `${k} finished · ${c} on course` : `${k} finished`,
      lvLaps: (n, l) => `${n}/${l} laps`, lvLapN: (i) => `Lap ${i}`, lvFinish: "Finish", lvDnf: "Did not finish", lvTotal: "Total", lvProfile: "Athlete page", lvTapHint: "Tap a runner to see lap times.", lvCourse: (l) => `${l} laps`, lvNoAward: "Fewer than two teams entered, so no team award in this category.",
      lvScore: "Points", lvProv: "Provisional", lvComplete: "Complete", lvMissing: (k) => `${k} to come`, lvOut: "Too few finishers", lvUnknown: "Bib to be confirmed", lvRunner: "runner",
      lvRule: (a, c) => `Scoring: the places of each school's first ${a} finishers (A and B) or first ${c} finishers (C) are added; lowest total wins, ties go to the team whose first runner placed higher. During the race, standings are projected from current positions (more laps first, then order past the finish line) and marked provisional; teams with too few runners recorded assume the rest come in right after the current last place.`,
      lvHeatsRule: (n) => `This category runs in ${n} heats, merged and ranked by time (hand timing may differ slightly from official chip times). Places and team points update after each heat and stay provisional until all heats finish.`,
      lvHeatsDone: (d, n) => `${d}/${n} heats done`, lvHeatPlace: (g, p) => `${g} #${p}`,
      pdSchools: "Schools", pvSchHead: (s, r) => `${s} schools · ${r} runners`, pvSchCount: (n) => `${n} runners`, pvTeamYes: "Team scored", pvTeamNo: (n) => `Fewer than ${n}, no team score`,
      pvFirstTime: "No past results", pvMore: (n) => `${n} more runners without past results (shown once the full list loads)`, pvRosterFallback: "Full runner list unavailable for now; only runners with past results are shown.", pvSchNote: "From the official start list. Tap a school to see its runners.",
      lvHeatTab: (h) => `Heat ${h}`, lvAllHeats: "All heats", lvOverall: (p) => `Overall #${p}`, lvHeatNotStarted: "This heat has not started.",
      lvRefresh: "Refresh", lvMvUp: (n) => `Up ${n}`, lvMvDown: (n) => `Down ${n}`,
      lvLocked: "Team title secured", lvNoTitle: "Can no longer win the team title", lvChampion: "Team champion", lvLeadProv: "Provisionally first", lvBehind: (d) => `Provisionally ${d} points behind first`,
      lvNeed1: (p, s, v) => `Last scoring runner must finish ${p}th or better to beat ${s} (${v} points)`,
      lvNeedN: (r, m, s, v) => `Remaining ${r} scoring runners must total ${m} places or fewer to beat ${s} (${v} points)`,
      lvTeamHint: "Tap a school for its runners and what it needs to win. Requirements use places of runners already finished.",
      lvRoster: "Runners", lvEntered: (n) => `${n} entered`, lvRosterErr: "Runner list unavailable for now.", lvSchoolPage: "School page",
      lvMemFin: (p, tm) => `#${p} · ${tm}`, lvMemLap: (n, l, p) => `${n}/${l} laps · provisionally #${p}`, lvMemNotStarted: "Not started", lvMemNoPass: "Not yet recorded", lvMemNoFin: "No finish recorded", lvScorer: "Scores",
      lvMemDns: "Absent", lvMemCutoff: "Past the time limit, no record", lvShort: (g) => `${g} absent or unable to finish: too few to score`,
      lvHeatGroup: (h, s) => `Heat ${h} (${s})`,
      lvUpdated: (s) => `Updated ${s}`, lvOffline: "Connection lost, retrying.", lvTimeNote: "Hand timing, for reference only",
      ctBtn: "Finisher card", ctTitle: (n) => `Edition ${n} finisher card`,
      ctNote: "Unofficial keepsake: results come from the finish-line record and are released category by category after checking against the official results. Official results are published by DSEDJ.",
      ctOpen: "Released: ", ctWait: "Released category by category after the race, once checked.", ctBib: "Bib number", ctName: "Name (as on the start list; Chinese name, or Portuguese name if none)",
      ctGo: "Search", ctNone: "No record found. Check the bib number and name, or the category has not been released yet.", ctNet: "Connection problem. Please try again later.", ctNeed: "Enter your bib number and name.",
      ctCat: "Category", ctPlace: "Place", ctTime: "Time", ctOf: (n) => `${n} finishers`, ctExport: "Export finisher card", ctHist: "See past results",
      ctHeat: (h) => `Heat ${h}`, ctPlaceV: (p) => `#${p}`,
      phBtn: "Race photos", phTitle: (n) => `Edition ${n} race photos`,
      phNote: "Unofficial photos taken during the race by the site editor. Enter your bib number and name to find and download photos showing your bib. Bibs are read by computer, so some photos may be missed or wrong.",
      phNeed: "Enter your bib number and name.", phNone: "No photos of you yet. Check the bib number and name; photos are added during the race, so try Refresh later.",
      phCount: (n) => `${n} photo${n === 1 ? "" : "s"} found`, phOpen: (i, n) => `Photo ${i} of ${n}`, phDl: "Download photo", phPrev: "Previous", phNext: "Next",
      phRemove: "Request removal of this photo", phCode: (c) => `Photo code ${c} (quote it in your request)`, phExpired: "Photos were kept until 31 August 2027 and have now been removed.",
      phKeep: "Photos are kept until 31 August 2027.", phFail: "Could not load the photo. Please try again later.",
      invBtn: "Export invitation", csLabel: "Card style", cs_dash: "Sprint", cs_trail: "Trail", cs_bib: "Race bib", cs_classic: "Classic", cardBtn: "Export honours card", cardSave: "Download image", cardShare: "Share", cardClose: "Close", cardFail: "Could not create the image. Please try again.",
      cardNote: "The card uses only results already published on this site. On a phone, use Share to save it to your photos.",
    },
  };

  let lang = "zh";
  try { lang = localStorage.getItem("xc-lang") || "zh"; } catch (e) { /* 無痕模式 */ }
  const t = (k, ...a) => { const v = I18N[lang][k]; return typeof v === "function" ? v(...a) : v; };

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const view = $("#view");
  /* Phosphor Icons (MIT) chart-bar / trend-up bold；運動員圖示為自繪 */
  const NAVICON = {
    rank: '<svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><path d="M224,196h-4V40a12,12,0,0,0-12-12H152a12,12,0,0,0-12,12V76H96A12,12,0,0,0,84,88v36H48a12,12,0,0,0-12,12v60H32a12,12,0,0,0,0,24H224a12,12,0,0,0,0-24ZM164,52h32V196H164Zm-56,48h32v96H108ZM60,148H84v48H60Z"/></svg>',
    records: '<svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><path d="M244,56v64a12,12,0,0,1-24,0V85l-75.51,75.52a12,12,0,0,1-17,0L96,129,32.49,192.490a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0L136,135l67-67H168a12,12,0,0,1,0-24h64A12,12,0,0,1,244,56Z"/></svg>',
    athletes: '<svg viewBox="0 0 256 256" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"><circle cx="100" cy="84" r="38"/><path d="M30 208c8-38 37-62 70-62s62 24 70 62"/><path d="M162 50a38 38 0 0 1 0 68"/><path d="M190 150c20 12 32 32 36 58"/></svg>',
  };

  let DB = null;
  const CATS = ["MA", "MB", "MC", "MD", "ME", "FA", "FB", "FC", "FD", "FE"];
  const catLabel = (c) => lang === "zh" ? `${c[0] === "M" ? "男" : "女"}${c[1]}` : `${c[0] === "M" ? "B" : "G"}${c[1]}`;
  const catLong = (c) => lang === "zh" ? `${t(c[0] === "M" ? "male" : "female")}${c[1]}組` : `${t(c[0] === "M" ? "male" : "female")} ${c[1]}`;
  const levelOf = (c) => "ABC".includes(c[1]) ? "secondary" : "primary";
  const yearShort = (y) => y.slice(2, 4) + "/" + y.slice(5, 7);

  function school(zh) {
    if (lang === "zh" || !DB) return zh;
    const s = DB.schools[zh];
    return (s && (s.pt || s.abbr)) || zh;
  }
  /* 校徽：有真校徽圖片（data/crests.json）就用圖片，否則以學校代碼＋專屬色生成盾形徽章 */
  function hueOf(a) { let h = 7; for (const ch of a) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
  function crest(zh, size = "sm") {
    const s = (DB && DB.schools[zh]) || {};
    const a = s.abbr || (zh || "?").slice(0, 2);
    const img = DB && DB.crests && DB.crests[a];
    const title = esc(school(zh));
    if (img) return `<span class="crest ${size} img" title="${title}" aria-hidden="true"><img src="${esc(img)}" alt="" decoding="async"></span>`;
    const k = a.length <= 2 ? .42 : a.length === 3 ? .34 : a.length === 4 ? .27 : .22;
    return `<span class="crest ${size}" style="--h:${hueOf(a)};--k:${k}" title="${title}" aria-hidden="true"><i>${esc(a)}</i></span>`;
  }
  function schoolLine(zh, size = "xs") { return `<span class="sl">${crest(zh, size)}<span>${esc(school(zh))}</span></span>`; }
  const abbrOf = (zh) => ((DB && DB.schools[zh]) || {}).abbr || zh;
  const schoolHref = (zh) => `#/s/${encodeURIComponent(abbrOf(zh))}`;
  /* 可點擊的校名：連去學校資料頁（不可放在另一個連結之內） */
  function schoolLink(zh, size = "xs") { return `<a class="sl sl-link" href="${schoolHref(zh)}">${crest(zh, size)}<span>${esc(school(zh))}</span></a>`; }
  const to = (a, b) => a === b ? `${a}` : `${a}${lang === "zh" ? " 至 " : " to "}${b}`;

  /* ---------- 比賽當日天氣（docs/data/weather.json） ---------- */
  function wxFor(edNo, cat) {
    const list = ((DB && DB.weather && DB.weather.races) || []).filter((w) => w.edition === edNo);
    if (list.length < 2) return list[0] || null;
    return list.find((w) => w.cats && cat && w.cats.includes(cat[1])) || list[0];
  }
  function wxSlow(w) { return t("wxSlow", w.slow_pct[0], w.slow_pct[1]); }
  function wxNotes(w) {
    const n = [];
    if (w.cats === "ABC") n.push(t("wxABC"));
    if (w.cats === "DE") n.push(t("wxDE"));
    if (w.basis === "planned") n.push(t("wxPlanned"));
    return n;
  }
  /* 排行榜用：一張天氣資訊卡 */
  function wxCard(w, cat) {
    if (!w) return "";
    const notes = wxNotes(w);
    const tr = w.temp_min === w.temp_max ? `${w.temp_min}` : `${w.temp_min}-${w.temp_max}`;
    return `<details class="wx">
      <summary><span class="wx-sum"><b>${t("wxTitle")}</b><span>${tr}°C · ${lang === "zh" ? "濕度" : "RH"} ${w.rh_avg}%${w.rain_reports > 0 ? " · " + t("wxRainY") : ""}</span></span><span class="wx-badge lv-${w.level}">${t("wx_" + w.level)}</span></summary>
      <div class="wx-head"><span>${esc(t("wxDayFmt", w.date))}</span></div>
      <div class="wx-grid">
        <div><span>${t("wxTemp")}</span><b>${tr}<small>°C</small></b></div>
        <div><span>${t("wxRh")}</span><b>${w.rh_avg}<small>%</small></b></div>
        <div><span>${t("wxWind")}</span><b>${w.wind_avg ?? "-"}<small> km/h</small></b></div>
        <div><span>${lang === "zh" ? "天氣" : "Rain"}</span><b>${w.rain_reports > 0 ? t("wxRainY") : t("wxRainN")}</b></div>
      </div>
      <div class="wx-impact">${t("wxImpact")}：${esc(wxSlow(w))}</div>
      ${notes.length ? `<p class="wx-note">${esc(notes.join("；"))}</p>` : ""}
      <a class="wx-link" href="#/records?c=${cat}&go=wx">${t("wxRecTitle")} ›</a>
    </details>`;
  }

  /* ---------- 比賽當日天氣預測（docs/data/forecast48.json，scripts/forecast.py 產生） ---------- */
  function fcNow() {
    const f = DB && DB.forecast, race = DB && DB.race;
    return f && f.available && race && f.date === race.date && daysTo(f.date) >= 0 ? f : null;
  }
  const fcSky = (f) => lang === "zh" ? ((f.desc_zh.split("。").find((x) => /晴|雲|雨|陰|霧|雷/.test(x)) || "").trim()) : ((f.desc_en.split(".").find((x) => /fine|cloud|rain|shower|sunny|fog|thunder/i.test(x)) || "").trim());
  const fcWind = (f) => lang === "zh" ? (f.wind_zh || "").replace(/^吹/, "") : (f.wind_en || "");
  function fcCard() {
    const f = fcNow(); if (!f) return "";
    const pub = f.published.replace(/^\d{4}-(\d{2})-(\d{2}) /, (m, mo, d) => lang === "zh" ? `${+mo}月${+d}日 ` : `${+d}/${+mo} `);
    return `<details class="wx wx-fc">
      <summary><span class="wx-sum"><b>${t("fcTitle")}</b><span>${f.temp_min}-${f.temp_max}°C · ${lang === "zh" ? "濕度" : "RH"} ${f.rh_min}-${f.rh_max}%${f.rain ? " · " + t("wxRainY") : ""}</span></span><span class="wx-badge lv-${f.level}">${t("wx_" + f.level)}</span></summary>
      <div class="wx-head"><span>${esc(t("wxDayFmt", f.date))} · ${esc(fcSky(f))}</span></div>
      <div class="wx-grid">
        <div><span>${t("wxTemp")}</span><b>${f.temp_min}-${f.temp_max}<small>°C</small></b></div>
        <div><span>${t("wxRh")}</span><b>${f.rh_min}-${f.rh_max}<small>%</small></b></div>
        <div><span>${t("fcWind")}</span><b class="fc-txt">${esc(fcWind(f))}</b></div>
        <div><span>${t("fcSky")}</span><b class="fc-txt">${f.rain ? t("wxRainY") : t("wxRainN")}</b></div>
      </div>
      <div class="wx-impact">${t("wxImpact")}：${esc(wxSlow(f))}</div>
      <p class="wx-note">${esc(t("fcPub", pub))}。${esc(t("fcNote"))}</p>
      <a class="wx-link" href="#/records?c=MA&go=wx">${t("wxRecTitle")} ›</a>
      ${/^https:\/\/www\.dsmg\.gov\.mo\//.test(f.source_url || "") ? `<a class="wx-link" href="${esc(f.source_url)}" target="_blank" rel="noopener">${lang === "zh" ? "地球物理氣象局最新預報" : "Latest SMG forecast"} ↗</a>` : ""}
    </details>`;
  }

  function personName(r, withSub = true) {
    if (r.hidden) return `<span class="hidden-name">${t("hiddenName")}</span>`;
    const main = lang === "zh" ? (r.name_zh || r.name_pt) : (r.name_pt || r.name_zh);
    const sub = lang === "zh" ? (r.name_zh ? r.name_pt : "") : (r.name_pt ? r.name_zh : "");
    return withSub && sub ? `${esc(main)}<small>${esc(sub)}</small>` : esc(main);
  }
  function fmt(sec) {
    if (sec == null) return "-";
    const s = Math.round(sec);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /* ---------- 衍生資料 ---------- */
  let PEOPLE = new Map(), MEDALS = [], LATEST = null;
  function derive() {
    DB.editions.sort((a, b) => b.edition - a.edition);
    LATEST = DB.editions[0];
    for (const ed of DB.editions) {
      for (const c of CATS) {
        for (const r of ed.categories[c].individual) {
          let p = PEOPLE.get(r.pid);
          if (!p) { p = { pid: r.pid, name_zh: r.name_zh, name_pt: r.name_pt, hidden: !!r.hidden, recs: [], schools: new Set(), gender: c[0] }; PEOPLE.set(r.pid, p); }
          p.recs.push({ ...r, year: ed.year, edition: ed.edition, cat: c, scope: ed.scope });
          p.schools.add(r.school_zh);
          if (!p.name_zh && r.name_zh) p.name_zh = r.name_zh;
        }
      }
    }
    for (const p of PEOPLE.values()) {
      p.recs.sort((a, b) => a.edition - b.edition);
      p.schools = new Set(p.recs.map((r) => r.school_zh));   // 舊校 → 新校（DB.editions 是新到舊）
      p.key = [p.name_zh, (p.name_pt || "").toLowerCase().replace(/[^a-z]/g, ""), ...[...p.schools]].join(" ");
    }
    // 同一間學校的新舊校名（同代碼）合併計算，顯示最新校名
    const abbrOf = (zh) => (DB.schools[zh] || {}).abbr || zh;
    const latestName = new Map();
    for (const ed of [...DB.editions].sort((a, b) => a.edition - b.edition)) for (const c of CATS) {
      for (const r of ed.categories[c].individual) latestName.set(abbrOf(r.school_zh), r.school_zh);
      const tc = ed.categories[c].team_champion; if (tc) latestName.set(abbrOf(tc.school_zh), tc.school_zh);
    }
    for (const s of (DB.race && DB.race.schools) || []) latestName.set(s.abbr, s.zh);
    const m = new Map();
    for (const ed of DB.editions) for (const c of CATS) {
      const tc = ed.categories[c].team_champion;
      if (!tc) continue;
      const k = abbrOf(tc.school_zh);
      const row = m.get(k) || { school: latestName.get(k) || tc.school_zh, secondary: 0, primary: 0, total: 0 };
      row[levelOf(c)]++; row.total++; m.set(k, row);
    }
    MEDALS = [...m.values()].sort((a, b) => b.total - a.total || b.secondary - a.secondary || a.school.localeCompare(b.school));
  }


  /* ---------- 在讀／畢業推斷 ----------
     依據第 48 屆（今屆）參賽名單：
     1. 在今屆名單 → 在讀・今屆參賽（A 組顯示第幾年；超過 4 年標示）
     2. 今屆名單有同名者但未能確定 → 未確定
     3. 最後一場在 A 組而今屆 A 組名單沒有其名字，或已跑滿 4 年 A 組 → 已畢業
     4. 最後一場在 B 至 E 組：組別約每兩年升一級、A 組最多 4 年，
        若相隔年數已超過讀完餘下組別所需年期 → 已畢業（推斷），否則 → 在讀（推斷）・今屆未報名 */
  const REMAIN = { A: 3, B: 5, C: 7, D: 9, E: 11 }; // 最後出賽後最多還可留在學界的年數
  function deriveStatus() {
    const pv = DB.preview, race = DB.race;
    if (!pv || !race) return;
    const entered = new Map();
    for (const [cat, v] of Object.entries(pv.categories)) for (const s of v.starters) entered.set(s.pid, { cat, school: s.school_zh });
    const unsure = new Set(pv.ambiguous_pids || []);
    for (const p of PEOPLE.values()) {
      const last = p.recs.at(-1);
      const aYears = p.recs.filter((r) => r.cat[1] === "A").length;
      const gap = race.edition - last.edition;
      if (entered.has(p.pid)) {
        const e = entered.get(p.pid);
        p.status = { code: "active", cat: e.cat, school: e.school, aYear: e.cat[1] === "A" ? aYears + 1 : null };
      } else if (unsure.has(p.pid)) {
        p.status = { code: "unsure" };
      } else if (last.cat[1] === "A" || aYears >= 4) {
        p.status = { code: "grad", last, aYears };
      } else if (gap > REMAIN[last.cat[1]]) {
        p.status = { code: "gradEst", last };
      } else {
        p.status = { code: "idle", last };
      }
    }
  }
  function statusChip(p, long = false) {
    const st = p.status; if (!st) return "";
    const label = t("st_" + st.code);
    let detail = "";
    if (long) {
      if (st.code === "active") detail = `${t("stEntered", DB.race.edition)} ${catLong(st.cat)}${st.aYear ? ` · ${t("stAYear", st.aYear)}` : ""}`;
      else if (st.code === "grad" || st.code === "gradEst" || st.code === "idle") detail = `${t("stLast")} ${yearShort(st.last.year)} ${catLong(st.last.cat)}`;
      else if (st.code === "unsure") detail = t("stUnsureWhy");
    }
    const warn = st.code === "active" && st.aYear > 4 ? `<span class="st-warn">${t("stOver4")}</span>` : "";
    return `<span class="st st-${st.code}">${esc(label)}</span>${detail ? `<span class="st-detail">${esc(detail)}</span>` : ""}${warn}`;
  }

  /* ---------- 搜尋 ---------- */
  const q = $("#q"), results = $("#results");
  function search(term) {
    term = term.trim().toLowerCase();
    if (!term) { results.hidden = true; return; }
    const termPt = term.replace(/[^a-z]/g, "");
    const hits = [];
    const schoolHits = Object.entries(DB.schools).filter(([zh, s]) => zh.includes(term) || (s.pt || "").toLowerCase().includes(term) || (s.abbr || "").toLowerCase() === term).slice(0, 3);
    for (const p of PEOPLE.values()) {
      if (p.hidden) continue;
      if (p.key.toLowerCase().includes(term) || (termPt.length >= 3 && p.key.includes(termPt))) hits.push(p);
      if (hits.length > 60) break;
    }
    hits.sort((a, b) => b.recs.at(-1).edition - a.recs.at(-1).edition || b.recs.length - a.recs.length);
    let html = schoolHits.map(([zh]) => `<a class="result" role="option" href="${schoolHref(zh)}">${crest(zh, "md")}<div><div>${esc(school(zh))}</div><div class="sub">${t("searchSchool")}</div></div></a>`).join("");
    html += hits.slice(0, 20).map((p) => {
      const last = p.recs.at(-1);
      return `<a class="result" role="option" href="#/p/${p.pid}">${crest(last.school_zh, "md")}<div><div>${personName(p)}</div><div class="sub">${esc(school(last.school_zh))}</div></div><span class="tag">${statusChip(p)}<br>${catLabel(last.cat)} · ${yearShort(last.year)}</span></a>`;
    }).join("");
    results.innerHTML = html || `<div class="empty">${t("noResult")}</div>`;
    results.hidden = false;
  }
  q.addEventListener("input", () => search(q.value));
  q.addEventListener("focus", () => q.value && search(q.value));
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) results.hidden = true; });
  results.addEventListener("click", (e) => { if (e.target.closest("a")) { results.hidden = true; q.value = ""; q.blur(); } });

  /* 首頁功能入口：讓使用者一眼看到可以查甚麼 */
  function entryTiles() {
    const zh = lang === "zh";
    const tiles = [
      { href: "#/rank", nav: "rank", t: zh ? "歷屆成績" : "Results by year", d: zh ? "第 38 至 47 屆各組個人及團體名次" : "Individual and team placings, editions 38 to 47" },
      { href: "#/athletes", nav: "athletes", t: zh ? "運動員名錄" : "Athlete directory", d: zh ? "按性別、組別、學校篩選，查看個人歷屆成績" : "Filter by gender, category or school" },
      { href: "#/athletes?tab=schools", nav: "athletes", t: zh ? "學校資料" : "Schools", d: zh ? "各校團體冠軍、獎牌得主及參賽運動員" : "Team titles, medallists and athletes" },
      { href: "#/records", nav: "records", t: zh ? "紀錄與趨勢" : "Records & trends", d: zh ? "最快成績、成績走勢及歷屆比賽天氣" : "Fastest times, trends and race-day weather" },
    ];
    return `<div class="section-title"><h2>${zh ? "功能導覽" : "Explore"}</h2></div>
      <div class="entry">${tiles.map((x) => `<a href="${x.href}"><span class="dot">${NAVICON[x.nav]}</span><b>${x.t}</b><small>${x.d}</small></a>`).join("")}</div>`;
  }

  /* ---------- 首頁 ---------- */
  function renderHome() {
    const ed = LATEST;
    const champs = CATS.map((c) => ({ c, r: ed.categories[c].individual[0] })).filter((x) => x.r);
    const champRows = champs.map(({ c, r }) => `<a class="mini-row ${c[0] === "M" ? "m" : "f"}" href="#/p/${r.pid}"><span class="cat">${catLabel(c)}</span><span class="who">${crest(r.school_zh, "xs")}${esc(lang === "zh" ? (r.name_zh || r.name_pt) : r.name_pt)}<small>${esc(school(r.school_zh))}</small></span><span class="t">${fmt(r.seconds)}</span></a>`).join("");

    const years = DB.editions.map((e) => e.year);
    const maxM = MEDALS[0]?.total || 1;
    const medalRows = MEDALS.slice(0, 6).map((m, i) => `<a class="bar" href="${schoolHref(m.school)}"><span class="pos">${i + 1}</span><div class="track"><div class="fill" style="width:${(m.total / maxM) * 100}%"></div><div class="name">${crest(m.school, "xs")}${esc(school(m.school))}</div></div><span class="n">${m.total}</span></a>`).join("");

    const fastest = CATS.map((c) => {
      let best = null;
      for (const e of DB.editions) { const r = e.categories[c].individual[0]; if (r && r.seconds && (!best || r.seconds < best.r.seconds)) best = { r, y: e.year }; }
      return { c, ...best };
    });
    const fastRows = fastest.map(({ c, r, y }) => r ? `<a class="mini-row ${c[0] === "M" ? "m" : "f"}" href="#/p/${r.pid}"><span class="cat">${catLabel(c)}</span><span class="who">${esc(lang === "zh" ? (r.name_zh || r.name_pt) : r.name_pt)}<small>${yearShort(y)}</small></span><span class="t">${fmt(r.seconds)}</span></a>` : "").join("");

    const streaks = CATS.map((c) => {
      const first = DB.editions[0].categories[c].team_champion;
      if (!first) return null;
      let n = 0;
      for (const e of DB.editions) { const tc = e.categories[c].team_champion; if (tc && tc.school_zh === first.school_zh) n++; else break; }
      return n >= 2 ? { c, school: first.school_zh, n } : null;
    }).filter(Boolean).sort((a, b) => b.n - a.n);
    const streakRows = streaks.slice(0, 8).map((s) => `<a class="mini-row ${s.c[0] === "M" ? "m" : "f"}" href="${schoolHref(s.school)}"><span class="cat">${catLabel(s.c)}</span><span class="who">${crest(s.school, "xs")}${esc(school(s.school))}</span><span class="t">${s.n}<small>${t("years")}</small></span></a>`).join("");

    const kings = [...PEOPLE.values()].map((p) => ({ p, w: p.recs.filter((r) => r.rank === 1).length })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w || b.p.recs.length - a.p.recs.length).slice(0, 7);
    const kingRows = kings.map(({ p, w }) => `<a class="mini-row ${p.gender === "M" ? "m" : "f"}" href="#/p/${p.pid}"><span class="cat">${catLabel(p.recs.at(-1).cat)}</span><span class="who">${crest(p.recs.at(-1).school_zh, "xs")}${esc(lang === "zh" ? (p.name_zh || p.name_pt) : p.name_pt)}<small>${esc(school(p.recs.at(-1).school_zh))}</small></span><span class="t">${w}<small>${t("times")}</small></span></a>`).join("");

    const cards = [
      { cls: "c-gold", sub: t("medalNote", years.at(-1), years[0]), title: t("medalTitle"), body: `<div class="bars">${medalRows}</div>`, more: "#/athletes?tab=schools" },
      { cls: "c-steel", sub: t("rangeSub", years.at(-1), years[0]), title: t("fastest"), body: `<div class="mini">${fastRows}</div>`, note: t("fastestNote"), more: "#/records" },
      { cls: "c-green", sub: t("asOf", ed.edition), title: t("streak"), body: `<div class="mini">${streakRows}</div>`, note: t("streakNote"), more: `#/rank?t=team&e=${ed.edition}` },
      { cls: "c-gold", sub: t("kingsNote"), title: t("kings"), body: `<div class="mini">${kingRows}</div>`, more: "#/athletes?k=champ" },
      { cls: "c-green", title: t("latestChamps", ed.year, ed.edition), body: `<div class="mini">${champRows}</div>`, more: `#/rank?e=${ed.edition}&c=MA` },
    ];

    const quick = CATS.map((c) => `<a class="${c[0] === "M" ? "m" : "f"}" href="#/rank?e=${ed.edition}&c=${c}">${c[1]}<small>${t(c[0] === "M" ? "male" : "female")}</small></a>`).join("");

    view.innerHTML = `
      ${raceBanner()}
      <div class="carousel" id="carousel">${cards.map((k) => `<article class="card ${k.cls}"><h3>${esc(k.title)}</h3>${k.more ? `<a class="card-more" href="${k.more}">${t("more")} ›</a>` : ""}${k.sub ? `<div class="sub">${esc(k.sub)}</div>` : ""}${k.body}${k.note ? `<div class="note">${esc(k.note)}</div>` : ""}</article>`).join("")}</div>
      <div class="dots" id="dots">${cards.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>
      <div class="section-title"><h2>${t("quick")} · ${t("edition", ed.edition)}</h2><a href="#/rank">${t("quickAll")} ›</a></div>
      <div class="quick">${quick}</div>
      ${entryTiles()}`;

    const car = $("#carousel"), dots = [...$("#dots").children];
    car.addEventListener("scroll", () => {
      const i = Math.round(car.scrollLeft / (car.firstElementChild.offsetWidth + 12));
      dots.forEach((d, j) => d.classList.toggle("on", j === i));
    }, { passive: true });
  }


  /* ---------- 熱門人氣：瀏覽次數、等級 ----------
     後端：docs/data/site.json 的 views = { url, key }（Supabase）。未設定時為「示範模式」，只計本裝置。
     規則：每次進入選手頁面 +1；同一裝置 60 秒內重複進入同一選手不重複計（防止重新整理灌數）。 */
  const ICON = {
    card: '<svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><path d="M208,28H48A20,20,0,0,0,28,48V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V48A20,20,0,0,0,208,28Zm-4,24V158.1l-27.51-27.52a20,20,0,0,0-28.29,0L128,150.83,100.3,123.17a20,20,0,0,0-28.29,0L52,143.17V52ZM52,177.11l34.16-34.17,62.18,62.18a.53.53,0,0,0,0,.08H52ZM181.29,204l-36-36,17.34-17.34L204,192.06V204ZM144,100a16,16,0,1,1,16,16A16,16,0,0,1,144,100Z"/></svg>',
    fire: '<svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><path d="M143.38,17.85a8,8,0,0,0-12.63,3.41l-22,60.41L84.59,58.26a8,8,0,0,0-11.93.89C51,87.53,40,116.08,40,144a88,88,0,0,0,176,0C216,84.55,165.21,36,143.38,17.85Zm40.51,135.49a57.6,57.6,0,0,1-46.56,46.55A7.65,7.65,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.630-16.85,33.44-33.45a8,8,0,0,1,15.780,2.68Z"/></svg>',
    eye: '<svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.570,61.26,162.880,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z"/></svg>',
    crown: '<svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><path d="M248,80a28,28,0,1,0-51.12,15.77l-26.79,33L146,73.4a28,28,0,1,0-36.06,0L85.910,128.74l-26.79-33a28,28,0,1,0-26.6,12L47,194.63A16,16,0,0,0,62.78,208H193.22A16,16,0,0,0,209,194.63l14.47-86.850A28,28,0,0,0,248,80ZM128,40a12,12,0,1,1-12,12A12,12,0,0,1,128,40ZM24,80A12,12,0,1,1,36,92,12,12,0,0,1,24,80ZM220,92a12,12,0,1,1,12-12A12,12,0,0,1,220,92Z"/></svg>',
  };
  const LV = [0, 5, 15, 30, 50, 80, 120, 180, 260, 360, 500, 700, 1000, 1500];
  const TIERS = ["bronze", "bronze", "bronze", "silver", "silver", "silver", "gold", "gold", "gold", "plat", "plat", "plat", "diamond", "diamond"];
  function lvOf(v) {
    let i = 0; while (i + 1 < LV.length && v >= LV[i + 1]) i++;
    const next = LV[i + 1];
    return { lv: i + 1, cur: LV[i], next, pct: next ? (v - LV[i]) / (next - LV[i]) : 1, tier: TIERS[i] };
  }
  const Views = (() => {
    const cfg = () => (DB && DB.site && DB.site.views && DB.site.views.url) ? DB.site.views : null;
    const store = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch (e) { return fb; } };
    const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無痕模式 */ } };
    // 新式 publishable key（sb_publishable_…）只放 apikey 標頭；舊式 anon JWT 亦放 Authorization
    const H = (c) => Object.assign({ apikey: c.key, "Content-Type": "application/json" }, c.key.startsWith("sb_") ? {} : { Authorization: "Bearer " + c.key });
    async function get(pid) {
      const c = cfg();
      if (!c) return store("xc-views-demo", {})[pid] || 0;
      const r = await fetch(`${c.url}/rest/v1/xc_views?pid=eq.${encodeURIComponent(pid)}&select=views`, { headers: H(c), cache: "no-store" });
      const j = await r.json(); return (j[0] && j[0].views) || 0;
    }
    async function hit(pid) {
      const recent = store("xc-views-recent", {}); const now = Date.now();
      if (recent[pid] && now - recent[pid] < 60000) { const v = await get(pid); return { before: v, after: v, counted: false }; }
      recent[pid] = now; save("xc-views-recent", recent);
      const c = cfg();
      if (!c) { const d = store("xc-views-demo", {}); const before = d[pid] || 0; d[pid] = before + 1; save("xc-views-demo", d); return { before, after: before + 1, counted: true }; }
      const r = await fetch(`${c.url}/rest/v1/rpc/xc_hit`, { method: "POST", headers: H(c), body: JSON.stringify({ p_pid: pid }) });
      if (!r.ok) throw new Error("views " + r.status);
      const after = Number(await r.json()); return { before: after - 1, after, counted: true };
    }
    async function top(n = 50) {
      const c = cfg();
      if (!c) return Object.entries(store("xc-views-demo", {})).map(([pid, views]) => ({ pid, views })).sort((a, b) => b.views - a.views).slice(0, n);
      const r = await fetch(`${c.url}/rest/v1/xc_views?select=pid,views&order=views.desc,pid.asc&limit=${n}`, { headers: H(c), cache: "no-store" });
      return r.json();
    }
    return { get, hit, top, live: () => !!cfg() };
  })();

  function lvBadge(v, size = "") {
    const L = lvOf(v);
    return `<span class="lv-badge lv-${L.tier} ${size}" aria-label="Lv.${L.lv}"><i>${L.lv}</i></span>`;
  }
  function popCard(v) {
    const L = lvOf(v);
    return `<div class="pop-line lv-${L.tier}" id="popCard">
      <span class="pop-views">${ICON.eye}<span id="popViews">${v}</span>${t("popViews")}</span>
      <span class="xp" aria-hidden="true"><i class="xp-fill" style="transform:scaleX(${L.pct})"></i></span>
      <span class="pop-next">${L.next ? t("popNext", L.next - v, L.lv + 1) : t("popMax")}</span>
      <span class="plus1" aria-hidden="true">+1</span>
    </div>`;
  }
  function lvCorner(v) {
    const L = lvOf(v);
    return `<span class="lv-corner lv-${L.tier}" id="lvCorner" title="Lv.${L.lv} ${t("tier_" + L.tier)}"><small>LV</small><b>${L.lv}</b></span>`;
  }
  function levelUpFx(lv, tier) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = document.createElement("div");
    el.className = `lvup lv-${tier}${reduce ? " still" : ""}`; el.setAttribute("role", "status");
    el.innerHTML = `<div class="lvup-burst"></div>${reduce ? "" : Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14}deg;--d:${60 + (i % 3) * 22}px"></i>`).join("")}
      <div class="lvup-text"><small>LEVEL UP</small><b>Lv.${lv}</b><span>${t("tier_" + tier)}</span></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), reduce ? 1600 : 1900);
  }
  function countUp(el, from, to) {
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || to - from > 50) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 500;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  async function trackProfileView(pid) {
    const card = $("#popCard"); if (!card) return;
    try {
      const { before, after, counted } = await Views.hit(pid);
      if (!document.body.contains(card)) return;
      const L0 = lvOf(before), L1 = lvOf(after);
      card.outerHTML = popCard(before);
      const corner = $("#lvCorner"); if (corner) corner.outerHTML = lvCorner(before);
      requestAnimationFrame(() => {
        const c = $("#popCard"); if (!c) return;
        c.querySelector(".xp-fill").style.transform = `scaleX(${L1.pct})`;
        countUp($("#popViews"), before, after);
        if (counted) c.classList.add("counted");
        setTimeout(() => {
          const c2 = $("#popCard"); if (c2) c2.querySelector(".pop-next").textContent = L1.next ? t("popNext", L1.next - after, L1.lv + 1) : t("popMax");
          if (L1.lv > L0.lv) {
            const k = $("#lvCorner"); if (k) { k.outerHTML = lvCorner(after); $("#lvCorner").classList.add("leveled"); }
            if (c2) c2.className = `pop-line lv-${L1.tier} counted`;
            levelUpFx(L1.lv, L1.tier);
          }
        }, 500);
      });
    } catch (e) {
      console.warn("views unavailable", e);
    }
  }

  let popTimer = null;
  const pageTimers = []; // 換頁時清除
  async function fillPopularity() {
    const box = $("#popBoard"); if (!box) return;
    let rows;
    try { rows = (await Views.top(50)).filter((r) => PEOPLE.has(r.pid) && !PEOPLE.get(r.pid).hidden && r.views > 0); }
    catch (e) { box.innerHTML = `<p class="muted-note">${t("popFail")}</p>`; return; }
    if (!document.body.contains(box)) return;
    const prev = new Map([...box.querySelectorAll("[data-pid]")].map((el) => [el.dataset.pid, Number(el.dataset.v)]));
    if (!rows.length) { box.innerHTML = `<p class="muted-note">${t("popEmpty")}</p>`; }
    else {
      const card = (r, i) => {
        const p = PEOPLE.get(r.pid), last = p.recs.at(-1), L = lvOf(r.views);
        const bumped = prev.has(r.pid) && prev.get(r.pid) < r.views ? " bumped" : "";
        return { p, last, L, bumped };
      };
      const podium = rows.slice(0, 3).map((r, i) => { const { p, last, L, bumped } = card(r, i);
        return `<a class="podium p${i + 1} lv-${L.tier}${bumped}" data-pid="${r.pid}" data-v="${r.views}" href="#/p/${r.pid}">
          ${i === 0 ? `<span class="crown">${ICON.crown}</span>` : ""}
          <span class="pd-rank">${i + 1}</span>${crest(last.school_zh, "md")}
          <div class="pd-name">${esc(lang === "zh" ? (p.name_zh || p.name_pt) : (p.name_pt || p.name_zh))}</div>
          <div class="pd-lv">${lvBadge(r.views)}<span>${ICON.fire}${r.views}</span></div></a>`; }).join("");
      const rest = rows.slice(3).map((r, i) => { const { p, last, L, bumped } = card(r, i + 3);
        return `<a class="row cr pop-row${bumped}" data-pid="${r.pid}" data-v="${r.views}" href="#/p/${r.pid}">
          <span class="rank">${i + 4}</span>${crest(last.school_zh, "sm")}
          <span style="min-width:0"><div class="nm">${personName(p)}</div><div class="sch">${esc(school(last.school_zh))}</div></span>
          <span class="pop-val">${lvBadge(r.views)}<b>${ICON.fire}${r.views}</b></span></a>`; }).join("");
      box.innerHTML = `<div class="podiums">${podium}</div>${rest ? `<div class="board">${rest}</div>` : ""}`;
    }
    const st = $("#popUpdated"); if (st) st.textContent = t("popUpdated", new Date().toLocaleTimeString(lang === "zh" ? "zh-HK" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }

  /* ---------- 排行榜 ---------- */
  function renderRank(params) {
    const tab = params.get("t") || "ind";
    const edNo = Number(params.get("e")) || LATEST.edition;
    const ed = DB.editions.find((e) => e.edition === edNo) || LATEST;
    const cat = CATS.includes(params.get("c")) ? params.get("c") : "MA";
    const go = (o) => { const p = new URLSearchParams({ t: tab, e: ed.edition, c: cat, ...o }); location.replace("#/rank?" + p); };

    const yearChips = DB.editions.map((e) => `<button class="chip ${e.edition === ed.edition ? "on" : ""}" data-e="${e.edition}"><span class="num">${yearShort(e.year)}</span></button>`).join("");
    let body = "";
    if (tab === "pop") {
      body = `<div class="pop-head"><span class="live ${Views.live() ? "on" : "demo"}">${Views.live() ? t("popLive") : t("popDemo")}</span><span id="popUpdated" class="pop-upd"></span></div>
        ${Views.live() ? "" : `<p class="banner">${t("popDemoNote")}</p>`}
        <div id="popBoard"><div class="skeleton"><i class="sk-row"></i><i class="sk-row"></i></div></div>
        <p class="muted-note">${t("popRule")}</p>`;
    } else if (tab === "ind") {
      const g = cat[0];
      const catBtns = (letters) => letters.split("").map((l) => `<button class="${cat === g + l ? "on" : ""}" data-c="${g + l}">${l}</button>`).join("");
      const rows = ed.categories[cat].individual;
      const lead = rows[0]?.seconds;
      body = `
        <div class="filters">
          <div class="toggle"><button class="m ${g === "M" ? "on" : ""}" data-g="M">${t("male")}</button><button class="f ${g === "F" ? "on" : ""}" data-g="F">${t("female")}</button></div>
          <div class="cats"><span class="grp">${t("secondary")}</span>${catBtns("ABC")}<span class="grp">${t("primary")}</span>${catBtns("DE")}</div>
        </div>
        <div class="board-head"><h2>${esc(catLong(cat))}</h2><span class="meta">${t("edition", ed.edition)} · ${t("runners", rows.length)}</span></div>
        ${ed.scope === "top10" ? `<p class="banner">${t("top10")}</p>` : ""}
        ${wxCard(wxFor(ed.edition, cat), cat)}
        <div class="board">${rows.map((r) => `
          <a class="row cr" href="#/p/${r.pid}">
            <span class="rank ${r.rank <= 3 ? "r" + r.rank : ""}">${r.rank}</span>
            ${crest(r.school_zh, "sm")}
            <span style="min-width:0"><div class="nm">${personName(r)}</div><div class="sch">${esc(school(r.school_zh))}</div></span>
            <span class="tm">${fmt(r.seconds)}${r.rank > 1 && lead ? `<span class="gap">+${fmt(r.seconds - lead)}</span>` : ""}</span>
          </a>`).join("")}</div>
        <div class="link-row"><a href="#/records?c=${cat}">${t("seeRecords")} ›</a><a href="#/athletes?g=${g}&lv=${cat[1]}">${lang === "zh" ? "本組運動員名錄" : "Athletes in this category"} ›</a></div>`;
    } else {
      const focus = params.get("s");
      const teams = CATS.map((c) => {
        const tc = ed.categories[c].team_champion;
        return `<div class="team"><a class="cat ${c[0] === "M" ? "m" : "f"}" href="#/rank?e=${ed.edition}&c=${c}" aria-label="${esc(catLong(c))}">${catLabel(c)}</a>${tc ? schoolLink(tc.school_zh, "sm") : `<span class="none">${t("noTeam")}</span>`}</div>`;
      }).join("");
      const medal = MEDALS.map((m, i) => `<a class="medal ${focus && abbrOf(focus) === abbrOf(m.school) ? "mine" : ""}" href="${schoolHref(m.school)}"><span class="rank ${i < 3 ? "r" + (i + 1) : ""}">${i + 1}</span>${schoolLine(m.school, "sm")}<span class="cnt"><span>${m.secondary}</span><span>${m.primary}</span><span class="total">${m.total}</span></span></a>`).join("");
      body = `
        <div class="board-head"><h2>${t("teamChamps")}</h2><span class="meta">${t("edition", ed.edition)} · ${ed.year}</span></div>
        <div class="team-grid">${teams}</div>
        ${wxCard(wxFor(ed.edition, "MA"), "MA")}
        <div class="board-head"><h2>${t("medalAll")}</h2></div>
        <div class="board"><div class="medal-head"><span>#</span><span>${t("schoolLbl")}</span><span class="cnt"><span>${t("secShort")}</span><span>${t("priShort")}</span><span>${t("total")}</span></span></div>${medal}</div>`;
    }

    view.innerHTML = `
      <div class="seg seg3"><button data-t="ind" class="${tab === "ind" ? "on" : ""}">${t("individual")}</button><button data-t="team" class="${tab === "team" ? "on" : ""}">${t("team")}</button><button data-t="pop" class="${tab === "pop" ? "on" : ""}">${ICON.fire}${t("popTab")}</button></div>
      ${tab === "pop" ? "" : `<div class="chips" id="years">${yearChips}</div>`}
      ${body}`;

    view.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => go({ t: b.dataset.t }));
    view.querySelectorAll("[data-e]").forEach((b) => b.onclick = () => go({ e: b.dataset.e }));
    view.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => go({ c: b.dataset.c }));
    view.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => go({ c: b.dataset.g + cat[1] }));
    // 只橫向置中已選屆別，不可令整頁上下捲動
    const on = $("#years .on"); if (on) { const box = on.parentElement; box.scrollLeft = on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2; }
    const mine = $(".medal.mine"); if (mine) mine.scrollIntoView({ block: "center" });
    if (tab === "pop") { fillPopularity(); popTimer = setInterval(fillPopularity, 15000); }
  }

  /* ---------- 個人檔案 ---------- */
  /* 今屆出賽資料：組別、分組、檢錄及起跑時間（只限有往績、已配對的參賽者） */
  function meEntry(pid) {
    const race = DB.race, pv = DB.preview;
    if (!race || !pv || daysTo(race.date) < 0) return null;
    for (const c of CATS) {
      const s = ((pv.categories[c] || {}).starters || []).find((x) => x.pid === pid);
      if (s) { const sch = race.schedule.find((x) => x.cat === c); return { cat: c, heat: (sch.heats || 1) > 1 && s.heat ? Number(s.heat) : null, sch, school_zh: s.school_zh }; }
    }
    return null;
  }
  function meRaceBtn(pid) {
    const m = meEntry(pid); if (!m) return "";
    const start = m.heat && m.heat > 1 ? `${t("meStart1")} ${m.sch.start}` : `${t("meStart")} ${m.sch.start}`;
    return `<a class="me-race" href="#/preview?c=${m.cat}&me=${pid}">
      <span class="mr-tag">${esc(t("meTag", DB.race.edition))}</span>
      <b>${esc(catLong(m.cat))}${m.heat ? ` · ${esc(t("meHeat", m.heat))}` : ""}</b>
      <span class="mr-time">${t("meCall")} ${m.sch.call} · ${start}</span>
      <span class="mr-go">${t("meGo")} ›</span></a>`;
  }

  function renderPerson(pid) {
    const p = PEOPLE.get(pid);
    if (!p) return renderNotFound();
    if (p.hidden) { view.innerHTML = `<div class="wip"><h2>${t("hiddenName")}</h2><p>${t("hiddenText")}</p><a class="btn" href="#/">${t("back")}</a></div>`; return; }
    const wins = p.recs.filter((r) => r.rank === 1).length;
    const best = Math.min(...p.recs.map((r) => r.rank));
    const chain = [...p.schools];
    // 校名可點擊進入學校資料頁；同校改名只顯示一次
    const schools = chain.filter((zh, i) => i === 0 || abbrOf(zh) !== abbrOf(chain[i - 1])).map((zh) => `<a href="${schoolHref(zh)}">${esc(school(zh))}</a>`).join(" → ");
    // 校徽鏈：只在真正轉校（代碼不同）時才顯示多個校徽；同校改名只顯示一個
    const crestSchools = chain.filter((zh, i) => i === 0 || (DB.schools[zh] || {}).abbr !== (DB.schools[chain[i - 1]] || {}).abbr);
    const crestChain = crestSchools.map((zh, i) => `${i ? '<span class="cc-arrow" aria-hidden="true">›</span>' : ""}${crest(zh, i === crestSchools.length - 1 ? "lg" : "md")}`).join("");
    const recsDesc = [...p.recs].reverse();
    const pos = (n) => n === 1 ? "g" : n === 2 ? "s" : n === 3 ? "b" : "";

    // 名次走勢（名次越小越高）
    let spark = "";
    if (p.recs.length > 1) {
      const W = 340, H = 130, padX = 24, top = 26, bottom = 30, maxR = Math.max(...p.recs.map((r) => r.rank), 3);
      const x = (i) => padX + (i * (W - padX * 2)) / (p.recs.length - 1);
      const y = (r) => top + ((r - 1) * (H - top - bottom)) / (maxR - 1 || 1);
      const pts = p.recs.map((r, i) => `${x(i).toFixed(1)},${y(r.rank).toFixed(1)}`).join(" ");
      const fill = (n) => n === 1 ? "var(--gold)" : n === 2 ? "var(--silver)" : n === 3 ? "var(--bronze)" : "var(--surface-2)";
      spark = `<div class="section-title"><h2>${t("rankTrend")}</h2></div>
        <div class="board" style="padding:6px 4px"><svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("rankTrend")}">
          <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${p.recs.map((r, i) => `<circle cx="${x(i)}" cy="${y(r.rank)}" r="5" fill="${fill(r.rank)}" stroke="var(--accent)" stroke-width="1.5"/>
            <text x="${x(i)}" y="${y(r.rank) - 10}" text-anchor="middle" font-size="13" fill="var(--text)">${r.rank}</text>
            <text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--muted)">${yearShort(r.year)}</text>`).join("")}
        </svg></div>`;
    }

    view.innerHTML = `
      <section class="hero">
        <h1>${esc(lang === "zh" ? (p.name_zh || p.name_pt) : (p.name_pt || p.name_zh))}</h1>
        <div class="pt">${esc(lang === "zh" ? p.name_pt : p.name_zh)}</div>
        <div class="schools">${schools}</div>
        <div class="st-line">${statusChip(p, true)}</div>
        ${meRaceBtn(pid)}
        ${popCard(0)}
        <div class="crest-chain${crestSchools.length > 1 ? " multi" : ""}">${crestChain}${lvCorner(0)}</div>
        <div class="stats">
          <div class="stat"><b>${p.recs.length}</b><span>${t("races")}</span></div>
          <div class="stat"><b style="color:${best <= 3 ? `var(--${["gold", "silver", "bronze"][best - 1]})` : "inherit"}">${best}</b><span>${t("best")}</span></div>
          <div class="stat"><b style="color:var(--gold)">${wins}</b><span>${t("wins")}</span></div>
        </div>
        <button type="button" class="card-btn" id="cardBtn">${ICON.card}${t("cardBtn")}</button>
      </section>
      ${spark}
      <p class="muted-note">${t("stHow")}</p>
      <div class="section-title"><h2>${t("history")}</h2></div>
      <div class="timeline">${recsDesc.map((r) => `
        <a class="tl" href="#/rank?e=${r.edition}&c=${r.cat}&hl=${r.pid}">
          <span class="yr">${yearShort(r.year)}<small>${t("edition", r.edition)}</small></span>
          <span class="info"><b>${esc(catLong(r.cat))}</b><br>${schoolLine(r.school_zh)}${(() => { const w = wxFor(r.edition, r.cat); return w ? `<span class="tl-wx">${esc(t("wxShort", Math.round(w.temp_avg), w.rh_avg))}${w.rain_reports > 0 ? " · " + t("wxRainY") : ""}</span>` : ""; })()}</span>
          <span class="res"><div class="pos ${pos(r.rank)}">${t("placeShort", r.rank)}</div><div class="tm">${fmt(r.seconds)}</div></span>
        </a>`).join("")}</div>`;
    trackProfileView(pid);
    $("#cardBtn").onclick = () => openCard(p);
  }

  /* ---------- 榮譽卡、觀賽邀請卡（docs/card.js 繪製） ---------- */
  const CARD_MEDAL = 10;
  // 卡上網址及 QR 碼：跟隨目前網址（網站搬到其他 GitHub 帳戶或自訂網域後自動更新）；本機測試時用預設網址
  const SITE_DEFAULT = "xc-escolar-macau.github.io";
  function siteUrl() {
    if (!/^https?:$/.test(location.protocol) || /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname)) return SITE_DEFAULT;
    return (location.host + location.pathname).replace(/index\.html$/, "").replace(/\/$/, "");
  }
  function cardData(p) {
    const last = p.recs.at(-1), zh = (p.status && p.status.code === "active" && p.status.school) || last.school_zh;
    const info = DB.schools[zh] || {}, abbr = info.abbr || zh.slice(0, 2);
    // 本賽事頒獎至第 10 名：榮譽卡「獎牌」＝頭十名（包括第 10 名）
    const medals = p.recs.filter((r) => r.rank <= CARD_MEDAL), wins = medals.filter((r) => r.rank === 1).length;
    const best = Math.min(...p.recs.map((r) => r.rank));
    const newest = [...p.recs].reverse();
    const rows = [...medals].sort((a, b) => a.rank - b.rank || b.edition - a.edition).slice(0, 5);
    for (const r of newest) { if (rows.length >= 5) break; if (r.rank > CARD_MEDAL) rows.push(r); }
    const catZh = (c) => `${c[0] === "M" ? "男子" : "女子"}${c[1]}組`;
    const pbRecs = p.recs.filter((r) => r.cat === last.cat && r.seconds);
    const pb = pbRecs.length ? pbRecs.reduce((a, b) => (b.seconds < a.seconds ? b : a)) : null;
    const st = p.status;
    const status = !st ? null : st.code === "active" ? `在讀・第 ${DB.race.edition} 屆參賽` : st.code === "unsure" ? null : t("st_" + st.code);
    const url = siteUrl();
    return {
      name: p.name_zh || p.name_pt, namePt: p.name_zh ? p.name_pt : "", school: zh, crestImg: DB.crests[abbr] || null, crestAbbr: abbr, crestHue: hueOf(abbr),
      status, statusMuted: !!st && st.code !== "active",
      stats: { races: p.recs.length, wins, medals: medals.length, best },
      tier: wins ? "gold" : best === 2 ? "silver" : medals.length ? "bronze" : "base",
      title: medals.length ? "榮譽紀錄" : "歷屆成績",
      rows: rows.slice(0, 5).sort((a, b) => b.edition - a.edition).map((r) => ({ place: r.rank, year: r.year, edition: r.edition, cat: catZh(r.cat), gender: r.cat[0], time: fmt(r.seconds) })),
      pb: pb ? { label: catZh(pb.cat), time: fmt(pb.seconds), year: pb.year } : null,
      url, qrUrl: `https://${url}/#/p/${p.pid}`, seed: p.pid,
    };
  }
  /* ---------- 完賽紀念卡（非官方；第 48 屆成績，工作人員核對後逐組開放）----------
     查詢：號碼布＋秩序冊姓名（xc_live_cert_lookup，兩者對得上才回傳），不能單憑號碼布查出姓名 */
  function zhOfAbbr(a) {
    const r = ((DB.race && DB.race.schools) || []).find((x) => x.abbr === a);
    if (r) return r.zh;
    const e = Object.entries(DB.schools || {}).find(([, v]) => v.abbr === a);
    return e ? e[0] : a;
  }
  const catZhFull = (c) => `${c[0] === "M" ? "男子" : "女子"}${c[1]}組`;
  function certData(r, ed) {
    const zh = zhOfAbbr(r.abbr), abbr = r.abbr, p = r.pid && PEOPLE.get(r.pid);
    const cz = catZhFull(r.cat), time = r.time_ms == null ? "-" : fmt(r.time_ms / 1000);
    const medal = r.place <= CARD_MEDAL, win = r.place === 1, url = siteUrl(), yr = (DB.race && DB.race.year) || "";
    return {
      name: r.name, namePt: p && p.name_zh ? p.name_pt : "", school: zh, crestImg: DB.crests[abbr] || null, crestAbbr: abbr, crestHue: hueOf(abbr),
      status: `第 ${ed} 屆完賽紀念`, statusMuted: false,
      stats: { races: 1, wins: win ? 1 : 0, medals: medal ? 1 : 0, best: r.place },
      tier: win ? "gold" : r.place === 2 ? "silver" : medal ? "bronze" : "base",
      title: `第 ${ed} 屆成績`,
      rows: [{ place: r.place, year: yr, edition: ed, cat: cz, gender: r.cat[0], time }],
      pb: { text: `${cz}完成時間`, label: cz, time, year: yr },
      source: "資料來源：終點紀錄（已與官方成績核對）",
      cert: { edition: ed, cat: cz, place: r.place, finishers: r.finishers, time,
              event: `第 ${ed} 屆學界越野跑比賽・${(DB.race && DB.race.date || "").replace(/^(\d{4})-(\d{2})-(\d{2})$/, (m, y, mo, d) => `${y}年${+mo}月${+d}日`)}` },
      url, qrUrl: r.pid ? `https://${url}/#/p/${r.pid}` : `https://${url}/#/cert`, seed: `c${r.cat}${r.name}`,
    };
  }
  function renderCert(params) {
    const ed = (DB.race && DB.race.edition) || 48;
    const event = (params.get("ev") || String(ed)).replace(/[^a-z0-9]/gi, "").toLowerCase();
    view.innerHTML = `<h1 class="page-title">${esc(t("ctTitle", ed))}${event !== String(ed) ? ' <span class="lv-pill demo">TEST</span>' : ""}</h1>
      <p class="lv-note">${esc(t("ctNote"))}</p>
      <div id="ctCats" class="ct-cats"><span>&nbsp;</span></div>
      <form id="ctForm" class="ct-form" autocomplete="off" novalidate>
        <label><span>${esc(t("ctBib"))}</span><input id="ctBib" inputmode="numeric" pattern="[0-9]*" maxlength="4" enterkeyhint="next"></label>
        <label><span>${esc(t("ctName"))}</span><input id="ctName" maxlength="60" enterkeyhint="search" autocapitalize="characters"></label>
        <button class="btn-primary ct-go" type="submit">${esc(t("ctGo"))}</button>
      </form>
      <div id="ctOut" aria-live="polite"></div>`;
    rpc("xc_live_cert_cats", { p_event: event }).then((list) => {
      const el = $("#ctCats"); if (!el) return;
      el.innerHTML = list && list.length ? `<span>${esc(t("ctOpen"))}</span>${list.map((x) => `<b class="cat-chip ${x.cat[0] === "M" ? "m" : "f"}">${esc(catLabel(x.cat))}</b>`).join("")}` : `<span>${esc(t("ctWait"))}</span>`;
    }).catch(() => { const el = $("#ctCats"); if (el) el.innerHTML = `<span>${esc(t("ctWait"))}</span>`; });
    $("#ctForm").onsubmit = async (e) => {
      e.preventDefault();
      const out = $("#ctOut"), bib = parseInt($("#ctBib").value.replace(/\D/g, ""), 10), name = $("#ctName").value.trim();
      if (!bib || name.length < 2) { out.innerHTML = `<p class="banner">${esc(t("ctNeed"))}</p>`; return; }
      out.innerHTML = `<div class="skeleton"><i class="sk-row"></i></div>`;
      let r = null;
      try { r = await rpc("xc_live_cert_lookup", { p_event: event, p_bib: bib, p_name: name }); }
      catch (err) { out.innerHTML = `<p class="banner">${esc(t("ctNet"))}</p>`; return; }
      if (!$("#ctOut")) return;
      if (!r) { out.innerHTML = `<p class="banner">${esc(t("ctNone"))}</p>`; return; }
      const zh = zhOfAbbr(r.abbr), multi = ((DB.race.schedule || []).find((x) => x.cat === r.cat) || {}).heats > 1;
      out.innerHTML = `<section class="ct-res">
        <div class="ct-head">${crest(zh, "md")}<div><b>${esc(r.name)}</b><small>${esc(school(zh))}</small></div></div>
        <div class="ct-grid">
          <div><span>${esc(t("ctCat"))}</span><b>${esc(catZhFull(r.cat))}</b>${multi && r.heat ? `<small>${esc(t("ctHeat", r.heat))}</small>` : ""}</div>
          <div><span>${esc(t("ctPlace"))}</span><b>${esc(t("ctPlaceV", r.place))}</b><small>${esc(t("ctOf", r.finishers))}</small></div>
          <div><span>${esc(t("ctTime"))}</span><b class="num">${r.time_ms == null ? "-" : fmt(r.time_ms / 1000)}</b></div>
        </div>
        <button class="card-btn" id="ctExport" type="button">${esc(t("ctExport"))}</button>
        ${r.pid && PEOPLE.has(r.pid) ? `<a class="ct-hist" href="#/p/${esc(r.pid)}">${esc(t("ctHist"))} ›</a>` : ""}
        <a class="ct-hist" id="ctPhotos" href="#/photos${event !== String(ed) ? "?ev=" + event : ""}">${esc(t("phBtn"))} ›</a>
      </section>`;
      $("#ctExport").onclick = () => openCertCard(r, ed);
      $("#ctPhotos").onclick = () => { PH_LAST = { event, bib, name }; };
    };
  }
  function openCertCard(r, ed) {
    let st = "dash";
    try { const v = localStorage.getItem("xc-card-style"); if (CARD_STYLES.includes(v)) st = v; } catch (e) { /* 無痕模式 */ }
    const draw = (k) => { const d = certData(r, ed), S = window.XCCardStyles; return k !== "classic" && S && S[k] ? S[k](d) : XCCard.render(d); };
    openExport(t("ctExport"), `${r.name}_第${ed}屆完賽紀念卡.png`, draw, {
      list: CARD_STYLES.map((k) => [k, t("cs_" + k)]), current: st,
      pick: (k) => { try { localStorage.setItem("xc-card-style", k); } catch (e) { /* 無痕模式 */ } },
    });
  }
  /* ---------- 比賽相片（第 48 屆起）：號碼布＋姓名兩者對得上才回傳相片（supabase/008_photos.sql 的 xc_photo_lookup） ---------- */
  const PH_END = Date.parse("2027-09-01T00:00:00+08:00");   // 保留一個學年
  let PH_LAST = null;   // 本次瀏覽最近一次查詢（只存在記憶體，不寫入網址或瀏覽器）
  const photoUrl = (path) => `${(DB.site.photos || DB.site.views).url}/storage/v1/object/public/xc-photos/${path}`;   // 相片檔案在獨立的相片專案
  const refreshBtn = (id) => `<button class="lv-refresh" id="${id}" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t("lvRefresh")}</button>`;
  function renderPhotos(params) {
    const ed = (DB.race && DB.race.edition) || 48;
    const event = (params.get("ev") || String(ed)).replace(/[^a-z0-9]/gi, "").toLowerCase();
    const expired = (window.XC_NOW || Date.now()) >= PH_END;   // XC_NOW 只供測試
    view.innerHTML = `<h1 class="page-title">${esc(t("phTitle", ed))}${event !== String(ed) ? ' <span class="lv-pill demo">TEST</span>' : ""}</h1>
      <p class="lv-note">${esc(t("phNote"))} ${esc(t("phKeep"))}</p>
      ${expired ? `<p class="banner">${esc(t("phExpired"))}</p>` : `<form id="phForm" class="ct-form" autocomplete="off" novalidate>
        <label><span>${esc(t("ctBib"))}</span><input id="phBib" inputmode="numeric" pattern="[0-9]*" maxlength="4" enterkeyhint="next"></label>
        <label><span>${esc(t("ctName"))}</span><input id="phName" maxlength="60" enterkeyhint="search" autocapitalize="characters"></label>
        <button class="btn-primary ct-go" type="submit">${esc(t("ctGo"))}</button>
      </form>
      <div id="phOut" aria-live="polite"></div>`}`;
    if (expired) return;
    const last = PH_LAST && PH_LAST.event === event ? PH_LAST : null;
    const run = async () => {
      const out = $("#phOut"), bib = parseInt($("#phBib").value.replace(/\D/g, ""), 10), name = $("#phName").value.trim();
      if (!bib || name.length < 2) { out.innerHTML = `<p class="banner">${esc(t("phNeed"))}</p>`; return; }
      out.innerHTML = `<div class="skeleton"><i class="sk-row"></i></div>`;
      let list = null;
      try { list = await rpc("xc_photo_lookup", { p_event: event, p_bib: bib, p_name: name }); }
      catch (err) { if ($("#phOut")) out.innerHTML = `<p class="banner">${esc(t("ctNet"))}</p>`; return; }
      if (!$("#phOut")) return;
      PH_LAST = { event, bib, name };
      if (!list || !list.length) {
        out.innerHTML = `<p class="banner">${esc(t("phNone"))}</p><div class="ph-bar">${refreshBtn("phRefresh")}</div>`;
      } else {
        out.innerHTML = `<div class="ph-bar"><b>${esc(t("phCount", list.length))}</b>${refreshBtn("phRefresh")}</div>
          <div class="ph-grid">${list.map((p, i) => `<button type="button" class="ph-tile" data-i="${i}" aria-label="${esc(t("phOpen", i + 1, list.length))}"><img alt="" loading="lazy" src="${esc(photoUrl(p.t))}"></button>`).join("")}</div>`;
        out.querySelectorAll(".ph-tile").forEach((b) => { b.onclick = () => openPhoto(list, +b.dataset.i, ed); });
      }
      $("#phRefresh").onclick = run;
    };
    $("#phForm").onsubmit = (e) => { e.preventDefault(); run(); };
    if (last) { $("#phBib").value = last.bib; $("#phName").value = last.name; run(); }
  }
  function openPhoto(list, i, ed) {
    const box = document.createElement("div");
    box.className = "card-modal ph-modal"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    document.body.appendChild(box);
    const site = DB.site || {};
    let url = null;
    const close = () => { box.remove(); document.removeEventListener("keydown", onKey); if (url) URL.revokeObjectURL(url); };
    const onKey = (e) => { if (e.key === "Escape") close(); else if (e.key === "ArrowLeft" && i > 0) show(i - 1); else if (e.key === "ArrowRight" && i < list.length - 1) show(i + 1); };
    document.addEventListener("keydown", onKey);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    const show = async (k) => {
      i = k;
      const p = list[i], code = String(p.id).slice(0, 8), ext = /\.jpg$/.test(p.f) ? "jpg" : "webp";
      const file = `第${ed}屆學界越野跑_${code}.${ext}`;
      box.setAttribute("aria-label", t("phOpen", i + 1, list.length));
      box.innerHTML = `<div class="cm-inner">
        <div class="ph-nav"><button type="button" class="cm-close" id="phPrev" ${i ? "" : "disabled"}>${t("phPrev")}</button><span>${esc(t("phOpen", i + 1, list.length))}</span><button type="button" class="cm-close" id="phNext" ${i < list.length - 1 ? "" : "disabled"}>${t("phNext")}</button></div>
        <div class="cm-img"><img src="${esc(photoUrl(p.t))}" alt="" class="ph-low"></div>
        <div class="cm-btns"><a class="btn-primary" id="phSave" aria-disabled="true">${t("phDl")}</a><button type="button" class="cm-share" id="phShare" hidden>${t("cardShare")}</button><button type="button" class="cm-close" id="phClose">${t("cardClose")}</button></div>
        <p class="muted-note">${esc(t("phCode", code))}${site.removal_url ? ` · <a href="${esc(site.removal_url)}" target="_blank" rel="noopener">${esc(t("phRemove"))}</a>` : ""}</p></div>`;
      $("#phClose").onclick = close; $("#phClose").focus();
      $("#phPrev").onclick = () => show(i - 1); $("#phNext").onclick = () => show(i + 1);
      try {
        const r = await fetch(photoUrl(p.f), { cache: "force-cache" });
        if (!r.ok) throw new Error(String(r.status));
        const blob = await r.blob();
        if (!box.isConnected || list[i] !== p) return;
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        box.querySelector(".cm-img").innerHTML = `<img src="${url}" alt="${esc(t("phOpen", i + 1, list.length))}">`;
        const a = $("#phSave"); a.href = url; a.download = file; a.removeAttribute("aria-disabled");
        const f = new File([blob], file, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { const sh = $("#phShare"); sh.hidden = false; sh.onclick = () => navigator.share({ files: [f], title: file }).catch(() => { /* 使用者取消 */ }); }
      } catch (e) {
        if (box.isConnected && list[i] === p) box.querySelector(".cm-img").insertAdjacentHTML("beforeend", `<p class="banner">${esc(t("phFail"))}</p>`);
      }
    };
    show(i);
  }
  // 榮譽卡款式：衝線、山徑、號碼布（docs/card-styles.js）及經典（docs/card.js）；記住使用者上次的選擇
  const CARD_STYLES = ["dash", "trail", "bib", "classic"];
  function openCard(p) {
    let st = "dash";
    try { const v = localStorage.getItem("xc-card-style"); if (CARD_STYLES.includes(v)) st = v; } catch (e) { /* 無痕模式 */ }
    const draw = (k) => { const d = cardData(p), S = window.XCCardStyles; return k !== "classic" && S && S[k] ? S[k](d) : XCCard.render(d); };
    openExport(t("cardBtn"), `${p.name_zh || p.name_pt}_榮譽卡.png`, draw, {
      list: CARD_STYLES.map((k) => [k, t("cs_" + k)]), current: st,
      pick: (k) => { try { localStorage.setItem("xc-card-style", k); } catch (e) { /* 無痕模式 */ } },
    });
  }
  async function openExport(label, name, make, styles) {
    const box = document.createElement("div");
    box.className = "card-modal"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", label);
    const pick = styles ? `<div class="cm-styles" role="radiogroup" aria-label="${esc(t("csLabel"))}">${styles.list.map(([k, l]) =>
      `<button type="button" role="radio" data-k="${k}" aria-checked="${k === styles.current}">${esc(l)}</button>`).join("")}</div>` : "";
    box.innerHTML = `<div class="cm-inner">${pick}<div class="cm-img"><div class="skeleton"><i class="sk-card"></i></div></div>
      <div class="cm-btns"><a class="btn-primary" id="cmSave" aria-disabled="true">${t("cardSave")}</a><button type="button" class="cm-share" id="cmShare" hidden>${t("cardShare")}</button><button type="button" class="cm-close" id="cmClose">${t("cardClose")}</button></div>
      <p class="muted-note">${t("cardNote")}</p></div>`;
    document.body.appendChild(box);
    const close = () => { box.remove(); document.removeEventListener("keydown", onKey); if (box._url) URL.revokeObjectURL(box._url); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    $("#cmClose").onclick = close; $("#cmClose").focus();
    let job = 0;
    const gen = async (key) => {
      const my = ++job, a = $("#cmSave"), sh = $("#cmShare");
      a.setAttribute("aria-disabled", "true"); sh.hidden = true;
      if (box._url) { box.querySelector(".cm-img").classList.add("busy"); }
      try {
        const cv = await make(key);
        const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
        if (my !== job || !box.isConnected) return;   // 已轉款式或已關閉
        if (box._url) URL.revokeObjectURL(box._url);
        const url = box._url = URL.createObjectURL(blob);
        const im = box.querySelector(".cm-img"); im.classList.remove("busy");
        im.innerHTML = `<img src="${url}" alt="${esc(label)}">`;
        a.href = url; a.download = name; a.removeAttribute("aria-disabled");
        const file = new File([blob], name, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          sh.hidden = false;
          sh.onclick = () => navigator.share({ files: [file], title: name }).catch(() => { /* 使用者取消 */ });
        }
      } catch (e) {
        console.error(e);
        if (my === job) box.querySelector(".cm-img").innerHTML = `<p class="banner">${t("cardFail")}</p>`;
      }
    };
    if (styles) box.querySelectorAll(".cm-styles button").forEach((b) => b.addEventListener("click", () => {
      if (b.getAttribute("aria-checked") === "true") return;
      box.querySelectorAll(".cm-styles button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      styles.pick(b.dataset.k); gen(b.dataset.k);
    }));
    gen(styles ? styles.current : undefined);
  }


  /* ---------- 第 48 屆賽前預覽 ---------- */
  function daysTo(dateStr) {
    const now = new Date(); const d = new Date(dateStr + "T00:00:00");
    return Math.round((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  }
  function raceBanner() {
    const race = DB.race, pv = DB.preview;
    if (!race || !pv) return "";
    const days = daysTo(race.date);
    if (days < -30) return ""; // 賽後一個月不再顯示
    const first = race.schedule.slice().sort((a, b) => a.start.localeCompare(b.start))[0];
    const venue = lang === "zh" ? race.venue_zh : race.venue_pt;
    const live = days <= 0 && days >= -3; // 比賽當日起三日內：橫額改為連去即時成績
    return `<a class="race-banner${live ? " live" : ""}" href="${live ? "#/live" : "#/preview"}">
      <div class="rb-main"><div class="rb-title">${esc(t("pvBanner", race.edition))}</div>
      <div class="rb-when">${esc(t("pvWhen", t("dateFmt", new Date(race.date + "T00:00:00")), first.start, venue))}</div></div>
      <div class="rb-side"><span class="rb-days">${esc(t("pvDays", days))}</span><span class="rb-go">${live ? t("lvGo") : t("pvGo")} ›</span></div>
    </a>`;
  }


  /* 分組標記：男C、女C 分組出發，列出所屬分組（C1、C2…） */
  const multiHeat = (cat) => ((DB.race && DB.race.schedule.find((x) => x.cat === cat)) || {}).heats > 1;
  const heatTag = (cat, h) => (h && multiHeat(cat) ? `<b class="pv-heat">${cat[1]}${h}</b>` : "");

  /* 預測排名：只列出能以往績推算的選手；相鄰差距小於門檻者合併成「實力接近」組 */
  function predictionBoard(info, cat) {
    const list = info.prediction || [];
    const meta = DB.preview.prediction_meta || {};
    if (!list.length) return `<p class="muted-note">${t("pdNone")}</p>`;
    const schoolOf = new Map(info.starters.map((s) => [s.pid, s.school_zh]));
    const heatOf = new Map(info.starters.map((s) => [s.pid, s.heat]));
    const lead = list[0].idx;
    let html = "", openGroup = null, shown = 0;
    list.forEach((x, i) => {
      const p = x.pid ? PEOPLE.get(x.pid) : null;
      if (x.pid && !p) return;
      shown++;
      const sch = x.pid ? schoolOf.get(x.pid) : x.school_zh;
      if (x.close && openGroup !== x.g) { if (openGroup !== null) html += "</div>"; html += `<div class="close-group"><div class="cg-label">${t("pdClose")}</div>`; openGroup = x.g; }
      else if (!x.close && openGroup !== null) { html += "</div>"; openGroup = null; }
      const gap = ((x.idx / lead - 1) * 100);
      const tags = [];
      if (x.aecm_rank) tags.push(`<span class="tag ${x.aecm_rank <= 3 ? "gold" : ""}">${t("pdAecm", x.aecm_rank, x.aecm_time)}</span>`);
      if (!x.pid) tags.push(`<span class="tag new">${t("pdNewbie")}</span>`);
      if (!x.aecm_rank && sch === "濠江中學") tags.push(`<span class="tag warn">${t("pdNoForm")}</span>`);
      const last = p ? p.recs.at(-1) : null;
      const name = p ? personName(p) : esc(x.name_zh);
      const tagName = x.pid ? "a" : "div";
      html += `<${tagName} class="row cr pd-row" ${x.pid ? `href="#/p/${x.pid}"` : ""}>
        <span class="rank ${i < 3 ? "r" + (i + 1) : ""}">${i + 1}</span>
        ${crest(sch, "sm")}
        <span style="min-width:0"><div class="nm">${name}</div><div class="sch">${heatTag(cat, x.pid ? heatOf.get(x.pid) : x.heat)}${esc(school(sch))}</div>${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}</span>
        <span class="pv-res"><b>${i === 0 ? t("pdTop") : "+" + gap.toFixed(1) + "%"}</b><span class="pd-last">${last ? `${t("pvLast")} ${catLabel(last.cat)} ${t("placeShort", last.rank)}` : t("pdNoHist")}</span></span>
      </${tagName}>`;
    });
    if (openGroup !== null) html += "</div>";
    const bt = meta.backtest || {}, ae = meta.aecm;
    return `<div class="board">${html}</div>
      <div class="pd-note">
        <p><b>${t("pdNoteTitle")}</b>${t("pdNote1", meta.close ? (meta.close * 100).toFixed(0) : 2)}</p>
        ${ae ? `<p>${t("pdNoteAecm", ae.name, Math.round((meta.aecm_weight || .6) * 100), ae.distances)}</p>` : ""}
        <p>${t("pdNote2", bt.spearman, bt.top3_hit)}</p>
        <p class="pd-warn">${t("pdNoteHK")}</p>
        <p class="pd-warn">${t("pdNote3", Math.max(info.total - shown, 0))}</p>
      </div>`;
  }


  /* 預覽頁頂部滑動區：真實相片做底的資訊卡 */
  function previewHero(race, pv) {
    const days = daysTo(race.date);
    const first = race.schedule.slice().sort((a, b) => a.start.localeCompare(b.start));
    const venue = lang === "zh" ? race.venue_zh : race.venue_pt;
    const nm = (x) => {
      if (!x.pid) return { name: x.name_zh, school: x.school_zh };
      const p = PEOPLE.get(x.pid); const st = pv.categories ? null : null;
      return { name: p ? (lang === "zh" ? (p.name_zh || p.name_pt) : (p.name_pt || p.name_zh)) : "", school: null };
    };
    const champs = CATS.map((c) => {
      const top = (pv.categories[c].prediction || [])[0]; if (!top) return "";
      const st = top.pid ? pv.categories[c].starters.find((s) => s.pid === top.pid) || {} : top;
      const sch = st.school_zh, hh = multiHeat(c) && st.heat ? st.heat : "";
      const n = nm(top).name;
      return `<a class="mini-row ${c[0] === "M" ? "m" : "f"}" href="#/preview?c=${c}&v=pred"><span class="cat">${catLabel(c)}${hh}</span><span class="who">${crest(sch, "xs")}${esc(n)}<small>${esc(school(sch))}</small></span><span class="t">${top.close ? `<small class="cl">${t("pdClose")}</small>` : ""}</span></a>`;
    }).join("");
    const horses = CATS.flatMap((c) => (pv.categories[c].prediction || []).filter((x) => !x.pid && x.aecm_rank && x.aecm_rank <= 3).map((x) => ({ ...x, c })))
      .sort((a, b) => a.aecm_rank - b.aecm_rank).slice(0, 8)
      .map((x) => `<div class="mini-row ${x.c[0] === "M" ? "m" : "f"}"><span class="cat">${catLabel(x.c)}${multiHeat(x.c) && x.heat ? x.heat : ""}</span><span class="who">${crest(x.school_zh, "xs")}${esc(x.name_zh)}<small>${esc(school(x.school_zh))}</small></span><span class="t">${t("pdAecmShort", x.aecm_rank)}</span></div>`).join("");
    const sched = first.map((x) => `<div class="mini-row ${x.cat[0] === "M" ? "m" : "f"}"><span class="cat">${catLabel(x.cat)}</span><span class="who">${x.distance.toLocaleString()}${lang === "zh" ? " 米" : " m"}<small>${x.runners}${t("pvRunnersUnit")}</small></span><span class="t">${x.start}</span></div>`).join("");
    const cards = [
      { photo: "arch", cls: "c-green hero-card", title: t("hcTitle"), sub: `${t("dateFmt", new Date(race.date + "T00:00:00"))} ${first[0].start} · ${venue}`,
        body: `<div class="hc-count"><b>${days > 0 ? days : days === 0 ? "0" : "-"}</b><span>${esc(t("pvDays", days))}</span></div>
               ${(() => { const f = fcNow(); return f ? `<div class="hc-fc">${esc(t("fcShort", f.temp_min, f.temp_max))} · ${esc(fcSky(f))}</div>` : ""; })()}
               <div class="hc-stats"><div><b>${Object.values(race.totals).reduce((a, b) => a + b, 0)}</b><span>${t("hcRunners")}</span></div><div><b>${race.schools.length}</b><span>${t("hcSchools")}</span></div><div><b>10</b><span>${t("hcCats")}</span></div></div>` },
      { photo: "start", cls: "c-steel", title: t("hcSched"), sub: t("hcSchedSub"), body: `<div class="mini">${sched}</div>` },
      { photo: "champ", cls: "c-gold", title: t("hcChamps"), sub: t("hcChampsSub"), body: `<div class="mini">${champs}</div>`, note: t("hcPredNote") },
      { photo: "runner", cls: "c-steel", title: t("hcPopular"), sub: Views.live() ? t("popLive") : t("popDemo"), body: `<div class="mini" id="heroPop"><div class="empty">${t("popEmpty")}</div></div>` },
      { photo: "girls", cls: "c-green", title: t("hcHorse"), sub: t("hcHorseSub"), body: `<div class="mini">${horses || `<div class="empty">-</div>`}</div>` },
    ];
    return `<div class="carousel pv-carousel" id="pvCarousel">${cards.map((k) => `<article class="card photo ${k.cls}" style="--photo:url(img/race/${k.photo}.jpg)"><h3>${esc(k.title)}</h3><div class="sub">${esc(k.sub)}</div>${k.body}${k.note ? `<div class="note">${esc(k.note)}</div>` : ""}</article>`).join("")}</div>
      <div class="dots" id="pvDots">${cards.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>`;
  }
  async function fillHeroPopular() {
    const box = $("#heroPop"); if (!box) return;
    try {
      const rows = (await Views.top(20)).filter((r) => PEOPLE.has(r.pid) && !PEOPLE.get(r.pid).hidden && r.views > 0).slice(0, 6);
      if (!rows.length || !document.body.contains(box)) return;
      box.innerHTML = rows.map((r, i) => { const p = PEOPLE.get(r.pid), last = p.recs.at(-1);
        return `<a class="mini-row ${p.gender === "M" ? "m" : "f"}" href="#/p/${r.pid}"><span class="cat">${i + 1}</span><span class="who">${crest(last.school_zh, "xs")}${esc(lang === "zh" ? (p.name_zh || p.name_pt) : (p.name_pt || p.name_zh))}<small>${esc(school(last.school_zh))}</small></span><span class="t">${lvBadge(r.views)}</span></a>`; }).join("");
    } catch (e) { /* 人氣暫時讀不到時保留預設文字 */ }
  }

  /* 賽前預覽「學校名單」：每校一個下拉，列出出戰隊員（姓名、分組、往績） */
  const PV_TRIED = new Set();
  function previewSchools(cat, info) {
    const race = DB.race, ev = String(race.edition);
    const list = ROSTERS.get(ev);
    const sch = race.schedule.find((x) => x.cat === cat), multi = (sch.heats || 1) > 1;
    const n = XCLive.TEAM_N[cat[1]];
    // 按預測團體名次排列：每校取預測名次最前的 n 人相加；未能預測者當作排在全部已預測者之後；不足 n 人者排最後
    const pred = info.prediction || [], P = pred.length, schoolOfPid = new Map(info.starters.map((s) => [s.pid, s.school_zh]));
    const places = {};
    pred.forEach((x, i) => { const a = abbrOf(x.pid ? schoolOfPid.get(x.pid) : x.school_zh); (places[a] = places[a] || []).push(i + 1); });
    const teamScore = (x) => { const pl = (places[x.abbr] || []).slice(0, n); return pl.reduce((s, v) => s + v, 0) + (n - pl.length) * (P + 1); };
    const best = (x) => (places[x.abbr] || [Infinity])[0];
    const schools = race.schools.filter((x) => x.n && x.n[cat]).sort((a, b) => (b.n[cat] >= n) - (a.n[cat] >= n)
      || (a.n[cat] >= n ? teamScore(a) - teamScore(b) || best(a) - best(b) : 0) || b.n[cat] - a.n[cat] || a.abbr.localeCompare(b.abbr));
    const members = list ? list.filter((r) => r.cat === cat) : info.starters.map((x) => ({ abbr: abbrOf(x.school_zh), heat: x.heat ? Number(x.heat) : null, pid: x.pid, name: null }));
    const html = schools.map((x) => {
      const mine = members.filter((m) => m.abbr === x.abbr).sort((a, b) => (a.heat || 0) - (b.heat || 0) || String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant"));
      const mix = multi && list ? (() => { const c = {}; mine.forEach((m) => { c[m.heat] = (c[m.heat] || 0) + 1; }); return Object.keys(c).sort().map((h) => `${cat[1]}${h}×${c[h]}`).join(" · "); })() : "";
      const rows = mine.map((m) => {
        const p = m.pid && PEOPLE.get(m.pid);
        const nm = p && !p.hidden ? `<a href="#/p/${m.pid}">${personName(p)}</a>` : m.name ? esc(m.name) : `<span class="muted">${t("lvRunner")}</span>`;
        let past = t("pvFirstTime");
        if (p && !p.hidden) { const last = p.recs.at(-1); past = `${yearShort(last.year)} ${catLabel(last.cat)} ${t("placeShort", last.rank)}`; }
        return `<li><span class="mn">${nm}</span><span class="ms">${multi && m.heat ? `<b class="pv-heat">${cat[1]}${m.heat}</b>` : ""}${esc(past)}</span></li>`;
      }).join("");
      const more = list ? 0 : x.n[cat] - mine.length; // 後備模式：未有往績者未能列出姓名
      return `<details class="pv-sch"><summary>${crest(x.zh, "sm")}<span class="ps-n"><b>${esc(school(x.zh))}</b><small>${esc([t("pvSchCount", x.n[cat]), x.n[cat] >= n ? t("pvTeamYes") : t("pvTeamNo", n), mix].filter(Boolean).join(" · "))}</small></span><i class="lv-caret" aria-hidden="true"></i></summary><ul>${rows}${more > 0 ? `<li class="more"><span class="mn muted">${t("pvMore", more)}</span></li>` : ""}</ul></details>`;
    }).join("");
    return `${list ? "" : `<p class="banner">${t("pvRosterFallback")}</p>`}<div class="board pv-schools">${html}</div><p class="muted-note">${t("pvSchNote")}</p>`;
  }

  function cheerPool(pid, cat, info) {
    const p = PEOPLE.get(pid), C = t("meCheers"), last = p.recs.at(-1), lastEd = LATEST.edition;
    const keys = [];
    if (last.edition === lastEd && last.cat === cat && last.rank === 1) keys.push("defend");
    else if (last.edition === lastEd && last.cat === cat && last.rank <= 3) keys.push("top3");
    else if (last.edition === lastEd && last.cat !== cat) keys.push("up");
    else if (last.edition < lastEd) keys.push("back");
    const pi = (info.prediction || []).findIndex((x) => x.pid === pid);
    if (pi >= 0 && pi < 10 && !keys.includes("defend")) keys.push("top10");
    if (pi >= 0 && info.prediction[pi].close) keys.push("close");
    const pool = [...keys.flatMap((k) => C[k]), ...C.all];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    // 有特別身份者（衛冕、升組等）第一句先用專屬打氣語
    if (keys.length) { const first = C[keys[0]][Math.floor(Math.random() * C[keys[0]].length)]; pool.splice(pool.indexOf(first), 1); pool.unshift(first); }
    return pool;
  }
  function inviteData(pid, m) {
    const p = PEOPLE.get(pid), zh = m.school_zh, info = DB.schools[zh] || {}, abbr = info.abbr || zh.slice(0, 2);
    const race = DB.race, d = new Date(race.date + "T00:00:00");
    const url = siteUrl();
    return {
      name: p.name_zh || p.name_pt, namePt: p.name_zh ? p.name_pt : "", school: zh, crestImg: DB.crests[abbr] || null, crestAbbr: abbr, crestHue: hueOf(abbr),
      edition: race.edition, cat: `${m.cat[0] === "M" ? "男子" : "女子"}${m.cat[1]}組`, heat: m.heat,
      date: `${d.getMonth() + 1}月${d.getDate()}日（星期${"日一二三四五六"[d.getDay()]}）`, venue: race.venue_zh,
      call: m.sch.call, start: m.sch.start, laps: m.sch.laps_zh, distance: m.sch.distance,
      startLabel: m.heat && m.heat > 1 ? "第 1 組起跑" : "起跑",
      note: m.heat && m.heat > 1 ? `第 ${m.heat} 組：第 1 組出發後，各組隨即順序起跑` : "",
      url, qrUrl: `https://${url}/#/preview?c=${m.cat}&me=${pid}`, seed: pid,
    };
  }
  function meCard(pid, cat, info) {
    const m = meEntry(pid), p = PEOPLE.get(pid);
    if (!m || m.cat !== cat || !p || p.hidden) return "";
    const pool = cheerPool(pid, cat, info);
    return `<section class="me-card" id="meCard" data-pool="${esc(JSON.stringify(pool))}" data-i="0">
      <div class="mc-tag">${esc(t("meHi"))}</div>
      <div class="mc-head">${crest(m.school_zh, "lg")}<span><b>${personName(p, false)}</b><small>${esc(school(m.school_zh))} · ${esc(catLong(cat))}${m.heat ? ` · ${esc(t("meHeat", m.heat))}` : ""}</small></span></div>
      <div class="mc-times"><div><span>${t("meCall")}</span><b>${m.sch.call}</b></div><div><span>${m.heat && m.heat > 1 ? t("meStart1") : t("meStart")}</span><b>${m.sch.start}</b></div></div>
      ${m.heat && m.heat > 1 ? `<p class="mc-note">${esc(t("meLater", m.heat))}</p>` : ""}
      <p class="mc-cheer" id="meCheer" aria-live="polite">${esc(pool[0])}</p>
      <div class="mc-btns"><button type="button" class="mc-more" id="meMore">${t("meMore")}</button>
      <button type="button" class="mc-inv" id="meInv">${ICON.card}${t("invBtn")}</button></div>
    </section>`;
  }

  function renderPreview(params) {
    const race = DB.race, pv = DB.preview;
    if (!race || !pv) return renderNotFound();
    const cat = CATS.includes(params.get("c")) ? params.get("c") : "MA";
    const g = cat[0];
    const mode = params.get("v") === "pred" && pv.categories[cat].prediction ? "pred" : params.get("v") === "sch" ? "sch" : "past";
    const me = /^p\d{2}[MF][A-E]\d{3}$/.test(params.get("me") || "") && PEOPLE.has(params.get("me")) ? params.get("me") : "";
    const go = (c, v = mode) => { location.replace("#/preview?c=" + c + (v !== "past" ? "&v=" + v : "") + (me && c === cat ? "&me=" + me : "")); };
    const ev = String(race.edition);
    // 學校名單需要出戰名單（公開函數，含秩序冊姓名）；未載入時先顯示有往績者，載入後重繪
    if (mode === "sch" && !ROSTERS.has(ev) && !PV_TRIED.has(ev)) { PV_TRIED.add(ev); loadRoster(ev).then(() => { if (location.hash.startsWith("#/preview")) renderPreview(params); }); }
    const sch = race.schedule.find((x) => x.cat === cat);
    const dist = sch.distance, distRules = sch.distance_rules;
    const m = (v) => v.toLocaleString() + (lang === "zh" ? " 米" : " m");
    const info = pv.categories[cat];
    const lastEd = LATEST.edition;
    const rows = info.starters.map((s) => {
      const p = PEOPLE.get(s.pid);
      const last = p.recs.at(-1);
      const best = p.recs.reduce((b, r) => (r.rank < b.rank ? r : b), p.recs[0]);
      let group = "older";
      if (last.edition === lastEd && last.cat === cat) group = "same";
      else if (last.edition === lastEd) group = "up";
      return { s, p, last, best, group };
    });
    const order = { same: 0, up: 1, older: 2 };
    rows.sort((a, b) => order[a.group] - order[b.group] || b.last.edition - a.last.edition || "ABCDE".indexOf(a.last.cat[1]) - "ABCDE".indexOf(b.last.cat[1]) || a.last.rank - b.last.rank);
    const head = { same: t("pvSame"), up: t("pvUp"), older: t("pvOlder") };
    let html = "", cur = "";
    for (const x of rows) {
      if (x.group !== cur) { cur = x.group; html += `<div class="pv-group">${esc(head[cur])}</div>`; }
      const tags = [];
      if (x.group === "same" && x.last.rank === 1) tags.push(`<span class="tag gold">${t("pvDefend")}</span>`);
      else if (x.group === "same" && x.last.rank <= 3) tags.push(`<span class="tag">${t("pvTop3")}</span>`);
      if (x.group === "up") tags.push(`<span class="tag">${esc(t("pvUpTag", catLabel(x.last.cat)))}</span>`);
      const lastTxt = `${x.group === "older" ? yearShort(x.last.year) : t("pvLast")} ${catLabel(x.last.cat)} ${t("placeShort", x.last.rank)}`;
      html += `<a class="row cr pv-row" href="#/p/${x.p.pid}">
        <span class="rank ${x.group === "same" && x.last.rank <= 3 ? "r" + x.last.rank : ""}">${x.group === "same" ? x.last.rank : "·"}</span>
        ${crest(x.s.school_zh, "sm")}
        <span style="min-width:0"><div class="nm">${personName(x.p)}</div>
          <div class="sch">${heatTag(cat, x.s.heat)}${esc(school(x.s.school_zh))}</div>
          ${x.last.school_zh !== x.s.school_zh && (DB.schools[x.last.school_zh] || {}).abbr !== (DB.schools[x.s.school_zh] || {}).abbr ? `<div class="prev-school"><span>${t("prevSchool")}</span>${schoolLine(x.last.school_zh)}</div>` : ""}
          ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}</span>
        <span class="pv-res"><b>${esc(lastTxt)}</b><span>${fmt(x.last.seconds)}</span></span>
      </a>`;
    }
    const catBtns = (letters) => letters.split("").map((l) => `<button class="${cat === g + l ? "on" : ""}" data-c="${g + l}">${l}</button>`).join("");
    view.innerHTML = `
      <h1 class="page-title pv-title">${esc(t("pvTitleZh"))}<small lang="pt">${esc(t("pvTitlePt"))}</small></h1>
      ${me ? meCard(me, cat, info) : ""}
      <div class="link-row"><a href="#/live">${t("lvGo")} ›</a><a href="#/cert">${t("ctBtn")} ›</a><a href="#/photos">${t("phBtn")} ›</a>
        <button class="lv-refresh" id="pvRefresh" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t("lvRefresh")}</button></div>
      ${previewHero(race, pv)}
      <div class="filters">
        <div class="toggle"><button class="m ${g === "M" ? "on" : ""}" data-g="M">${t("male")}</button><button class="f ${g === "F" ? "on" : ""}" data-g="F">${t("female")}</button></div>
        <div class="cats"><span class="grp">${t("secondary")}</span>${catBtns("ABC")}<span class="grp">${t("primary")}</span>${catBtns("DE")}</div>
      </div>
      <section class="pv-info">
        <div class="pv-cat">${esc(catLong(cat))}</div>
        <dl>
          <div><dt>${t("pvCall")}</dt><dd>${sch.call}</dd></div>
          <div><dt>${t("pvStart")}</dt><dd>${sch.start}</dd></div>
          <div><dt>${t("pvDist")}</dt><dd>${m(dist)}</dd></div>
          <div><dt>${t("pvRunners")}</dt><dd>${sch.runners}</dd></div>
        </dl>
        <div class="pv-sub">${esc(lang === "zh" ? sch.laps_zh : sch.laps_en)} · ${esc(t("pvHeats", sch.heats))}</div>
        <div class="dist-pair">${distRules && distRules !== dist
          ? `<span><b>${t("distSched")}</b>${m(dist)}</span><span><b>${t("distRules")}</b>${m(distRules)}</span><em>${t("distDiffer")}</em>`
          : `<span><b>${t("distSched")}</b>${m(dist)}</span><span><b>${t("distRules")}</b>${distRules ? m(distRules) : "-"}</span><em>${t("distSame")}</em>`}</div>
      </section>
      ${fcCard()}
      <div class="board-head pv-head"><h2>${esc(mode === "pred" ? t("pdHead", (info.prediction || []).length, info.total) : mode === "sch" ? t("pvSchHead", race.schools.filter((x) => x.n && x.n[cat]).length, info.total) : t("pvKnown", info.starters.length, info.total))}</h2>
        <div class="mini-seg" role="tablist"><button role="tab" data-v="past" class="${mode === "past" ? "on" : ""}" aria-selected="${mode === "past"}">${t("pdPast")}</button><button role="tab" data-v="pred" class="${mode === "pred" ? "on" : ""}" aria-selected="${mode === "pred"}">${t("pdPred")}</button><button role="tab" data-v="sch" class="${mode === "sch" ? "on" : ""}" aria-selected="${mode === "sch"}">${t("pdSchools")}</button></div></div>
      ${mode === "pred" ? predictionBoard(info, cat) : mode === "sch" ? previewSchools(cat, info) : `${rows.length ? `<div class="board">${html}</div>` : `<p class="muted-note">${t("pvNone")}</p>`}
      ${info.unmatched ? `<p class="muted-note">${esc(t("pvNew", info.unmatched))}</p>` : ""}
      <p class="muted-note">${t("pvNote")}</p>`}`;
    view.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => go(cat, b.dataset.v));
    if (me) {
      view.querySelectorAll(`.pv-row[href="#/p/${me}"], .pd-row[href="#/p/${me}"]`).forEach((a) => a.classList.add("mine", "me-glow"));
      const mc = $("#meCard");
      if (mc) $("#meInv").onclick = () => { const m = meEntry(me), p = PEOPLE.get(me); openExport(t("invBtn"), `${p.name_zh || p.name_pt}_觀賽邀請卡.png`, () => XCCard.invite(inviteData(me, m))); };
      if (mc) $("#meMore").onclick = () => { const pool = JSON.parse(mc.dataset.pool), i = (Number(mc.dataset.i) + 1) % pool.length; mc.dataset.i = i; $("#meCheer").textContent = pool[i]; };
    }
    $("#pvRefresh").onclick = async () => { const b = $("#pvRefresh"); b.classList.add("busy"); b.disabled = true; await loadRoster(ev, true); if (location.hash.startsWith("#/preview")) renderPreview(params); };
    const car = $("#pvCarousel"), dots = [...($("#pvDots") || { children: [] }).children];
    if (car) car.addEventListener("scroll", () => { const i = Math.round(car.scrollLeft / (car.firstElementChild.offsetWidth + 12)); dots.forEach((d, j) => d.classList.toggle("on", j === i)); }, { passive: true });
    fillHeroPopular();
    view.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => go(b.dataset.c));
    view.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => go(b.dataset.g + cat[1]));
  }


  /* ---------- 即時成績（終點人手輸入，Supabase xc_live_feed） ----------
     #/live           第 48 屆正式資料（event "48"）
     #/live?ev=test   演練資料
     #/live?demo=47   以第 47 屆官方成績在本機模擬重播（不連資料庫）
     參數：c＝組別；v＝ind（個人即時排名，預設）／team（團體即時排名）；h＝分組（1、2、3……或 all＝全組合併；未指定則按最新進度） */
  const LIVE_CATS = ["MA", "MB", "FB", "MC", "FC", "FA"]; // 第 48 屆中學組，按起跑次序
  let LIVE = null;
  function liveCats() {
    const sch = (DB.race && DB.race.schedule) || [];
    const order = sch.slice().sort((a, b) => a.start.localeCompare(b.start)).map((x) => x.cat).filter((c) => LIVE_CATS.includes(c));
    return order.length ? order : LIVE_CATS;
  }
  const heatCount = (cat) => ((DB.race && DB.race.schedule.find((x) => x.cat === cat)) || {}).heats || 1;
  function liveEntered(cat) {
    if (LIVE.demo) return LIVE.demoEntered[cat] || {};
    const m = {};
    for (const s of (DB.race && DB.race.schools) || []) if (s.n && s.n[cat]) m[s.abbr] = s.n[cat];
    return m;
  }
  const abbrName = new Map();
  function schoolOfAbbr(a) {
    if (!abbrName.size) { for (const [zh, s] of Object.entries(DB.schools)) if (s.abbr) abbrName.set(s.abbr, zh); for (const s of (DB.race && DB.race.schools) || []) abbrName.set(s.abbr, s.zh); }
    return abbrName.get(a) || a;
  }
  // 示範重播用虛擬時鐘（加速播放）；正式資料用伺服器校正後的時間
  function liveNow() { if (LIVE && LIVE.demo) return LIVE.t0 + (Date.now() - LIVE.t0) * LIVE.demoSpeed; return Date.now() + (LIVE ? LIVE.offset : 0); }
  function fmtClock(ms) {
    if (ms == null || ms < 0) return "0:00";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /* Supabase 公開函數（只可讀） */
  async function rpc(name, body) {
    const c = DB.site && DB.site.views;
    if (!c || !c.url) throw new Error("no database");
    const H = { apikey: c.key, "Content-Type": "application/json" };
    if (!c.key.startsWith("sb_")) H.Authorization = "Bearer " + c.key;
    const r = await fetch(`${c.url}/rest/v1/rpc/${name}`, { method: "POST", headers: H, cache: "no-store", body: JSON.stringify(body) });
    if (!r.ok) throw new Error(name + " " + r.status);
    return r.json();
  }
  /* 出戰名單（秩序冊姓名、學校、分組；不含號碼布）：k 與即時紀錄的 k 相同，用來對應 */
  const ROSTERS = new Map();
  async function loadRoster(event, force) {
    if (!force && ROSTERS.has(event)) return ROSTERS.get(event);
    try { const list = await rpc("xc_live_roster_public", { p_event: event }); ROSTERS.set(event, list); return list; }
    catch (e) { return ROSTERS.get(event) || null; }
  }

  /* 示範重播：把第 47 屆官方成績壓縮成數分鐘的即時更新（按今屆圈數合成各圈經過時間，最後一圈＝官方成績） */
  function demoSetup(edNo) {
    const ed = DB.editions.find((e) => e.edition === edNo) || LATEST;
    const speed = 30, t0 = Date.now();
    LIVE.t0 = t0; LIVE.demoSpeed = speed;
    LIVE.demoEntered = {}; LIVE.demoRows = []; LIVE.roster = [];
    for (const cat of liveCats()) {
      const rows = ed.categories[cat].individual;
      const ent = {}, laps = XCLive.lapsOf(DB.race, cat), passes = [];
      rows.forEach((r) => { const a = abbrOf(r.school_zh); ent[a] = (ent[a] || 0) + 1; });
      LIVE.demoEntered[cat] = ent;
      // 分組出發的組別：按序輪流分入各組，各組相隔（最慢時間＋2 分鐘）先後出發
      const n = heatCount(cat), gap = (Math.max(...rows.map((r) => r.seconds)) + 120) * 1000;
      for (let h = 1; h <= n; h++) LIVE.heats.set(`${cat}|${h}`, { cat, heat: h, start_ms: t0 + (h - 1) * gap, status: h === 1 ? "running" : "ready" });
      rows.forEach((r, j) => { const heat = (j % n) + 1, st0 = t0 + (heat - 1) * gap, k = `${cat}-${j}`, abbr = abbrOf(r.school_zh);
        LIVE.roster.push({ k, cat, heat: n > 1 ? heat : null, abbr, pid: r.hidden ? null : r.pid, name: r.hidden ? null : r.name_zh || r.name_pt });
        XCLive.simSplits(r.seconds, laps, j + 1).forEach((ms, i) =>
          passes.push({ id: `${cat}-${j}-${i}`, k, cat, heat, abbr, pid: r.hidden ? null : r.pid, at_ms: st0 + ms + j, deleted: false })); });
      passes.sort((x, y) => x.at_ms - y.at_ms).forEach((e, i) => { e.seq = i + 1; });
      LIVE.demoRows.push(...passes);
    }
    LIVE.demoSpeed = speed; LIVE.demoEd = ed.edition;
  }
  function demoTick() {
    const now = liveNow();
    let changed = false;
    for (const r of LIVE.demoRows) if (r.at_ms <= now && !LIVE.entries.has(r.id)) { LIVE.entries.set(r.id, r); changed = true; }
    for (const cat of liveCats()) for (let n = heatCount(cat), i = 1; i <= n; i++) {
      const h = LIVE.heats.get(`${cat}|${i}`);
      const mine = LIVE.demoRows.filter((r) => r.cat === cat && r.heat === i);
      const last = mine.length ? Math.max(...mine.map((r) => r.at_ms)) : h.start_ms;
      if (h.status === "ready" && now >= h.start_ms) { h.status = "running"; changed = true; }
      if (h.status === "running" && now > last) { h.status = "done"; changed = true; }
    }
    return changed;
  }

  async function livePoll() {
    if (!LIVE) return;
    if (LIVE.demo) { if (demoTick()) liveRender(); LIVE.updated = new Date(); liveStamp(); return; }
    try {
      const j = await rpc("xc_live_feed", { p_event: LIVE.event, p_since: LIVE.rev });
      if (!LIVE) return;
      LIVE.offset = j.now - Date.now();
      let changed = !LIVE.loaded;
      for (const h of j.heats) { LIVE.heats.set(`${h.cat}|${h.heat}`, h); LIVE.rev = Math.max(LIVE.rev, h.rev); changed = true; }
      for (const e of j.entries) { LIVE.entries.set(e.id, e); LIVE.rev = Math.max(LIVE.rev, e.rev); changed = true; }
      LIVE.loaded = true; LIVE.error = false; LIVE.updated = new Date();
      if (changed) liveRender(); else liveStamp();
    } catch (e) {
      console.warn("live feed unavailable", e);
      if (LIVE) { LIVE.error = true; liveStamp(); }
    }
  }
  // 「更新」按鈕：立即重新下載即時紀錄及出戰名單
  async function liveRefresh() {
    if (!LIVE) return;
    const b = $("#lvRefresh"); if (b) { b.classList.add("busy"); b.disabled = true; }
    if (!LIVE.demo) { const list = await loadRoster(LIVE.event, true); if (list && LIVE) LIVE.roster = list; }
    await livePoll();
    if (!LIVE) return;
    liveRender();
    const b2 = $("#lvRefresh"); if (b2) { b2.classList.remove("busy"); b2.disabled = false; }
  }
  function liveStamp() {
    const el = $("#lvUpdated"); if (!el || !LIVE) return;
    el.textContent = LIVE.error ? t("lvOffline") : LIVE.updated ? t("lvUpdated", LIVE.updated.toLocaleTimeString(lang === "zh" ? "zh-HK" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })) : "";
    el.classList.toggle("warn", !!LIVE.error);
  }
  function catState(cat) {
    const n = heatCount(cat);
    const hs = []; for (let i = 1; i <= n; i++) hs.push(LIVE.heats.get(`${cat}|${i}`) || { heat: i, status: "ready" });
    const status = hs.every((h) => h.status === "done") ? "done" : hs.some((h) => h.status !== "ready") ? "running" : "ready";
    const cur = hs.find((h) => h.status === "running") || [...hs].reverse().find((h) => h.status === "done") || hs[0];
    return { n, hs, status, cur };
  }
  // 每秒更新比賽用時及達標倒數（不重繪整頁）
  function liveClock() {
    const el = $("#lvClock"); if (!el || !LIVE) return;
    const st = catState(LIVE.cat), h = st.cur;
    if (st.status !== "running" || !h || h.start_ms == null || h.status !== "running") { el.textContent = st.status === "done" ? t("lvDone") : "0:00"; return; }
    const ms = liveNow() - h.start_ms;
    el.textContent = fmtClock(ms);
    const cut = $("#lvCut"); if (cut) { const left = XCLive.CUTOFF[LIVE.cat] * 1000 - ms; cut.textContent = left > 0 ? `${t("lvCutoff")} ${fmtClock(left)}` : t("lvCutoffOver"); cut.classList.toggle("over", left <= 0); }
  }

  /* 排位變動（仿賽車排位顯示）：記錄每個畫面上一次的名次，名次改變時在名次旁顯示 ▲／▼ 及位數約 6 秒，並以動畫移到新位置 */
  const MOVE_MS = 6000;
  function trackMoves(viewId, ranks) {
    const prev = LIVE.lastRanks.get(viewId), now = Date.now();
    if (prev) for (const [k, r] of ranks) { const o = prev.get(k); if (o != null && r != null && o !== r) LIVE.moves.set(`${viewId}|${k}`, { d: o - r, at: now }); }
    LIVE.lastRanks.set(viewId, ranks);
  }
  function moveBadge(viewId, k) {
    const m = LIVE.moves.get(`${viewId}|${k}`);
    if (!m) return "";
    const age = Date.now() - m.at;
    if (age > MOVE_MS) return "";
    return `<span class="lv-mv ${m.d > 0 ? "up" : "down"}" style="animation-delay:-${age}ms" aria-label="${esc(t(m.d > 0 ? "lvMvUp" : "lvMvDown", Math.abs(m.d)))}">${m.d > 0 ? "▲" : "▼"}${Math.abs(m.d)}</span>`;
  }
  function captureRows(box) { const m = new Map(); if (box) box.querySelectorAll("[data-key]").forEach((el) => m.set(el.dataset.key, el.getBoundingClientRect().top)); return m; }
  function playMoves(box, before, sameView) {
    if (!box || !sameView || !before.size || !box.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    box.querySelectorAll("[data-key]").forEach((el) => {
      const old = before.get(el.dataset.key), now = el.getBoundingClientRect().top;
      if (old == null) { el.animate([{ opacity: 0, transform: "translateX(-16px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "ease-out" }); return; }
      const d = old - now;
      if (Math.abs(d) > 1) el.animate([{ transform: `translateY(${d}px)` }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  }

  function autoHeat(st) { return (st.hs.find((h) => h.status === "running") || [...st.hs].reverse().find((h) => h.status === "done") || st.hs[0]).heat; }
  function setLiveParam(k, v) { const p = new URLSearchParams(location.hash.split("?")[1] || ""); if (v == null) p.delete(k); else p.set(k, v); location.replace("#/live?" + p); }

  function liveRender() {
    if (!LIVE || !$("#lvBody")) return;
    const cats = liveCats(), cat = LIVE.cat;
    const st = catState(cat), multi = st.n > 1;
    const heats = {}; for (const h of st.hs) heats[h.heat] = h;
    const entries = [...LIVE.entries.values()].filter((e) => e.cat === cat);
    const laps = XCLive.lapsOf(DB.race, cat);
    const built = XCLive.buildRunners(entries, heats, { laps, minGap: XCLive.MIN_GAP[cat] / (LIVE.demo ? LIVE.demoSpeed : 1), multiHeat: multi, done: st.status === "done" });
    const ranked = built.runners;
    const entered = liveEntered(cat), pending = multi && st.status !== "done";
    // 不能計分的隊員：缺席標記；或已過達標時間／分組已完成而沒有任何經過紀錄（按出戰名單）
    const members = (LIVE.roster || []).filter((r) => r.cat === cat).map((r) => ({ key: r.k, abbr: r.abbr, heat: r.heat }));
    const gone = XCLive.notScoring(cat, ranked, built.absent, members, heats, liveNow());
    const S = XCLive.teamStandings(cat, ranked, entered, st.status === "done", pending, gone.count);
    const TR = XCLive.titleRace(cat, ranked, entered, pending, gone.count);
    const heatsDone = st.hs.filter((h) => h.status === "done").length;
    const time = (ms) => ms == null ? "" : fmtClock(ms);
    const roster = (LIVE.roster || []).filter((r) => r.cat === cat);
    const rosterK = new Map(roster.map((r) => [r.k, r]));
    const view = LIVE.view;
    const hsel = multi ? (LIVE.heatPin[cat] ?? autoHeat(st)) : null;
    const viewId = `${cat}|${view}|${view === "ind" ? hsel : ""}`;
    const box0 = $("#lvBoard"), before = captureRows(box0), sameView = box0 && box0.dataset.view === viewId;
    const nameOf = (e) => { const p = e.pid && PEOPLE.get(e.pid); if (p && !p.hidden) return personName(p); const r = rosterK.get(e.key || e.k); const nm = e.name || (r && r.name); return nm ? esc(nm) : ""; };

    // ---- 個人即時排名 ----
    const open = LIVE.open;
    let indHtml = "", ranks = new Map();
    if (view === "ind") {
      const list = multi && hsel !== "all" ? ranked.filter((e) => e.heat === hsel) : ranked;
      const rk = (e) => (multi && hsel !== "all" ? e.heatPlace : e.place);
      list.forEach((e) => ranks.set(e.key, rk(e)));
      trackMoves(viewId, ranks);
      indHtml = list.map((e) => {
        const p = e.pid && PEOPLE.get(e.pid);
        const zh = e.abbr === "?" ? null : schoolOfAbbr(e.abbr);
        const named = nameOf(e);
        const who = e.abbr === "?" && !named ? `<div class="nm muted">${t("lvUnknown")}</div>`
          : named ? `<div class="nm">${named}</div><div class="sch">${zh ? esc(school(zh)) : t("lvUnknown")}</div>`
          : `<div class="nm">${esc(school(zh))}</div><div class="sch">${t("lvRunner")}</div>`;
        const sub = multi ? (hsel === "all" ? (e.heatPlace ? t("lvHeatPlace", cat[1] + e.heat, e.heatPlace) : t("pvHeat", e.heat)) : (e.place ? t("lvOverall", e.place) : "")) : "";
        const right = e.fin ? `${time(e.t)}${sub ? `<span class="gap">${sub}</span>` : ""}`
          : `<span class="lv-lap">${t("lvLaps", e.laps, laps)}</span><span class="gap">${e.dnf ? t("lvDnf") : time(e.t)}</span>`;
        const r = rk(e), isOpen = open.has(e.key);
        const splits = isOpen ? `<div class="lv-splits">${e.passes.map((q, i) => `<span><small>${e.fin && q === e.finEntry ? t("lvFinish") : t("lvLapN", i + 1)}</small><b>${time(e.splits[i])}</b><small>${t("lvTotal")} ${time(q.t)}</small></span>`).join("")}${p && !p.hidden ? `<a href="#/p/${e.pid}">${t("lvProfile")} ›</a>` : ""}</div>` : "";
        return `<div class="lv-run ${isOpen ? "open" : ""} ${e.dnf ? "dnf" : ""}" data-key="${esc(e.key)}"><button class="row cr" data-rk="${esc(e.key)}" aria-expanded="${isOpen}"><span class="rank-wrap"><span class="rank ${r && r <= 3 && e.fin ? "r" + r : ""}">${r ?? "-"}</span>${moveBadge(viewId, e.key)}</span>${zh ? crest(zh, "sm") : '<span class="crest sm"></span>'}<span style="min-width:0">${who}</span><span class="tm">${right}</span></button>${splits}</div>`;
      }).join("");
    }

    // ---- 團體即時排名 ----
    let teamHtml = "";
    if (view === "team") {
      S.teams.forEach((x) => ranks.set(x.abbr, x.pos));
      trackMoves(viewId, ranks);
      const lead = S.teams.find((x) => x.pos === 1);
      const byKey = new Map(ranked.map((e) => [e.key, e]));
      teamHtml = S.teams.map((x) => {
        const zh = schoolOfAbbr(x.abbr), tr = TR[x.abbr] || {};
        const chips = x.places.map((p, i) => `<span class="lv-pl ${i < S.n ? "sc" : "ex"}">${p}</span>`).join("") + Array.from({ length: x.missing }, () => `<span class="lv-pl gap">·</span>`).join("");
        const status = x.short ? t("lvShort", x.gone) : x.out ? t("lvOut") : x.complete ? t("lvComplete") : x.missing ? t("lvMissing", x.missing) : "";
        // 奪冠形勢
        let why = "", whyCls = "";
        if (st.status === "done") { if (x.pos === 1 && x.complete) { why = t("lvChampion"); whyCls = "ok"; } }
        else if (tr.state === "locked") { why = t("lvLocked"); whyCls = "ok"; }
        else if (tr.state === "out") { why = t("lvNoTitle"); whyCls = "muted"; }
        else if (tr.need && !(pending && tr.need.max < (tr.need.r * (tr.need.r + 1)) / 2)) {
          const vs = esc(school(schoolOfAbbr(tr.need.vs)));
          why = tr.need.r === 1 ? t("lvNeed1", tr.need.max, vs, tr.need.vsScore) : t("lvNeedN", tr.need.r, tr.need.max, vs, tr.need.vsScore); whyCls = "need";
        } else if (lead && x !== lead && !x.out) why = t("lvBehind", x.projected - lead.projected);
        else if (x === lead && !x.out) why = t("lvLeadProv");
        const isOpen = LIVE.openTeams.has(x.abbr);
        // 出戰名單（下拉）
        let body = "";
        if (isOpen) {
          const mine = roster.filter((r) => r.abbr === x.abbr);
          const seen = new Set(mine.map((r) => r.k));
          const extra = ranked.filter((e) => e.abbr === x.abbr && !seen.has(e.key)).map((e) => ({ k: e.key, heat: e.heat, abbr: e.abbr, pid: e.pid, name: e.name, extra: true }));
          const members = mine.concat(extra).map((r) => ({ r, e: byKey.get(r.k) }));
          const scorers = new Set(x.scorers);
          const memRow = ({ r, e }) => {
            const p = r.pid && PEOPLE.get(r.pid);
            const nm = p && !p.hidden ? personName(p) : r.name ? esc(r.name) : `<span class="muted">${t(r.extra ? "lvUnknown" : "lvRunner")}</span>`;
            const h = heats[r.heat || 1] || { status: "ready" };
            let stt, cls = "";
            if (e && e.fin && e.place != null) { stt = t("lvMemFin", e.place, time(e.t)) + (multi && e.heatPlace ? ` · ${t("lvHeatPlace", cat[1] + e.heat, e.heatPlace)}` : ""); cls = scorers.has(e.place) && x.scorers.indexOf(e.place) < S.n ? "sc" : "fin"; }
            else if (e && e.dnf) { stt = t("lvDnf"); cls = "dnf"; }
            else if (!e && gone.why.get(r.k) === "dns") { stt = t("lvMemDns"); cls = "dnf"; }
            else if (!e && gone.why.get(r.k) === "cutoff") { stt = t("lvMemCutoff"); cls = "dnf"; }
            else if (e) { stt = t("lvMemLap", e.laps, laps, e.place); cls = "run"; }
            else { stt = h.status === "ready" ? t("lvMemNotStarted") : h.status === "running" ? t("lvMemNoPass") : t("lvMemNoFin"); cls = "wait"; }
            return `<li class="${cls}"><span class="mn">${nm}</span><span class="ms">${cls === "sc" ? `<b class="lv-sc-tag">${t("lvScorer")}</b>` : ""}${esc(stt)}</span></li>`;
          };
          const sortM = (a, b) => (a.e && a.e.place != null ? a.e.place : 1e9) - (b.e && b.e.place != null ? b.e.place : 1e9);
          let inner = "";
          if (!LIVE.roster) inner += `<p class="muted-note">${t("lvRosterErr")}</p>`;
          if (multi) {
            for (const h of st.hs) {
              const g = members.filter((m) => (m.r.heat || (m.e && m.e.heat)) === h.heat).sort(sortM);
              if (!g.length) continue;
              inner += `<div class="lv-rh">${esc(t("lvHeatGroup", h.heat, { ready: t("lvReady"), running: t("lvRunning"), done: t("lvDone") }[h.status]))}</div><ul>${g.map(memRow).join("")}</ul>`;
            }
          } else inner += `<ul>${members.sort(sortM).map(memRow).join("")}</ul>`;
          body = `<div class="lv-roster"><div class="lv-rt">${t("lvRoster")}（${t("lvEntered", x.entered)}）</div>${inner}<a class="lv-sl" href="${schoolHref(zh)}">${t("lvSchoolPage")} ›</a></div>`;
        }
        const heatMix = multi ? (() => { const c = {}; roster.filter((r) => r.abbr === x.abbr).forEach((r) => { c[r.heat] = (c[r.heat] || 0) + 1; }); return Object.keys(c).sort().map((h) => `${cat[1]}${h}×${c[h]}`).join(" · "); })() : "";
        return `<div class="lv-tw ${isOpen ? "open" : ""} ${x.out ? "out" : ""}" data-key="${esc(x.abbr)}">
          <button class="lv-team" data-tk="${esc(x.abbr)}" aria-expanded="${isOpen}">
            <span class="rank-wrap"><span class="rank ${x.pos && x.pos <= 3 && x.complete ? "r" + x.pos : ""}">${x.pos ?? "-"}</span>${moveBadge(viewId, x.abbr)}</span>${crest(zh, "sm")}
            <span class="lv-tm"><b>${esc(school(zh))}</b><span class="lv-pls">${chips}</span>${heatMix ? `<span class="lv-mix">${esc(heatMix)}</span>` : ""}${why ? `<span class="lv-why ${whyCls}">${why}</span>` : ""}</span>
            <span class="lv-sc"><b>${x.out ? "-" : x.complete ? x.score : x.projected}</b><small class="${x.complete ? "ok" : ""}">${x.complete || x.out ? status : [t("lvProv"), status].filter(Boolean).join(" · ")}</small><i class="lv-caret" aria-hidden="true"></i></span>
          </button>${body}</div>`;
      }).join("");
    }

    const statusTxt = { ready: t("lvReady"), running: t("lvRunning"), done: t("lvDone") }[st.status];
    $("#lvTabs").innerHTML = cats.map((c) => `<button class="chip lv-tab ${c === cat ? "on" : ""}" data-lc="${c}"><span class="lv-dot ${catState(c).status}"></span>${catLabel(c)}</button>`).join("");
    const pill = $("#lvPill");
    if (pill && !LIVE.demo && LIVE.event === String((DB.race && DB.race.edition) || 48)) {
      const sts = cats.map((c) => catState(c).status);
      const any = sts.includes("running"), all = sts.every((x) => x === "done");
      pill.textContent = any ? t("lvLive") : all ? t("lvDone") : t("lvReady");
      pill.classList.toggle("demo", !any);
    }
    const heatTabs = multi && view === "ind" ? `<div class="chips lv-heats" role="tablist">${st.hs.map((h) => `<button class="chip ${hsel === h.heat ? "on" : ""}" data-lh="${h.heat}" role="tab" aria-selected="${hsel === h.heat}"><span class="lv-dot ${h.status}"></span>${t("lvHeatTab", h.heat)}</button>`).join("")}<button class="chip ${hsel === "all" ? "on" : ""}" data-lh="all" role="tab" aria-selected="${hsel === "all"}">${t("lvAllHeats")}</button></div>` : "";
    const meta = `${multi ? t("lvHeatsDone", heatsDone, st.n) + " · " : ""}${t("lvFin", S.finishers, st.status === "done" ? 0 : S.onCourse)}`;
    let boardHtml;
    if (view === "ind") {
      const empty = multi && hsel !== "all" && (heats[hsel] || {}).status === "ready" ? t("lvHeatNotStarted") : t("lvWait");
      boardHtml = indHtml ? `<p class="lv-hint">${t("lvTapHint")}</p><div class="board lv-ind" id="lvBoard" data-view="${esc(viewId)}">${indHtml}</div>` : `<p class="muted-note">${empty}</p>`;
    } else {
      boardHtml = S.award ? `<p class="lv-hint">${t("lvTeamHint")}</p><div class="board lv-teams" id="lvBoard" data-view="${esc(viewId)}">${teamHtml}</div>` : `<p class="banner">${t("lvNoAward")}</p>`;
    }
    $("#lvBody").innerHTML = `
      <section class="lv-head">
        <div><span class="lv-status ${st.status}">${statusTxt}</span>${multi ? `<span class="lv-heat">${t("lvHeat", st.cur.heat, st.n)}</span>` : ""}<h2>${esc(catLong(cat))}</h2></div>
        <div class="lv-clock"><b id="lvClock">0:00</b><small id="lvCut"></small></div>
      </section>
      <div class="mini-seg lv-seg" role="tablist"><button role="tab" data-lv="ind" class="${view === "ind" ? "on" : ""}" aria-selected="${view === "ind"}">${t("lvInd")}</button><button role="tab" data-lv="team" class="${view === "team" ? "on" : ""}" aria-selected="${view === "team"}">${t("lvTeam")}</button></div>
      ${heatTabs}
      ${multi ? `<p class="banner">${t("lvHeatsRule", st.n)}</p>` : ""}
      <div class="board-head"><h2>${view === "ind" ? (multi ? (hsel === "all" ? t("lvAllHeats") : t("lvHeatTab", hsel)) : t("lvInd")) : t("lvTeam")}</h2><span class="meta">${meta}</span></div>
      ${boardHtml}
      <p class="muted-note">${view === "ind" ? `${t("lvCourse", laps)} · ${t("lvTimeNote")}` : t("lvRule", XCLive.TEAM_N.A, XCLive.TEAM_N.C)}</p>`;
    playMoves($("#lvBoard"), before, sameView);
    $("#lvBody").querySelectorAll("[data-rk]").forEach((b) => b.onclick = () => { const k = b.dataset.rk; if (open.has(k)) open.delete(k); else open.add(k); liveRender(); });
    $("#lvBody").querySelectorAll("[data-tk]").forEach((b) => b.onclick = () => { const k = b.dataset.tk; if (LIVE.openTeams.has(k)) LIVE.openTeams.delete(k); else LIVE.openTeams.add(k); liveRender(); });
    $("#lvBody").querySelectorAll("[data-lv]").forEach((b) => b.onclick = () => { LIVE.view = b.dataset.lv; setLiveParam("v", LIVE.view === "team" ? "team" : null); });
    $("#lvBody").querySelectorAll("[data-lh]").forEach((b) => b.onclick = () => { const v = b.dataset.lh; LIVE.heatPin[cat] = v === "all" ? "all" : Number(v); setLiveParam("h", v); });
    $("#lvTabs").querySelectorAll("[data-lc]").forEach((b) => b.onclick = () => { LIVE.cat = b.dataset.lc; const p = new URLSearchParams(location.hash.split("?")[1] || ""); p.set("c", LIVE.cat); p.delete("h"); location.replace("#/live?" + p); });
    liveClock(); liveStamp();
  }

  function renderLive(params) {
    const demo = Number(params.get("demo")) || 0;
    const event = demo ? "demo" : (params.get("ev") || String((DB.race && DB.race.edition) || 48)).replace(/[^a-z0-9]/gi, "").toLowerCase();
    const cats = liveCats();
    // 同一場資料只換組別或畫面：保留已下載的資料及排位紀錄
    if (!LIVE || LIVE.event !== event || LIVE.demo !== demo) LIVE = { event, demo, rev: 0, offset: 0, entries: new Map(), heats: new Map(), loaded: false, cat: null, roster: null, open: new Set(), openTeams: new Set(), heatPin: {}, lastRanks: new Map(), moves: new Map() };
    if (demo && !LIVE.demoRows) demoSetup(demo);
    const want = params.get("c");
    if (cats.includes(want)) LIVE.cat = want;
    if (!LIVE.cat) { const running = cats.find((c) => catState(c).status === "running"); LIVE.cat = running || cats[0]; }
    LIVE.view = params.get("v") === "team" ? "team" : "ind";
    const hp = params.get("h");
    if (hp === "all") LIVE.heatPin[LIVE.cat] = "all";
    else if (hp && Number(hp) >= 1 && Number(hp) <= heatCount(LIVE.cat)) LIVE.heatPin[LIVE.cat] = Number(hp);
    else delete LIVE.heatPin[LIVE.cat]; // 未指定：按最新進度
    view.innerHTML = `
      <h1 class="page-title lv-title">${esc(t("lvTitle", demo ? LIVE.demoEd : (DB.race && DB.race.edition) || 48))}<span class="lv-pill demo" id="lvPill">${demo ? t("lvDemo") : event !== String((DB.race && DB.race.edition) || 48) ? "TEST" : t("lvReady")}</span>
        <button class="lv-refresh" id="lvRefresh" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${t("lvRefresh")}</button></h1>
      <p class="lv-note">${demo ? t("lvDemoNote", LIVE.demoEd) : t("lvNote")} <span id="lvUpdated" class="lv-upd"></span></p>
      ${demo ? "" : `<div class="link-row lv-links"><a href="#/cert${event !== String((DB.race && DB.race.edition) || 48) ? "?ev=" + event : ""}">${t("ctBtn")} ›</a><a href="#/photos${event !== String((DB.race && DB.race.edition) || 48) ? "?ev=" + event : ""}">${t("phBtn")} ›</a></div>`}
      <div class="chips" id="lvTabs"></div>
      <div id="lvBody"><div class="skeleton"><i class="sk-row"></i><i class="sk-row"></i></div></div>`;
    $("#lvRefresh").onclick = liveRefresh;
    if (LIVE.loaded || demo) liveRender();
    if (!demo && !LIVE.roster) loadRoster(event).then((list) => { if (LIVE && LIVE.event === event && list) { LIVE.roster = list; liveRender(); } });
    livePoll();
    // 有組別進行中每 4 秒更新，否則每 15 秒；用時每秒更新
    let tick = 0;
    pageTimers.push(setInterval(() => {
      tick++;
      liveClock();
      const active = liveCats().some((c) => catState(c).status === "running");
      if (demo ? true : active ? tick % 4 === 0 : tick % 15 === 0) livePoll();
    }, 1000));
  }

  /* ---------- 運動員名錄／學校名錄 ---------- */
  let ATH = null, SCHOOLS = null;
  function buildDirectory() {
    if (ATH) return;
    ATH = [...PEOPLE.values()].filter((p) => !p.hidden).map((p) => {
      const last = p.recs.at(-1);
      return { p, last, wins: p.recs.filter((r) => r.rank === 1).length, medals: p.recs.filter((r) => r.rank <= 3).length,
        best: Math.min(...p.recs.map((r) => r.rank)), abbrs: new Set(p.recs.map((r) => abbrOf(r.school_zh))) };
    }).sort((a, b) => b.wins - a.wins || b.medals - a.medals || a.best - b.best || b.last.edition - a.last.edition || b.p.recs.length - a.p.recs.length);
    const m = new Map();
    const row = (a) => { if (!m.has(a)) m.set(a, { abbr: a, names: new Set(), latest: null, latestEd: 0, titles: [], people: new Set(), wins: 0, medals: 0 }); return m.get(a); };
    for (const ed of DB.editions) for (const c of CATS) {
      const cat = ed.categories[c];
      for (const r of cat.individual) {
        const x = row(abbrOf(r.school_zh)); x.names.add(r.school_zh);
        if (ed.edition > x.latestEd) { x.latestEd = ed.edition; x.latest = r.school_zh; }
        if (!r.hidden) x.people.add(r.pid);
        if (r.rank === 1) x.wins++;
        if (r.rank <= 3) x.medals++;
      }
      if (cat.team_champion) { const x = row(abbrOf(cat.team_champion.school_zh)); x.names.add(cat.team_champion.school_zh); x.titles.push({ edition: ed.edition, year: ed.year, cat: c }); if (!x.latest) x.latest = cat.team_champion.school_zh; }
    }
    for (const s of (DB.race && DB.race.schools) || []) if (m.has(s.abbr)) m.get(s.abbr).latest = s.zh;
    SCHOOLS = [...m.values()].sort((a, b) => b.titles.length - a.titles.length || b.people.size - a.people.size || a.abbr.localeCompare(b.abbr));
  }

  function athRow(x) {
    const tags = [];
    if (x.wins) tags.push(`<span class="tag gold">${t("athWins", x.wins)}</span>`);
    if (x.medals > x.wins) tags.push(`<span class="tag">${t("athMedals", x.medals)}</span>`);
    if (!x.medals) tags.push(`<span class="tag">${t("athBest", x.best)}</span>`);
    return `<a class="row r3 ath-row" href="#/p/${x.p.pid}">
      ${crest(x.last.school_zh, "sm")}
      <span style="min-width:0"><div class="nm">${personName(x.p)}</div><div class="sch">${esc(school(x.last.school_zh))} · ${catLabel(x.last.cat)} ${yearShort(x.last.year)}</div><div class="tags">${tags.join("")}${x.p.status && x.p.status.code === "active" ? statusChip(x.p) : ""}</div></span>
      <span class="go">›</span></a>`;
  }

  function renderAthletes(params) {
    buildDirectory();
    const tab = params.get("tab") === "schools" ? "schools" : "people";
    const g = ["M", "F"].includes(params.get("g")) ? params.get("g") : "";
    const k = ["active", "champ", "podium"].includes(params.get("k")) ? params.get("k") : "";
    const lv = "ABCDE".includes(params.get("lv") || "-") ? params.get("lv") : "";
    const sc = params.get("s") || "";
    const set = (o) => { const p = new URLSearchParams({ tab, g, k, lv, s: sc, ...o }); for (const [a, b] of [...p]) if (!b || (a === "tab" && b === "people")) p.delete(a); location.replace("#/athletes" + (p.toString() ? "?" + p : "")); };
    const seg = `<div class="seg"><button data-tab="people" class="${tab === "people" ? "on" : ""}">${t("athTabPeople")}</button><button data-tab="schools" class="${tab === "schools" ? "on" : ""}">${t("athTabSchools")}</button></div>`;
    let body = "";
    if (tab === "schools") {
      body = `<div class="board-head"><h2>${t("schCount", SCHOOLS.length)}</h2></div>
        <div class="board">${SCHOOLS.map((x) => `<a class="row r3" href="#/s/${encodeURIComponent(x.abbr)}">${crest(x.latest, "sm")}
          <span style="min-width:0"><div class="nm">${esc(school(x.latest))}</div><div class="sch">${t("schAthletes")} ${x.people.size} · ${t("schIndWins")} ${x.wins}</div></span>
          <span class="sch-titles"><b>${x.titles.length}</b><small>${t("schTitles")}</small></span></a>`).join("")}</div>
        <p class="muted-note">${t("schSortNote")}</p>`;
    } else {
      let list = ATH;
      if (g) list = list.filter((x) => x.p.gender === g);
      if (lv) list = list.filter((x) => x.last.cat[1] === lv);
      if (sc) list = list.filter((x) => x.abbrs.has(sc));
      if (k === "active") list = list.filter((x) => x.p.status && x.p.status.code === "active");
      if (k === "champ") list = list.filter((x) => x.wins > 0);
      if (k === "podium") list = list.filter((x) => x.medals > 0);
      const chips = [["", t("athAll")], ["active", t("athActive")], ["champ", t("athChamp")], ["podium", t("athPodium")]].map(([v, l]) => `<button class="chip ${k === v ? "on" : ""}" data-k="${v}">${l}</button>`).join("");
      const opts = SCHOOLS.map((x) => `<option value="${esc(x.abbr)}" ${sc === x.abbr ? "selected" : ""}>${esc(school(x.latest))}</option>`).join("");
      const lvBtns = ["", ..."ABCDE"].map((l) => `<button class="${lv === l ? "on" : ""}" data-lv="${l}">${l || t("athAll")}</button>`).join("");
      body = `
        <div class="filters">
          <div class="toggle"><button class="a ${g === "" ? "on" : ""}" data-g="">${t("athAll")}</button><button class="m ${g === "M" ? "on" : ""}" data-g="M">${t("male")}</button><button class="f ${g === "F" ? "on" : ""}" data-g="F">${t("female")}</button></div>
          <div class="cats lv-cats">${lvBtns}</div>
        </div>
        <label class="sel"><span class="sr">${t("schoolLbl")}</span><select id="athSchool"><option value="">${t("athAllSchools")}</option>${opts}</select></label>
        <div class="chips">${chips}</div>
        <div class="board-head"><h2>${t("athCount", list.length)}</h2><span class="meta">${lang === "zh" ? "以最後一次參賽的組別計算" : "By latest category"}</span></div>
        ${list.length ? `<div class="board" id="athList">${list.slice(0, 40).map(athRow).join("")}</div>
        ${list.length > 40 ? `<button type="button" class="more-btn" id="athMore">${t("athMore", list.length - 40)}</button>` : ""}` : `<p class="muted-note">${t("athNone")}</p>`}
        <p class="muted-note">${t("athSortNote")}</p>`;
      view._athList = list;
    }
    view.innerHTML = `<h1 class="page-title">${t("athTitle")}</h1>${seg}${body}`;
    view.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => set({ tab: b.dataset.tab }));
    view.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => set({ g: b.dataset.g }));
    view.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => set({ k: b.dataset.k }));
    view.querySelectorAll("[data-lv]").forEach((b) => b.onclick = () => set({ lv: b.dataset.lv }));
    const sel = $("#athSchool"); if (sel) sel.onchange = () => set({ s: sel.value });
    const more = $("#athMore");
    if (more) {
      let shown = 40;
      more.onclick = () => {
        const list = view._athList; const next = list.slice(shown, shown + 40); shown += next.length;
        $("#athList").insertAdjacentHTML("beforeend", next.map(athRow).join(""));
        if (shown >= list.length) more.remove(); else more.textContent = t("athMore", list.length - shown);
      };
    }
  }

  /* ---------- 學校資料頁 ---------- */
  function renderSchool(abbr) {
    buildDirectory();
    const x = SCHOOLS.find((s) => s.abbr === abbr);
    if (!x) return renderNotFound();
    const zh = x.latest, info = DB.schools[zh] || {};
    const former = [...x.names].filter((n) => n !== zh);
    const people = ATH.filter((a) => a.abbrs.has(abbr));
    const medals = [];
    for (const a of people) for (const r of a.p.recs) if (r.rank <= 3 && abbrOf(r.school_zh) === abbr) medals.push({ a, r });
    medals.sort((m, n) => n.r.edition - m.r.edition || CATS.indexOf(m.r.cat) - CATS.indexOf(n.r.cat) || m.r.rank - n.r.rank);
    const current = people.filter((a) => a.p.status && a.p.status.code === "active" && abbrOf(a.p.status.school) === abbr)
      .sort((m, n) => CATS.indexOf(m.p.status.cat) - CATS.indexOf(n.p.status.cat) || m.best - n.best);
    const byYear = new Map(); for (const tt of x.titles) { if (!byYear.has(tt.edition)) byYear.set(tt.edition, { ...tt, cats: [] }); byYear.get(tt.edition).cats.push(tt.cat); }
    const titleRows = [...byYear.values()].sort((a, b) => b.edition - a.edition).map((y) => `
      <a class="medal" href="#/rank?t=team&e=${y.edition}&s=${encodeURIComponent(zh)}"><span class="yr-cell">${yearShort(y.year)}</span>
        <span class="title-cats">${y.cats.map((c) => `<span class="cat-chip ${c[0] === "M" ? "m" : "f"}">${catLabel(c)}</span>`).join("")}</span><span class="go">›</span></a>`).join("");
    const medalRows = medals.map(({ a, r }) => `<a class="row r3" href="#/p/${a.p.pid}">
      <span class="rank r${r.rank}">${r.rank}</span>
      <span style="min-width:0"><div class="nm">${personName(a.p)}</div><div class="sch">${catLong(r.cat)} · ${t("edition", r.edition)} ${yearShort(r.year)}</div></span>
      <span class="tm">${fmt(r.seconds)}</span></a>`).join("");
    const roster = [...people].sort((m, n) => n.last.edition - m.last.edition || n.wins - m.wins || n.medals - m.medals || m.best - n.best);
    view.innerHTML = `
      <section class="hero school-hero">
        <div class="school-crest">${crest(zh, "lg")}</div>
        <h1>${esc(school(zh))}</h1>
        <div class="pt">${esc(lang === "zh" ? (info.pt || "") : zh)}</div>
        ${former.length ? `<div class="schools">${t("schFormer")}${former.map((n) => esc(school(n))).join("、")}</div>` : ""}
        <div class="stats stats4">
          <div class="stat"><b style="color:var(--gold)">${x.titles.length}</b><span>${t("schTitles")}</span></div>
          <div class="stat"><b>${x.wins}</b><span>${t("schIndWins")}</span></div>
          <div class="stat"><b>${x.medals}</b><span>${t("schMedals")}</span></div>
          <div class="stat"><b>${x.people.size}</b><span>${t("schAthletes")}</span></div>
        </div>
      </section>
      ${current.length ? `<div class="section-title"><h2>${t("schCurrent", DB.race.edition)}</h2><a href="#/preview">${t("pvGo")} ›</a></div>
        <div class="board">${current.map((a) => `<a class="row r3" href="#/p/${a.p.pid}"><span class="rank cat-rank ${a.p.status.cat[0] === "M" ? "m" : "f"}">${catLabel(a.p.status.cat)}</span>
          <span style="min-width:0"><div class="nm">${personName(a.p)}</div><div class="sch">${t("pvLast")} ${catLabel(a.last.cat)} ${t("placeShort", a.last.rank)} · ${yearShort(a.last.year)}</div></span><span class="go">›</span></a>`).join("")}</div>` : ""}
      <div class="section-title"><h2>${t("schTeamList")}</h2><a href="#/rank?t=team&s=${encodeURIComponent(zh)}">${t("schViewRank")} ›</a></div>
      ${titleRows ? `<div class="board">${titleRows}</div>` : `<p class="muted-note">${t("schNoTitle")}</p>`}
      <div class="section-title"><h2>${t("schMedalList")}</h2></div>
      ${medalRows ? `<div class="board">${medalRows}</div>` : `<p class="muted-note">${t("schNoMedal")}</p>`}
      <div class="section-title"><h2>${t("schRoster")}</h2><a href="#/athletes?s=${encodeURIComponent(abbr)}">${t("more")} ›</a></div>
      <div class="board">${roster.slice(0, 15).map(athRow).join("")}</div>`;
  }

  /* ---------- 私隱及資料使用／申請移除 ---------- */
  function renderPrivacy() {
    const site = DB.site || {};
    const url = site.removal_url;
    const cta = url
      ? `<a class="btn-primary" href="${esc(url)}" target="_blank" rel="noopener">${t("pvyApply")}</a>`
      : `<p class="banner">${t("pvyPending")}</p>`;
    view.innerHTML = `
      <h1 class="page-title">${t("pvyTitle")}</h1>
      <section class="prose">
        <h2>${t("pvySrcH")}</h2><p>${t("pvySrc")} <a href="${esc(DB.source)}" target="_blank" rel="noopener">${t("source")}</a></p>
        <h2>${t("pvyShowH")}</h2><p>${t("pvyShow")}</p>
        <h2>${t("pvyNoH")}</h2><p>${t("pvyNo")}</p>
        <h2>${t("pvyStatusH")}</h2><p>${t("stHow")}</p>
        <h2 id="remove">${t("pvyRemoveH")}</h2>
        <p>${t("pvyRemove", site.removal_days || 7)}</p>
        <ol class="steps"><li>${t("pvyStep1")}</li><li>${t("pvyStep2")}</li><li>${t("pvyStep3")}</li></ol>
        ${cta}
        <p class="muted-note">${t("pvyNote")}</p>
      </section>`;
  }

  /* ---------- 紀錄與趨勢 ---------- */
  const SERIES = { champ: "#c98500", tenth: "#9085e9", bars: "#199e70" }; // 已用 dataviz 驗證器在深色底驗證

  function niceStep(range) {
    const steps = [10, 15, 20, 30, 60, 90, 120, 180, 300];
    return steps.find((s) => range / s <= 5) || 600;
  }

  function lineChart({ id, xs, series, label }) {
    const W = 340, H = 210, L = 42, R = 46, T = 14, B = 28;
    const vals = series.flatMap((s) => s.values.filter((v) => v != null));
    const lo0 = Math.min(...vals), hi0 = Math.max(...vals);
    const step = niceStep(hi0 - lo0 || 30);
    const lo = Math.floor(lo0 / step) * step, hi = Math.ceil(hi0 / step) * step || lo + step;
    const x = (i) => L + (i * (W - L - R)) / Math.max(xs.length - 1, 1);
    const y = (v) => T + ((v - lo) * (H - T - B)) / (hi - lo || 1);
    const ticks = []; for (let v = lo; v <= hi + 0.01; v += step) ticks.push(v);
    const grid = ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="ax">${fmt(v)}</text>`).join("");
    const xl = xs.map((s, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="ax">${esc(s)}</text>`).join("");
    const lines = series.map((s) => {
      const pts = s.values.map((v, i) => v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean).join(" ");
      const lastI = s.values.map((v, i) => v == null ? -1 : i).filter((i) => i >= 0).at(-1);
      const dots = s.values.map((v, i) => v == null ? "" : `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`).join("");
      const end = lastI != null ? `<text x="${x(lastI) + 8}" y="${y(s.values[lastI]) + 4}" class="endlbl">${fmt(s.values[lastI])}</text>` : "";
      return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}${end}`;
    }).join("");
    const legend = series.map((s) => `<span class="lg"><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("");
    const table = `<table class="tv"><thead><tr><th>${t("season")}</th>${series.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${xs.map((s, i) => `<tr><td>${esc(s)}</td>${series.map((se) => `<td>${fmt(se.values[i])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    return `<figure class="chart" id="${id}">
      <div class="legend">${legend}</div>
      <div class="plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" tabindex="0">${grid}${xl}<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>${lines}<rect class="hit" x="${L - 10}" y="${T}" width="${W - L - R + 20}" height="${H - T - B}" fill="transparent"/></svg><div class="tip" hidden></div></div>
      <figcaption>${t("lowerFaster")}</figcaption>
      <details class="tvw"><summary>${t("tableView")}</summary>${table}</details>
    </figure>`;
  }

  function wireLineChart(id, xs, series) {
    const fig = document.getElementById(id); if (!fig) return;
    const svg = fig.querySelector("svg"), tip = fig.querySelector(".tip"), xh = fig.querySelector(".xh");
    const W = 340, L = 42, R = 46;
    let cur = -1;
    const show = (i) => {
      cur = Math.max(0, Math.min(xs.length - 1, i));
      const xx = L + (cur * (W - L - R)) / Math.max(xs.length - 1, 1);
      xh.setAttribute("x1", xx); xh.setAttribute("x2", xx); xh.setAttribute("visibility", "visible");
      tip.replaceChildren();
      const h = document.createElement("div"); h.className = "th"; h.textContent = xs[cur]; tip.appendChild(h);
      for (const s of series) {
        const row = document.createElement("div"); row.className = "tr";
        const k = document.createElement("i"); k.style.background = s.color;
        const v = document.createElement("b"); v.textContent = fmt(s.values[cur]);
        const n = document.createElement("span"); n.textContent = s.name;
        row.append(k, v, n); tip.appendChild(row);
      }
      tip.hidden = false;
      const rect = svg.getBoundingClientRect(), px = (xx / W) * rect.width;
      tip.style.left = Math.min(Math.max(px - 60, 0), rect.width - 130) + "px";
    };
    const hide = () => { xh.setAttribute("visibility", "hidden"); tip.hidden = true; };
    svg.addEventListener("pointermove", (e) => {
      const rect = svg.getBoundingClientRect(); const vx = ((e.clientX - rect.left) / rect.width) * W;
      show(Math.round(((vx - L) / (W - L - R)) * (xs.length - 1)));
    });
    svg.addEventListener("pointerleave", hide);
    svg.addEventListener("focus", () => show(cur < 0 ? xs.length - 1 : cur));
    svg.addEventListener("blur", hide);
    svg.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") { show(cur - 1); e.preventDefault(); } if (e.key === "ArrowRight") { show(cur + 1); e.preventDefault(); } });
  }

  function barChart({ id, xs, values, label }) {
    const W = 340, H = 170, L = 12, R = 12, T = 22, B = 26, bw = 24;
    const max = Math.max(...values, 1);
    const slot = (W - L - R) / xs.length;
    const bars = values.map((v, i) => {
      const h = ((H - T - B) * v) / max, bx = L + slot * i + (slot - bw) / 2, by = H - B - h;
      // 頂端 4px 圓角、底部方角
      const d = `M${bx},${H - B} V${by + 4} Q${bx},${by} ${bx + 4},${by} H${bx + bw - 4} Q${bx + bw},${by} ${bx + bw},${by + 4} V${H - B} Z`;
      return `<g class="bar" tabindex="0" aria-label="${esc(xs[i])}: ${v}"><rect x="${L + slot * i}" y="${T}" width="${slot}" height="${H - T - B}" fill="transparent"/><path d="${d}" fill="${SERIES.bars}"/><text x="${bx + bw / 2}" y="${by - 6}" text-anchor="middle" class="val">${v}</text><text x="${bx + bw / 2}" y="${H - 8}" text-anchor="middle" class="ax">${esc(xs[i])}</text></g>`;
    }).join("");
    return `<figure class="chart" id="${id}"><div class="plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="grid"/>${bars}</svg></div></figure>`;
  }

  function renderRecords(params) {
    const cat = CATS.includes(params.get("c")) ? params.get("c") : "MA";
    const g = cat[0];
    const go = (c) => { location.replace("#/records?c=" + c); };
    const eds = [...DB.editions].sort((a, b) => a.edition - b.edition); // 舊→新
    const xs = eds.map((e) => yearShort(e.year));
    const champ = eds.map((e) => e.categories[cat].individual[0]?.seconds ?? null);
    const tenth = eds.map((e) => e.categories[cat].individual[9]?.seconds ?? null);
    const all = eds.flatMap((e) => e.categories[cat].individual.map((r) => ({ ...r, year: e.year, edition: e.edition })));
    const top = all.filter((r) => r.seconds != null).sort((a, b) => a.seconds - b.seconds || a.edition - b.edition).slice(0, 10);
    const rec = top[0];
    const dist = DB.distances;
    const known = dist ? Object.values(dist.years).filter((v) => v != null).length : 0;
    const fullEds = eds.filter((e) => e.scope === "full");
    const teamRows = [...eds].reverse().map((e) => ({ e, tc: e.categories[cat].team_champion }));
    // 連冠計算（由新到舊）
    let streak = 0; for (const { tc } of teamRows) { if (tc && tc.school_zh === teamRows[0].tc?.school_zh) streak++; else break; }
    const catBtns = (letters) => letters.split("").map((l) => `<button class="${cat === g + l ? "on" : ""}" data-c="${g + l}">${l}</button>`).join("");

    view.innerHTML = `
      <div class="filters" style="margin-top:6px">
        <div class="toggle"><button class="m ${g === "M" ? "on" : ""}" data-g="M">${t("male")}</button><button class="f ${g === "F" ? "on" : ""}" data-g="F">${t("female")}</button></div>
        <div class="cats"><span class="grp">${t("secondary")}</span>${catBtns("ABC")}<span class="grp">${t("primary")}</span>${catBtns("DE")}</div>
      </div>
      <p class="banner">${t("distBanner", known, dist?.current?.[cat], dist?.rules?.[cat])}</p>
      ${rec ? `<section class="record">
        <div class="label">${t("recordTitle", catLong(cat))}</div>
        <div class="rec-time">${fmt(rec.seconds)}</div>
        <a class="rec-who" href="#/p/${rec.pid}">${personName(rec)}</a>
        <div class="rec-meta">${schoolLink(rec.school_zh, "sm")} · <a href="#/rank?e=${rec.edition}&c=${cat}&hl=${rec.pid}">${t("edition", rec.edition)} ${esc(rec.year)}</a></div>
      </section>` : ""}
      <div class="section-title"><h2>${t("trendTitle")}</h2></div>
      ${lineChart({ id: "trend", xs, series: [{ name: t("champTime"), color: SERIES.champ, values: champ }, { name: t("tenthTime"), color: SERIES.tenth, values: tenth }], label: t("trendTitle") })}
      <div class="section-title"><h2>${t("top10Title")}</h2></div>
      <div class="board">${top.map((r, i) => `
        <a class="row cr" href="#/p/${r.pid}">
          <span class="rank ${i < 3 ? "r" + (i + 1) : ""}">${i + 1}</span>
          ${crest(r.school_zh, "sm")}
          <span style="min-width:0"><div class="nm">${personName(r)}</div><div class="sch">${esc(school(r.school_zh))} · ${yearShort(r.year)}</div>${PEOPLE.get(r.pid)?.status?.code === "active" ? `<div class="tags">${statusChip(PEOPLE.get(r.pid))}</div>` : ""}</span>
          <span class="tm">${fmt(r.seconds)}</span>
        </a>`).join("")}</div>
      <div class="section-title"><h2>${t("finTitle")}</h2></div>
      ${barChart({ id: "fin", xs: fullEds.map((e) => yearShort(e.year)), values: fullEds.map((e) => e.categories[cat].individual.length), label: t("finTitle") })}
      <p class="muted-note">${t("finNote")}</p>
      <div class="section-title"><h2>${t("teamHist")}</h2>${streak >= 2 ? `<span class="pill">${t("streakNow", streak)}</span>` : ""}</div>
      <div class="board">${teamRows.map(({ e, tc }) => tc ? `
        <a class="medal" href="${schoolHref(tc.school_zh)}"><span class="yr-cell">${yearShort(e.year)}</span><span>${schoolLine(tc.school_zh, "sm")}</span><span class="go">›</span></a>` : `
        <div class="medal"><span class="yr-cell">${yearShort(e.year)}</span><span class="none" style="color:var(--muted);font-size:13px">${t("noTeam")}</span><span></span></div>`).join("")}</div>
      ${wxTable(eds, cat)}`;

    view.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => go(b.dataset.c));
    view.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => go(b.dataset.g + cat[1]));
    wireLineChart("trend", xs, [{ name: t("champTime"), color: SERIES.champ, values: champ }, { name: t("tenthTime"), color: SERIES.tenth, values: tenth }]);
    if (params.get("go") === "wx") { const el = $("#wx"); if (el) el.scrollIntoView({ block: "start" }); }
  }

  /* 歷屆比賽天氣：每屆一行，連同本組冠軍成績，方便比較各年條件；點選進入該屆成績 */
  function wxTable(eds, cat) {
    if (!DB.weather) return "";
    const rows = [...eds].reverse().map((e) => {
      const w = wxFor(e.edition, cat); if (!w) return "";
      const champ = e.categories[cat].individual[0];
      const notes = wxNotes(w).filter((n) => n !== t("wxPlanned"));
      return `<a class="wxrow" href="#/rank?e=${e.edition}&c=${cat}">
        <span class="yr">${yearShort(e.year)}<small>${t("edition", e.edition)}</small></span>
        <span class="wx-mid"><b>${to(w.temp_min, w.temp_max)}°C · ${lang === "zh" ? "濕度" : "RH"} ${w.rh_avg}%${w.rain_reports > 0 ? " · " + t("wxRainY") : ""}</b>
          <small>${esc(t("wxDayFmt", w.date))}${w.basis === "planned" ? "＊" : ""}${notes.length ? " · " + esc(notes.join("；")) : ""}</small>
          <span class="wx-badge lv-${w.level}">${t("wx_" + w.level)} · ${esc(wxSlow(w))}</span></span>
        <span class="wx-champ">${champ ? fmt(champ.seconds) : "-"}<small>${t("champTime")}</small></span>
      </a>`;
    }).join("");
    const f = fcNow();
    const fcRow = f ? `<div class="wxrow fc-row">
        <span class="yr">${t("fcRow")}<small>${t("edition", DB.race.edition)}</small></span>
        <span class="wx-mid"><b>${to(f.temp_min, f.temp_max)}°C · ${lang === "zh" ? "濕度" : "RH"} ${f.rh_min}-${f.rh_max}%${f.rain ? " · " + t("wxRainY") : ""}</b>
          <small>${esc(t("wxDayFmt", f.date))} · ${esc(fcSky(f))}</small>
          <span class="wx-badge lv-${f.level}">${t("wx_" + f.level)} · ${esc(wxSlow(f))}</span></span>
        <span class="wx-champ">-<small>${t("champTime")}</small></span>
      </div>` : "";
    return `<div class="section-title" id="wx"><h2>${t("wxRecTitle")}</h2></div>
      <p class="muted-note" style="margin-top:-4px">${t("wxRecSub")}</p>
      <div class="board">${fcRow}${rows}</div>
      <p class="muted-note">${t("wxPlannedFoot")}${t("wxNote")}</p>`;
  }
  function renderNotFound() { view.innerHTML = `<div class="wip"><h2>${t("notFound")}</h2><a class="btn" href="#/">${t("back")}</a></div>`; }

  /* ---------- 路由 ---------- */
  window.addEventListener("error", (e) => { console.error(e.error || e.message); });
  let routed = false, navDepth = 0, lastPath = null;
  window.addEventListener("hashchange", () => { navDepth++; });
  function backButton() {
    // Phosphor Icons (MIT) caret-left bold
    return `<button type="button" class="back" id="backBtn"><svg viewBox="0 0 256 256" aria-hidden="true" fill="currentColor"><path d="M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z"/></svg>${t("back")}</button>`;
  }
  function wireBack() {
    const b = $("#backBtn"); if (!b) return;
    // 由站內點入 → 回上一頁；直接開啟連結 → 回首頁
    b.onclick = () => { if (navDepth > 0) history.back(); else location.hash = "#/"; };
  }
  /* 首頁宣傳海報：每次進入首頁彈出；按海報進入賽前預覽；關閉按鈕須等 3 秒 */
  const PROMO_WAIT = 3;
  function closePromo() { const b = document.querySelector(".promo"); if (b) { clearInterval(b._tick); b.remove(); document.removeEventListener("keydown", b._onKey); } }
  function showPromo() {
    const race = DB.race;
    if (!race || !DB.preview || window.XC_NO_PROMO || document.querySelector(".promo")) return;
    const days = daysTo(race.date);
    if (days < 0) return; // 比賽日之後不再宣傳
    const first = race.schedule.slice().sort((a, b) => a.start.localeCompare(b.start))[0];
    const venue = lang === "zh" ? race.venue_zh : race.venue_pt;
    const total = Object.values(race.totals).reduce((a, b) => a + b, 0);
    const box = document.createElement("div");
    box.className = "promo"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", t("pvTitleZh"));
    box.innerHTML = `<div class="promo-wrap">
      <a class="promo-card" href="#/preview" style="--photo:url(img/race/start.jpg)">
        <span class="pr-tag">${esc(t("prTag"))}</span>
        <span class="pr-title">${esc(t("pvTitleZh")).replace("屆", "屆<br>")}</span>
        <span class="pr-pt" lang="pt">${esc(t("pvTitlePt"))}</span>
        <span class="pr-count"><small>${esc(t("prToGo"))}</small><b>${days}</b><small>${esc(t("prDays"))}</small></span>
        <span class="pr-when">${esc(t("pvWhen", t("dateFmt", new Date(race.date + "T00:00:00")), first.start, venue))}</span>
        <span class="pr-stats"><span><b>${total}</b>${esc(t("hcRunners"))}</span><span><b>${race.schools.length}</b>${esc(t("hcSchools"))}</span><span><b>${race.schedule.length}</b>${esc(t("hcCats"))}</span></span>
        <span class="pr-cta">${esc(t("prCta"))}<i aria-hidden="true">›</i></span>
      </a>
      <button type="button" class="promo-x" disabled aria-label="${esc(t("prWait", PROMO_WAIT))}">
        <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="19"/><circle class="ring" cx="22" cy="22" r="19" pathLength="100"/></svg>
        <b class="px-n">${PROMO_WAIT}</b><svg class="px-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button></div>`;
    document.body.appendChild(box);
    const x = box.querySelector(".promo-x"), n = box.querySelector(".px-n");
    let left = PROMO_WAIT;
    box._tick = setInterval(() => {
      left--;
      if (left > 0) { n.textContent = left; x.setAttribute("aria-label", t("prWait", left)); return; }
      clearInterval(box._tick); x.disabled = false; box.classList.add("ready"); x.setAttribute("aria-label", t("prClose"));
    }, 1000);
    box._onKey = (e) => { if (e.key === "Escape" && !x.disabled) closePromo(); };
    document.addEventListener("keydown", box._onKey);
    x.onclick = () => { if (!x.disabled) closePromo(); };
    box.querySelector(".promo-card").addEventListener("click", closePromo);
    box.querySelector(".promo-card").focus({ preventScroll: true });
  }

  function route() {
    if (popTimer) { clearInterval(popTimer); popTimer = null; }
    while (pageTimers.length) clearInterval(pageTimers.pop());
    const h = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = h.split("?");
    const params = new URLSearchParams(qs || "");
    let nav = "home";
    if (!(path === "/" || path === "")) closePromo();
    if (path === "/" || path === "") { renderHome(); showPromo(); }
    else if (path === "/rank") { nav = "rank"; renderRank(params); highlight(params.get("hl")); }
    else if (path.startsWith("/p/")) { nav = ""; renderPerson(path.slice(3)); }
    else if (path === "/athletes") { nav = "athletes"; renderAthletes(params); }
    else if (path === "/live") { nav = ""; renderLive(params); }
    else if (path.startsWith("/s/")) { nav = "athletes"; renderSchool(decodeURIComponent(path.slice(3))); }
    else if (path === "/records") { nav = "records"; renderRecords(params); }
    else if (path === "/preview") { nav = ""; renderPreview(params); }
    else if (path === "/privacy") { nav = ""; renderPrivacy(); }
    else if (path === "/cert") { nav = ""; renderCert(params); }
    else if (path === "/photos") { nav = ""; renderPhotos(params); }
    else renderNotFound();
    if ((path.startsWith("/p/") || path.startsWith("/s/") || path === "/preview" || path === "/privacy" || path === "/live" || path === "/cert" || path === "/photos") && !view.querySelector(".wip")) {
      view.insertAdjacentHTML("afterbegin", backButton());
      wireBack();
    }
    document.querySelectorAll(".dock a").forEach((a) => {
      const on = a.dataset.nav === nav;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (routed) view.focus({ preventScroll: true });
    routed = true;
    // 同一頁面內切換篩選（男女、組別、屆別、往績／預測）保留捲動位置；進入另一頁才回到頁頂
    const samePage = path === lastPath;
    lastPath = path;
    if (!samePage && !params.get("hl") && !(path === "/rank" && params.get("s")) && !params.get("go")) window.scrollTo(0, 0);
  }
  // 再按目前頁面的底部按鈕：回到頁頂（一般 App 做法）
  document.querySelectorAll(".dock a").forEach((a) => a.addEventListener("click", () => {
    if (a.classList.contains("on")) window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }));
  function highlight(pid) {
    if (!pid) return;
    const a = view.querySelector(`.row[href="#/p/${pid}"]`);
    if (a) { a.classList.add("mine"); a.scrollIntoView({ block: "center" }); }
  }

  function applyLang() {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => el.textContent = t(el.dataset.i18n));
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => el.placeholder = t(el.dataset.i18nPh));
    $("#langBtn").textContent = lang === "zh" ? "EN" : "中";
    $("#langBtn").setAttribute("aria-label", t("langAria"));
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    document.title = lang === "zh" ? "澳門學界越野跑成績" : "Macau Schools Cross-Country Results";
  }
  $("#langBtn").onclick = () => {
    lang = lang === "zh" ? "en" : "zh";
    try { localStorage.setItem("xc-lang", lang); } catch (e) { /* 忽略 */ }
    applyLang(); ATH = null; SCHOOLS = null; route(); if (q.value) search(q.value);
  };

  applyLang();
  // 每次都向伺服器確認資料是否更新（ETag），避免新舊檔案混用
  const get = (u) => fetch(u, { cache: "no-cache" });
  const opt = (u) => get(u).then((r) => r.ok ? r.json() : null).catch(() => null);
  Promise.all([get("data/results.json").then((r) => r.json()), opt("data/distances.json"), opt("data/race48.json"), opt("data/preview48.json"), opt("data/crests.json"), opt("data/site.json"), opt("data/weather.json"), opt("data/forecast48.json")]).then(([d, dist, race, pv, crests, site, weather, forecast]) => {
    DB = d; DB.site = site || {}; DB.weather = weather; DB.forecast = forecast;
    DB = d; DB.distances = dist; DB.race = race; DB.preview = pv && pv.data_version === d.data_version ? pv : null; DB.crests = (crests && crests.images) || {}; derive(); deriveStatus();
    $("#srcLink").href = d.source;
    window.addEventListener("hashchange", route);
    route();
  }).catch((err) => {
    console.error(err); // 讓真正原因可見（測試會捕捉 console 錯誤）
    view.innerHTML = `<div class="wip" role="alert"><h2>${t("loadFail")}</h2><p>${t("loadFailText")}</p><button type="button" id="retry">${t("retry")}</button></div>`;
    $("#retry").onclick = () => location.reload();
  });
})();
