# 自選側欄、前瞻本益比與 ETF 折溢價

後續已依需求移除近20日線／高低區間小圖，改為當日分時及開盤虛線；尚缺真實分時憑證時顯示缺口，詳見 [當日分時功能](WATCHLIST-INTRADAY.md)。

本文件保留初版交付紀錄。2026-11-19 後續已接上個別法人公開報導的 EPS 預估，新增來源／年度切換，並明列原文未區分基本／稀釋 EPS 的口徑；最新來源、引用範圍及驗收請見 [法人預估功能](INSTITUTIONAL-FORECASTS.md)。以下「尚未接入」敘述僅代表初版狀態。

2026-11-19（台北）查核與實作。正式入口為[個股分析](https://alex113607004-cmyk.github.io/finance-school/#analysis/TW/2330)，頂部「自選股」控制側欄。

## 自選改為側欄

- 移除獨立自選頁；桌面顯示左側可收合清單，主區仍為原個股分析或市場總覽。手機／平板為抽屜，支援 Escape、焦點循環、返回開啟按鈕、背景停用及選股後自動關閉。
- 側欄保留搜尋、直接加入／移除、台美股篩選、清單內搜尋、100檔上限、跨分頁同步與儲存失敗重試。沿用 `finance-school.watchlist.v1`，不搬移或清除既有收藏及舊學習紀錄。
- `#watchlist`、`#watchlist/all`、`#watchlist/TW`、`#watchlist/US` 會保留／回到分析並開啟對應側欄，沒有新的獨立頁。分析網址含市場的格式維持原樣。
- 顯示最新已發布收盤價、變動、幣別與實際交易日；來源延後時保留原日期。每檔小圖先使用可合法展示、身份與時間對齊的分時資料；目前無分時授權，實際顯示有來源的近期日收盤，或同交易日開高低收位置，清楚標示期間與「非分時」。缺少資料時留空，不將 OHLC 四點連成虛構分時。
- 全市場排行解析保留開、高、低供小圖使用，不混入舊日 OHLC。個股歷史圖的縮放、根數、游標與日／週／月 K 沿用原實作。

## 前瞻本益比

一般股票皆顯示本欄；前瞻本益比＝實際股價 ÷ 未來一年預估稀釋 EPS。已公告 TTM EPS 不作為預估值，不能由成長率自行外推後冠上市場共識。

目前未取得可公開展示的分析師預估 EPS 來源，所以自動欄位明示「預估資料待補」。可操作的試算採使用者自行輸入之未來12個月 EPS，明示為假設，不改寫原始資料與歷史估值。沒有有效行情、EPS 非正或 ETF 時停止計算；美股沒有合格行情仍不補數字。

`forwardEPS` 的介接契約位於 `src/forward-pe.js`：必須包含市場識別 `id`、預估 `eps`、`currency`、`horizon`（FY／NTM）、`periodStart`／`periodEnd`、`asOf`、`provider`、原始 `source`、`verified`、`license.publicDisplayAllowed`、`basis: diluted`、`shareBasisVerified`、`shareBasisDate` 及 `priceAdjustment: unadjusted`。驗證身份、期間約一年且未結束、預估發布不晚於價格日、更新不超過120日、幣別與分割股數一致。來源需由有權限的後端／Actions 取得，憑證不放 `VITE_*`。此契約已以模擬資料測試，尚未接入真實預估供應商。

## ETF 使用正式每日淨值

來源採[證券投資信託基金每日淨值，政府資料集11109](https://data.gov.tw/dataset/11109)，實際下載為[SITCA 官方 CSV](https://www.sitca.org.tw/MemberK0000/F/03/nav.csv)。授權為[政府資料開放授權條款第1版](https://data.gov.tw/license)，每天更新；查核日2026-11-19。以「受益憑證代號」對應股票代號，不用名稱猜測基金身份，也不將一般未上市基金塞入 ETF 清單。

- 每筆保留代號、基金名稱／內部代碼、正式淨值日期、每受益權單位淨值、幣別、原始來源與查核時間。初次對應現有名單 364 檔中的 345 檔；未涵蓋者保留缺口，不宣稱全數覆蓋。美股 SPY 尚無可核實行情與正式淨值。
- 折溢價＝（同日收盤價 ÷ 正式每單位淨值 − 1）×100%。正值為溢價、負值為折價。日期、幣別不符或價格過期不計算；海外基金可能較晚結算，不能把查核時間當作淨值日。
- 移除 ETF 的公司 EPS 估值、P25／P75、24筆本益比樣本門檻與 EPS 情境試算。資料狀態改為行情／基金淨值／折溢價；技術面仍可獨立閱讀。
- 不把 MIS 的盤中預估淨值 `f` 或前一營業日淨值 `h` 當成正式同日淨值。[官方介接格式](https://dsp.twse.com.tw/public/static/downloads/tradingDepartment/ETF%20%E7%94%B3%E8%B4%96%E8%B3%87%E8%A8%8A%E5%8F%8A%E5%8D%B3%E6%99%82%E6%B7%A8%E5%80%BC%E6%8F%AD%E9%9C%B2%E5%B0%88%E5%8D%80%E4%BB%8B%E6%8E%A5%E6%A0%BC%E5%BC%8F%E8%AA%AA%E6%98%8E_20250109142554.pdf)已查核。參考專案 [taiwan-etf-holdings](https://github.com/dj8111/taiwan-etf-holdings) 未標示授權，未複製程式碼；最終使用另行確認開放授權的每日 CSV，自行實作解析。
- 更新指令 `npm run update:etf-nav`；一批只查一次 CSV，與原台北17:00、21:00排程一同執行。`data/etf-nav-cache.json` 由 Actions 快取，保留最多8個已觀察淨值日期。來源失敗保留原數字及原查核時間，不保證來源會於當日完成公布。

## 真實資料重算與驗收

[0050重算紀錄](etf-nav-recalculation.json)：2026-11-19 [證交所日線](https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=20261101&stockNo=0050)收盤90.20 TWD／單位，官方正式淨值90.05 TWD／單位，`(90.20 / 90.05 − 1) × 100 = 0.1665741255%`，畫面顯示+0.17%溢價。

本機：`npm ci`、`npm run dev -- --port 4173`；Pages 子路徑使用 `npm run build:pages`、`npm run preview:pages`，開啟 `http://127.0.0.1:4176/finance-school/#analysis/TW/2330`。

`npm test`：42個檔案、270項通過；`npm run build:pages`通過。驗收涵蓋單位／幣別／日期、NAV跨日保留、前瞻EPS缺口與假設、非曆年會計年度、發布日與分割基準、負EPS、ETF停止公司估值、側欄收藏／同步／失敗重試。已實際執行官方NAV更新流程，成功解析345檔。

[瀏覽器紀錄](sidebar-browser.json)：2330／6488／0050／AAPL、SPY專用欄位、前瞻EPS試算（實際股價2100元及假設EPS100元，得到21倍）、日／週／月K切換、收藏保存與跨分頁同步、手機焦點及選股自動收合、舊自選網址、桌面1440／iPad820／手機390／320px皆通過。實體iPad觸控、授權分時及真實預估EPS供應商仍未驗收。

本次來源查詢中，TWSE最新排行成功取得11/19；TPEx日報查詢逾時，保留11/18原日期與原查核時間。這是來源缺口，沒有將資料發布時間改成交易日。
