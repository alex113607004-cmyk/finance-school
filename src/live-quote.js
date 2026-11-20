import {marketDate} from './security';
export function usableLiveQuote(q,{region,symbol,market,currency},now=new Date()){
 if(!q||q.id!==region+':'+symbol||q.symbol!==symbol||q.region!==region||q.kind!=='live-snapshot'||q.adjustment!=='unadjusted'||q.accessScope!=='personal-authenticated'||q.publicDisplayAllowed!==false||q.provider!=='Fugle'||!/^https:\/\/developer\.fugle\.tw\//.test(q.source||''))return false;
 if(!['TWD','USD','CNY','JPY','HKD'].includes(q.currency)||currency!=='未核實'&&q.currency!==currency||market&&q.market!==market||!Number.isFinite(q.price)||q.price<=0||q.close!==q.price||!['realtime','aftermarket','delayed'].includes(q.status))return false;
 const age=now.getTime()-Date.parse(q.checkedAt),trade=Date.parse(q.timestamp),dateAge=(Date.parse(marketDate(now,region))-Date.parse(q.date))/86400000;
 return age>=-1000&&age<120000&&Number.isFinite(trade)&&trade<=now.getTime()+1000&&marketDate(new Date(trade),region)===q.date&&dateAge>=0&&dateAge<=10;
}
export async function loadLiveQuote(security,{origin,cloudSession=false,fetcher=(...a)=>fetch(...a)}={}){
 const url=new URL('/api/quote',origin);url.searchParams.set('region',security.region);url.searchParams.set('symbol',security.symbol);
 const r=await fetcher(url.href,{credentials:cloudSession?'same-origin':'omit',redirect:cloudSession?'manual':'follow',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(cloudSession&&(r.type==='opaqueredirect'||[0,301,302,303,307,308,401,403].includes(r.status))){const e=Error('Email 驗證已失效，請重新登入；目前顯示原盤後快照。');e.stop=true;e.auth=true;throw e;}
 if(r.status===429){const e=Error('行情額度不足，已暫停自動更新，請稍後按「更新行情」重試。');e.stop=true;throw e;}
 if(!r.ok){let data;try{data=await r.json();}catch{}const messages={MARKET_UNSUPPORTED:'目前私人來源支援台股；此市場尚未接上行情。',FUGLE_AUTH:'行情金鑰或方案無法查詢此標的。',CLOUD_KEY_REQUIRED:'請確認 Cloudflare 正式環境已設定 Fugle Key。',LOCAL_KEY_REQUIRED:'請先在自選股側欄設定本機 Fugle Key。'};throw Error(messages[data?.code]||'私人報價暫不可用，目前顯示原盤後快照。');}
 const data=await r.json();if(data.schemaVersion!==1||!usableLiveQuote(data.quote,security))throw Error('私人報價的標的、時間、幣別或來源不符，沿用原盤後快照。');return data.quote;
}
