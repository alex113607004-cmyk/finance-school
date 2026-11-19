export function intradayEndpoint(origin,region,symbol){
 if(!origin)return null;
 const base=new URL(origin);
 if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname)))throw Error('分時後端必須使用 HTTPS。');
 if(base.username||base.password||base.search||base.hash||base.pathname!=='/')throw Error('分時設定只接受不含憑證的後端 origin。');
 if(!['TW','US'].includes(region)||!(/^[0-9A-Z.]{1,12}$/).test(symbol))throw Error('分時標的格式不符。');
 const url=new URL('/api/intraday',base);url.searchParams.set('region',region);url.searchParams.set('symbol',symbol);return url.href;
}
export async function loadIntraday(region,symbol,{origin='',fetcher=(...a)=>fetch(...a)}={}){
 const url=intradayEndpoint(origin,region,symbol);if(!url)return null;
 const response=await fetcher(url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('當日分時來源暫時無法連線。');
 const data=await response.json();
 if(data.schemaVersion!==1||data.intraday?.id!==region+':'+symbol)throw Error('當日分時來源或標的格式不符。');
 return data.intraday;
}
