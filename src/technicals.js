import {enrichHistoryRows,MA_PERIODS} from '../worker/runtime.mjs';
import {taipeiDate} from './freshness.js';

export const TECHNICAL_MODEL='均線觀察模型 1.0';
export const MA_LINES=[
 {label:'五日線',period:5,color:'#e4ba74'},
 {label:'十日線',period:10,color:'#a5a5fc'},
 {label:'週線',period:5,alias:true,color:'#e4ba74'},
 {label:'月線',period:20,color:'#7ed6cb'},
 {label:'季線',period:60,color:'#e698cb'},
 {label:'年線',period:240,color:'#9dbfe7'},
];
export function analyzeTechnicals(history,data,now=new Date()){
 const sourceRows=history?.rows||[];
 const valid=sourceRows.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')&&Number.isFinite(Date.parse(r.date))&&new Date(r.date).toISOString().slice(0,10)===r.date&&Number.isFinite(r.close)&&r.close>0);
 const sorted=[...valid].sort((a,b)=>a.date.localeCompare(b.date));
 const rows=enrichHistoryRows(sorted),last=rows.at(-1),previous=rows.at(-2),gaps=[],concerns=[];
 if(valid.length!==sourceRows.length||new Set(rows.map(r=>r.date)).size!==rows.length)gaps.push('日線有無效價格、日期或重複列，需先核對來源。');
 const metrics=MA_LINES.map(line=>{
  const value=history?.partial?null:last?.['ma'+line.period],prior=history?.partial?null:previous?.['ma'+line.period];
  return {...line,value:value??null,slope:Number.isFinite(value)&&Number.isFinite(prior)?value-prior:null,bias:Number.isFinite(value)&&value>0?(last.close/value-1)*100:null,above:Number.isFinite(value)?last.close>value:null};
 });
 if(rows.length<241)gaps.push(`目前 ${rows.length} 個有效交易日；年線及其前一日斜率需至少 241 筆，不以短期資料代替。`);
 if(history?.partial)gaps.push('歷史月份缺漏或本次更新未完整成功，不跨缺口產生綜合買進結論。');
 if(history?.refreshFailed)gaps.push('本次日線重新查詢失敗，先確認來源已恢復再判讀當下買進條件。');
 const today=taipeiDate(now),age=last?(Date.parse(today)-Date.parse(last.date))/86400000:Infinity;
 if(!Number.isFinite(age)||age<0||age>7)gaps.push('日線日期缺漏、異常或距今超過 7 個日曆日。');
 if(!last||last.date!==data?.quote?.date||last.close!==data?.quote?.close)gaps.push('均線最後收盤與個股行情未對齊。');
 const checked=Date.parse(history?.fetchedAt);
 if(!Number.isFinite(checked)||now.getTime()-checked>72*3600000||checked>now.getTime()+300000)gaps.push('日線來源超過 72 小時未成功查核或時間異常。');
 if(rows.some((r,i)=>i>0&&Math.abs(r.close/rows[i-1].close-1)>.35))gaps.push('未還原價格出現單日超過 35% 的跳變，可能涉及分割、除權或異常資料，先核對公司行動。');
 if(data?.code&&history?.code&&data.code!==history.code)gaps.push('歷史資料的股票代號與目前標的不一致。');
 const unique=metrics.filter(m=>!m.alias),above=unique.filter(m=>m.above===true).length;
 const rising=unique.filter(m=>Number.isFinite(m.slope)&&m.slope>0).length;
 const byPeriod=n=>unique.find(m=>m.period===n);
 const alignment=MA_PERIODS.every((n,i)=>i===0||byPeriod(MA_PERIODS[i-1]).value>=byPeriod(n).value);
 const bias20=byPeriod(20).bias,extended=Number.isFinite(bias20)&&bias20>10;
 if(extended)concerns.push('收盤高於月線超過 10%，觸及本模型自訂的追價觀察門檻；不代表必然回檔。');
 if(above<5)concerns.push(`價格僅站上 ${above}／5 條獨立均線；週線與五日線為同一條，不重複計入。`);
 if(rising<5)concerns.push(`僅 ${rising}／5 條均線較前一交易日上揚；斜率不是未來漲跌預測。`);
 if(!alignment)concerns.push('尚未形成 MA5 ≥ MA10 ≥ MA20 ≥ MA60 ≥ MA240 的完整排列。');
 const status=gaps.length?'insufficient':extended?'extended':above===5&&rising===5&&alignment?'support':last.close<byPeriod(60).value&&last.close<byPeriod(240).value?'caution':'mixed';
 return {version:TECHNICAL_MODEL,status,date:last?.date||null,close:last?.close||null,count:rows.length,metrics,above,rising,alignment,bias20,gaps,concerns,
 title:status==='support'?'價格、均線方向與排列同向':status==='extended'?'趨勢偏強，短線追價距離需留意':status==='caution'?'價格低於季線與年線，中長期承壓':status==='mixed'?'短中長期訊號尚未一致':'均線資料尚不足以完成判讀'};
}

export function combineAnalysis(fundamental,technical){
 const base={fundamental,technical,status:'insufficient',title:'資料未齊，暫不能形成綜合買進結論',summary:'請先核對下方基本面與均線的資料缺口。',reasons:[]};
 if(fundamental.status==='special')return {...base,status:'special',title:fundamental.title,summary:fundamental.summary,reasons:['均線只描述價格趨勢，不能補足此標的缺少的專屬基本面研究。']};
 if(fundamental.status==='caution')return {...base,status:'caution',title:'先觀望：基本面有明確警訊',summary:fundamental.summary,reasons:[...fundamental.concerns,...technical.concerns]};
 if(fundamental.status==='insufficient'||technical.status==='insufficient')return {...base,reasons:[...fundamental.criticalGaps,...technical.gaps]};
 if(fundamental.status==='candidate'&&technical.status==='support')return {...base,status:'candidate',title:'基本面與均線同向，可列入研究候選',summary:'本模型的基本面、價格位置、均線方向與排列條件均有支持；仍需核對現金流、公司行動與可承受的部位風險。',reasons:['通過四項基本面篩選。','收盤高於五條獨立均線，均線皆上揚且排列同向；月線正乖離未超過本頁 10% 觀察門檻。']};
 return {...base,status:'watch',title:'先觀察：基本面與均線尚未共同支持',summary:fundamental.status!=='candidate'?'基本面仍有估值、成長或財務條件待釐清；價格趨勢轉強也不能單獨補足。':technical.status==='extended'?'基本面通過初篩，但短線離月線較遠；先評估追價風險與進場條件。':'基本面通過初篩，但短中長期均線尚未同向；先觀察趨勢是否改善。',reasons:[...fundamental.concerns,...technical.concerns]};
}
