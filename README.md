# 新手財經小學堂：台美股實戰知識庫

以 React 19、Tailwind CSS 4、Vite 建立的繁體中文財經學習網站。原始碼依職責分檔，正式建置產出 **單一、自帶程式和樣式的 `index.html`**，適合 GitHub Pages。

## 功能

- **5 個階段、19 個單元**：盤面、基本面、技術面、籌碼、風險管理。附件寫 14 個，但實際清單為 3＋4＋4＋4＋4＝19，全部納入。
- 每單元有學習目標、白話解釋、對照表、三步示範、作答後提示與解法、查核來源。
- 階段篩選、跨階段全文搜尋、已學會狀態篩選、收藏夾。
- 進度與收藏保存在 `localStorage`；重開保留，損壞或無法儲存時提供回饋。
- 融資維持率／130% 模型臨界價、初始停損／移動防守線、本益比三種互動試算器。
- 點閱式名詞定義與例子、三個有來源與假設的真實歷史案例。
- 台股股價直接呈現、本站原生 K 線／收盤線與 MA5／MA10，不依賴 TradingView iframe；提供台美股 Google Finance 外站查價連結。台股內建每日快照，Sites 上可重查官方盤後資料。
- 深色介面、翡翠／靛藍／金色識別；漲跌與獲利採 **紅漲 ▲、綠跌 ▼**。

## 本機開發

使用 Node.js 24 LTS（最低 22.12）。

```bash
npm ci
npm run dev
```

開啟終端顯示的本機網址。開發模式不會自行啟動盤後 API；課程、搜尋、收藏、試算、每日快照與原生圖表可獨立使用。

```bash
npm test             # 財務模型、資料結構與 React 互動測試
npm run build:pages  # GitHub Pages：dist/pages/index.html
npm run build        # 同時產出 Pages 單檔及可部署的 Worker
npm run preview      # 預覽剛建置的單檔
```

`dist/pages/index.html` 包含 React、Tailwind 編譯後 CSS、程式與教材。核心教學不依賴 CDN；外站查價、原始來源及可選 API 仍需連網。瀏覽器直接開 `file://` 時，localStorage 行為依瀏覽器而異，建議用 HTTP 或 Pages。

## 第一次放到 GitHub

1. 到 GitHub 按 **New repository**，例如取名 `finance-school`。是否公開由你選擇；免費個人方案通常須公開 repository 才能使用 Pages。
2. 解壓縮交付的原始碼 ZIP。將其**內容**放在 repository 根目錄，包含 `.github/workflows/pages.yml`、`package.json`、`package-lock.json`、`src/` 與根目錄 `index.html`。不要再多包一層專案資料夾。
3. 初次推送至 `main` 後，到 **Settings → Pages → Build and deployment → Source → GitHub Actions**。
4. 到 **Actions → Test and deploy to GitHub Pages → Run workflow**，或再推送一個提交。測試與建置通過後會部署。
5. 在 Pages 或完成的 workflow 頁面查看真正的網站網址。此專案使用相對資產路徑與 hash 路由，支援 `/<repository>/` 子路徑。

若使用 Git，可在解壓縮目錄執行以下步驟；`<你的-repository-HTTPS-網址>` 必須換成你建立的真實網址：

```bash
git init -b main
git add .
git commit -m "Build finance learning website"
git remote add origin <你的-repository-HTTPS-網址>
git push -u origin main
```

官方部署說明：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 靜態版與盤後資料

GitHub Pages 只提供靜態檔案，不會執行 `worker/runtime.mjs`。

- 未設定 API：以內建每日快照提供全上市行情與適用財務比率，以及預設四檔的日均線。學習、進度、收藏、試算、詞典、歷史案例與原生圖表均可用。資料日期、擷取時間和是否當日均分開標示。
- 若有自行部署的公開讀取 API：在 **Settings → Secrets and variables → Actions → Variables** 設定 `VITE_MARKET_API_ORIGIN`（例如自己的 API 網域，不含結尾 `/`），再重建。API 需提供 `/api/stock?code=2330` 與 `/api/history?code=2330` 並允許該 Pages 網域 CORS。
- `VITE_` 變數會進入前端，**不能放 API 金鑰、登入 token 或私人認證**。不要把需要登入的私人網站網址直接當跨站 API。
- 現有 Sites 預覽使用同站 Worker，沿用證交所盤後 API，無跨站讀取需求。`npm run build` 會為此產生 `dist/server/index.js`。
- 無資料商授權的秒級即時報價、上櫃與興櫃 API、美股財報 API、下單與雲端帳號同步不在本版範圍。

