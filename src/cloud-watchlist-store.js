import {WATCHLIST_KEY,WATCHLIST_BACKUP_KEY,WATCHLIST_LIMIT,watchEntry,decodeWatchlist} from './watchlist-store';
import {watchOperation} from '../worker/watchlist-storage.mjs';
export const CLOUD_WATCHLIST_KEY='finance-school.cloud-watchlist.v1';
export function createCloudWatchlistStore({fetcher=(...a)=>fetch(...a),getStorage=()=>localStorage,target=typeof window==='undefined'?null:window,now=()=>new Date(),uuid=()=>crypto.randomUUID(),visible=()=>typeof document==='undefined'||document.visibilityState!=='hidden',pollMs=30000}={}){
 const visibilityTarget=target?.document;
 const listeners=new Set();let initialized=false,pending=[],timer=null,inflight=null,remote=[],version=-1;
 const read=()=>{try{return getStorage();}catch{return null;}};
 let storage=read(),initial=[];try{const raw=storage?.getItem(WATCHLIST_KEY)??null,decoded=decodeWatchlist(raw);initial=decoded.items;if(decoded.corrupt&&raw!==null)storage?.setItem(WATCHLIST_BACKUP_KEY,raw);}catch{}
 try{const saved=JSON.parse(storage?.getItem(CLOUD_WATCHLIST_KEY)||'null');if(saved?.schemaVersion===1){initialized=!!saved.initialized;pending=(saved.pending||[]).map(watchOperation).filter(Boolean);}}catch{}
 const apply=(items,ops=pending)=>{const all=new Map(items.map(e=>[e.id,e]));for(const op of ops){if(op.type==='remove')all.delete(op.id);else if(!all.has(op.entry.id))all.set(op.entry.id,op.entry);}return [...all.values()];};
 let state=Object.freeze({items:initial,persistent:!!storage,cloud:true,syncState:'syncing',pendingCount:pending.length,lastSyncedAt:null,error:'',inputError:'',message:'正在同步雲端自選股…'});
 const publish=patch=>{state=Object.freeze({...state,...patch,items:Object.freeze((patch.items||state.items).map(e=>Object.freeze({...e}))),pendingCount:pending.length});for(const fn of listeners)fn();};
 function persist(){try{storage=read();if(!storage)throw Error();storage.setItem(WATCHLIST_KEY,JSON.stringify({schemaVersion:1,items:state.items}));storage.setItem(CLOUD_WATCHLIST_KEY,JSON.stringify({schemaVersion:1,initialized,pending}));return true;}catch{return false;}}
 function readPending(){try{const saved=JSON.parse(read()?.getItem(CLOUD_WATCHLIST_KEY)||'null');if(saved?.schemaVersion===1){initialized=initialized||!!saved.initialized;const merged=new Map([...pending,...(saved.pending||[]).map(watchOperation).filter(Boolean)].map(op=>[op.opId,op]));pending=[...merged.values()];}}catch{}}
 async function request(operations){
  const response=await fetcher('/api/watchlist',{method:operations?'POST':'GET',credentials:'same-origin',redirect:'manual',cache:'no-store',...(operations?{headers:{'Content-Type':'application/json'},body:JSON.stringify({operations})}:{}),signal:AbortSignal.timeout(15000)});
  if(response.type==='opaqueredirect'||[0,301,302,303,307,308,401,403].includes(response.status)){const e=Error('Email 驗證已失效，重新登入後才能同步；此裝置收藏仍保留。');e.auth=true;throw e;}
  if(response.status===409)throw Error('雲端合併後超過 100 檔，請移除部分標的，再重試同步。');
  if(response.status===503)throw Error('雲端收藏儲存暫不可用；變更已保留，請稍後重試同步。');
  if(!response.ok)throw Error('雲端同步失敗，變更已保留，請重試同步。');
  const data=await response.json(),decoded=decodeWatchlist(JSON.stringify(data));
  if(data.schemaVersion!==1||!Number.isSafeInteger(data.revision)||data.revision<0||decoded.corrupt||!Array.isArray(data.items))throw Error('雲端收藏格式異常，保留此裝置資料。');
  return {...data,items:decoded.items};
 }
 function accept(data){if(data.revision>=version){remote=data.items;version=data.revision;}publish({items:apply(remote)});persist();}
 function sync(){
  if(inflight)return inflight;
  publish({syncState:'syncing',error:'',message:'正在同步雲端自選股…'});
  inflight=(async()=>{
   try{
    readPending();const data=await request();
    if(!initialized){const ids=new Set([...data.items.map(e=>e.id),...pending.filter(o=>o.type==='add').map(o=>o.entry.id)]),removed=new Set(pending.filter(o=>o.type==='remove').map(o=>o.id));const seeds=[];for(const entry of state.items)if(!ids.has(entry.id)&&!removed.has(entry.id)){seeds.push({opId:uuid(),type:'add',entry});ids.add(entry.id);}pending=[...seeds,...pending];initialized=true;}
    accept(data);
    while(pending.length){const batch=pending.slice(0,200),result=await request(batch),done=new Set(batch.map(op=>op.opId));pending=pending.filter(op=>!done.has(op.opId));accept(result);}
    publish({syncState:'synced',lastSyncedAt:now().toISOString(),error:'',message:'已同步雲端自選股',persistent:true});persist();
   }catch(e){publish({syncState:e.auth?'auth-required':'offline',error:e.message||'雲端同步失敗，變更保留在此裝置。',message:'收藏變更待同步'});if(!persist()&&pending.length)publish({persistent:false,error:'雲端同步及瀏覽器儲存均不可用，變更僅在此分頁暫存；請保留分頁並重試同步。'});}
   finally{inflight=null;}
  })();return inflight;
 }
 function add(input){const entry=watchEntry(input,now());if(!entry){publish({inputError:'股票識別不符，請從支援的搜尋結果或個股頁加入。'});return false;}readPending();if(state.items.some(e=>e.id===entry.id))return true;if(state.items.length>=WATCHLIST_LIMIT){publish({inputError:'自選清單最多 100 檔，請先移除其他標的。'});return false;}pending.push({opId:uuid(),type:'add',entry});publish({items:[...state.items,entry],inputError:'',message:`已加入 ${entry.symbol}，正在同步…`});persist();sync();return true;}
 function remove(id){if(!state.items.some(e=>e.id===id))return true;readPending();pending.push({opId:uuid(),type:'remove',id});publish({items:state.items.filter(e=>e.id!==id),inputError:'',message:`已移除 ${id.split(':').at(-1)}，正在同步…`});persist();sync();return true;}
 const refresh=()=>{if(visible())sync();};
 function changed(e){if(e?.key===CLOUD_WATCHLIST_KEY||e?.key===WATCHLIST_KEY){readPending();refresh();}}
 function subscribe(fn){listeners.add(fn);if(listeners.size===1){target?.addEventListener('focus',refresh);target?.addEventListener('online',refresh);visibilityTarget?.addEventListener('visibilitychange',refresh);target?.addEventListener('storage',changed);timer=setInterval(refresh,pollMs);sync();}return()=>{listeners.delete(fn);if(!listeners.size){clearInterval(timer);target?.removeEventListener('focus',refresh);target?.removeEventListener('online',refresh);visibilityTarget?.removeEventListener('visibilitychange',refresh);target?.removeEventListener('storage',changed);}};}
 return {getSnapshot:()=>state,subscribe,add,remove,retry:sync,sync,dismissInputError:()=>publish({inputError:''})};
}
