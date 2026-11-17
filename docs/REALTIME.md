> 新增美股 SEC 基本面與行情邊界設定見 [台美股個股分析](TW-US-ANALYSIS.md)。公開版仍沒有美股價格或 WebSocket；行情憑證與再展示權均需另行提供。

# 即時行情介接：目前狀態與所需設定

本次交付完整盤後版。帳號尚無可用 Fugle／其他資料商憑證及展示授權，**目前未接上即時行情或 WebSocket**，GitHub Pages 不執行持有金鑰的後端。既有 `VITE_MARKET_API_ORIGIN` 只連盤後 REST API，不會啟用即時串流。頁面不把查詢成功宣稱為即時。

以下是後續介接規格與步驟，尚未以真實憑證實測；不是已上線的服務。

## 先取得的資料與設定

1. 向資料商確認方案可用的市場、頻道、股票數、連線數、頻率限制、即時或延遲等級，以及**公開網站對第三人展示、再散布、快取保留時間**等權利。現有帳號不能由 API 可呼叫就推定可公開轉播。可先由 [Fugle 官方](https://developer.fugle.tw/) 申請方案及取得書面使用條件。
2. 另備 Node 24 或同等可持續 WebSocket 的後端（容器／VM／有狀態服務）；前端 GitHub Pages 只連自己的 HTTPS API/SSE。多訪客共用一條受配額控制的上游訂閱，不為每名訪客各開一條行情連線。
3. 後端 Secret Manager 設定 `FUGLE_API_KEY`；一般後端設定 `ALLOWED_WEB_ORIGIN=https://alex113607004-cmyk.github.io`、允許股票 `2330`、方案實際延遲級別及合約准許的快取秒數。金鑰不可使用 `VITE_` 前綴，不放 repository、HTML、URL query、localStorage 或 log。

## 依官方規格的接法

- [REST Intraday Quote](https://developer.fugle.tw/docs/data/http-api/intraday/quote/)：後端先 `GET https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/2330`，header `X-API-KEY` 從 Secret 讀取。僅傳出正規化後允許展示的欄位，response `Cache-Control: no-store`，不轉出 header 或認證錯誤原文。
- [WebSocket 建立、認證與訂閱](https://developer.fugle.tw/docs/data/websocket-api/getting-started/)：連 `wss://api.fugle.tw/marketdata/v1.0/stock/streaming`，送 `{event:'auth',data:{apikey:serverSecret}}`，收到 `authenticated` 後才送 `{event:'subscribe',data:{channel:'aggregates',symbol:'2330'}}`。
- [Aggregates 欄位](https://developer.fugle.tw/docs/data/websocket-api/market-data-channels/aggregates/)：以 `lastTrade.price` 與 `lastTrade.time` 為已成交價及成交時間；不要用含試撮的 `lastPrice` 冒充成交。檢查 `isClose`，微秒時間戳先換算至 JavaScript 毫秒；顯示成交時間，不用收到訊息時間替代。
- 每次重連先重取 REST 快照，避免漏訊時還宣稱狀態連續。認證錯誤（官方 code 1000）停止重試；暫時斷線採 1、2、4、8…最多 30 秒加抖動退避，尊重 429 / Retry-After 與方案配額。長時間沒有 heartbeat／pong 判為中斷，並清楚顯示最後一筆成交時間，停止宣稱即時。

建議對瀏覽器提供 `GET /api/live/snapshot?code=2330`，成功後才建立 `GET /api/live/events?code=2330`（SSE）。統一傳出：

```json
{
  "symbol": "2330",
  "price": null,
  "tradeTime": null,
  "source": "Fugle",
  "status": "connecting",
  "receivedAt": null
}
```

這是介面格式，不是模擬報價；`price` 未取得前為 null。`status` 僅取 `connecting`、`realtime`、`delayed`、`aftermarket`、`disconnected`，對應連線中、即時、延遲、盤後、中斷。即時／延遲必須由合約與資料狀態決定，不由前端猜測。無憑證時回盤後狀態及原因並沿用證交所快照，不填假成交。

## 前端接入與估值口徑

先載入上述快照，再開始 SSE；顯示行情來源、最後成交時間及來源狀態。官方日線／均線與即時成交分開保留，即時價不塞進已完成日 K。以前端已核實的財報快照，依**成交日期當時可用**的四季 EPS 重算歷史區間，僅更新成交價對區間的位置，不把 EPS 當即時變動；無財報可用時仍顯示暫無適用估值。

SSE 中斷顯示最後成功值及「連線中斷」，不可保留「即時」綠燈。跨交易日、公告日、除權息與重連後都需重新核對資料日期。均線仍用已公布日收盤，若要與盤中價比較需另外標示「盤中價 vs 前一交易日 MA20」，不改寫本版盤後驗算結果。

## 尚待外部條件的驗收

- 真實帳號／方案、公開展示與快取權利核可。
- 授權環境中的 REST→WS 順序、成交與試撮分離、延遲等級及盤後狀態。
- 上游中斷、heartbeat 逾時、429、無效認證、配額與多訪客訂閱共用。
- 金鑰掃描、限流、HTTPS／CORS 與部署平台長連線實測。

這些項目未宣稱通過；盤後版不依賴上述服務即可啟動及使用。
