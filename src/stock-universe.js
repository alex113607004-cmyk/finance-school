import {numeric,isoDate,reportPeriod,stockData} from '../worker/runtime.mjs';
import {matchesIndustry} from './industries.js';
export const MARKET_NAMES={TWSE:'上市',TPEX:'上櫃',ESB:'興櫃'};
export const KIND_NAMES={stock:'普通股',preferred:'特別股',etf:'ETF',etn:'ETN',reit:'不動產受益證券',tdr:'存託憑證'};
export const TPEX_API='https://www.tpex.org.tw/openapi/v1/';
export const supportedCode=code=>/^[0-9A-Z]{4,6}$/.test(code);
export function securityKind(code,company){
 if(/^00/.test(code))return 'etf';
 if(/^01\d{3}[A-Z]$/.test(code))return 'reit';
 if(/^02|^03/.test(code)&&/^[0-9]{5,6}[A-Z]?$/.test(code))return 'etn';
 if(/^91\d{2,4}$/.test(code))return 'tdr';
 if(/^\d{4}[A-Z]$/.test(code))return 'preferred';
 if(/^\d{4}$/.test(code)||company)return 'stock';
 return null; // Exclude warrants, corporate bonds and certificates from the stock search.
}
export function normalizeCompany(c){
 if(!c)return null;
 return {'公司代號':String(c['公司代號']||c.SecuritiesCompanyCode||''),'公司名稱':c['公司名稱']||c.CompanyName,'公司簡稱':c['公司簡稱']||c.CompanyAbbreviation,'英文簡稱':c['英文簡稱']||c.Symbol,'產業別':c['產業別']||c.SecuritiesIndustryCode,'上市日期':c['上市日期']||c.DateOfListing,'網址':(c['網址']||c.WebAddress||'').trim()};
}
export function normalizeFinancial(r){return {...r,'公司代號':r['公司代號']||r.SecuritiesCompanyCode,'公司名稱':r['公司名稱']||r.CompanyName,'出表日期':r['出表日期']||r.Date,'年度':r['年度']||r.Year,'季別':r['季別']||r.Season};}
const metric=(r,...keys)=>{for(const key of keys){const n=numeric(r?.[key]);if(n!==null)return n;}return null;};
export function enrichIncome(stock,row,source,checkedAt){
 if(!row)return stock;
 const r=normalizeFinancial(row),p=reportPeriod(r),revenue=metric(r,'營業收入','收益','淨收益'),gross=metric(r,'營業毛利（毛損）淨額','營業毛利（毛損）'),op=metric(r,'營業利益（損失）','營業利益'),net=metric(r,'本期淨利（淨損）','本期稅後淨利（淨損）','本期稅後淨利'),eps=metric(r,'基本每股盈餘（元）','基本每股盈餘(元)','基本每股盈餘');
 const normal=stock.fundamentals.kind==='company';
 return {...stock,sources:{...stock.sources,earnings:source},sourceChecks:{...stock.sourceChecks,earnings:checkedAt},profit:stock.profit||{year:p?.year,quarter:p?.quarter,period:p?.label,tableDate:isoDate(r['出表日期']),gross:normal&&revenue>0&&gross!==null?gross/revenue*100:null,operating:normal&&revenue>0&&op!==null?op/revenue*100:null,net:normal&&revenue>0&&net!==null?net/revenue*100:null},fundamentals:{...stock.fundamentals,earnings:{period:p,tableDate:isoDate(r['出表日期']),epsYtd:eps,revenue,operatingProfit:op,netProfit:net,unit:'新台幣千元（EPS 為元／股）',basis:'年初至季末累計基本 EPS，非近四季 EPS',announcementDate:null}}};
}
export function normalizeMarket({market,quotes=[],companies=[],revenue=[],income=[],balance=[],valuation=[],sources={},sourceChecks={}}){
 const cs=companies.map(normalizeCompany),financials=income.map(normalizeFinancial),bs=balance.map(normalizeFinancial),codes=new Set([...cs.map(c=>c['公司代號']),...quotes.map(q=>q.Code||q.SecuritiesCompanyCode)]),stocks={};
 const normalQuotes=quotes.map(q=>market==='TWSE'?q:({Date:q.Date,Code:q.SecuritiesCompanyCode,Name:q.CompanyName,ClosingPrice:market==='ESB'?q.LatestPrice:q.Close,OpeningPrice:market==='ESB'?null:q.Open,HighestPrice:market==='ESB'?q.Highest:q.High,LowestPrice:market==='ESB'?q.Lowest:q.Low,TradeVolume:market==='ESB'?q.TransactionVolume:q.TradingShares,Change:market==='ESB'?null:q.Change}));
 const normalValuation=valuation.map(v=>market==='TWSE'?v:({Code:v.SecuritiesCompanyCode,Date:v.Date,PEratio:v.PriceEarningRatio,PBratio:v.PriceBookRatio,DividendYield:v.YieldRatio}));
 const datasets={quotes:normalQuotes,valuation:normalValuation,companies:cs,revenue,earnings:[],balance:bs,profit:[]};
 for(const code of codes){
  const company=cs.find(c=>c['公司代號']===code),kind=securityKind(code,company);
  if(!supportedCode(code)||!kind)continue;
  let stock=stockData(code,datasets,{fetchedAt:sourceChecks.quotes});
  if(stock.quote&&!(stock.quote.close>0))stock.quote.close=null;
  stock={...stock,market,securityKind:kind,sources,sourceChecks,mode:'daily-snapshot'};
  stock.fundamentals.kind=kind==='etf'||kind==='etn'?kind:stock.company?.industryCode==='17'?'financial':company?'company':'unavailable';
  const b=bs.find(r=>r['公司代號']===code);
  if(b){stock.sources={...stock.sources,balance:b._source||sources.balance};stock.sourceChecks={...stock.sourceChecks,balance:b._checkedAt||sourceChecks.balance};}
  if(market==='ESB'&&stock.quote){const original=quotes.find(q=>q.SecuritiesCompanyCode===code);stock.quote={...stock.quote,type:'last-trade',time:original?.Time,previousAverage:numeric(original?.PreviousAveragePrice),basis:'興櫃最新成交價快照，非集中市場收盤價；不與前日均價計算收盤漲跌幅。'};}
  const entry=financials.find(r=>r['公司代號']===code);
  stock=enrichIncome(stock,entry,entry?._source||sources.earnings,entry?._checkedAt||sourceChecks.earnings);
  stocks[code]=stock;
 }
 return stocks;
}
export function mergeMarkets(...markets){
 const stocks={};
 for(const items of markets)for(const s of Object.values(items)){
  const old=stocks[s.code];
  if(!old||(s.quote?.date||'')>(old.quote?.date||'')||s.quote?.date===old.quote?.date&&(s.company?.listed||'')>(old.company?.listed||''))stocks[s.code]=s;
 }
 return stocks;
}
export function addPeerContext(stocks){
 const groups=new Map();
 for(const s of Object.values(stocks))if(s.securityKind==='stock'&&s.company?.industryCode&&s.valuation?.pe>0){const k=[s.market,s.company.industryCode,s.valuation.date].join('|');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);}
 for(const s of Object.values(stocks)){
  const peers=(groups.get([s.market,s.company?.industryCode,s.valuation?.date].join('|'))||[]).filter(p=>p.code!==s.code).map(p=>p.valuation.pe).sort((a,b)=>a-b);
  if(peers.length<5)continue;const q=p=>{const i=(peers.length-1)*p;return peers[Math.floor(i)]+(peers[Math.ceil(i)]-peers[Math.floor(i)])*(i%1)};
  s.officialPeer={count:peers.length,p25:q(.25),median:q(.5),p75:q(.75),date:s.valuation.date,market:s.market,basis:'同市場、同產業、同估值日的正本益比；財報參考期可能不同，僅供分布觀察。'};
 }
 return stocks;
}
const text=v=>String(v||'').normalize('NFKC').replace(/臺/g,'台').replace(/\s+/g,'').toLocaleLowerCase();
export function searchStocks(stocks,query,{market='all',industry='all',limit=15}={}){
 const q=text(query).replace(/^(twse|tpex|esb):/,'');
 return Object.values(stocks).filter(s=>(market==='all'||s.market===market)&&matchesIndustry(s,industry,'TW')&&(!q||[s.code,s.name,s.company?.fullName,s.company?.english].some(v=>text(v).includes(q)))).sort((a,b)=>{
  const score=s=>text(s.code)===q?0:text(s.name)===q?1:text(s.code).startsWith(q)?2:text(s.name).startsWith(q)?3:4;
  return score(a)-score(b)||a.code.localeCompare(b.code);
 }).slice(0,limit);
}
export function resolveStock(stocks,query){
 const q=text(query).replace(/^(twse|tpex|esb):/,'');
 return Object.values(stocks).find(s=>text(s.code)===q)||Object.values(stocks).find(s=>[s.name,s.company?.fullName,s.company?.english].some(v=>text(v)&&text(v)===q))||null;
}
export function universeCounts(stocks){return Object.fromEntries(Object.keys(MARKET_NAMES).map(m=>[m,Object.values(stocks).filter(s=>s.market===m).length]));}
export function parseTpexDaily(body,allowed,source,checkedAt){
 if(String(body.stat).toLowerCase()!=='ok')return [];
 const date=isoDate(body.date),rows=[];
 for(const table of body.tables||[]){
  const fields=table.fields||[],at=names=>fields.findIndex(f=>names.some(n=>f.replace(/\s/g,'')===n)),id=at(['代號','證券代號']),o=at(['開盤','開盤價']),h=at(['最高','最高價']),l=at(['最低','最低價']),c=at(['收盤','收盤價']),v=at(['成交股數','成交張數','成交仟股']),ch=at(['漲跌','漲跌價差']);
  if([id,o,h,l,c,v].some(i=>i<0))continue;
  const multiplier=fields[v].includes('股數')?1:1000;
  for(const raw of table.data||[]){const code=String(raw[id]);if(!allowed.has(code))continue;const close=numeric(raw[c]);rows.push({code,name:raw[at(['名稱','證券名稱'])],date,open:numeric(raw[o]),high:numeric(raw[h]),low:numeric(raw[l]),close,volume:numeric(raw[v])===null?null:numeric(raw[v])*multiplier,change:numeric(raw[ch]),source,checkedAt});}
 }
 return rows;
}
