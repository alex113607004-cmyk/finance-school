# 台美股個股分析

繁體中文的個股研究網站，集中查看行情、K 線、均線、基本面與歷史估值。

新增 **私人雲端版，Email 驗證碼登入**：手機、平板和電腦都開啟 [私人 Worker 網址](https://finance-school.alexchen109.workers.dev/)，不用另設密碼，電腦也不必開機。須先依 [Cloudflare 設定指南](docs/EMAIL-ACCESS-CLOUD.md) 啟用 Access、允許自己的 Email 並保存後端 Key；尚未設定時程式拒絕提供私人頁面及行情。真實收信與 Key 查詢仍需本人完成驗證。

保留 **Windows 本機版，免登入、免另設密碼**：[下載 ZIP](https://alex113607004-cmyk.github.io/finance-school/downloads/finance-school-windows-local.zip)。安裝 Node.js LTS 後，解壓縮並雙擊「啟動本機版.cmd」，第一次在本機頁面儲存 Fugle Key 即可；Key 只留在你的電腦。詳見 [本機使用與驗收](docs/LOCAL-WINDOWS.md)。

正式網站：https://alex113607004-cmyk.github.io/finance-school/

- [自選股清單](https://alex113607004-cmyk.github.io/finance-school/#watchlist/all)
- [市場總覽：熱門、漲跌排行與漲跌停](https://alex113607004-cmyk.github.io/finance-school/#overview/TW)
- [台積電 2330](https://alex113607004-cmyk.github.io/finance-school/#analysis/TW/2330)
- [環球晶 6488](https://alex113607004-cmyk.github.io/finance-school/#analysis/TW/6488)
- [Apple AAPL](https://alex113607004-cmyk.github.io/finance-school/#analysis/US/AAPL)
- [Microsoft MSFT](https://alex113607004-cmyk.github.io/finance-school/#analysis/US/MSFT)

## 目前功能

新增 **產業篩選**：台股／美股個股頁、自選股搜尋和市場總覽都能按官方分類找標的；台股使用交易所產業代碼，美股使用 SEC SIC，ETF 與分類缺口獨立列示。市場總覽的統計、排行與分頁同步篩選並保留返回狀態。詳見 [操作、來源與驗收](docs/INDUSTRY-FILTERS.md)。

同一裝置可沿用現有 Cloudflare Access Cookie 快速登入，建議在控制台將本人 application／policy 設為 7 天；不需新增網站帳密。此設定尚未代為變更，詳見 [保留登入的逐步設定與評估](docs/DEVICE-LOGIN.md)。

私人雲端版新增 **跨裝置自選股同步與台股個股頁最新成交**：所有裝置用同一 Email 登入私人網址，收藏首次合併、加入／移除以操作同步，斷線可補送；前景每 30 秒及回到分頁時查詢雲端變更。全部台股個股頁均接入 Fugle 可支援的標的，顯示實際成交、時間、幣別與來源，重算價格相關倍數，K 圖另畫現價虛線。日均線仍採已完成盤後資料，ETF 仍須同日正式淨值。美股尚無合格行情，保留缺口。詳見 [使用、來源、衝突規則與驗收](docs/CLOUD-SYNC-LIVE-QUOTES.md)。

自選股使用可收合側邊欄，直接搜尋、加入／移除與切換分析，保留原有收藏，私人雲端版支援跨裝置同步，公開站與本機版保留瀏覽器儲存；手機及平板改為抽屜。小圖只接受當日分時，提供開盤價虛線及時間／價格游標，不以近20日線或高低區間替代。**私人雲端版以 Cloudflare Access Email PIN 驗證本人，Key 放後端；Windows 本機版首次保存 Key 後免登入。** 真實資料仍依自己的 Key、方案與當日資料可用性。詳見 [私人雲端設定](docs/EMAIL-ACCESS-CLOUD.md)、[本機設定](docs/LOCAL-WINDOWS.md)、[圖表口徑](docs/WATCHLIST-INTRADAY.md)。舊 `#watchlist/all`／`TW`／`US` 網址繼續開啟側欄；原雲端密碼版僅保留 [歷史紀錄](docs/PRIVATE-INTRADAY-SETUP.md)。

一般股票頁的「前瞻本益比」採具名機構年度 EPS 預估：首批為 2330／2317／6488 的 FactSet 調查中位數（鉅亨網公開報導），另有 2330 的摩根士丹利預估（經濟日報轉述）。可切換年度與來源，以實際股價重算，並同步自選側欄；顯示預估期間、報導日及原文連結。原文未區分基本／稀釋 EPS 時明列口徑，不冒稱稀釋 EPS。其餘標的尚缺來源，不外推或套用其他公司預估。使用者假設另收在試算中，不覆寫機構數值。詳見 [來源、引用範圍、更新與驗算](docs/INSTITUTIONAL-FORECASTS.md)。

ETF 使用 [官方每日淨值開放資料](https://data.gov.tw/dataset/11109)，只以同日、同幣別收盤價計算折溢價，移除公司 EPS、本益比樣本及情境試算門檻。初次已核實 345 檔台灣 ETF；各檔淨值日分別保存，美股 SPY 尚缺合格行情及淨值，保留具體缺口。

頁首「資料狀態」預設收合成可點擊圖示：✓ 資料完整、! 部分缺漏或待核對、× 沒有可用資料；展開後可查看逐欄查核表。行情、財報與歷史估值分開標示，提醒行情／官方本益比錯日，提供回補進度、公告日缺口與來源暫停時間。第一階段資料回補仍有外部來源阻塞，網站持續標示缺口；依使用者最新指示先行第二階段。詳見 [資料狀態與驗收](docs/DATA-READINESS.md)、[逐項功能關卡](docs/FEATURE-ROADMAP.md)。

新增「市場總覽」：不需輸入代號即可瀏覽上市／上櫃普通股與 ETF 的成交熱門、漲幅排行、跌幅排行、收盤漲停和跌停。支援成交量／金額排序、篩選與分頁，點選直接進入既有個股分析。使用同日官方盤後資料和已對齊交易日的官方停板價；不是即時排行。詳見 [來源、分類口徑與驗收](docs/MARKET-OVERVIEW.md)。

個股頁已精簡為「價格與 K 線 → 分析摘要 → 基本面 → 估值試算」。刪除重複判讀及開發配置說明，來源與長篇計算可展開查閱；新增頁內導覽及統一桌面、平板、手機的深色介面。詳見 [版面改版與驗收](docs/DASHBOARD-REDESIGN.md)。

新增「價格合理性評估」：搜尋後整合基本面、MA5／20／60 與現價相對歷史估值的位置，列出來源、算式和資料缺口。技術面不會改寫估值；資料不足時不給假合理價。詳見 [模型與驗算](docs/PRICE-ASSESSMENT.md)。

新增官方現金流批次回補與「資料完整度與更新狀態」：第一批已驗證 51 家上市櫃公司的年初累計營業現金流、現金設備支出及自由現金流，包含 2330、2317、6488。頁面可展開原始數字及算式；沒有公告日的彙總資料不進入歷史估值。詳見 [選定配置、來源與回補限制](docs/DATA-CONFIGURATION.md)。

- 台股／美股切換，代號與公司名稱搜尋；台股含官方上市、上櫃、興櫃名單，美股先提供 AAPL、MSFT 財報及 SPY 的 ETF 資料缺口。
- 台股行情、漲跌幅、成交量、資料日期與原始來源。日／週／月 K、成交量、日 MA5／20／60、縮放與拖曳游標；資料不足時保留缺口。
- 可核實的 EPS、營收與獲利率、現金流及原始財報；台積電提供完整季度研究快照，美股使用 SEC Company Facts、Submissions 與直接揭露的季度 EPS。
- 自家歷史本益比 P25／P50／P75、至少 24 筆有效月末樣本、展開來源與算式，以及 EPS／倍數情境試算。估值與均線位置分開呈現。
- 指標可點開定義與例子；ETF 與金融業不套一般公司的估值門檻。
- 桌面、平板、手機版面；保留台股最近查看與本機 twstock 選用快照。

**目前美股沒有合格公開行情展示來源，因此沒有站內價格、K 線或實際價格估值。SEC 自動抓取預設停用，沿用已核實快照與原查核日期。** 台積電 IR 在 GitHub runner 的 403 限制仍依既有規則顯示警示。

網站已移除教材單元、文章／影片索引、學習進度、教材收藏、學習搜尋、獨立詞典頁與舊看盤入口。根網址直接進入個股分析；舊教材網址及 `#market` 轉向 `#analysis/TW/2330`。舊台股網址 `#analysis/2330` 和美股 `#analysis/us/AAPL` 繼續有效。既有瀏覽器學習紀錄不再讀寫，也不自動清除。

## 本機啟動與驗收

Node.js 24 LTS（最低 22.12）：

```bash
npm ci
npm run start:local
# 首次需要時自行建置，開啟 http://127.0.0.1:4178/#watchlist/all
npm run dev -- --port 4173
# http://127.0.0.1:4173/#analysis/TW/2330
npm test
npm run build:pages
npm run preview:pages
# http://127.0.0.1:4176/finance-school/#analysis/US/AAPL
```

`predev`／`prebuild:pages` 從保存的官方日報重建上櫃歷史資產，無須先向來源發出大量回補請求。`build:pages` 產生完整 `dist/pages/`，包含 HTML、台美股 JSON、個股歷史及圖表授權文字。相對路徑與 hash 路由支援 GitHub Pages 的 repository 子路徑。`npm run build` 另產出可選 Worker；Pages 不執行 Worker。

## 資料更新與部署

台股沿用 TWSE、TPEx、MOPS 與公司公告流程，GitHub Actions 每日台灣時間 **17:00、21:00** 擷取、測試、建置與發布，排程可能延後。進站或按重新查詢會讀最新已發布資料；上市近期日線另向官方查詢，上櫃採同源快照。來源失敗保留原日期，不把查詢時間當成交易時間。

市場總覽跟隨相同排程；可執行 `npm run update:overview` 更新獨立的 `market-overview-data.json`。若上市、上櫃日期不同，合併排行只使用較新日期，另顯示缺少同日資料的市場，避免跨日比較。

現金流另採官方財務比較 E 點通批次快取：每次排程最多 120 檔，逐批回補；既有資料至少相隔 7 天查核。遇 403／429 停止並暫停 24 小時，不能保證所有公司的回補完成日期。可執行 `npm run update:financials:offline` 重建已核實資料，不發出外部請求。

ETF 每日淨值跟隨相同排程，以 `npm run update:etf-nav` 每批只讀取一次官方 CSV；GitHub Actions 快取保留最多8次日期觀察以便與價格對齊。來源失敗保留原淨值日與查核時間，海外資產 ETF 的正式淨值可能落後台股交易日。排行資產另保留官方開高低收供側欄區間圖使用。

法人預估以 `npm run update:forecasts` 隨同排程重新查核已登錄的 4 篇公開報導；進站讀取最新發布快照。只核對這些報導的數值與日期，不自動搜尋機構新報告，也不代表取得 FactSet 或券商完整資料庫。查核時間與原報導日期分開保留；原文改值待重核時暫停倍數計算。引用限於個別數字及來源連結，並非資料商 API 授權。

SEC 財報要由維護者自行設定 `SEC_USER_AGENT` 並明確啟用 `SEC_UPDATES_ENABLED=true`，不從 GitHub profile 代填聯絡資訊。行情憑證只放在後端或 Actions Secrets，不能放入 `VITE_*`。

推送 `main` 即由 `.github/workflows/pages.yml` 測試與部署。PR 僅測試與建置，不向 SEC 或交易所重新抓取來源。

## 來源、口徑與限制

- [台美股資料來源、授權、更新與驗算](docs/TW-US-ANALYSIS.md)
- [法人預估 EPS、前瞻本益比來源與驗收](docs/INSTITUTIONAL-FORECASTS.md)
- [台股全市場涵蓋與缺口](docs/ALL-STOCKS.md)
- [台積電歷史估值模型](docs/STOCK-ANALYSIS.md)
- [twstock 本機快照及即時行情介接](docs/REALTIME.md)
- [僅保留個股分析的變更與驗收](docs/ANALYSIS-ONLY.md)

股票分析與資料查閱用途；歷史區間不等於保證合理價或買進指令。
