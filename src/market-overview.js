import {numeric,isoDate} from '../worker/runtime.mjs';
export const OVERVIEW_MARKETS={TWSE:'上市',TPEX:'上櫃'};
export const OVERVIEW_CATEGORIES=[['hot','成交熱門'],['gainers','漲幅排行'],['losers','跌幅排行'],['limitUp','漲停板'],['limitDown','跌停板']];
const text=v=>String(v??'').replace(/<[^>]*>/g,'').replace(/\s/g,'');
export function parseOverviewQuotes(body,market,universe,{source,checkedAt}){
 if(!OVERVIEW_MARKETS[market]||String(body.stat).toLowerCase()!=='ok'||!isoDate(body.date))throw Error('官方行情日期或狀態不完整');
 const date=isoDate(body.date),out=[],seen=new Set();
 for(const t of body.tables||[]){
  const f=(t.fields||[]).map(text),at=keys=>f.findIndex(x=>keys.includes(x)),id=at(['證券代號','代號']),close=at(['收盤價','收盤']),volume=at(['成交股數','成交仟股','成交張數']),amount=at(['成交金額','成交金額(元)']),ch=at(['漲跌價差','漲跌']),sign=at(['漲跌(+/-)']);
  if([id,close,volume,amount,ch].some(i=>i<0))continue;
  for(const r of t.data||[]){
   const code=String(r[id]),registered=universe[code];
   if(!registered||registered.market!==market||!['stock','etf'].includes(registered.securityKind)||seen.has(code))continue;
   const price=numeric(r[close]),v=numeric(r[volume]),turnover=numeric(r[amount]);
   if(!(price>0)||v===null||v<=0||turnover===null||turnover<0)continue;
   seen.add(code);const raw=numeric(r[ch]),s=sign>=0?text(r[sign]):null;
   const change=market==='TWSE'?(s==='+'&&raw!==null?raw:s==='-'&&raw!==null?-raw:s===''&&raw===0?0:null):raw;
   const previous=change!==null?price-change:null;
   const nameColumn=at(['證券名稱','名稱']);
   out.push({id:`TW:${market}:${code}`,code,name:nameColumn>=0?String(r[nameColumn]).trim():registered.name,market,type:registered.securityKind,date,close:price,change,changePercent:previous>0?change/previous*100:null,volume:v*(f[volume]==='成交股數'?1:1000),turnover,source,checkedAt,limit:{status:'unavailable',reason:'尚無同日官方停板價。'}});
  }
 }
 if(!out.length)throw Error('官方行情表格無可辨認且有效的股票／ETF成交資料');
 return out;
}
export function parseTwseLimits(body,{source,checkedAt}){
 const date=isoDate(body.date),f=body.fields||[];
 if(body.stat!=='OK'||!date||!Array.isArray(body.data))throw Error('上市停板價的日期或狀態不符');
 const upper=f.indexOf('漲停價'),lower=f.indexOf('跌停價'),code=f.indexOf('證券代號');
 if([upper,lower,code].some(i=>i<0))throw Error('上市停板價欄位不完整');
 return Object.fromEntries(body.data.map(r=>[String(r[code]),{date,upper:numeric(r[upper]),lower:numeric(r[lower]),source,checkedAt,evidenceDate:date,method:'official-same-day'}]));
}
export function parseTpexNextLimits(body,{effectiveDate,source,checkedAt,chainVerified}){
 const evidenceDate=isoDate(body.date);
 if(!chainVerified||String(body.stat).toLowerCase()!=='ok'||!evidenceDate||evidenceDate>=effectiveDate)throw Error('無法確認上櫃次日停板價對應的交易日');
 const result={};
 for(const t of body.tables||[]){const f=(t.fields||[]).map(text),id=f.indexOf('代號'),up=f.indexOf('次日漲停價'),down=f.indexOf('次日跌停價');if([id,up,down].some(i=>i<0))continue;
  for(const r of t.data||[])result[String(r[id])]={date:effectiveDate,upper:numeric(r[up]),lower:numeric(r[down]),source,checkedAt,evidenceDate,method:'official-previous-session-next'};
 }
 if(!Object.keys(result).length)throw Error('上櫃日報沒有次日停板價欄位');return result;
}
export function attachOverviewLimits(stocks,limits){
 return stocks.map(s=>{
  const b=limits[s.code];
  if(!b||b.date!==s.date)return {...s,limit:{status:'unavailable',reason:'行情與官方停板價日期尚未對齊。'}};
  if(!(b.upper>0)||!(b.lower>0)||b.upper<=b.lower)return {...s,limit:{...b,status:'unavailable',reason:'停板價未提供或無法判定；不以百分比猜測。'}};
  if(b.upper>=9999.95&&b.lower<=.01)return {...s,limit:{...b,status:'unrestricted',reason:'來源為無一般漲跌幅限制的價格範圍。'}};
  const equal=n=>Math.abs(s.close-n)<1e-6;
  if(s.close>b.upper+1e-6||s.close<b.lower-1e-6)return {...s,limit:{...b,status:'unavailable',reason:'收盤價超出來源停板範圍，需重新核對。'}};
  return {...s,limit:{...b,status:equal(b.upper)?'up':equal(b.lower)?'down':'none'}};
 });
}
export function overviewScope(snapshot,{market='all',type='stock'}={}){
 const available=(snapshot?.stocks||[]).filter(s=>OVERVIEW_MARKETS[s.market]&&(market==='all'||s.market===market)&&(type==='all'||s.type===type)&&s.close>0&&Number.isFinite(s.volume)&&s.volume>0);
 const date=available.map(s=>s.date).sort().at(-1)||null;
 const stocks=available.filter(s=>s.date===date),known=stocks.filter(s=>Number.isFinite(s.changePercent)),count=status=>stocks.filter(s=>s.limit?.status===status).length;
 const missingMarkets=Object.keys(OVERVIEW_MARKETS).filter(m=>(market==='all'||m===market)&&snapshot?.markets?.[m]?.date!==date);
 return {date,stocks,missingMarkets,stats:{total:stocks.length,up:known.filter(s=>s.changePercent>0).length,down:known.filter(s=>s.changePercent<0).length,flat:known.filter(s=>s.changePercent===0).length,unknownChange:stocks.length-known.length,limitUp:count('up'),limitDown:count('down'),limitUnknown:count('unavailable'),unrestricted:count('unrestricted'),turnover:stocks.reduce((sum,s)=>sum+s.turnover,0)}};
}
export function rankOverview(stocks,{category='hot',metric='volume'}={}){
 const filtered=stocks.filter(s=>category==='gainers'?s.changePercent>0:category==='losers'?s.changePercent<0:category==='limitUp'?s.limit?.status==='up':category==='limitDown'?s.limit?.status==='down':true);
 return [...filtered].sort((a,b)=>{
  const primary=category==='gainers'?b.changePercent-a.changePercent:category==='losers'?a.changePercent-b.changePercent:category==='hot'&&metric==='turnover'?b.turnover-a.turnover:b.volume-a.volume;
  return primary||b.turnover-a.turnover||a.id.localeCompare(b.id);
 });
}
