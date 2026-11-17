# 台美股個股分析 — 2026-11-17

## 開啟與可用範圍

- 台股：`#analysis/TW/2330`、`#analysis/TW/6488`、`#analysis/TW/0050`。舊 `#analysis/2330` 等網址繼續有效。
- 美股：`#analysis/US/AAPL`、`#analysis/US/MSFT`。支援代號、英文公司名、蘋果／微軟搜尋。
- SPY：ETF 研究欄位與發行人連結；目前行情、淨值、折溢價皆缺資料，沒有虛構數字。
- 台股原有上市、上櫃、興櫃清單與資料流程保留；美股沒有宣稱涵蓋所有股票。市場識別為 `TW:2330`、`US:AAPL`，不以無市場的 ticker 合併資料。
- 學習進度、教材收藏、課程網址、台股最近瀏覽儲存鍵未改動。EPS／本益比／均線與現金流可回到既有課程。

```bash
npm ci
npm run dev -- --port 4173
# http://127.0.0.1:4173/#analysis/US/AAPL
npm test
npm run build:pages
npm run preview:pages
# http://127.0.0.1:4176/finance-school/#analysis/US/AAPL
```

## 資料來源與授權狀態

來源查核日：**2026-11-17**。實際 HTTP 紀錄見 [us-source-audit.json](us-source-audit.json)，SEC 擷取時間與 SHA-256 見 `data/sec/*-source-checks.json`。連結可開啟不等於取得行情再展示權。

