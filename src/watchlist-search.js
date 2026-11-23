import {industryInfo} from './industries';
import {searchStocks} from './stock-universe';
import {searchUS} from './us-client';
import {securityId} from './security';

const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase();

// Search verified catalogs only; market is part of the identity even when symbols coincide.
export function searchWatchTargets(universe,us,query,market='all',limit=8,{industry='all'}={}){
 const q=normalize(query);
 if(!q&&industry==='all')return {items:[],hasMore:false};
 const tw=market==='US'?[]:searchStocks(universe?.stocks||{},q,{limit:limit+1,industry}).map(s=>({
  id:securityId('TW',s.code),region:'TW',code:s.code,name:s.name,description:s.company?.fullName||s.company?.english||'',market:s.market,securityKind:s.securityKind,industry:industryInfo(s,s.region||'TW'),
 }));
 const american=market==='TW'?[]:searchUS(us?.stocks||{},q,{industry}).map(s=>({
  id:securityId('US',s.code),region:'US',code:s.code,name:s.nameZh||s.name,description:s.nameZh?s.name:'',market:s.market,securityKind:s.securityKind,industry:industryInfo(s,'US'),
 }));
 const score=s=>normalize(s.code)===q?0:normalize(s.name)===q?1:normalize(s.code).startsWith(q)?2:normalize(s.name).startsWith(q)?3:4;
 const matches=[...tw,...american].sort((a,b)=>score(a)-score(b)||a.id.localeCompare(b.id));
 return {items:matches.slice(0,limit),hasMore:matches.length>limit};
}
