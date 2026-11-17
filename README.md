# 新手財經小學堂

繁體中文的來源導讀與台美股資料學習網站。正式網站：
https://alex113607004-cmyk.github.io/finance-school/

## 台美股個股研究

新增市場切換、含市場的網址、AAPL／MSFT 的 SEC 財報、季度與近四季稀釋 EPS、營收與獲利率、現金流及可展開的來源／算式。台股沿用官方流程，個股圖改用 Lightweight Charts，保留拖曳查值與日／週／月切換。

- [台積電](https://alex113607004-cmyk.github.io/finance-school/#analysis/TW/2330) · [Apple](https://alex113607004-cmyk.github.io/finance-school/#analysis/US/AAPL) · [Microsoft](https://alex113607004-cmyk.github.io/finance-school/#analysis/US/MSFT)
- **美股行情尚無可公開展示的來源，價格、K 線與估值明確保留缺口。** SEC 基本面可查；依使用者選擇，未設定識別用聯絡資訊，因此 SEC 自動更新預設暫停，保留原始查核日。
- [來源、授權狀態、更新頻率、介接設定與驗算](docs/TW-US-ANALYSIS.md)
- 本機 `npm run dev`；正式子路徑預覽 `npm run build:pages && npm run preview:pages`，開啟 `http://127.0.0.1:4176/finance-school/#analysis/US/AAPL`。

## 全市場台股個股分析

[開啟個股分析](https://alex113607004-cmyk.github.io/finance-school/#analysis/6488)：已取消單一股票限制，依官方清單搜尋上市、上櫃、興櫃及基金類標的。2026-11-17 快照 2,789 檔，包含 1,392 上市、1,023 上櫃、374 興櫃。

上市／上櫃提供日、週、月 K、成交量、MA5/20/60 與拖曳虛線；依公司申報資料整理累計 EPS、月營收年增、財報比率及官方 PE/PB/殖利率。搜尋支援部分名稱、英文簡稱、市場篩選與最近查看，不借用上一檔股票數據。

連續四季 EPS、公告日與歷史樣本未核實的股票不套歷史估值；累計 EPS 不冒充 TTM。現金流未接入時列出缺口，興櫃不以議價均價製造 K 線，ETF 不套公司本益比法。

- [全市場資料、涵蓋範圍、限制與驗收](docs/ALL-STOCKS.md)
- [已核實的台積電歷史模型與原始來源](docs/STOCK-ANALYSIS.md)
- 個股圖表使用 TradingView Lightweight Charts，可滾輪／捏合縮放、拖曳讀值及切換日／週／月 K。
- [本機 twstock 報價快照及正式即時行情介接規格](docs/REALTIME.md)

```bash
npm ci
npm run dev -- --port 4173
# http://127.0.0.1:4173/#analysis/6488
```

上櫃歷史資產在 dev/build 前由保存的官方日報重建，適用 GitHub Pages。原始更新依序為 `npm run update:market`、`npm run update:analysis`、`npm run update:universe`；財報新聞稿解析需 Python 3 與 poppler-utils。GitHub 排程仍為台北 17:00、21:00。

## 美股個股分析

[Apple（AAPL）](https://alex113607004-cmyk.github.io/finance-school/#analysis/us/AAPL) 與 [Microsoft（MSFT）](https://alex113607004-cmyk.github.io/finance-school/#analysis/us/MSFT) 提供 SEC 季報、營收年增、利潤率、現金流與可驗算的四季稀釋 EPS，並支援手動倍數試算。美股盤後行情及歷史估值需先設定具公開展示權的行情來源。更新、欄位口徑與設定見 [美股資料文件](docs/US-STOCKS.md)。

## 目前功能

- **五個主題、15 個全新單元**：股票與交易入門、財報與估值、技術分析、籌碼與槓桿、配置與風險。
- 單元最上方先列三條中文重點，每條有可開啟的依據；之後依序為文章／官方教學、閱讀提示及自我檢核。
- **24 項原始教材**：20 篇文章或官方說明、4 支證交所官方教學影片頁。保留發布機構、原文語言、適用市場、原始連結及查核日。
- 搜尋可涵蓋主題、重點、名詞及發布機構；可篩選主題／完成狀態，另有精選教材索引與影片篩選。
- 名詞彈窗、收藏及學習進度。新教材使用 v3 進度鍵，不把舊單元誤認為已完成；不刪除既有 v2 瀏覽器紀錄。
- 個股看盤、官方盤後數據、可滑鼠／觸控拖曳的原生 K 線／收盤線、週／十日／月／季／年均線、基本面與相對估值判讀仍保留。

「實戰試算室」「真實歷史案例」入口與頁面、舊 19 單元、原試算器元件及案例資料程式已移除。舊 `#tools`、`#cases`、`#case/*` 與 `#lesson/*` 回到新版學習主題；舊單元網址顯示教材已更新。Git 歷史保留以便回復，網站不提供舊教材入口。

## 教材來源與查核

來源包括臺灣證券交易所、公開資訊觀測站、集保結算所、SEC Investor.gov、SEC、Fidelity 及 Charles Schwab。外國制度不直接當台灣規則；指標觀念不寫成保證訊號。原文由各發布機構持續更新。

- [來源登錄](src/learning-sources.js)：公開網址、發布機構、語言、閱讀範圍及查核日。
- [教材與重點依據](src/learning-data.js)：每條重點對應來源 ID。
- [查核紀錄](docs/learning-source-audit.json)：24 個頁面的實際 HTTP 狀態、標題、最終網址、核對章節與四個官方 MP4 來源 metadata。
- 影片以原站觀看方式提供，本站不下載、重製或自動載入大型影片。只核對課程頁與影片來源連結，未逐段審看影片；單元摘要依已讀文章或官方頁面文字撰寫。
- HTTP 200 只證明這次可開啟；內容校閱另依紀錄章節與每條重點的引用完成，不承諾來源永不改版。

## 開發與建置

Node.js 24 LTS（最低 22.12）：

```bash
npm ci
npm run dev
npm test
npm run build:pages
```

建置產出 `dist/pages/index.html`（內含程式、樣式與回退快照）、`market-data.json` 、`analysis-data.json`、`universe-data.json` 、`us-data.json`、圖表授權文字及 `stock-history/TPEX/*.json`（進站／按需更新用）。部署時上傳整個 `dist/pages/`；相對路徑與 hash 路由支援 GitHub Pages 的 repository 子路徑。

`npm run build` 另產出可選 Worker；GitHub Pages 不會執行 Worker。現有預覽若另有部署，需自行更新，這次交付以 GitHub Pages 為準。

## 行情更新與分析範圍

每次新開／重載網站，讀取最新已發布 `market-data.json` 與官方估值報表；查看個股時重查近期月份日線，並補齊缺少的歷史月份。同一訪客的重複請求會合併，訪客不取得 GitHub token，也不觸發 Actions。

財報 OpenAPI 未提供瀏覽器跨站讀取，因此原始財報仍由 GitHub Actions 每日台北 **17:00、21:00** 擷取、測試、建置及部署；排程可能延後。來源擷取時間、財報期間與交易日期分開標示，不改寫舊資料日期。

預設四檔含最近 14 個月日線，MA5／10／20／60／240 使用未還原收盤。舊看盤頁 MA5 統一稱週線；新個股分析明列 MA5（5 日），與曆週 K 棒分開。缺月、過期、未滿 241 筆、行情未對齊或疑似分割等情況停止完整候選判讀。均線只描述價格，不是內在價值。

既有「台美股看盤」頁的價格判讀採同產業、同日、同參考財報期的正本益比樣本。倍數情境不當合理價上下限或目標價；該舊看盤頁未接入現金流、多年獲利、前瞻 EPS、個人適合度與完整還原公司行動。金融股、ETF 及未接入美股使用不同研究說明。

## GitHub Pages

本 repository 已以 **Settings → Pages → Source → GitHub Actions** 啟用。推送 `main` 或執行 workflow 即測試與部署。無須在瀏覽器提供憑證。若設定 `VITE_MARKET_API_ORIGIN`，它會公開進入前端，不能放 API 金鑰或私人 token。

更詳細的歷次驗收與具體限制見 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。
