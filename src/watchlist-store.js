import {WATCHLIST_KEY,WATCHLIST_BACKUP_KEY,WATCHLIST_LIMIT,watchEntry,decodeWatchlist} from '../shared/watchlist-schema.mjs';
export {WATCHLIST_KEY,WATCHLIST_BACKUP_KEY,WATCHLIST_LIMIT,watchEntry,decodeWatchlist} from '../shared/watchlist-schema.mjs';
export function createWatchlistStore({getStorage=()=>window.localStorage,target=typeof window==='undefined'?null:window,now=()=>new Date()}={}){
 let snapshot;const listeners=new Set(),pending=new Map();
 function disk(){try{const storage=getStorage();if(!storage)throw Error();const raw=storage.getItem(WATCHLIST_KEY);return {storage,raw,...decodeWatchlist(raw)};}catch{return {items:snapshot?.items||[],unavailable:true};}}
 const initial=disk();
 const freeze=s=>Object.freeze({...s,items:Object.freeze(s.items.map(x=>Object.freeze({...x})))});
 const storageMessage='自選清單目前只在此分頁暫存，關閉後可能遺失。請允許瀏覽器儲存，或釋放儲存空間後重試。';
 const corruptMessage='部分自選資料格式異常，原資料仍保留。重試儲存時會先備份原資料。';
 snapshot=freeze({items:initial.items,persistent:!initial.unavailable&&!initial.corrupt,error:initial.unavailable?storageMessage:initial.corrupt?corruptMessage:'',inputError:'',message:''});
 function publish(next){snapshot=freeze(next);listeners.forEach(fn=>fn());}
 function apply(items,operations=pending){const all=new Map(items.map(e=>[e.id,e]));for(const [id,op]of operations){if(op.remove)all.delete(id);else if(!all.has(id))all.set(id,op.entry);else all.set(id,{...all.get(id),name:op.entry.name});}return [...all.values()];}
 function persist(d,items,message){
  if(items.length>WATCHLIST_LIMIT){publish({items,persistent:false,error:'其他分頁的變更使清單超過 100 檔；請先移除部分標的，再儲存此分頁的變更。',inputError:'',message:'變更暫存於此分頁'});return false;}
  try{
   if(d.unavailable||!d.storage)throw Error();
   if(d.corrupt&&d.raw!==null)d.storage.setItem(WATCHLIST_BACKUP_KEY,d.raw);
   d.storage.setItem(WATCHLIST_KEY,JSON.stringify({schemaVersion:1,items}));
   pending.clear();publish({items,persistent:true,error:'',inputError:'',message:message+(d.corrupt?'；原有格式異常資料已保留備份。':'')});return true;
  }catch{publish({items,persistent:false,error:storageMessage,inputError:'',message:message+'（僅此分頁暫存）'});return false;}
 }
 function add(input){
  const entry=watchEntry(input,now());if(!entry){publish({...snapshot,inputError:'股票識別不符，請從支援的搜尋結果或個股頁加入。'});return false;}
  const d=disk(),items=apply(d.items);
  if(items.some(x=>x.id===entry.id)){if(pending.size||!snapshot.persistent||d.corrupt||d.unavailable)return persist(d,items,'已儲存自選清單');publish({...snapshot,items,inputError:'',message:`${entry.symbol} 已在自選清單`});return true;}
  if(items.length>=WATCHLIST_LIMIT){publish({...snapshot,inputError:`自選清單最多 ${WATCHLIST_LIMIT} 檔，請先移除其他標的。`});return false;}
  pending.set(entry.id,{entry});return persist(d,apply(d.items),`已加入 ${entry.symbol} ${entry.name}`);
 }
 function remove(id){if(typeof id!=='string'||!snapshot.items.some(e=>e.id===id))return true;const d=disk();pending.set(id,{remove:true});return persist(d,apply(d.items),`已移除 ${id.split(':').at(-1)}`);}
 function retry(){const d=disk();return persist(d,apply(d.items),'自選清單已儲存在此瀏覽器');}
 function synchronize(event){
  if(event?.type==='storage'&&event.key!==null&&event.key!==WATCHLIST_KEY)return;
  const d=disk();if(event?.storageArea&&d.storage&&event.storageArea!==d.storage)return;
  const items=apply(d.items),persistent=!pending.size&&!d.unavailable&&!d.corrupt,error=d.unavailable?storageMessage:d.corrupt?corruptMessage:pending.size?storageMessage:'';
  if(JSON.stringify(items)===JSON.stringify(snapshot.items)&&persistent===snapshot.persistent&&error===snapshot.error)return;
  publish({...snapshot,items,persistent,error,inputError:'',message:pending.size?snapshot.message:'已同步此瀏覽器的自選清單'});
 }
 function subscribe(callback){listeners.add(callback);if(listeners.size===1){target?.addEventListener('storage',synchronize);target?.addEventListener('focus',synchronize);synchronize();}return()=>{listeners.delete(callback);if(!listeners.size){target?.removeEventListener('storage',synchronize);target?.removeEventListener('focus',synchronize);}};}
 return {subscribe,getSnapshot:()=>snapshot,add,remove,retry,dismissInputError:()=>publish({...snapshot,inputError:''})};
}
