# 私人自選股同步與個股頁行情

2026-11-20：依使用者要求，私人雲端版新增跨裝置自選股同步，並將 Fugle 最新成交接入全部台股個股頁。使用者先前已確認私人網站可登入；本次不索取或改寫本人 Key、Email 和 Access 政策。

私人網址：https://finance-school.alexchen109.workers.dev/

## 使用方式

所有裝置都開啟同一個私人網址，以原本允許的 Email 登入。側欄顯示「已同步雲端 · 手機與電腦共用」後，收藏會存入雲端。開啟頁面、回到分頁及每 30 秒的前景檢查會取得變更，也可按「同步自選股」。首次使用合併該私人網址在此瀏覽器既有的收藏，不會用空白裝置清單清除其他裝置。

搜尋任一台股標的，頁首直接顯示最新可驗證的成交價、漲跌、成交量、交易時間、來源與盤中／盤後狀態；不需要先加入自選。前景頁面每 30 秒查詢，隱藏分頁暫停，按「更新行情」可重試。這是 REST 行情快照，不是 WebSocket 逐筆推播。

GitHub Pages 公開站與 Windows 免登入本機版沿用原有資料方式，不會讀取私人收藏或 Fugle Key。不同網址的 localStorage 無法自動讀取；原本只存在公開站或 Windows 本機版的收藏，需要在私人網站加入一次。

## 自選股儲存與衝突

- 使用 Cloudflare SQLite Durable Object `WatchlistStorage`，由 `WATCHLISTS` binding 連接。Wrangler 的 `watchlist-v1` migration 自動建立命名空間，不需要使用者另外填 KV namespace ID。
- `/api/watchlist` 讀寫均須先通過原有 Cloudflare 平台驗證，並與 `ACCESS_ALLOWED_EMAIL` 比對。儲存位置以已驗證允許 Email 的 SHA-256 識別；不接受瀏覽器指定其他帳號或儲存位置。
- 儲存的只有市場、代號、名稱、加入日期及操作識別，不保存行情、API Key 或 OTP。最多 100 檔。
- 客戶端送出加入／移除操作，不上傳整份清單覆蓋其他裝置。儲存交易內逐一套用，保留最近 1,000 筆已處理操作 ID，避免正常重送加回已刪除標的。同一標的的不同操作依伺服器接收順序生效。
- 斷線變更留在瀏覽器待送佇列，重開後補送；若瀏覽器也無法儲存，明示僅此分頁暫存。登入過期保留收藏並顯示重試訊息。首次合併超過 100 檔時顯示限制，需先移除部分標的，不能靜默截斷清單。
- 只允許同源 JSON 寫入，所有回應 `private, no-store`。Cloudflare 儲存額度依本人現有 Workers 方案；SQLite Durable Objects 支援 Free 方案，本次不變更付費方案。

## 行情來源與價格口徑

- Fugle `GET /intraday/quote/{symbol}` 提供實際成交與整股累積量；Ticker 提供交易幣別、交易單位及市場。支援來源能回傳的上市、上櫃、興櫃、ETF 等網站既有標的，不承諾 Key 方案涵蓋所有代號。
- 使用 `lastTrade.price/time`，缺少完整實際成交時僅接受附成交時間的 `closePrice/closeTime`；不以可能包含試撮的 `lastPrice` 或 `lastTrial` 代替成交。
- 來源時間以微秒換算為 ISO timestamp，查詢時間另列。驗證代號、市場、交易日、幣別、時間及未還原價格口徑。不把盤後或舊交易日顯示成今日即時成交。
- 漲跌以實際成交價相對 `referencePrice` 重算；缺少參考價才採 `previousClose`，頁面明示比較基準，避免把含試撮的來源漲跌直接配上實際成交價。
- 上市／上櫃整股累積量以 Ticker 的 `boardLot` 換算股數，不假設所有標的都是 1,000 股；興櫃按來源股數。這些累積量不含零股、盤後定價及鉅額，與歷史日線全日量不能混算量比。
- 同一 Worker isolate 內合併同標的並行請求，原始行情最多暫存 10 秒，Ticker 最長 12 小時；交易日改變強制重取 Ticker。跨 isolate 不承諾共享快取。快取只留後端記憶體，不寫入公開資產。
- 登入失效或額度不足會停止該頁自動更新並清除私人價格，改顯示有日期的原盤後快照；可重新登入或手動重試。來源、時間、幣別不符時同樣退回快照。