| 資料 | 原始來源、範圍 | 使用方式／狀態 |
|---|---|---|
| 台股行情、公司清單、財報摘要 | [TWSE OpenAPI](https://openapi.twse.com.tw/)、[TPEx OpenAPI](https://www.tpex.org.tw/openapi/)、[MOPS](https://mops.twse.com.tw/) | 沿用既有官方盤後流程、引用與快照；非即時授權。逐項來源見 [ALL-STOCKS](ALL-STOCKS.md)。沒有新增即時再散布服務。 |
| 台積電單季稀釋 EPS | 公司各季首次新聞稿 | 保留公告日、原始文件、雜湊及保守可用日。歷史模型見 [STOCK-ANALYSIS](STOCK-ANALYSIS.md)。 |
| 台積電季度營運與現金流 | [2026 Q3 財務摘要 PDF](https://investor.tsmc.com/chinese/encrypt/files/encrypt_file/reports/2026-10/3a94d1034b9e6b22446b674f7aaf3d088a12a193/FS.pdf) 第 2／4 頁 | 僅整理數值、算式與來源，不轉載報告文字。固定核實快照 `data/2330-research-metrics.json`；本期 2026/07–09、比較期 2025/07–09。公告 2026-10-15，與最新行情日期分開。 |
| AAPL、MSFT 財報 | [SEC Company Facts](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)、Submissions、10-K／10-Q／8-K exhibits | 使用 SEC 官方公開存取方式；保存原始數值、CIK、accession、form、申報日、期間與文件連結。財報公開可查不代表 SEC 授予交易所行情權。原始文件權利仍屬相關權利人；本站只整理財務數字。 |
| 美股行情 | 可替換的後端資料介面 | **未取得展示權或憑證，未發布任何美股價格、成交量、K 線或實際估值。** 盤前／正常盤／盤後明列未提供。 |
| FinMind 候選 | [基本面 API](https://finmind.github.io/tutor/TaiwanMarket/Fundamental/)、[商業使用](https://finmind.github.io/CommercialUse/)、[資料授權](https://finmind.github.io/Disclaimer/) | 已確認財報、現金流、月營收資料集；全市場批次功能限 backer／sponsor 等方案。官方商業 Q&A 指向 Sponsor Pro，並限制原始資料再散布／鏡像；對外公開仍須確認原來源授權。**沒有確認本專案方案與再展示權，因此未啟用。** |
| Lightweight Charts 5.3.0 | TradingView | Apache 2.0。網站保留標誌、連結、NOTICE 與授權全文；不是從 TradingView 取行情。 |
| twstock／yfinance | 可選本機工具 | 不加入公共部署依賴。既有 TWSE 原始本機快照完整保留；本次未找到原有 twstock 專用資料檔。新增本機匯出工具，不冒稱已使用／驗收此套件。yfinance 沒有被當作公開展示授權來源。 |

Apple：CIK `0000320193`；Microsoft：CIK `0000789019`。原始 JSON 保存在 `data/sec/`，前端只載入整理後的 `us-data.json`，沒有 User-Agent 或憑證。

### 可直接回查的最新文件

- [Apple FY2026 10-K](https://www.sec.gov/Archives/edgar/data/320193/000032019326000026/aapl-20260926.htm)：2026-11-03 申報，期末 2026-09-26。
- [Apple FY2026 Q4 原始 8-K exhibit](https://www.sec.gov/Archives/edgar/data/320193/000032019326000024/a8-kex991q4202609262026.htm)：2026-11-02 申報，直接季度稀釋 EPS **2.10**。
- [Microsoft FY2027 Q1 10-Q](https://www.sec.gov/Archives/edgar/data/789019/000119312526436133/msft-20260930.htm)：2026-10-28 申報，2026-07-01～09-30。
- [Microsoft FY2026 Q4 原始 8-K exhibit](https://www.sec.gov/Archives/edgar/data/789019/000119312526323632/msft-ex99_1.htm)：2026-07-29 申報，直接季度 EPS **4.81**。

## 更新頻率與失敗處理

- 台股：沿用每日台北 **17:00、21:00** Actions 更新、測試、建置及部署；排程可能延遲。進站讀取最新已發布資產，上市近期日線可由瀏覽器重查；上櫃讀取同源官方快照。
- **SEC：依使用者選擇，未提供聯絡信箱，預設不啟用自動抓取。** 保留 2026-11-17 已核實資料和真正來源查核時間。按重新查詢只讀發布快照，不能宣稱已查到當天新公告。
- 維護者日後可在 Actions Secret 或 repository variable 設定 `SEC_USER_AGENT`，內容需包含專案識別及同意用於此用途的聯絡 email。程式不會從 GitHub profile 推測或代填信箱；身份資料不寫入前端、JSON 或紀錄。
- 已設定識別後，`npm run update:us` 才會對 SEC 發請求。依 [SEC fair access](https://www.sec.gov/os/accessing-edgar-data) 以每次至少 1.1 秒、序列請求（低於 10 requests/sec）；429／5xx 依 Retry-After／指數退避，403 停止重試，保留舊快照與原日期。來源失敗不把 checkedAt 改成成功。
- `npm run update:us:offline` 只從保存的原始資料重建，絕不更新來源查核時間。GitHub 的 PR 建置不向 SEC 抓資料。
- 台積電 IR 在 GitHub runner 的既有 403 限制仍存在；保留既有版本警示與停止估值規則。補充季度營運面板是獨立核實快照，未假裝跟隨每次行情更新。

## 財報口徑與可驗算模型

1. **會計季度**依原公司申報期間對應 FY／Q，不把 Company Facts 比較數的 `fy` 當成該數值的真正會計年度。Apple 採 52／53 週；Microsoft 6 月年度結束，2026 年 9 月季是 FY2027 Q1。
2. **單季流量**優先用直接申報；否則僅在同年度起日、標籤、幣別、單位一致時，從累計值相減。涉及尚未對齊的更正累計值則停止，不混算。每個原始輸入都保留來源與版本。
3. **單季稀釋 EPS**只用直接申報季度值。Q4 缺漏時不以全年減九個月代替；兩家公司最新 Q4 從 issuer 8-K exhibit 核實。Apple 四季相加 **8.97**，全年加權股數 EPS **8.98**；Microsoft Q4 直接 EPS **4.81**，全年減前三季為 **4.80**，都不可混用。更早年度直接 Q4 尚未逐筆補齊，會留下歷史 EPS 樣本缺口。
4. **時間版本**：只採觀察日當時已公開文件，保守從申報次日納入。後續更正只影響其公開後的觀察日。比較數即使屬去年，仍保留本次文件申報日，沒有偽裝成去年已知。
5. **金額／比率**：SEC 原值 USD；台積電原始百萬元數字正規化成 TWD 元；頁面才縮放成原幣百萬元。營收年增使用相同會計季度；台股原有月營收另列。毛利率＝毛利／營收；營業利益率＝營業利益／營收。自由現金流＝OCF−現金購置設備，不把未付現金租賃也算入，不以淨利代替現金流。
6. **估值**：各完整月末實際未還原收盤／當時四季 EPS，取可比正值樣本的 P25／P50／P75；至少 **24 筆**。最新已公告四季 EPS × 各倍數得到下緣、中位數、上緣。P25／P75 是歷史分布中段，不是投資評等或保證合理價。
7. **停用條件**：負／零 EPS、四季不連續、報表過舊、行情過舊／日期無效、缺漏／重複行情、樣本不足、分割或幣別未對齊。美股分割需逐季、逐 accession 核實 EPS 的股數基準，否則停止，避免已重編 EPS 被再次調整。
8. **K 線**由日線彙整，週採週一至週日、月採曆月，期中棒標記；日 MA5／20／60 在切顯示根數前以完整有效日線計算。未還原口徑包含除息跳空。美股將來有來源時需明列調整方式；估值不接受含股利還原價。
9. **ETF／金融業**：ETF 另列 NAV／折溢價，只有同日同幣別可計算；0050、SPY 缺 NAV 時顯示缺口。金融業保留官方 P/B，ROE 缺可比權益及淨利時不推算。

技術面、基本面、估值分開呈現；所有摘要由已計算數字和確切比較期間產生，沒有語言模型代填數字或預測買進勝率。

## 美股行情後端介接

公開版目前沒有真正行情。`scripts/us-quote-provider.mjs` 是可替換的資料邊界，**不是已完成某家資料商實測的串接**。維護者確認供應商允許本網站公開展示、交易所涵蓋、延遲與快取／保存條款後，才可由後端／Actions 產生下列契約：

```json
{"stocks":[{"region":"US","symbol":"AAPL","cik":"0000320193","exchange":"NASDAQ","provider":"合格來源名稱","exchangeCoverage":"合約涵蓋交易所","license":{"publicDisplayAllowed":true,"documentation":"合約或條款網址","checkedAt":"查核日期","cachePolicy":"合約允許範圍"},"quote":{"price":123,"currency":"USD","date":"交易日","timestamp":"成交 ISO 時間","status":"delayed","delayMinutes":15,"volume":100,"sessions":{}},"history":{"adjustment":"unadjusted","rows":[],"completeMonths":[],"corporateActionsVerified":false,"corporateActions":[],"epsShareBases":[]}}]}
```

上例是**格式示意，不是真實行情**，不得放入生成快照。設定伺服器端 `US_PUBLIC_QUOTE_FILE` 與 `US_PUBLIC_DISPLAY_CONFIRMED=true` 後執行更新。格式檢查不代替法律授權；未勾選權利確認、缺條款或 yfinance 輸入一律不發布。分割基準表需包含 `accession`、`end`、`basisThrough`、`verified`。來源只輸出白名單資料，API key 不得放入 JSON 或 `VITE_*`。

即時串流仍需持有密鑰的後端、合格供應商快照→串流、斷線重連與公開展示實測，見 [REALTIME](REALTIME.md)。本版沒有宣稱已接上 WebSocket。

本機可選 `python3 scripts/local-quotes.py twstock 2330` 或 `python3 scripts/local-quotes.py yfinance AAPL`；先自行安裝相應套件。只輸出被 Git 忽略的 `.local/`，不參與 CI／公開建置。yfinance 的 Close 可能已按分割調整，`auto_adjust=False` 也不等於實際未還原價。此可選工具未以外部套件實測，公開網站不依賴它。

## 驗收

詳細數字見 [獨立重算紀錄](tw-us-recalculation.json)。

- 2330：2026-11-17 收 2,170；四季 EPS 19.50+22.08+27.25+29.43＝**98.26**。34 筆 2024-01～2026-10 月末樣本，P25 **23.033447547**、P50 **24.988324742**、P75 **26.872925829**。區間 **2,263.27～2,640.53 TWD**，現價低於區間。20 筆收盤合計 **46,490／20＝2,324.50**。用獨立 Python 從原始 TWSE body 與首次公告 EPS 重算，與前端一致。
- AAPL：2026 Q4 OCF **145,097−116,996＝28,101** 百萬 USD；CapEx **9,041−6,799＝2,242**；FCF **25,859**。營收 **478,834−364,357＝114,477**；毛利率 **54,820／114,477＝47.88734855%**；直接四季 EPS **8.97 USD／股**。原始 SEC 數值另由測試獨立讀取核對。**缺合格行情，因此沒有美股估值重算結果。**
- MSFT：FY2027 Q1 營收 **92,279** 百萬 USD、OCF **58,000**、CapEx **39,367**、FCF **18,633**；四季 EPS **19.16**，年度與季度映射正確。
- 6488：上櫃快照 2026-11-17 收 **546 TWD**、成交量 **10,450,392 股**，載入同源歷史資產，沒有使用上市 endpoint。
- 0050／SPY：顯示基金資料與 NAV 缺口，不套公司 PE。
- 自動測試涵蓋同代號不同市場、跨年累計、公告晚於觀察日、更正、分割、負 EPS、行情過期／延遲、來源失敗、搜尋／ETF／假設試算。
- Chromium 實測 1440px 桌面、820px iPad、390px 手機及真正 `/finance-school/` 掛載。台股滑鼠／iPad 觸控拖曳會改變讀值，日／週／月切換與期中標記正常；無頁面 JS 錯誤、無整頁水平溢出。這是 Chromium 的 iPad 尺寸／觸控模擬，未使用實體 iPad Safari。
- 授權行情、真正即時／延遲與盤前盤後串流、可選本機套件，以及來源後續新財報版本仍需外部設定／實測，不列為通過。
