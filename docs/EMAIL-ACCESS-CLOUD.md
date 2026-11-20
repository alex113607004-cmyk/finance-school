# 私人雲端版：Email 驗證碼登入

2026-11-20：依使用者選擇，新增可在手機、平板和電腦使用的私人雲端版。不另設網站密碼，Windows 電腦不必開機。Windows 免登入本機版仍保留；GitHub Pages 繼續供應公開盤後網站、資料快照與本機下載包。

私人網址：**https://finance-school.alexchen109.workers.dev/**。不是 GitHub Pages 網址。請完成下列 Cloudflare 設定再登入；本程式在沒有平台驗證身分或允許 Email 時會拒絕提供網頁和 API。

## 控制台設定順序

### 1. 加入 Email 驗證碼登入方式

登入 [Cloudflare](https://dash.cloudflare.com/)，開啟 **Zero Trust**。首次使用可能要求建立 team name、選擇方案與付款資料。官方初始設定文件說明 Free 方案不收費，但仍要求付款資料；請本人確認並操作，專案不會替你提交付款資料或升級方案。

在 **Integrations → Identity providers → Add** 新增 **One-time PIN**。新的 Zero Trust 組織不一定已經有此方式，不要把 Cloudflare 帳號登入方式當作私人網站的登入方式。

### 2. 保護整個 Worker，只允許自己的 Email

回到 **Workers & Pages → finance-school → Access**，開啟 **Protect this Worker behind Access**，選 **All traffic**。這會包含 production、預覽和綁定網域；不要只保護預覽而漏掉正式 `workers.dev`。

到 Zero Trust 的對應 Access application 編輯政策，設定 **Allow → Include → Emails → 自己完整的 Email**，並選用 **One-time PIN**。不要選 Everyone 或整個 Email domain。儲存後，未登入開啟私人網址應轉到 Cloudflare Access 登入畫面。

### 3. 保存後端設定

**Workers & Pages → finance-school → Settings → Variables and Secrets**：

| 類型 | 名稱 | 值 |
| --- | --- | --- |
| Secret | `FUGLE_API_KEY` | 自己已取得的 Fugle API Key |
| Text | `ACCESS_ALLOWED_EMAIL` | 政策中允許的同一個完整 Email |
| Text | `INTRADAY_PERSONAL_USE_CONFIRMED` | `true` |

Key 只填在 Cloudflare Secret；Email、Key 和驗證碼都不用傳給維護助手。程式會再比對平台驗證的 Email 與 `ACCESS_ALLOWED_EMAIL`。不需要 `INTRADAY_ACCESS_PASSWORD`，舊值不再由此私人雲端版本使用。

個人 Key 的方案與交易所條件仍適用；本功能僅供本人登入使用，不因此取得公開展示或轉授權。

### 4. 部署最新程式

若此 Worker 已連到 GitHub，確認 repository 為 `alex113607004-cmyk/finance-school`、production branch 為 `main`，到 **Deployments** 重新部署最新版本。既有 Deploy command 可維持：

```sh
npx wrangler@4.165.0 deploy --config wrangler.intraday.jsonc
```

設定檔的 custom build 會執行 `npm run build:cloud`；先完成 Vite 建置，再產生私有網頁模組。無需新增 Static Assets binding。`keep_vars: true` 保留控制台設定；Secret 不寫入 Git 或前端。

從自己的終端機部署時，先 `npm ci`，用自己的 Cloudflare 帳號驗證 Wrangler，再執行上述命令。

### 5. 在手機／iPad 使用

用 Safari 或 Chrome 開啟私人網址，輸入允許的 Email，從信箱取得一次性驗證碼並填入 Cloudflare 登入頁。登入後在自選股側欄加入台股，查看分鐘走勢與開盤價虛線。Email PIN 每次只能用一次，官方期限為 10 分鐘；未被政策允許的信箱不會收到 PIN，畫面可能仍顯示一般提示。

登入有效期依 Access application 的 session 設定。過期時，重新驗證後即可繼續，不需記另一組網站密碼。「登出」使用 `/cdn-cgi/access/logout`，會撤銷 Cloudflare Access 登入工作階段。

私人雲端版已新增 [跨裝置自選股同步及個股頁行情](CLOUD-SYNC-LIVE-QUOTES.md)，同一 Email 登入私人網址後，首次合併此網址既有收藏，並同步加入／移除。公開 Pages 與 Windows 本機版仍各自儲存。手機可加入主畫面作為捷徑；尚無離線行情或背景更新承諾。

## 保護與資料口徑

- 同一個 Worker 提供網頁和 API，避免公開 Pages 跨站請求受保護 API 的 cookie／重新導向問題。
- 只接受 Cloudflare 平台提供的 `ctx.access.getIdentity()` 身分；不信任外部傳入的 Email header 或 `Cf-Access-Jwt-Assertion`。全站先驗證，原始 HTML、JSON 和行情 API 均不例外。
- **不使用 Static Assets router／binding**：官方說明它不會將 `ctx.access` 傳給使用者 Worker。已建置 HTML 放在 Worker 模組；其他白名單公開資料由 Worker 向原 Pages 讀取。頁面、快照代理和行情回應均 `private, no-store`。
- 同源快照請求攜帶 Access session cookie；查詢 TWSE 等外部來源不攜帶 cookie，代理向 GitHub 不轉傳 Cookie、Key 或登入身分。
- 私人行情目前支援 Fugle 台股。分鐘資料來自 Fugle candles，開盤價來自同代號 quote；日期與幣別須通過原有檢查。Key 不回傳瀏覽器，不存 localStorage。
- 側欄開啟、加入標的或按重新整理會查詢分時，使用 candles、quote；後續個股頁另新增前景每 30 秒 REST 報價查詢，Ticker 提供幣別及交易單位。沒有逐筆串流或背景輪詢，額度取決於本人方案。公開盤後資料仍隨 Pages 每日台灣時間 17:00／21:00 排程更新，原始日期不因進站而改寫。
- 資料缺漏、額度不足、過期和來源失敗顯示具體狀態；登入失效清除分時曲線。美股行情缺口及原有估值方法不因登入功能改變。

## 驗收

- `npm test`：54 個測試檔、337 項通過。包含匿名／偽造 header／其他 Email 拒絕、缺少設定、同源 API、私密資料不轉送、來源失敗、登入重新導向、cookie 範圍與既有分析計算。
- `wrangler deploy --dry-run --config wrangler.intraday.jsonc`：custom build 與 Worker 打包通過；約 8,148 KiB 原始／937 KiB gzip，沒有 Static Assets binding。
- Chromium 1440／820／390／320 px 檢查通過：匿名拒絕、本人工作階段、開盤價虛線、無第二組密碼、無瀏覽器 Key、過期清除曲線、其他 Email 拒絕及版面無橫向溢出；Windows 本機儲存／重新開啟／移除 Key 回歸亦通過。
- 瀏覽器驗收採本機 fixture 模擬 Cloudflare 已驗證身分及 Fugle 數字，不把測試 cookie 當作正式登入憑證。結果另存 [瀏覽器紀錄](cloud-email-browser.json)。
- 尚需本人完成／實測：Zero Trust 方案、允許 Email 政策、Secrets、正式 Worker 部署、真實 PIN 收信及 Fugle Key／方案查詢、實體 iPad Safari 與手機瀏覽器。測試工具沒有 Cloudflare 帳號設定權限，不能宣稱已完成真實登入或行情驗證。

## 官方依據（2026-11-20 查核）

- [Email One-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
- [Protect Workers with Access、平台驗證與 All traffic](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Static Assets binding 的 Access context 限制](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Zero Trust 組織初始設定、方案與付款資料](https://developers.cloudflare.com/learning-paths/clientless-access/initial-setup/create-zero-trust-org/)
- [Access session 與登出](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
- [workers.dev 與 Access](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
