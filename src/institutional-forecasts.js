import {marketDate} from './security.js';
const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export function forecastNeedsReview(estimate,check){return check?.status==='verified'?false:!!estimate.sourceReviewRequired||/已核實版本不同|識別不符|日期與已核實版本不符/.test(check?.reason||'');}
export function approvedCitation(estimate){
 try{const u=new URL(estimate.source);return estimate.usage?.mode==='public-news-fact-citation'&&estimate.usage?.reviewed===true&&estimate.usage?.scope==='individual-observation'&&u.protocol==='https:'&&['news.cnyes.com','money.udn.com'].includes(u.hostname)&&['broker','consensus-median'].includes(estimate.kind)&&dateOK(estimate.usage.reviewedOn);}catch{return false;}
}
export function forecastOptions(publication,stock,{region=stock?.region||'TW',now=new Date()}={}){
 if(!stock||['etf','etn','reit'].includes(stock.securityKind))return [];
 const today=marketDate(now,region);
 return (publication?.estimates||[]).filter(e=>e.id===region+':'+stock.code&&e.verified&&dateOK(e.asOf)&&e.asOf<=today&&(!e.publishedAt||Date.parse(e.publishedAt)<=now.getTime())&&dateOK(e.periodEnd)&&e.periodEnd>today).sort((a,b)=>a.fiscalYear-b.fiscalYear||b.asOf.localeCompare(a.asOf)||a.key.localeCompare(b.key));
}
export function defaultForecast(publication,stock,options={}){
 const region=options.region||stock?.region||'TW',now=options.now||new Date(),items=forecastOptions(publication,stock,{region,now}),today=marketDate(now,region);
 const preferredYear=Number(today.slice(0,4))+(region==='TW'&&Number(today.slice(5,7))>=7?1:0);
 const compatible=items.filter(e=>!stock.quote?.date||e.asOf<=stock.quote.date),pool=compatible.length?compatible:items;
 return items.find(e=>e.key===options.choiceKey)||pool.find(e=>e.fiscalYear===preferredYear)||pool[0]||null;
}
const text=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function verifyPublicForecast(html,estimate){
 const plain=text(html),title=text(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||''),compact=plain.replace(/\s+/g,'');
 if(!title.includes(estimate.code==='2330'?'台積電':estimate.code==='2317'?'鴻海':estimate.code==='6488'?'環球晶':estimate.code))throw Error('報導標的識別不符');
 const normalized=html.replaceAll('\\"','"'),published=normalized.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1];
 if(!published||!Number.isFinite(Date.parse(published))||marketDate(new Date(published),'TW')!==estimate.asOf)throw Error('報導日期與已核實版本不符');
 if(estimate.kind==='consensus-median'){
  if(!/factset/i.test(title)||!title.includes(estimate.code+'-TW'))throw Error('非指定 FactSet 調查報導');
  const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].slice(0,1);let found=false;
  for(const t of tables){const rows=[...t[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>text(c[1]))),head=rows[0]||[],index=head.findIndex(c=>c.startsWith(String(estimate.fiscalYear)+'年')),median=rows.find(r=>r[0]==='中位數');
   if(index>=1&&median&&Number(String(median[index]).split('(')[0].replaceAll(',',''))===estimate.eps){found=true;break;}
  }
  if(!found)throw Error('年度 EPS 中位數與已核實版本不同，需重新查核');
 }else{
  if(!compact.includes('大摩預估')||!compact.includes(estimate.fiscalYear+'年的'+estimate.eps+'元'))throw Error('具名機構年度 EPS 與已核實版本不同');
 }
 return true;
}
