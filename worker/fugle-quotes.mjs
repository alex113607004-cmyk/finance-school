export const FUGLE_QUOTE_SOURCE='https://developer.fugle.tw/docs/data/http-api/intraday/quote/';
const positive=n=>Number.isFinite(n)&&n>0;
const taipeiDay=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(d);
export function normalizeFugleQuote(raw,ticker,symbol,now=new Date()){
 if(raw.symbol!==symbol||ticker.symbol!==symbol||raw.exchange!==ticker.exchange||!['TWSE','TPEx'].includes(raw.exchange)||!['TSE','OTC','ESB','TIB'].includes(raw.market)||raw.market!==ticker.market||ticker.date!==raw.date)throw Error('identity');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!['TWD','USD','CNY','JPY','HKD'].includes(ticker.tradingCurrency))throw Error('currency/date');
 // lastPrice can be a trial match. Only lastTrade, or an explicitly timed close, is an actual transaction.
 const actual=raw.lastTrade?.price!==undefined||raw.lastTrade?.time!==undefined?raw.lastTrade:{price:raw.closePrice,time:raw.closeTime};
 const price=actual.price,micros=actual.time,ms=micros/1000;
 if(!positive(price)||!Number.isSafeInteger(micros)||!Number.isFinite(ms)||ms>now.getTime()+1000||taipeiDay(new Date(ms))!==raw.date||raw.date>taipeiDay(now))throw Error('no-actual-trade');
 const dayAge=(Date.parse(taipeiDay(now))-Date.parse(raw.date))/86400000;
 if(dayAge>10)throw Error('stale');
 const reference=positive(raw.referencePrice)?raw.referencePrice:positive(raw.previousClose)?raw.previousClose:null;
 const end=Date.parse(raw.date+(raw.market==='ESB'?'T15:00:00+08:00':'T13:30:00+08:00')),after=raw.isClose===true||now.getTime()>=end||raw.date!==taipeiDay(now),boardLot=positive(ticker.boardLot)?ticker.boardLot:null;
 const volumeRaw=Number.isFinite(raw.total?.tradeVolume)&&raw.total.tradeVolume>=0?raw.total.tradeVolume:null,unitFactor=raw.market==='ESB'?1:boardLot;
 return {id:'TW:'+symbol,region:'TW',symbol,date:raw.date,price,close:price,open:positive(raw.openPrice)?raw.openPrice:null,high:positive(raw.highPrice)?raw.highPrice:null,low:positive(raw.lowPrice)?raw.lowPrice:null,previousClose:positive(raw.previousClose)?raw.previousClose:null,referencePrice:reference,change:reference?price-reference:null,changePercent:reference?(price-reference)/reference*100:null,changeBasis:positive(raw.referencePrice)?'當日參考價':'前日收盤價',currency:ticker.tradingCurrency,market:raw.market==='ESB'?'ESB':raw.exchange==='TWSE'?'TWSE':'TPEX',exchange:raw.exchange,timestamp:new Date(ms).toISOString(),checkedAt:now.toISOString(),provider:'Fugle',source:FUGLE_QUOTE_SOURCE,sourceURL:FUGLE_QUOTE_SOURCE,status:after?'aftermarket':'realtime',kind:'live-snapshot',transport:'rest-snapshot',adjustment:'unadjusted',publicDisplayAllowed:false,accessScope:'personal-authenticated',volume:volumeRaw!==null&&unitFactor?volumeRaw*unitFactor:null,volumeRaw,boardLot,volumeBasis:'盤中整股累積成交量；不含零股、盤後與鉅額',volumeUnit:'股',halted:raw.tradingHalt?.isHalted===true,trialInProgress:raw.isTrial===true};
}
export function createFugleReader({fetcher=(...a)=>fetch(...a),now=()=>new Date()}={}){
 const cache=new Map();
 async function read(kind,symbol,key){
  const id=kind+':'+symbol,ttl=kind==='ticker'?43200000:10000,existing=cache.get(id),time=now().getTime();
  if(existing&&existing.key===key&&time-existing.time<ttl)return existing.promise;
  const promise=(async()=>{const r=await fetcher('https://api.fugle.tw/marketdata/v1.0/stock/intraday/'+kind+'/'+symbol+(kind==='candles'?'?timeframe=1&sort=asc':''),{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(12000)});if(!r.ok){const e=Error('provider');e.upstreamStatus=r.status;throw e;}return r.json();})();
  cache.set(id,{key,time,promise});if(cache.size>300)cache.delete(cache.keys().next().value);
  try{return await promise;}catch(e){cache.delete(id);throw e;}
 }
 return {read,async quote(symbol,key){const raw=await read('quote',symbol,key);let ticker=await read('ticker',symbol,key);if(ticker.date!==raw.date){cache.delete('ticker:'+symbol);ticker=await read('ticker',symbol,key);}return normalizeFugleQuote(raw,ticker,symbol,now());}};
}
