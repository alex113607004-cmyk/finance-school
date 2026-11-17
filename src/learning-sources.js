// Titles and content reviewed against the original publisher on the stated date.
export const REVIEWED_AT='2026-11-17';
const source=(id,title,publisher,url,language,kind,focus,scope='一般投資觀念')=>({id,title,publisher,url,language,kind,focus,scope,checkedAt:REVIEWED_AT});
export const resources=[
 source('stocks','Stocks – FAQs','SEC Investor.gov','https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks','英文','article','先讀 What are stocks?，辨認所有權、股利與股東權利。'),
 source('trading','集中市場交易制度介紹','臺灣證券交易所','https://www.twse.com.tw/zh/products/system/trading.html','繁體中文','article','讀一般交易與盤中零股的交易單位、委託及撮合說明。','台灣集中市場制度'),
 source('orders','Types of Orders','SEC Investor.gov','https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders','英文','article','對照市價與限價委託的價格及成交限制。','美國委託概念；台股可用條件另依交易制度'),
 source('quotes','More Than Meets the Eye: How to Read Stock Quotes','Charles Schwab','https://www.schwab.com/learn/story/learn-how-to-read-stock-quotes','英文','article','先讀報價欄位的 bid/ask、previous close、open、volume、range。','美股報價示範；欄位概念可比較，交易制度不同'),
 source('statements',"Beginners’ Guide to Financial Statements",'美國證券交易委員會 SEC','https://www.sec.gov/about/reports-publications/beginners-guide-financial-statements','英文','article','讀資產負債表、損益表與現金流量表的用途。'),
 source('mops-terms','財務比較 E 點通：使用說明與公式','臺灣證券交易所／公開資訊觀測站','https://mopsfin.twse.com.tw/terms','繁體中文','article','核對單季／累計資料、更新頻率及比較指標口徑。','台灣公司申報資料與財報比較'),
 source('pe','What Is the P/E Ratio? Why Investors Use It','Charles Schwab','https://workplace.schwab.com/story/stock-analysis-using-pe-ratio','英文','article','讀歷史與前瞻本益比、同業比較及一次性收益的限制。'),
 source('valuation-notes','個股日本益比、殖利率及股價淨值比：資料說明','臺灣證券交易所','https://www.twse.com.tw/zh/trading/historical/bwibbu.html','繁體中文','article','閱讀報表下方的股利年度、財報年季與指標口徑。','證交所估值資料'),
 source('dividends','除權除息投資 Q&A','臺灣證券交易所投資人知識網','https://investoredu.twse.com.tw/Pages/TWSE_InvestmentQA.aspx?ID=1','繁體中文','article','讀股利權利、除權息交易及參考價格調整說明。','台股除權息概念'),
 source('sma','Simple Moving Average (SMA)','Fidelity','https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/sma','英文','article','讀等權重平均的計算方式，以及較長週期的平滑效果。'),
 source('macd','MACD','Fidelity','https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/macd','英文','article','核對快慢 EMA、訊號線及橫盤時反覆交叉的限制。'),
 source('stochastic','Fast Stochastic','Fidelity','https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/fast-stochastic','英文','article','觀察收盤在近期高低區間的位置；注意快慢版本差異。'),
 source('levels','What Is Support and Resistance?','Fidelity','https://www.fidelity.com/learning-center/trading-investing/technical-analysis/support-and-resistance','英文','article','讀供需區域、突破及支撐壓力角色轉換。'),
 source('institutions','三大法人買賣超日報：欄位與說明','臺灣證券交易所','https://www.twse.com.tw/fund/T86?response=html','繁體中文','article','先讀表尾說明，再辨認外陸資、投信、自營商及股數單位。','台灣上市股票買賣超統計'),
 source('holders','集保戶股權分散表：編製說明','臺灣集中保管結算所 TDCC','https://www.tdcc.com.tw/portal/zh/smWeb/qryStock','繁體中文','article','閱讀 ID 歸戶、週資料基準及持股分級欄位。','台灣集保股權分散統計'),
 source('margin','Investor Bulletin: Understanding Margin Accounts','SEC Investor.gov','https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-29','英文','article','只讀借款投資的放大損益、利息及擔保品風險。','美國融資制度；文中門檻不可直接套用台股'),
 source('allocation','Asset Allocation and Diversification','SEC Investor.gov','https://www.investor.gov/introduction-investing/getting-started/asset-allocation','英文','article','讀投資期限、承受損失能力與資產類別分散。'),
 source('etf','Exchange-Traded Funds (ETFs)','SEC Investor.gov','https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-2','英文','article','讀基金組合、交易價格與淨值、費用及產品風險。','美國 ETF 教育；台灣商品另查公開說明書'),
 source('dca','Dollar Cost Averaging','SEC Investor.gov','https://www.investor.gov/introduction-investing/investing-basics/glossary/dollar-cost-averaging','英文','article','讀定額、定期投入時，價格與買入股數的關係。'),
 source('fraud','Five Questions to Ask Before You Invest','SEC Investor.gov','https://www.investor.gov/introduction-investing/getting-started/five-questions-ask-you-invest','英文','article','閱讀獨立查證、主動提問及不要只依推薦做決定的提醒。','防詐原則；台灣業者資格請用金管會名單核對'),
 source('video-odd','盤中零股 vs. 大盤交易','臺灣證券交易所｜全民投資通識線上課程','https://www.twse.com.tw/zh/allinone/2-1-2.html','繁體中文','video','到官方課程頁觀看，搭配交易制度文章核對現行規則。','官方教學影片頁'),
 source('video-etf','被動式 ETF 入門全解析','臺灣證券交易所｜全民投資通識線上課程','https://www.twse.com.tw/zh/allinone/2-4-1.html','繁體中文','video','到官方課程頁觀看被動式 ETF 概念，留意並非所有 ETF 都是被動式。','官方教學影片頁'),
 source('video-dca','掌握懶人心法－定期定額投資','臺灣證券交易所｜全民投資通識線上課程','https://www.twse.com.tw/zh/allinone/2-2-1.html','繁體中文','video','到官方課程頁觀看定期定額的使用情境。','官方教學影片頁'),
 source('safety','行前認知：執行注意事項','臺灣證券交易所｜全民投資通識線上課程','https://www.twse.com.tw/zh/allinone/1-2.html','繁體中文','video','頁面列有合法業者查證管道，可由官網進入查核。','官方課程頁與合法業者查證清單'),
];
export const sourceById=Object.fromEntries(resources.map(resource=>[resource.id,resource]));
