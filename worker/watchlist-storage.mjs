import {watchEntry,WATCHLIST_LIMIT} from '../shared/watchlist-schema.mjs';
const empty=()=>({schemaVersion:1,revision:0,items:[],updatedAt:null,processed:[]});
const validId=id=>typeof id==='string'&&/^(TW:[0-9A-Z]{4,6}|US:[A-Z][A-Z0-9.-]{0,9})$/.test(id);
export function watchOperation(op){
 if(!op||typeof op.opId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(op.opId))return null;
 if(op.type==='remove'&&validId(op.id))return {opId:op.opId,type:'remove',id:op.id};
 const entry=op.type==='add'&&watchEntry(op.entry);return entry?{opId:op.opId,type:'add',entry}:null;
}
const publicState=state=>({schemaVersion:1,revision:state.revision,items:state.items,updatedAt:state.updatedAt});
export function createWatchlistStorage(storage,{now=()=>new Date()}={}){
 return {async fetch(request){
  const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
  if(request.method==='GET')return reply(publicState(await storage.get('watchlist')||empty()));
  if(request.method!=='POST')return reply({code:'METHOD_NOT_ALLOWED'},405);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({code:'INVALID_CONTENT_TYPE'},415);
  const text=await request.text();if(text.length>80000)return reply({code:'TOO_LARGE'},413);
  let input;try{input=JSON.parse(text);}catch{return reply({code:'INVALID_OPERATIONS'},400);}
  const ops=Array.isArray(input.operations)&&input.operations.map(watchOperation);
  if(!ops||!ops.length||ops.length>200||ops.some(op=>!op))return reply({code:'INVALID_OPERATIONS'},400);
  return storage.transaction(async txn=>{
   const state=await txn.get('watchlist')||empty(),seen=new Set(state.processed),items=new Map(state.items.map(e=>[e.id,e]));let changed=false;
   for(const op of ops){if(seen.has(op.opId))continue;changed=true;seen.add(op.opId);if(op.type==='remove')items.delete(op.id);else if(!items.has(op.entry.id))items.set(op.entry.id,op.entry);}
   if(items.size>WATCHLIST_LIMIT)return reply({...publicState(state),code:'WATCHLIST_LIMIT',error:'雲端清單最多 100 檔，請先移除部分標的。'},409);
   const next=changed?{...state,items:[...items.values()],revision:state.revision+1,updatedAt:now().toISOString(),processed:[...seen].slice(-1000)}:state;
   if(changed)await txn.put('watchlist',next);
   return reply(publicState(next));
  });
 }};
}
