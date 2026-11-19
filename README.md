# 台美股個股分析

繁體中文的個股研究網站，集中查看行情、K 線、均線、基本面與歷史估值。

正式網站：https://alex113607004-cmyk.github.io/finance-school/

- [自選股清單](https://alex113607004-cmyk.github.io/finance-school/#watchlist/all)
- [市場總覽：熱門、漲跌排行與漲跌停](https://alex113607004-cmyk.github.io/finance-school/#overview/TW)
- [台積電 2330](https://alex113607004-cmyk.github.io/finance-school/#analysis/TW/2330)
- [環球晶 6488](https://alex113607004-cmyk.github.io/finance-school/#analysis/TW/6488)
- [Apple AAPL](https://alex113607004-cmyk.github.io/finance-school/#analysis/US/AAPL)
- [Microsoft MSFT](https://alex113607004-cmyk.github.io/finance-school/#analysis/US/MSFT)

## 目前功能

自選股已改為可收合側邊欄，直接搜尋、加入／移除與切換分析，保留原有收藏與跨分頁同步；手機及平板改為抽屜，支援關閉、Escape、焦點循環及選股後自動收合。小圖依實際資料標示近期日收盤或當日高低區間，未取得分時資料時不繪製假分時。舊 `#watchlist/all`／`TW`／`US` 網址會開啟側欄並回到分析。詳見 [此次功能與驗收](docs/SIDEBAR-ETF-FORWARD.md)。

所有一般股票頁新增「前瞻本益比」與未來12個月 EPS 假設試算。目前沒有已授權的預估 EPS 來源，正式數字標示待補，使用者假設與已公告 EPS／歷史估值分開。ETF 則使用 [官方每日淨值開放資料](https://data.gov.tw/dataset/11109)，只以同日、同幣別收盤價計算折溢價，移除公司 EPS、本益比樣本及情境試算門檻。初次已核實 345 檔台灣 ETF；各檔淨值日分別保存，美股 SPY 尚缺合格行情及淨值，保留具體缺口。

新增頁首「資料狀態」與逐欄查核表：行情、財報與歷史估值分開標示，提醒行情／官方本益比錯日，提供回補進度、公告日缺口與來源暫停時間。第一階段資料回補仍有外部來源阻塞，網站持續標示缺口；依使用者最新指示先行第二階段。詳見 [資料狀態與驗收](docs/DATA-READINESS.md)、[逐項功能關卡](docs/FEATURE-ROADMAP.md)。

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

SEC 財報要由維護者自行設定 `SEC_USER_AGENT` 並明確啟用 `SEC_UPDATES_ENABLED=true`，不從 GitHub profile 代填聯絡資訊。行情憑證只放在後端或 Actions Secrets，不能放入 `VITE_*`。

推送 `main` 即由 `.github/workflows/pages.yml` 測試與部署。PR 僅測試與建置，不向 SEC 或交易所重新抓取來源。

## 來源、口徑與限制

- [台美股資料來源、授權、更新與驗算](docs/TW-US-ANALYSIS.md)
- [台股全市場涵蓋與缺口](docs/ALL-STOCKS.md)
- [台積電歷史估值模型](docs/STOCK-ANALYSIS.md)
- [twstock 本機快照及即時行情介接](docs/REALTIME.md)
- [僅保留個股分析的變更與驗收](docs/ANALYSIS-ONLY.md)

股票分析與資料查閱用途；歷史區間不等於保證合理價或買進指令。
