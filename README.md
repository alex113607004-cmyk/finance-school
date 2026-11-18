# 台美股個股分析

繁體中文的個股研究網站，集中查看行情、K 線、均線、基本面與歷史估值。

正式網站：https://alex113607004-cmyk.github.io/finance-school/

- [台積電 2330](https://alex113607004-cmyk.github.io/finance-school/#analysis/TW/2330)
- [環球晶 6488](https://alex113607004-cmyk.github.io/finance-school/#analysis/TW/6488)
- [Apple AAPL](https://alex113607004-cmyk.github.io/finance-school/#analysis/US/AAPL)
- [Microsoft MSFT](https://alex113607004-cmyk.github.io/finance-school/#analysis/US/MSFT)

## 目前功能

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

現金流另採官方財務比較 E 點通批次快取：每次排程最多 120 檔，逐批回補；既有資料至少相隔 7 天查核。遇 403／429 停止並暫停 24 小時，不能保證所有公司的回補完成日期。可執行 `npm run update:financials:offline` 重建已核實資料，不發出外部請求。

SEC 財報要由維護者自行設定 `SEC_USER_AGENT` 並明確啟用 `SEC_UPDATES_ENABLED=true`，不從 GitHub profile 代填聯絡資訊。行情憑證只放在後端或 Actions Secrets，不能放入 `VITE_*`。

推送 `main` 即由 `.github/workflows/pages.yml` 測試與部署。PR 僅測試與建置，不向 SEC 或交易所重新抓取來源。

## 來源、口徑與限制

- [台美股資料來源、授權、更新與驗算](docs/TW-US-ANALYSIS.md)
- [台股全市場涵蓋與缺口](docs/ALL-STOCKS.md)
- [台積電歷史估值模型](docs/STOCK-ANALYSIS.md)
- [twstock 本機快照及即時行情介接](docs/REALTIME.md)
- [僅保留個股分析的變更與驗收](docs/ANALYSIS-ONLY.md)

股票分析與資料查閱用途；歷史區間不等於保證合理價或買進指令。
