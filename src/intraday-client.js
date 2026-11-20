export function intradayEndpoint(origin,region,symbol){
 if(!origin)return null;
 const base=new URL(origin);
 if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname)))throw Error('分時後端必須使用 HTTPS。');
 if(base.username||base.password||base.search||base.hash||base.pathname!=='/')throw Error('分時設定只接受不含憑證的後端 origin。');
 if(!['TW','US'].includes(region)||!(/^[0-9A-Z.]{1,12}$/).test(symbol))throw Error('分時標的格式不符。');
 const url=new URL('/api/intraday',base);url.searchParams.set('region',region);url.searchParams.set('symbol',symbol);return url.href;
}
export async function loadIntraday(region,symbol,{origin='',accessPassword='',cloudSession=false,fetcher=(...a)=>fetch(...a)}={}){
 const url=intradayEndpoint(origin,region,symbol);if(!url)return null;
 const response=await fetcher(url,{credentials:cloudSession?'same-origin':'omit',redirect:cloudSession?'manual':'follow',cache:'no-store',headers:accessPassword?{Authorization:'Bearer '+accessPassword}:{},signal:AbortSignal.timeout(15000)});
 if(cloudSession&&(response.type==='opaqueredirect'||[0,301,302,303,307,308,401,403].includes(response.status))){const e=Error('Email 驗證已失效或沒有存取權，請重新登入。');e.accessRequired=true;throw e;}
 if(!response.ok){let body;try{body=await response.clone().json();}catch{}const messages={LOCAL_KEY_REQUIRED:'請先在本機設定 Fugle API Key。',CLOUD_KEY_REQUIRED:'請在 Cloudflare 保存 Fugle Key 並啟用個人使用設定。',FUGLE_AUTH:'Fugle 金鑰或方案無法查詢，請檢查金鑰設定。',NO_INTRADAY:'尚無當日有效分時資料，或來源暫時無法連線。',MARKET_UNSUPPORTED:'目前分時來源支援台股。'};if(messages[body?.code])throw Error(messages[body.code]);}
 if(response.status===401){const e=Error('私人分時存取密碼不正確，請重新輸入。');e.accessRequired=true;throw e;}
 if(response.status===503)throw Error('私人行情後端尚未完成設定。');
 if(response.status===429)throw Error('行情來源額度暫時用盡，請稍後重新整理。');
 if(!response.ok)throw Error('當日分時來源暫時無法連線。');
 const data=await response.json();
 if(data.schemaVersion!==1||data.intraday?.id!==region+':'+symbol)throw Error('當日分時來源或標的格式不符。');
 return data.intraday;
}
