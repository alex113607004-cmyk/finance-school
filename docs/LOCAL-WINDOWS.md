# Windows 本機版：免登入、免另設密碼

本文件說明免登入電腦版。後續另新增可在手機／平板使用的 [Email 驗證碼私人雲端版](EMAIL-ACCESS-CLOUD.md)，兩種方式均保留。依使用者先前 2026-11-20 的選擇，本機版只在自己的電腦執行。原雲端密碼流程不再預設接線，本機版也不向 Cloudflare 查行情。

## 開始使用

1. 安裝 [Node.js LTS](https://nodejs.org/)（至少 22.12，建議 24）。
2. [下載 Windows 本機版](https://alex113607004-cmyk.github.io/finance-school/downloads/finance-school-windows-local.zip)，將整個 ZIP 解壓縮。
3. 雙擊 **啟動本機版.cmd**。啟動視窗要保留，關閉即停止服務；網站會自動開啟 `http://127.0.0.1:4178/#watchlist/all`。
4. 第一次在側欄「本機分時行情」貼上你已取得的 Fugle API Key，按「儲存到本機」。沒有帳號登入或另一組密碼。
5. 點股票星號加入本機自選，查看當日分鐘收盤曲線及開盤價虛線；重新整理可重新查詢。

下載包包含預先建置的完整網站與本機服務，只需要 Node，不用 Git、npm 套件安裝或 Cloudflare。請先解壓縮全部檔案，不要直接在 ZIP 視窗內執行啟動檔。本機收藏與線上站依不同網址分開保存；原線上收藏不會被刪除，移至本機時需重新加入。

若從原始碼使用：`npm run start:local`。首次需要時會自行安裝套件並建置網站；已有可用建置則直接啟動。macOS／Linux 可使用 `啟動本機版.command` 或相同 Node 指令。

## 金鑰與連線

- Key 保存在解壓縮資料夾的 `.local/fugle-local.json`，Unix 模式為 0600，資料夾為 0700。這是本機檔案，不宣稱已加密。介面可更換或移除；重新開啟同一資料夾的本機版時不需再填 Key。
- `.local/` 已被 Git 忽略，下載包使用明確檔案清單，不包含金鑰、設定資料夾、`.env` 或開發者的 node_modules。不要分享自己的 `.local` 資料夾。
- 服務只綁定 `127.0.0.1`；檢查 Host、Origin 與 Sec-Fetch-Site，阻擋外站請求與 DNS rebinding。設定 Key 的 POST／DELETE 額外要求同來源及 JSON，沒有開放 CORS。
- Key 只從本機後端送至 Fugle，不會送入 GitHub、Cloudflare、URL 或瀏覽器儲存；儲存後輸入欄會清空，狀態端點不回傳 Key。錯誤不包含上游原文或秘密。
- 這是本機個人使用，不應透過 tunnel 或對外轉發變成公開行情服務。原 Cloudflare 設定不參與本機運作。

## 資料更新與功能

分時沿用已驗證的 Fugle 1 分 K 與 quote 的開盤價，由本機直接查詢。每次開啟、自選清單變更或手動重新整理才查詢，沒有自動輪詢；資料範圍及額度依自己的方案。台股正常盤資料少於兩筆、未開盤、非交易日、前一日資料、金鑰／方案錯誤及額度用盡均保留具體缺口，不補模擬價格。現有 adapter 適用台股上市／上櫃；美股原資料缺口仍保留。

盤後基本面、排行、ETF 淨值、法人預估與上櫃歷史會嘗試讀取原 GitHub Pages 的最新已發布資產，五分鐘內共用快照；來源失敗保留已取得或下載包內的資料及原始日期。原自動發布仍依台灣時間 17:00／21:00 排程，不能把快照查詢當成即時財報。日／週／月 K、均線、估值與名詞維持原計算。

## 打包與驗收

`python3 scripts/package-local.py` 產生 `dist/pages/downloads/finance-school-windows-local.zip`；GitHub Pages 工作流程在建置後產生下載包。包內只有網站、必要的 Node 內建模組服務及啟動檔，沒有需要另外安裝的 runtime npm 依賴。初次本機包約 6 MB／1042 個檔案，實際大小依已發布快照變動。

`npm test`：51 個檔案、322 項通過；`npm run build:pages` 通過。新增測試涵蓋同來源金鑰設定、重載狀態、秘密不回傳、跨站／重綁定 Host 拒絕、路徑逃逸、本機來源使用範圍、零額外密碼、provider 錯誤與原日期保留。

[本機瀏覽器驗收](local-no-login-browser.json) 使用實際 Node HTTP handler 及合成 Fugle 回應，跑通儲存 Key → 分時圖與開盤虛線 → 重載免登入 → 移除 Key 清除曲線，確認沒有 Cloudflare 請求、瀏覽器儲存沒有 Key、異來源被擋、1440／820／390／320px 無溢出及無瀏覽器錯誤。另從實際下載包解壓縮啟動，確認不需要 node_modules。

真實 Fugle Key／方案、Windows 上雙擊 `.cmd`、Windows 預設瀏覽器及 Defender／防火牆介面仍待使用者實機驗收；目前在 Linux／Chromium 驗證相同 Node 服務及前端流程，未宣稱讀取過使用者 Key。