## 專案結構

```text
src/
  App.jsx                  五階段導航、課程、進度、收藏、搜尋、詞典、案例
  data.js                  19 單元與校閱後教材
  legacy-data.js           沿用已核實案例與名詞來源
  domain.js                純計算、資料清理、搜尋
  components/Calculators.jsx
  components/Market.jsx
  styles.css               Tailwind 入口與響應式設計
  *.test.*                 Vitest / React Testing Library 測試
worker/runtime.mjs         可選的證交所資料 Worker
scripts/build-worker.mjs   產出 Worker（Pages 不需要）
.github/workflows/pages.yml
```

`web/` 和舊驗收檔是過往版本留存，不是新版進入點；GitHub 交付 ZIP 已排除這些舊檔與 Sites 身份檔。新版以此 README、`src/` 與 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md) 為準。

## 教材口徑

附件是需求資料，不是已核實的金融事實來源。已將「低本益比必便宜」「130% 立即斷頭」「均線是所有人實際成本」「大戶吃貨可由分點證明」「定期定額保證反彈獲利」改為有條件、可核算的教學。詳見 [編輯紀錄](docs/EDITORIAL.md)。

本工具僅供投資教育，並非個別交易建議。所有非真實快照的數字均標示模擬；停損價與移動參考線不是保證成交或保底獲利。

## 每日資料更新（2026/11/17 新增）

本版已內建最新查核的全上市證券盤後快照，GitHub Pages 不設定 API 也能顯示股價、本益比與適用財報欄位。

- `npm run update:market`：從官方來源擷取全上市行情／估值／營益分析／公司資料，寫入 `src/generated/market.json`，不需要金鑰。
- 若 OpenAPI 彙總更新較慢，另核對按日期查詢的正式估值報表；採較新來源的收盤價、本益比、股價淨值比等，不把舊數字改標今日。
- 日均線快照預設涵蓋 2330、2317、2454、0050。其他股票的股價與適用財務比率仍有快照，任意個股日均線可透過 API 取得。可用 `MARKET_HISTORY_CODES` 環境變數調整日線清單，逗號分隔。
- workflow 已加入每日 UTC 09:00、13:00（台北 17:00、21:00）擷取、測試後建置及部署；GitHub 排程可能延後，repository 須先建立、啟用 Pages 並允許 Actions。本次尚未替你啟用不存在的 repository。
- Pages 將最新資料嵌入單檔 HTML。訪客可按「更新資料」重載最新已部署快照；網頁不會自行從 GitHub 觸發 Actions。公開 repository 長時間沒有活動可能被 GitHub 暫停排程，請留意 Actions 狀態。
- Sites 預覽則在進入看盤、每分鐘、切回頁面與手動更新時重查同源 API。來源快取最多 5 分鐘，強制重驗最短 15 秒，跨台北日期不沿用前一日快取。
- 更新狀態分開顯示「交易日期／估值日期／財報期間／來源實際擷取時間」。`servedAt` 只是 API 回應時間，不冒充資料擷取時間。
- 休市與尚未收盤／未公布狀態不填造當日價格；財報仍是最新公布會計期間。來源失敗時使用標示日期的每日快照並告知連線問題，不默認它是今日行情。
- 美股目前提供 Google Finance 外站查價入口；本站的美股行情與財報資料源尚未接入，不虛填報價。

更新並建置：

```bash
npm run update:market
npm run build:pages
```

## Google Finance 與原生圖表

新版已移除前端 TradingView 嵌入腳本，不再把外部圖表當成行情主區。

- 股價、漲跌、開高低、量與財務指標由官方資料／每日快照直接顯示。
- 本站使用 SVG 繪製日 K 線與收盤線，包含 MA5、MA10、20／50 交易日範圍與日期選取，無需第三方圖表庫或 iframe。
- Google Finance 按鈕是外站查價，包含台股 TPE、NASDAQ、NYSE，VOO 映射 NYSEARCA；不是網站數字的來源。Google 的時點、量與財報口徑可能與本站不同，不混算。
- Google 公開的 GOOGLEFINANCE 是試算表功能，歷史資料不能從 Sheets API／Apps Script 取出；Google Finance 聲明亦限制未經書面同意的資料複製、儲存及再分發。此專案未爬取 Google 或轉存其數字，不將網頁可瀏覽解讀成可再分發授權。
- 美股目前僅提供外站查價；不把台股數字、模擬資料或缺值零填到美股。

官方說明：https://support.google.com/docs/answer/3093281?hl=zh-Hant
Google Finance 聲明：https://www.google.com/intl/en/googlefinance/disclaimer/
