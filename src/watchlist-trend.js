import {marketDate} from './security';
export function watchTrend(stock,history,{region='TW',now=new Date()}={}){
 const quote=stock?.quote||{},today=marketDate(now,region),intraday=stock?.intraday,price=quote.price??quote.close;
 const dateLabel=quote.date===today?'今日':quote.date||'日期待確認';
 const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!dateOK(quote.date)||quote.date>today)return {mode:'missing',label:'走勢日期待確認',note:'沒有有效日期，不繪製價格走勢。'};
 if(intraday?.id===region+':'+stock.code&&intraday.date===quote.date&&intraday.currency===(quote.currency||(region==='TW'?'TWD':'USD'))&&intraday.publicDisplayAllowed&&intraday.source&&Array.isArray(intraday.rows)&&intraday.rows.length>=2){
  const points=intraday.rows.map(r=>({time:Date.parse(r.time),value:r.price}));
  if(points.every((p,i)=>Number.isFinite(p.time)&&p.time<=now.getTime()&&marketDate(new Date(p.time),region)===quote.date&&Number.isFinite(p.value)&&p.value>0&&(!i||p.time>points[i-1].time)))return {mode:'intraday',label:dateLabel+'分時',points,source:intraday.source};
 }
 const historyMatches=(!history?.code||history.code===stock.code)&&(!history?.region||history.region===region);
 const rows=(historyMatches?history?.rows||[]:[]).filter(r=>dateOK(r.date)&&r.date<=quote.date&&Number.isFinite(r.close)&&r.close>0).slice(-20);
 if(rows.length>=2&&new Set(rows.map(r=>r.date)).size===rows.length&&rows.every((r,i)=>!i||r.date>rows[i-1].date))return {mode:'daily',label:'近 '+rows.length+' 交易日',points:rows.map(r=>({time:Date.parse(r.date),value:r.close})),from:rows[0].date,to:rows.at(-1).date,source:rows.at(-1).source||stock.sources?.quotes,note:'今日分時尚未接入；此圖為每日收盤走勢。'};
 if([quote.open,quote.high,quote.low,price].every(n=>Number.isFinite(n)&&n>0)&&quote.high>=Math.max(quote.open,price)&&quote.low<=Math.min(quote.open,price)&&quote.date<=today)return {mode:'range',label:dateLabel+'高低區間',low:quote.low,high:quote.high,open:quote.open,close:price,note:'顯示開高低收位置，並非分時走勢。'};
 return {mode:'missing',label:'分時尚未提供',note:'尚無可公開展示的今日分時資料。'};
}
