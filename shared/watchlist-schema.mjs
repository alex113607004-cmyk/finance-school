export const WATCHLIST_KEY='finance-school.watchlist.v1';
export const WATCHLIST_BACKUP_KEY='finance-school.watchlist.recovery.v1';
export const WATCHLIST_LIMIT=100;
export function watchEntry(input,now=new Date()){
 if(!input||!['TW','US'].includes(input.region))return null;
 const symbol=String(input.symbol??input.code??'').trim().toUpperCase();
 if(!(input.region==='TW'?/^[0-9A-Z]{4,6}$/:/^[A-Z][A-Z0-9.-]{0,9}$/).test(symbol))return null;
 const id=`${input.region}:${symbol}`;
 if(input.id!==undefined&&input.id!==id)return null;
 const addedAt=input.addedAt===undefined?now.toISOString():input.addedAt;
 if(typeof addedAt!=='string'||!Number.isFinite(Date.parse(addedAt)))return null;
 return {id,region:input.region,symbol,name:String(input.name||symbol).trim().slice(0,100),addedAt};
}
export function decodeWatchlist(raw){
 if(raw===null)return {items:[],corrupt:false};
 try{
  const data=JSON.parse(raw);if(data?.schemaVersion!==1||!Array.isArray(data.items))throw Error();
  const seen=new Set(),items=[];let corrupt=data.items.length>WATCHLIST_LIMIT;
  for(const input of data.items){const entry=watchEntry(input);if(!entry){corrupt=true;continue;}if(!seen.has(entry.id)&&items.length<WATCHLIST_LIMIT){seen.add(entry.id);items.push(entry);}}
  return {items,corrupt};
 }catch{return {items:[],corrupt:true};}
}
