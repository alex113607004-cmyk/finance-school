import {sourceById} from './learning-sources.js';
export {resources,sourceById,REVIEWED_AT} from './learning-sources.js';
export const stages=[
 {id:'s1',name:'股票與交易入門',english:'UNDERSTAND THE MARKET',desc:'先認識持有什麼，再看交易與報價。',icon:'candles',color:'emerald'},
 {id:'s2',name:'財報與估值',english:'READ THE BUSINESS',desc:'分清會計期間、獲利與價格。',icon:'chart',color:'indigo'},
 {id:'s3',name:'技術分析',english:'READ PRICE EVIDENCE',desc:'讀懂指標如何形成，以及能說明到哪裡。',icon:'activity',color:'amber'},
 {id:'s4',name:'籌碼與槓桿',english:'UNDERSTAND THE DATA',desc:'先讀統計定義，保留推論的界線。',icon:'layers',color:'violet'},
 {id:'s5',name:'配置與風險',english:'BUILD A SOUND PROCESS',desc:'把目標、產品與資訊查核放在一起。',icon:'shield',color:'cyan'},
];
const point=(text,...sourceIds)=>({text,sourceIds});
const lesson=(id,stage,title,goal,sourceIds,takeaways,guide,question,answer,tags,minutes=12)=>({id,stage,title,goal,sourceIds,takeaways,guide,reflection:{question,answer},tags,minutes,searchText:sourceIds.map(id=>sourceById[id].publisher+' '+sourceById[id].title+' '+sourceById[id].focus+' '+sourceById[id].scope).join(' ')});
export const units=[
 lesson('start-ownership','s1','持有股票，究竟持有什麼？','認識所有權、股利及股東參與權。',['stocks'],[
  point('股票代表公司的一部分所有權，不是存款。','stocks'),
  point('持股的經濟利益可能來自價格上升或公司分配盈餘。','stocks'),
  point('股東可能享有投票權；不同股票種類的權利應分別確認。','stocks'),
 ],['先讀 What are stocks?，把所有權與報酬來源分開。','接著查看股票種類與風險的延伸問答。'],'看見股價上升以外，你還會查哪一種股東權利？','從股利政策與投票權開始，再核對自己持有的股票種類。',['股票','股東','股利','所有權']),
 lesson('start-orders','s1','從交易單位到委託成交','分清股、交易單位，以及委託與成交。',['trading','orders','video-odd'],[
  point('台股普通股一般交易單位為 1,000 股；零股交易另有制度。','trading'),
  point('限價委託限制可接受價格，但不保證成交。','orders'),
  point('美國文章中的委託類型不必然能直接用於台股，應對照現行制度。','trading','orders'),
 ],['先讀證交所的交易單位與盤中零股章節，再看官方影片。','用英文文章補充價格與成交的取捨，不照搬美國交易規則。'],'委託送出後，下一步要確認什麼？','查委託回報與成交回報，確認成交股數、價格及未成交部分。',['零股','限價單','交易單位','成交'],16),
 lesson('start-quotes','s1','報價表：先辨認欄位與時間','區分成交、委買賣與不同期間的價格範圍。',['quotes'],[
  point('前收、今日開盤與買賣報價描述不同事件，不能互相替代。','quotes'),
  point('當日高低範圍與 52 週範圍的期間不同。','quotes'),
  point('成交量是交易數量；閱讀時須同時核對期間與單位。','quotes'),
 ],['對照原文列出的 bid/ask、previous close、open、volume。','回到看盤頁時，先找交易日期，再找各欄位的單位。'],'為什麼前收不能當成下一筆一定買得到的價格？','前收描述過去成交，下一筆仍須依當時買賣報價及委託條件成交。',['收盤價','開盤價','成交量','買賣價差']),
 lesson('fund-statements','s2','先讀期間，再讀財報','認識四張報表及單季、累計的差異。',['statements','mops-terms'],[
  point('資產負債表描述特定時點；損益與現金流量表描述一段期間。','statements'),
  point('資產、負債與權益要一起讀，獲利也須對照現金流。','statements'),
  point('財務比較資料有單季、累計與更新時間差，先核對口徑。','mops-terms'),
 ],['先讀 SEC 的三種報表用途，再看股東權益變動表。','用 E 點通說明核對單季／累計，不把季度標籤直接當單季。'],'兩個數字都寫第三季，為什麼仍可能不能直接比較？','一個可能只含第三季，另一個可能涵蓋年初至季末；先確認期間與單位。',['財報期間','現金流','營收','淨利'],15),
 lesson('fund-pe','s2','EPS 與本益比：比較之前先對口徑','理解歷史與預估倍數，以及同業比較的限制。',['pe','valuation-notes'],[
  point('本益比把每股價格與每股盈餘放在一起比較。','pe'),
  point('歷史與前瞻本益比使用的獲利資料不同，預估值不是已實現獲利。','pe'),
  point('讀證交所估值表時，連同股利年度與參考財報年季一起查。','valuation-notes'),
 ],['讀 P/E ratio formula 與 Types of P/E ratios，找出分母的 EPS 期間。','再讀證交所報表說明，避免把不同網站的倍數直接混用。'],'兩檔股票本益比一高一低，還欠缺哪些比較條件？','產業、成長與風險，以及 EPS 期間、來源和是否含一次性損益。',['EPS','本益比','近四季 EPS','前瞻估值'],14),
 lesson('fund-dividends','s2','股利權利與除息價格','把配息資格、參考價及殖利率分開閱讀。',['dividends','valuation-notes'],[
  point('除息交易日起買進的股票，不再附帶本次現金股利權利。','dividends'),
  point('除權息會調整參考價格；參考價不是保證成交價。','dividends'),
  point('殖利率是股利相對價格的比例，閱讀時必須確認股利年度。','valuation-notes'),
 ],['讀官方 Q&A 的權利與參考價說明，分清現金股利和配股。','在估值表找股利年度，別把歷史殖利率當未來承諾。'],'只知道殖利率，是否已知道完整持有報酬？','還沒有；價格變化、配息期間及稅費等也會影響實際結果。',['現金股利','除息','殖利率','總報酬']),
 lesson('chart-averages','s3','均線：價格如何被平均？','理解簡單移動平均的計算與平滑效果。',['sma'],[
  point('SMA 將指定期間的價格相加，再除以觀察筆數，各筆等權重。','sma'),
  point('較長期間通常更平滑，也較慢反映近期變化。','sma'),
  point('均線會隨新資料移動；判讀前先確認價格欄位與期間。','sma'),
 ],['先讀 Calculation 與 How this indicator works。','本站週線採 5 個交易日，月／季／年採 20／60／240 日，這是本頁設定。'],'同一張圖換了均線期間，為什麼結果也會改變？','納入的歷史價格與平均筆數不同，平滑程度與反應速度就不同。',['週線','十日線','月線','季線','年線','SMA']),
 lesson('chart-momentum','s3','隨機指標與 MACD：先懂輸入資料','區分區間位置與均線動能，避免混用版本。',['stochastic','macd'],[
  point('隨機指標描述收盤在近期高低範圍的位置，需留意快慢版本。','stochastic'),
  point('MACD 利用快慢 EMA 的差及訊號線觀察趨勢動能。','macd'),
  point('橫盤時 MACD 可能反覆交叉；訊號本身不能保證方向。','macd'),
 ],['先讀兩篇 Description，再核對參數與平滑方式。','閱讀快版隨機指標時，不直接當成每個平台的 KD 設定。'],'兩個網站的 KD 數字不同，先檢查什麼？','比較價格期間、快慢版本及平滑參數，確認是否使用同一組輸入。',['KD','MACD','EMA','動能'],15),
 lesson('chart-levels','s3','支撐與壓力：理解區域與突破','認識供需觀察及角色轉換，保留驗證空間。',['levels'],[
  point('支撐與壓力用來描述價格區域中的供需觀察。','levels'),
  point('價格突破後，原先支撐或壓力的角色可能改變。','levels'),
  point('歷史區域仍可能失效；要觀察後續價格，而非把線當保證。','levels'),
 ],['讀支撐、壓力及角色轉換段落，再對照原文圖示。','把判讀寫成有條件的觀察，保留價格不照預期走的情境。'],'若價格重新跌回突破區內，你原來的判斷要怎麼處理？','重新檢查突破是否成立，以及原先假設是否仍獲資料支持。',['支撐','壓力','突破','趨勢']),
 lesson('flow-institutions','s4','法人統計：先讀分類再讀買賣超','知道表格記錄什麼，以及沒有記錄什麼。',['institutions'],[
  point('報表分列外陸資、投信與自營商，單位為股數。','institutions'),
  point('自營商另區分自行買賣與避險，不能把不同欄位重複相加。','institutions'),
  point('閱讀提醒：彙總買賣超未揭露每位交易者的完整目的，不能直接等同看多或看空。','institutions'),
 ],['選擇交易日期，先讀表尾說明與欄位全名。','分開看買進、賣出與淨額，再確認統計涵蓋範圍。'],'只看淨買超，會漏掉什麼？','會漏掉同時發生的買賣規模、分類差異，以及未在表中揭露的交易目的。',['三大法人','外資','投信','自營商','買賣超']),
 lesson('flow-holders','s4','集保股權分散：級距與資料基準','讀懂歸戶後的人數、股數與持有比例。',['holders'],[
  point('股權分散資料依 ID 歸戶，再按持股級距彙整。','holders'),
  point('資料基準為每週最後一個營業日營業結束後的餘額。','holders'),
  point('表格顯示級距的人數、股數與占比，不直接揭露個別股東的交易動機。','holders'),
 ],['先讀官方編製說明，再看日期與持股級距。','比較不同週時，確認級距及分母口徑相同，並讀專戶計算說明。'],'為什麼不能把某級距占比增加直接稱為特定人吃貨？','統計是歸戶後的級距總量，沒有直接證明個別身份、買進時點或動機。',['集保','股權分散','持股比重','級距']),
 lesson('flow-margin','s4','借款投資：先理解損失如何放大','認識槓桿、利息與擔保品風險。',['margin'],[
  point('融資帳戶使用借款投資，與全額自付的現金帳戶不同。','margin'),
  point('借款與利息會增加負擔，價格下跌可能加大自有資金的損失。','margin'),
  point('原文為美國制度；台股成數、維持率與補繳程序須另外查核。','margin'),
 ],['先讀現金帳戶與融資帳戶的差異，再讀風險說明。','把美國規則與借款風險原則分開，台股實際程序洽券商核對。'],'閱讀海外融資文章時，哪些內容不能直接套在台股？','借款上限、維持標準、通知與處分程序等市場規則，必須另外查現行規範。',['融資','槓桿','維持率','借款風險']),
 lesson('risk-allocation','s5','先有目標，再談分散配置','用期限與承受能力安排資產類別。',['allocation'],[
  point('資產配置是把資金分配到股票、債券、現金等不同資產。','allocation'),
  point('適合的配置與投資期限及風險承受能力有關。','allocation'),
  point('分散須看資產與投資內容的差異，不只看持有檔數。','allocation'),
 ],['讀 time horizon 與 risk tolerance，再讀 diversification。','先寫資金用途與需要的時間，再檢查持股是否集中。'],'同產業的多檔股票，是否已經充分分散？','檔數增加仍可能集中於共同產業風險，需要再查資產內容與風險來源。',['分散投資','資產配置','風險','投資期限']),
 lesson('risk-etf','s5','ETF 與定期定額：產品和方法分開看','認識基金結構、交易價格及定額投入。',['etf','dca','video-etf','video-dca'],[
  point('ETF 是交易所交易的基金，應看投資內容、費用與價格相對淨值的差異。','etf'),
  point('定期定額按固定間隔投入固定金額，價格低時同額可買較多單位。','dca'),
  point('投入方法不會改變基金本身的資產風險；仍需閱讀產品說明。','etf','dca'),
 ],['先看 ETF 的產品結構，再看定期定額的投入方式。','官方中文影片用於延伸理解；個別商品仍查公開說明書。'],'為什麼不能只憑定期投入，就省略查基金成分與費用？','投入節奏與投資標的不同；標的的集中、費用及價格風險仍會影響結果。',['ETF','定期定額','費用','淨值'],22),
 lesson('risk-fraud','s5','資訊查證：來源、資格與投資承諾','建立先查證再決定的閱讀習慣。',['fraud','safety'],[
  point('主動提問並獨立查研究資料，不只依推薦或推銷內容做決定。','fraud'),
  point('核對投資業者與商品資訊，來源與提供者的資格要分開確認。','fraud'),
  point('台灣合法業者名單可由證交所課程頁列出的官方查證管道進入。','safety'),
 ],['讀 Five Questions 的查證提問，再開官方課程頁的合法業者清單。','用自己找到的官網核對，保留來源與日期。'],'收到投資推薦連結後，第一步會做什麼？','先透過獨立找到的官方管道查核業者與商品，再確認資訊與承諾是否有依據。',['防詐','資訊查證','投資風險','合法業者'],15),
];
export function resourcesFor(unit){return unit.sourceIds.map(id=>sourceById[id]);}
