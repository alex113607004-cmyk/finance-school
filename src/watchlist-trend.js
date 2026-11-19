import {marketDate} from './security.js';
const positive=n=>Number.isFinite(n)&&n>0;
const https=u=>{try{return new URL(u).protocol==='https:';}catch{return false;}};
export function watchTrend(stock,_history,{region='TW',now=new Date()}={}){
 const missing=note=>({mode:'missing',label:'當日分時尚未提供',note:note||'需要當日分鐘成交資料；不以日線或開高低收代替。'});
 const data=stock?.intraday,today=marketDate(now,region);
 if(!data)return missing();
 if(data.id!==region+':'+stock.code||data.date!==today)return missing('分時標的或交易日不符；舊交易日不標成今日走勢。');
 if(data.currency!==(stock.currency||stock.quote?.currency||(region==='TW'?'TWD':'USD'))||!data.publicDisplayAllowed||!https(data.source)||data.basis!=='unadjusted'||!data.regularSession)return missing('分時來源、展示條件、幣別或價格口徑尚未確認。');
 const start=Date.parse(data.sessionStart),end=Date.parse(data.sessionEnd),zone=region==='US'?'America/New_York':'Asia/Taipei';
 const clock=t=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(t));
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||marketDate(new Date(start),region)!==today||marketDate(new Date(end),region)!==today||clock(start)!==(region==='US'?'09:30':'09:00')||clock(end)!==(region==='US'?'16:00':'13:30'))return missing('尚無有效的當日正常交易時段。');
 if(!positive(data.open))return missing('當日開盤價尚未取得，無法繪製開盤基準線。');
 if(!Array.isArray(data.rows)||data.rows.length<2)return missing('當日成交資料不足兩筆，等待分時資料。');
 const points=data.rows.map(r=>({time:Date.parse(r.time),value:r.price}));
 if(!points.every((p,i)=>Number.isFinite(p.time)&&p.time>=start&&p.time<=end&&p.time<=now.getTime()&&positive(p.value)&&(!i||p.time>points[i-1].time)))return missing('分時時間或價格無效，暫停繪製。');
 return {mode:'intraday',label:'今日分時',points,open:data.open,start,end,date:today,currency:data.currency,source:data.source,provider:data.provider||'分時來源',intervalMinutes:data.intervalMinutes||1,lastTime:points.at(-1).time,note:'當日正常盤分鐘收盤價快照；虛線為當日開盤價，不是昨收。'};
}
export function miniGeometry(trend){
 const values=[trend.open,...trend.points.map(p=>p.value)],min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.12,max*.0005),lo=min-pad,hi=max+pad;
 const x=t=>4+(t-trend.start)/(trend.end-trend.start)*112,y=v=>35-(v-lo)/(hi-lo)*30;
 return {x,y,openY:y(trend.open),path:trend.points.map((p,i)=>(i?'L':'M')+x(p.time).toFixed(2)+' '+y(p.value).toFixed(2)).join(' ')};
}
