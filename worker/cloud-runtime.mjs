import {normalizeFugle} from './intraday.mjs';
const PUBLIC='https://alex113607004-cmyk.github.io/finance-school/';
const FILES=new Set(['market-data.json','universe-data.json','analysis-data.json','us-data.json','us-stocks-data.json','market-overview-data.json','etf-nav-data.json','forward-estimates-data.json','THIRD-PARTY-NOTICES.txt','LICENSE-lightweight-charts.txt']);
export function createCloudApp({html='',fetcher=(...args)=>fetch(...args),now=()=>new Date()}={}){
 return {async fetch(request,env={},ctx={}){
  const url=new URL(request.url),headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Cross-Origin-Resource-Policy':'same-origin'};
  const out=(data,status=200)=>Response.json(data,{status,headers});
  // Only the platform-authenticated Access context is trusted, never caller headers.
  if(!ctx.access||typeof ctx.access.getIdentity!=='function')return out({error:'請先啟用 Cloudflare Access，使用 Email 驗證碼登入。',code:'ACCESS_REQUIRED'},403);
  const owner=String(env.ACCESS_ALLOWED_EMAIL||'').trim().toLowerCase();
  if(!owner)return out({error:'請在 Cloudflare 設定允許登入的 Email。',code:'ACCESS_NOT_CONFIGURED'},503);
  let identity;try{identity=await ctx.access.getIdentity();}catch{return out({error:'Email 驗證已失效，請重新登入。',code:'ACCESS_REQUIRED'},403);}
  if(!identity?.email||String(identity.email).trim().toLowerCase()!==owner)return out({error:'這個 Email 沒有此私人網站的存取權。',code:'ACCESS_DENIED'},403);
  if(!['GET','HEAD'].includes(request.method))return out({error:'Method not allowed'},405);
  if(url.pathname.startsWith('/api/')&&(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin||['cross-site','same-site'].includes(request.headers.get('Sec-Fetch-Site'))))return out({error:'僅限同一私人網站查詢。'},403);
  if(url.pathname.startsWith('/api/')&&request.method!=='GET')return out({error:'Method not allowed'},405);
  const configured=!!env.FUGLE_API_KEY&&env.INTRADAY_PERSONAL_USE_CONFIRMED==='true';
  if(url.pathname==='/api/session')return out({schemaVersion:1,mode:'cloud-access',authenticated:true,configured});
  if(url.pathname==='/api/intraday'){
   if(!configured)return out({error:'請在 Cloudflare 保存 Fugle Key 並啟用個人使用設定。',code:'CLOUD_KEY_REQUIRED'},503);
   const symbol=url.searchParams.get('symbol')||'';
   if(url.searchParams.get('region')!=='TW')return out({error:'目前雲端分時來源支援台股。',code:'MARKET_UNSUPPORTED'},422);
   if(!/^[0-9A-Z]{4,6}$/.test(symbol))return out({error:'股票代號格式不正確。'},400);
   try{
    const read=async kind=>{const r=await fetcher('https://api.fugle.tw/marketdata/v1.0/stock/intraday/'+kind+'/'+symbol+(kind==='candles'?'?timeframe=1&sort=asc':''),{headers:{'X-API-KEY':env.FUGLE_API_KEY},signal:AbortSignal.timeout(12000)});if(!r.ok){const e=Error('upstream');e.upstreamStatus=r.status;throw e;}return r.json();};
    const [candles,quote]=await Promise.all([read('candles'),read('quote')]);return out({schemaVersion:1,intraday:normalizeFugle(candles,quote,symbol,now())});
   }catch(e){if(e.upstreamStatus===429)return out({error:'行情額度暫時用盡，請稍後重新整理。',code:'RATE_LIMIT'},429);if([401,403].includes(e.upstreamStatus))return out({error:'Fugle 金鑰或方案無法查詢，請檢查後端設定。',code:'FUGLE_AUTH'},502);return out({error:'尚無當日有效分時資料，或來源暫時無法連線。',code:'NO_INTRADAY'},502);}
  }
  if(url.pathname==='/')return new Response(request.method==='HEAD'?null:html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
  const relative=url.pathname.slice(1);
  if(!FILES.has(relative)&&!/^stock-history\/TPEX\/[0-9A-Z]{4,6}\.json$/.test(relative))return out({error:'Not found'},404);
  try{const r=await fetcher(PUBLIC+relative,{signal:AbortSignal.timeout(18000)});if(!r.ok)return out({error:'公開快照暫時無法取得，保留頁面內原始日期資料。'},502);return new Response(request.method==='HEAD'?null:r.body,{headers:{...headers,'Content-Type':r.headers.get('Content-Type')||'application/json; charset=utf-8'}});}catch{return out({error:'公開快照暫時無法取得，保留頁面內原始日期資料。'},502);}
 }};
}
