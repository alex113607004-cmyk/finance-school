// Standalone optional Worker. API keys are read only from server secrets.
const SOURCE='https://developer.fugle.tw/docs/data/http-api/intraday/candles/';
export function normalizeFugle(candles,quote,symbol,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(now);
 if(candles.symbol!==symbol||quote.symbol!==symbol||candles.date!==today||quote.date!==today||candles.exchange!==quote.exchange||!['TWSE','TPEx'].includes(candles.exchange)||candles.timeframe&&candles.timeframe!=='1')throw Error('identity/date');
 const data=candles.data;
 if(!Array.isArray(data)||data.length<2||data.some(r=>!Number.isFinite(Date.parse(r.date))||!Number.isFinite(r.close)||r.close<=0)||!Number.isFinite(quote.openPrice)||quote.openPrice<=0)throw Error('incomplete');
 const sorted=[...data].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const start=Date.parse(today+'T09:00:00+08:00'),end=Date.parse(today+'T13:30:00+08:00');
 if(sorted.some((r,i)=>Date.parse(r.date)<start||Date.parse(r.date)>end||Date.parse(r.date)>now.getTime()||i&&Date.parse(r.date)<=Date.parse(sorted[i-1].date)))throw Error('time');
 return {id:'TW:'+symbol,date:today,currency:'TWD',exchange:candles.exchange,provider:'Fugle',source:SOURCE,publicDisplayAllowed:false,accessScope:'personal-authenticated',basis:'unadjusted',regularSession:true,status:'snapshot',intervalMinutes:1,open:quote.openPrice,sessionStart:today+'T09:00:00+08:00',sessionEnd:today+'T13:30:00+08:00',checkedAt:now.toISOString(),rows:sorted.map(r=>({time:r.date,price:r.close}))};
}
async function authorized(request,secret){
 const header=request.headers.get('Authorization')||'',value=header.startsWith('Bearer ')?header.slice(7):'';
 if(!value||value.length>128)return false;
 const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),[left,right]=await Promise.all([hash(value),hash(secret)]);
 let difference=0;for(let i=0;i<left.length;i++)difference|=left[i]^right[i];return difference===0;
}
export function createIntradayWorker({fetcher=(...a)=>fetch(...a),now=()=>new Date()}={}){
 return {async fetch(request,env={}){
  const url=new URL(request.url),origin=request.headers.get('Origin'),allowed=env.INTRADAY_ALLOWED_ORIGIN;
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(origin&&origin===allowed?{'Access-Control-Allow-Origin':origin}:{} )};
  const out=(body,status=200)=>Response.json(body,{status,headers});
  if(url.pathname!=='/api/intraday')return out({error:'Not found'},404);
  if(origin!==allowed||!allowed)return out({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Authorization'}});
  if(request.method!=='GET')return out({error:'Method not allowed'},405);
  const password=env.INTRADAY_ACCESS_PASSWORD||'';
  if(!env.FUGLE_API_KEY||env.INTRADAY_PERSONAL_USE_CONFIRMED!=='true'||!(/^[!-~]{32,128}$/).test(password)||password===env.FUGLE_API_KEY)return out({error:'私人行情後端尚未完成設定。'},503);
  if(!await authorized(request,password))return out({error:'請輸入正確的私人分時存取密碼。'},401);
  const region=url.searchParams.get('region'),symbol=url.searchParams.get('symbol')||'';
  if(region!=='TW')return out({error:'目前分時介接僅支援台灣市場。'},422);
  if(!/^[0-9A-Z]{4,6}$/.test(symbol))return out({error:'證券代號格式錯誤。'},400);
  try{
   const read=async kind=>{const r=await fetcher('https://api.fugle.tw/marketdata/v1.0/stock/intraday/'+kind+'/'+symbol+(kind==='candles'?'?timeframe=1&sort=asc':''),{headers:{'X-API-KEY':env.FUGLE_API_KEY},signal:AbortSignal.timeout(12000)});if(!r.ok){const e=Error('upstream');e.upstreamStatus=r.status;throw e;}return r.json();};
   const [candles,quote]=await Promise.all([read('candles'),read('quote')]);
   const intraday=normalizeFugle(candles,quote,symbol,now());return out({schemaVersion:1,intraday});
  }catch(e){if(e.upstreamStatus===429)return out({error:'行情來源額度暫時用盡，請稍後重新整理。'},429);if([401,403].includes(e.upstreamStatus))return out({error:'行情來源認證失敗，請在後端檢查 API Key 與方案。'},502);return out({error:'當日分時尚無有效資料或來源暫時無法連線。'},502);}
 }};
}
export default createIntradayWorker();