## 估值、技術面與 ETF

個股頁的價格、近四季本益比、前瞻本益比、歷史區間位置與使用者試算，使用同一份合格最新成交價。原本的近四季 EPS、至少 24 筆歷史月末樣本、公告日與股數基準檢查保持適用；缺少資料仍不給假合理價。

日／週／月 K、成交量與均線保留已完成盤後資料，圖上另外畫「最新成交」虛線。現價相對 MA5／20／60，使用最後已完成交易日的日均線，註明日期；不插入半日量改寫全日均量。縮放根數、拖曳十字線與週月切換仍沿用原圖表。

ETF 仍使用同日、同幣別正式淨值計算折溢價；當天正式淨值尚未公告時顯示缺口，不拿前一日淨值冒充當日折溢價，也不套公司本益比。美股尚無合格行情來源，頁面明示缺口；本次不把台股 Key 用來假造 AAPL／MSFT 行情。

## 驗收與實測範圍

先完成同步單元及雙瀏覽器流程，再加入個股行情：已驗證兩裝置既有清單合併、加入／移除傳播與重新開啟後不復活刪除項目。相關測試另外涵蓋操作重送、並行變更、離線重開、100 檔限制、未登入及跨來源寫入拒絕。

行情測試涵蓋實際成交與試撮區分、微秒時間、參考價、非 1,000 股交易單位、上櫃／興櫃、錯日／未來／過期、來源失敗、429、登入過期、切換未收藏標的，以及現價相對已完成 MA 的驗算。

瀏覽器測試使用合成 Email 身分和模擬行情，不能代替本人真實 API Key 與實體 iPad／手機驗收。正式環境受 Access 保護，助手不會索取 OTP 或 Key；最終真實驗收需本人在兩台裝置以相同 Email 登入，互相加入／移除一檔收藏，並確認真實標的最新成交時間。

`npm test` 已通過 58 個測試檔、356 項測試；Pages／Worker dry-run 建置通過，SQLite Durable Object binding 已識別。Chromium 1440／820／390／320 px 無橫向溢出；2330／6488／0050、AAPL 缺口、前景更新、背景暫停、429 停止與登入失效清除均通過。測試價格 2,250 ÷ 真實已核實近四季 EPS 98.26 ＝ 22.8984 倍，前瞻 EPS 148.64 則為 15.1372 倍；頁面分別顯示 22.90／15.14 倍，價格為模擬值。

原生 SQLite 儲存測試亦通過：[執行紀錄](native-watchlist-validation.json)。

驗收結果：見 [雙裝置同步](cloud-sync-browser.json) 及 [個股頁與版面](live-analysis-browser.json)。

## 原始來源與查核日

下列官方文件於 2026-11-20 查閱，本功能按既有個人使用授權運作，不擴大為公開行情展示。

- [Fugle Quote](https://developer.fugle.tw/docs/data/http-api/intraday/quote/)
- [Fugle Ticker：交易單位、幣別](https://developer.fugle.tw/docs/data/http-api/intraday/ticker/)
- [Fugle 行情規範與成交量組成](https://developer.fugle.tw/docs/data/intro/)
- [Fugle 分鐘 K 成交量單位](https://developer.fugle.tw/docs/data/http-api/intraday/candles/)
- [Fugle 整股交易單位與時間戳規則](https://developer.fugle.tw/docs/data/websocket-api/getting-started/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/get-started/)
- [SQLite Durable Objects 方案與額度](https://developers.cloudflare.com/durable-objects/platform/pricing/)
