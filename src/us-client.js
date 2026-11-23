import {matchesIndustry} from './industries';
export async function loadUSPublication({fetcher=fetch,baseUrl=document.baseURI}={}){
 const response=await fetcher(new URL('us-data.json',baseUrl),{cache:'no-store'});
 if(!response.ok)throw Error(`美股資料服務 HTTP ${response.status}`);
 const value=await response.json();
 if(value.schemaVersion!==1||!value.stocks?.['US:AAPL']||value.stocks['US:AAPL'].region!=='US')throw Error('美股快照格式或市場識別不符。');
 return value;
}
export function searchUS(stocks,query,{industry='all'}={}){const q=query.trim().toLocaleLowerCase();return Object.values(stocks).filter(s=>matchesIndustry(s,industry,'US')&&(!q||[s.code,s.name,s.nameZh,s.cik].some(v=>String(v||'').toLocaleLowerCase().includes(q))));}
