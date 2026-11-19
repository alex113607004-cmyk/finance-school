# 自選股當日分時與開盤虛線

查核日：2026-11-19（台灣時間）。本次只修改側欄小圖與可選分時介接；主圖日／週／月 K、估值、法人預估、ETF 折溢價及收藏保留。

## 目前交付狀態

已移除「今日高低區間」及「近20個交易日」替代圖。新的小圖僅使用同市場、同標的、當地日期為當日的正常盤分鐘收盤序列。水平虛線取來源明確提供的當日開盤價，與曲線共用縱軸；不是昨收、均價或第一筆收到的成交。時間軸固定交易時段，尚未成交的右側留白，不拉伸或補滿走勢。

滑鼠／觸控可選取最近的已提供分鐘點，顯示時間與價格；鍵盤焦點及左右鍵也能操作。分鐘收盤連線是分時快照，沒有宣稱逐筆成交或即時串流。正常盤之外的資料不混入。缺開盤價、少於兩點、跨日、未來時間、錯誤身份／幣別、非正價格或重複時間均停止繪製。

**正式 GitHub Pages 尚未接上真實分時供應商。** 現有 TWSE／TPEx 盤後日資料只有每日開高低收，不能重建當天價格路徑；正式站會顯示「當日分時尚未提供／分時資料待接入」。測試曲線只存在於測試及本機瀏覽器攔截，沒有匯入公開快照或正式站。

## 可選後端與設定

前端 `VITE_INTRADAY_API_ORIGIN` 只接受 HTTPS origin（本機 loopback 可用 HTTP）。前端以 `GET /api/intraday?region=TW&symbol=2330` 取得正規化資料；市場是識別的一部分，不送瀏覽器憑證。後端來源可替換，只要符合 `src/watchlist-trend.js` 的驗證口徑。沒有設定時不發出分時查詢。

`worker/intraday.mjs` 是獨立可選 Cloudflare Worker，不會由 GitHub Pages 執行，亦未於本次自動部署。其 Fugle adapter 使用官方 [1 分 K API](https://developer.fugle.tw/docs/data/http-api/intraday/candles/) 與 [Quote API 的 openPrice](https://developer.fugle.tw/docs/data/http-api/intraday/quote/)，不取含試撮的 lastPrice。不需要安裝 SDK；憑證只從後端 Secret 取得。

維護者於可執行 Worker 的平台部署此檔，並設定：

| 位置 | 設定 | 用途 |
| --- | --- | --- |
| 後端 Secret | `FUGLE_API_KEY` | 有效方案憑證，不能放 GitHub Pages 或 VITE 變數 |
| 後端變數 | `INTRADAY_ALLOWED_ORIGIN=https://alex113607004-cmyk.github.io` | 前端來源；本機測試改為實際 localhost origin |
| 後端變數 | `INTRADAY_PUBLIC_DISPLAY_CONFIRMED=true` | 維護者已核對該方案允許本站公開展示；預設停用 |
| 後端變數 | `INTRADAY_LICENSE_URL` | 可回查的契約／方案依據 HTTPS 連結，不能以 API 文件代替授權 |
| GitHub repository Actions variable | `VITE_INTRADAY_API_ORIGIN` | 已部署的分時後端 origin；變更後需重新執行 Pages 建置 |

公開部署前按實際方案設定主機端限流及配額；目前每檔每次讀取兩個 upstream 端點，不自動輪詢、不共享快取，回應 `Cache-Control: no-store`。只有設定憑證與明確展示條件才呼叫上游；錯誤不回傳金鑰、認證 header 或上游原文。CORS 限定前端 origin，但 CORS 不代替主機端的用量保護。

台股 adapter 目前只支援 TWSE／TPEx；美股需要另接符合展示條件及美東時區的來源，現有美股財報與缺口照常顯示。使用條件查核參考 [證交所交易資訊使用規範](https://www.twse.com.tw/zh/products/information/use.html)，不因公開可讀就假定可再散布。

## 更新與失敗

設定來源後，進站開啟側欄、重開側欄、收藏清單變更、按「重新整理自選股資料」會讀取分時快照，最多三檔同時載入；不依 17:00／21:00 盤後排程產生分鐘資料。沒設定時仍可用其餘盤後功能。重新整理失敗會清除該批未成功的曲線及提示重試，不將舊曲線標成最新；跨日後每分鐘畫面時鐘檢查會移除前日曲線，換日不自動宣稱連線或持續更新。

## 驗收

`npm test`：47 個檔案、298 項通過。`npm run build:pages` 通過。新增驗證含缺來源不發請求、同代號不同市場、開盤價縮放與平盤、未成交時段留白、負值／亂序／未來／跨日資料、鍵盤游標、後端金鑰不外洩、CORS、無憑證不呼叫 upstream、來源失敗與台股上市／上櫃格式，以及載入中移除最後一檔收藏與取消回應。

[Chromium 本機驗收紀錄](watchlist-intraday-browser.json)：正式子路徑缺口、ETF 指標保留及桌面 1440／iPad 視窗 820／手機 390／320px 無水平溢出；另以明確標示的本機測試資料驗證開盤虛線、滑鼠與鍵盤游標、失敗重新整理清除曲線，無瀏覽器錯誤。這部分是介接及互動測試，不是真實行情驗收。

真實 Fugle 憑證、公開展示方案、實際上櫃回應、API 配額及限流、正式後端、實體 iPad 觸控尚未驗收；目前不宣稱已取得任何真實分時行情。
