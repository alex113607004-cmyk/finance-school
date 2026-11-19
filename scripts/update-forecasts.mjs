import fs from 'node:fs';
import {verifyPublicForecast,forecastNeedsReview} from '../src/institutional-forecasts.js';
const file='src/generated/forward-estimates.json',cache='data/forward-estimates-cache.json',prior=JSON.parse(fs.readFileSync(file,'utf8')),now=new Date(),checks={...prior.sourceChecks},warnings=[];
try{const cached=JSON.parse(fs.readFileSync(cache,'utf8'));for(const e of prior.estimates){const old=cached.estimates?.find(p=>p.key===e.key&&p.source===e.source&&p.eps===e.eps);if(old?.sourceReviewRequired)e.sourceReviewRequired=true;if(old&&cached.sourceChecks?.[e.source])checks[e.source]=cached.sourceChecks[e.source];}}catch{}
const groups=Map.groupBy(prior.estimates,e=>e.source);
for(const [source,entries]of groups){
 try{const r=await fetch(source,{signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('HTTP '+r.status);const html=await r.text();for(const e of entries)verifyPublicForecast(html,e);checks[source]={checkedAt:now.toISOString(),status:'verified'};}
 catch(e){checks[source]={...checks[source],attemptedAt:now.toISOString(),status:'retained',reason:e.message};warnings.push('預估來源本次未能核實，保留原報導日期：'+entries[0].publisher+'（'+e.message+'）');}
}
const estimates=prior.estimates.map(e=>({...e,sourceReviewRequired:forecastNeedsReview(e,checks[e.source])}));
const next={...prior,generatedAt:now.toISOString(),estimates,sourceChecks:checks,warnings};
fs.writeFileSync(file+'.tmp',JSON.stringify(next)+'\n');fs.renameSync(file+'.tmp',file);
fs.writeFileSync(cache+'.tmp',JSON.stringify(next)+'\n');fs.renameSync(cache+'.tmp',cache);
console.log(JSON.stringify({estimates:estimates.length,stocks:new Set(estimates.map(e=>e.id)).size,warnings}));
