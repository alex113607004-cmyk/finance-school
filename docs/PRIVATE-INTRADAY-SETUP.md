# 個人自用 Fugle 分時行情設定

本版本依使用者確認的「僅本人使用」設計。GitHub Pages 保留公開盤後資料；Fugle 分時 API 需要另一組私人存取密碼才能查詢。取得個人 Key 不表示取得公開散布授權，本版本不對未驗證訪客提供 Fugle 行情。

## 1. 建立 Cloudflare 後端

登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)，開啟 Workers & Pages → Create application，匯入你帳號內的 GitHub repository `alex113607004-cmyk/finance-school`，選擇 Worker。

建置設定：

| 欄位 | 填入 |
| --- | --- |
| 名稱 | `finance-school-intraday` |
| Production branch | `main` |
| Root directory | 專案根目錄 `/` |
| Build command | 留空；後端單一模組不需建置 React |
| Deploy command | `npx wrangler@4.165.0 deploy --config wrangler.intraday.jsonc` |

按 Deploy。這只部署 `worker/intraday.mjs`，不替換原 GitHub Pages。先不設定金鑰也可以部署，但後端預設停止行情查詢。部署成功會得到 `https://finance-school-intraday.<你的子網域>.workers.dev`。

若採本機 CLI，可在專案根目錄執行 `npx wrangler login` 及上述 deploy command；Secret 請用 Dashboard 或互動式 `npx wrangler secret put NAME --config wrangler.intraday.jsonc`，不把值寫在命令參數、公開檔案或聊天。Dashboard 建立流程依 [Cloudflare 官方文件](https://developers.cloudflare.com/workers/get-started/dashboard/)。

## 2. 只在 Cloudflare 保存金鑰與私人密碼

選擇剛建立的 Worker → Settings → Variables and Secrets → Add，新增：

| Type | Name | Value |
| --- | --- | --- |
| Secret | `FUGLE_API_KEY` | 你的 Fugle API Key |
| Secret | `INTRADAY_ACCESS_PASSWORD` | 由密碼管理員隨機產生的另一組 32～128 碼英數密碼；不能和 Fugle Key 相同，不含空白 |
| Text | `INTRADAY_PERSONAL_USE_CONFIRMED` | `true`；只供本人使用，並依本人帳號方案使用 |

`INTRADAY_ALLOWED_ORIGIN` 已由設定檔固定為 `https://alex113607004-cmyk.github.io`，不能改成 `*`。設定完按 Deploy。Key 與私人存取密碼都不用提供給開發者，只有你在 Cloudflare 填寫；保存好私人存取密碼，之後用於網站解鎖。

設定檔使用 `keep_vars: true`，後續部署保留 Dashboard 的個人使用開關；金鑰始終保存在 Secret。這與 [Cloudflare Secret 操作方式](https://developers.cloudflare.com/workers/configuration/secrets/) 及 [Wrangler keep_vars](https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth) 相符。不要設定舊版 `INTRADAY_PUBLIC_DISPLAY_CONFIRMED`，個人模式不使用公開展示開關。

## 3. 連回 GitHub Pages

將 Worker 的 **HTTPS origin**（只有網址，不含 API Key、密碼、query 或 `/api/intraday`）提供給維護者，或自行於 GitHub repository → Settings → Secrets and variables → Actions → Variables 新增：

`VITE_INTRADAY_API_ORIGIN=https://finance-school-intraday.<你的子網域>.workers.dev`

重新執行 Pages 工作流程。網站側欄會出現「私人分時行情」：輸入第二步自己設定的 **私人存取密碼**，按「解鎖分時行情」。此欄不是填 Fugle API Key。

成功取得當日正常盤資料後才顯示分時曲線與開盤價虛線。按「鎖定分時行情」清除頁面密碼與曲線；重新載入頁面後需再輸入。密碼不寫入 localStorage、sessionStorage、URL 或公開快照。不要分享私人存取密碼；需撤銷存取時，在 Cloudflare 更換此 Secret。

## 實際行為與缺口

- 未設定後端時維持原有盤後功能；沒有存取密碼時不發分時查詢。
- API 在讀取 Fugle 前驗證密碼，匿名／錯誤密碼回 401，來源不符回 403。CORS 只補充限制，密碼檢查才是資料保護。
- Fugle 金鑰只從後端送至 Fugle；另組私人密碼只從你的頁面經 HTTPS Authorization header 送至自己的後端。頁面不會取得 Fugle 金鑰。
- 回應明列 `accessScope: personal-authenticated`、`publicDisplayAllowed: false`，不冒稱個人方案允許公開再散布。
- 狀態區分私人密碼錯誤、後端未設定、Fugle 認證／方案錯誤、額度用盡與當日資料缺口。錯誤不包含上游回應原文或金鑰。
- 無自動輪詢或共用快取；每次查詢單檔最多兩個 Fugle 請求。需依本人實際方案配額操作。台股 adapter 支援 TWSE／TPEx，美股另需來源。
- 換日／尚未開盤或非交易日時，來源若僅回前一日，會保留當日缺口，不把昨日資料標成今天。

## 驗收狀態

`npm test`：48 檔案、308 項通過；`npm run build:pages` 通過。測試包含匿名／錯誤密碼不查 upstream、同 Origin 也不能繞過驗證、禁止 query token、兩組 Secret 不可相同、預檢 CORS、錯誤與配額、不持久保存密碼、鎖定清除及私人資料不宣稱公開授權。

[本機 Chromium 紀錄](private-intraday-browser.json) 使用測試後端驗證匿名／錯誤密碼拒絕、只有解鎖後才查詢上游、私人資料曲線與開盤虛線、鎖定清除、重新載入需再輸入、不保存密碼、非允許來源拒絕及 1440／820／390／320px 版面，無瀏覽器錯誤。這些是合成行情，並非你的真實 Fugle Key。

Wrangler 4.165.0 的 `deploy --dry-run --config wrangler.intraday.jsonc` 通過，產物 5.75 KiB；未部署到使用者帳號，也未讀取本機環境金鑰。

尚需使用者在自己的 Cloudflare 帳號部署與保存 Secret、提供 Worker origin，才能完成真實 Fugle Key／方案與正式網站的驗收。開發者未取得你的金鑰，也未宣稱真實行情已接通。
