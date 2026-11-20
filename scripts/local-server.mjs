import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {normalizeFugle} from '../worker/intraday.mjs';
const PUBLIC='https://alex113607004-cmyk.github.io/finance-school/';
const JSON_FILES=new Set(['market-data.json','universe-data.json','analysis-data.json','us-data.json','us-stocks-data.json','market-overview-data.json','etf-nav-data.json','forward-estimates-data.json']);
export function createLocalServer({root=path.resolve('dist/pages'),configDir=path.resolve('.local'),fetcher=(...args)=>fetch(...args),now=()=>new Date(),refreshPublic=true}={}){
 const keyFile=path.join(configDir,'fugle-local.json'),cache=new Map();
 const getKey=()=>{try{return JSON.parse(fs.readFileSync(keyFile,'utf8')).apiKey||'';}catch{return '';}};
 const saveKey=key=>{fs.mkdirSync(configDir,{recursive:true,mode:0o700});fs.writeFileSync(keyFile+'.tmp',JSON.stringify({apiKey:key})+'\n',{mode:0o600});fs.renameSync(keyFile+'.tmp',keyFile);fs.chmodSync(keyFile,0o600);};
 const server=http.createServer(async(req,res)=>{
  const address=server.address(),origin='http://127.0.0.1:'+address.port;
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  // Loopback binding plus Host/Origin checks prevent remote pages and DNS rebinding.
  if(req.headers.host!=='127.0.0.1:'+address.port||req.headers.origin&&req.headers.origin!==origin||['cross-site','same-site'].includes(req.headers['sec-fetch-site']))return json({error:'僅限本機網站使用。'},403);
  try{
   const url=new URL(req.url,origin),pathname=url.pathname;
   if(pathname==='/api/local/status'&&req.method==='GET')return json({schemaVersion:1,mode:'local-only',configured:!!getKey()});
   if(pathname==='/api/local/key'){
    if(req.headers.origin!==origin)return json({error:'請從本機網站設定金鑰。'},403);
    if(req.method==='DELETE'){try{fs.unlinkSync(keyFile);}catch(e){if(e.code!=='ENOENT')throw e;}return json({configured:false});}
    if(req.method!=='POST')return json({error:'Method not allowed'},405);
    if(!(req.headers['content-type']||'').startsWith('application/json'))return json({error:'需要 JSON 格式。'},415);
    let body='';for await(const part of req){body+=part;if(body.length>8192)return json({error:'內容過大。'},413);}
    let key;try{key=JSON.parse(body).apiKey?.trim();}catch{return json({error:'設定格式不正確。'},400);}
    if(typeof key!=='string'||!(/^[!-~]{8,4096}$/).test(key))return json({error:'請輸入完整的 Fugle API Key。'},400);
    saveKey(key);return json({configured:true});
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return json({error:'Method not allowed'},405);
   if(pathname==='/api/intraday'){
    const symbol=url.searchParams.get('symbol')||'',region=url.searchParams.get('region');
    if(region!=='TW')return json({error:'目前本機分時來源支援台股。',code:'MARKET_UNSUPPORTED'},422);
    if(!/^[0-9A-Z]{4,6}$/.test(symbol))return json({error:'股票代號格式不正確。'},400);
    const key=getKey();if(!key)return json({error:'請先在本機設定 Fugle API Key。',code:'LOCAL_KEY_REQUIRED'},503);
    const read=async kind=>{const r=await fetcher('https://api.fugle.tw/marketdata/v1.0/stock/intraday/'+kind+'/'+symbol+(kind==='candles'?'?timeframe=1&sort=asc':''),{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(12000)});if(!r.ok){const e=Error('upstream');e.upstreamStatus=r.status;throw e;}return r.json();};
    try{
     const [candles,quote]=await Promise.all([read('candles'),read('quote')]);
     const data=normalizeFugle(candles,quote,symbol,now());return json({schemaVersion:1,intraday:{...data,accessScope:'local-only'}});
    }catch(e){
     if(e.upstreamStatus===429)return json({error:'行情來源額度暫時用盡，請稍後重新整理。',code:'RATE_LIMIT'},429);
     if([401,403].includes(e.upstreamStatus))return json({error:'Fugle 金鑰或方案無法查詢，請檢查本機 API Key。',code:'FUGLE_AUTH'},502);
     return json({error:'尚無當日有效分時資料，或來源暫時無法連線。',code:'NO_INTRADAY'},502);
    }
   }
   if(pathname.startsWith('/api/'))return json({error:'Not found'},404);
   const relative=decodeURIComponent(pathname.slice(1)||'index.html'),file=path.resolve(root,relative),base=path.resolve(root)+path.sep;
   if(!file.startsWith(base))return json({error:'Not found'},404);
   const published=JSON_FILES.has(relative)||/^stock-history\/TPEX\/[0-9A-Z]{4,6}\.json$/.test(relative);
   if(published&&refreshPublic){
    const prior=cache.get(relative);if(prior&&Date.now()-prior.time<300000)return json(prior.body);
    try{const r=await fetcher(PUBLIC+relative,{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!r.ok)throw Error();const body=await r.json();if(!body||typeof body!=='object')throw Error();cache.set(relative,{time:Date.now(),body});return json(body);}catch{if(prior)return json(prior.body);/* Retain original dates in the bundled snapshot. */}
   }
   if(!fs.existsSync(file)||!fs.statSync(file).isFile()||!fs.realpathSync(file).startsWith(fs.realpathSync(root)+path.sep))return json({error:'Not found'},404);
   const type=file.endsWith('.json')?'application/json':file.endsWith('.txt')?'text/plain':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
   res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});
   if(req.method==='HEAD')return res.end();
   if(relative==='index.html'){const html=fs.readFileSync(file,'utf8').replace('<head>','<head><meta name="finance-school-mode" content="local">');return res.end(html);}
   fs.createReadStream(file).pipe(res);
  }catch{return json({error:'本機服務暫時無法完成請求。'},500);}
 });
 return server;
}
