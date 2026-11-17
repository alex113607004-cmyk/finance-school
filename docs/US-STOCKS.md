# 美股個股分析

在個股分析選擇「美股分析」，或直接開啟 `#analysis/us/AAPL` 與 `#analysis/us/MSFT`。原台股網址仍可使用。本站目前提供 Apple、Microsoft 的官方申報，台股與美股各用其交易日及幣別。

## 財報與估值口徑

- `npm run update:us` 由 [SEC Company Facts](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) 擷取 US GAAP、USD 與 USD/股資料。可在自動化環境以 `SEC_USER_AGENT` 設定網站名稱及可聯繫的識別資訊。每次逐檔擷取，遇短暫失敗與允許重試的 429 退避。失敗時保留原擷取時間及數值，並標記警告。
- EPS 使用 10-Q 的單季稀釋 EPS。若 SEC 資料只有全年 EPS，第四季用已核對的 Apple Newsroom 或 Microsoft Investor Relations 單季 GAAP 稀釋 EPS（來源列在頁面）。後續第四季缺少已核對公告時，四季加總及估值會顯示資料不足。四季加總可與正式全年稀釋 EPS 略異。
- 營收與利潤率比較相同財年季度。季報數值優先，其次取同財年、同概念的相鄰累計期間差額。自由現金流採營業活動淨現金流減現金資本支出，不納入融資租賃等非現金取得。各項可展開申報日、期間與原始數字。
- 歷史 P/E 使用美東各完整月份最後交易日、當時已公開的連續四季 EPS 與合格日線。估值使用 24 筆以上正倍數樣本的 P25、P50、P75。申報與發稿日可能在盤後，統一從隔日納入。資料陳舊、股數基準無法核對、缺少有效樣本或相同欄位的申報值衝突時，不發布區間。資料只是歷史比較基準。
- 首版涵蓋兩檔普通股。SEC Company Facts 無法提供股價，ETF、金融股專用模型和美股即時串流未在此版開放。

## 選用盤後行情

設定 [Alpaca 歷史日線](https://docs.alpaca.markets/us/reference/stockbars) 前，先確認該帳戶有權公開展示與快取資料。GitHub Settings → Secrets and variables → Actions 中加入 secrets `ALPACA_API_KEY_ID`、`ALPACA_API_SECRET_KEY`。使用 repository variables `US_PUBLISH_MARKET_DATA=1` 明確開啟發布，並用 `US_ALPACA_FEED=sip` 指定整合市場，或用 `iex` 顯示單一交易所的圖表。金鑰只在資料更新工作使用。

頁面顯示完整交易日的未調整日線及來源。只有 SIP 日線支援估值。每次將原始日線與拆股調整日線逐筆比較，資料不一致便暫停歷史估值。GitHub Pages 發布靜態快照，沒有串流。沒有行情設定時，仍可看官方財報與手動倍數試算。

本機預覽使用 `npm ci`、`npm run dev -- --port 4173`。沒有行情授權時請保持預設設定，不發布其他來源的日線。
