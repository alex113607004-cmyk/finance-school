export function taipeiDate(now=new Date()){return new Date(now.getTime()+8*3600000).toISOString().slice(0,10)}
export function freshness(date,now=new Date()){
 const today=taipeiDate(now),local=new Date(now.getTime()+8*3600000),minutes=local.getUTCHours()*60+local.getUTCMinutes(),weekend=[0,6].includes(local.getUTCDay());
 if(!date)return{state:'missing',label:'資料尚未取得',today};
 if(date>today)return{state:'unexpected',label:'來源日期晚於台北今天，請核對',today};
 if(date===today)return{state:'today',label:'已取得今日資料',today};
 if(weekend)return{state:'previous',label:'週末：顯示來源最近提供的交易日',today};
 if(minutes<810)return{state:'waiting',label:'等待今日收盤資料，先顯示最近可用交易日',today};
 return{state:'pending',label:'來源尚未提供今日資料，或今日休市',today};
}
export function taipeiTime(iso){if(!iso)return'尚未成功查詢';const d=new Date(iso);if(!Number.isFinite(d.getTime()))return'日期格式未提供';return d.toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})}
export function newestData(incoming,known){
 if(!incoming)return known;if(!known)return incoming;const result={...incoming,sources:{...incoming.sources},sourceChecks:{...incoming.sourceChecks},warnings:[...(incoming.warnings||[])]};
 for(const key of ['quote','valuation','profit']){const date=x=>key==='profit'?`${x?.year||0}-${x?.quarter||0}`:x?.date||'';if(known[key]&&date(known[key])>date(incoming[key])){result[key]=known[key];const source=key==='quote'?'quotes':key;result.sources[source]=known.sources?.[source];result.sourceChecks[source]=known.sourceChecks?.[source]||known.fetchedAt;result.warnings.push(`${key==='quote'?'行情':key==='valuation'?'估值':'財報'}來源本次回傳較舊或缺少資料，保留已查核的較新期間。`);}}
 return result;
}
