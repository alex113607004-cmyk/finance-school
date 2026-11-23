# 產業篩選

2026-11-23：個股搜尋、自選股搜尋和市場總覽新增產業篩選；既有網址、估值方法、行情和收藏維持。

## 使用方式

- 台股個股頁：選擇上市／上櫃／興櫃範圍與產業，無須輸入代號即可瀏覽清單，再點選標的。可以載入更多或繼續輸入代號／公司名。搜尋送出同時遵守市場與產業，不會由精確代號繞過篩選；原本直接連結和最近查看仍可開啟。
- 美股個股頁：選擇 SEC SIC 分類，篩選現有 AAPL、MSFT、SPY；不因此增加美股行情涵蓋範圍。
- 自選股搜尋：選市場、產業後直接瀏覽，先顯示 8 檔，可載入更多並點星號加入。此篩選供發現標的，既有自選清單仍可用原本市場與名稱篩選，不會刪除或隱藏其他收藏。
- 市場總覽：產業與市場、標的類型、熱門／漲跌停條件交集；統計卡、焦點卡、表格、分頁一致。切換產業返回第一頁；同一分頁離開後返回保留選擇。切換市場或股票／ETF 類型會重設產業，避免保留不適用分類。
- ETF 獨立為「ETF（基金類型）」；缺少分類為「分類未提供」，不由公司名猜測。

## 資料與更新

台股代碼使用既有公司名單的 `產業別`，名稱使用同份已核實官方財務／營收分類，同代碼不同來源名稱會合併列示（例如金融業／金融保險業）。沒有名稱時顯示產業代碼。TW 分類代碼與 SEC SIC 分別命名為 `TW:24`、`US:SIC:3571`，不混用或冒稱 GICS。

- [TWSE 公司名單](https://openapi.twse.com.tw/v1/opendata/t187ap03_L)
- [TPEx 上櫃公司名單](https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O)
- [TPEx 興櫃公司名單](https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_R)
- [上市營收及產業名稱](https://openapi.twse.com.tw/v1/opendata/t187ap05_L)、[上櫃營收及產業名稱](https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O)
- [Apple SEC Submissions](https://data.sec.gov/submissions/CIK0000320193.json)：SIC 3571 Electronic Computers。
- [Microsoft SEC Submissions](https://data.sec.gov/submissions/CIK0000789019.json)：SIC 7372 Services-Prepackaged Software。

本次將既有原始快照中的分類複製到輕量名單與排行，不將本次程式查核日期當作來源更新日期。SEC 未啟用自動更新時繼續保留原查核日期。台股分類隨既有每日台灣時間 17:00／21:00 的更新流程；來源失敗保留已核實資料。分類描述保留 source／checkedAt，可從 JSON 及原始公司名單回查。分類、行情與財報的更新日期可以不同。

產業先篩選已對齊交易日的排行；某產業當日沒有標的就顯示空結果，不回退到較舊日期尋找標的。舊排行快照若沒有分類，可用同代號且同市場的已核實名單補充，不能跨上市／上櫃借用分類。

`node scripts/refresh-classifications.mjs` 可離線重建分類 metadata，不更新行情、來源查核時間或 SEC 財務數字。正式更新由 `update-universe.mjs`、`update-us.mjs` 和行情 parser 持續帶入分類。

## 驗收

- `npm test`：60 個測試檔、371 項通過。涵蓋產業與市場／名稱交集、台美同代號、分類缺口、ETF、分類名稱與代碼不一致、舊視圖遷移、分頁／返回還原、跨日行情排除及既有行情與估值。
- `npm run build:pages`、`npm run build:cloud` 通過；Wrangler 4.165.0 dry-run 打包通過（約 9,368 KiB 原始／982 KiB gzip），保留原 Access 與 Durable Object binding。
- Chromium 的實際 Pages 子路徑在 1440、820、390、320 px 無頁面錯誤或橫向溢出。已操作產業榜單、12→24 筆個股清單、8→16 筆自選搜尋、加入收藏、篩選外代號拒絕、AAPL／MSFT SIC 切換與市場網址。iPad／手機抽屜另驗收選股後自動收合。
- [瀏覽器紀錄](industry-browser.json)。外部行情來源在本機瀏覽器驗收時阻擋，以固定已核實快照檢查流程；不把測試說成真實行情或 Access 登入驗證。
- 已比較四個變更的 JSON，移除新增 `industry` 欄位後與原版本逐值相同；原財報、行情、來源日期和查核時間未改寫。
- 實體 iPad／iPhone Safari 與 Cloudflare 真實登入的跨日有效期仍須本人操作確認，詳見 [快速登入評估](DEVICE-LOGIN.md)。
