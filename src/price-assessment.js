import {dailyAverages,validCandle} from './stock-analysis.js';
import {marketDate,quoteStatus} from './security.js';
import {format} from './domain.js';
import {cashflowView} from './tw-cashflow.js';
const finite=Number.isFinite;
const fundKinds=['etf','etn','reit'];
const age=(date,today)=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&finite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date?(Date.parse(today)-Date.parse(date))/86400000:Infinity;
const kindOf=stock=>stock.securityKind||'stock';
const position=(price,low,high)=>price<low?'below':price>high?'above':'within';
const sourceList=metric=>[...new Set((metric?.sources||[]).map(s=>s.source).filter(Boolean))];

export function assessTechnicals(stock,history,{region='TW',now=new Date()}={}){
 const quote=stock?.quote,price=quote?.price??quote?.close,live=quote?.kind==='live-snapshot',status=quoteStatus(quote,{region,now}),rows=history?.rows||[],reasons=[];
 if(!status.usable)reasons.push(status.reason||'沒有有效行情。');
 if(history?.partial||history?.refreshFailed)reasons.push('日線更新不完整，暫停技術面判讀。');
 if(history?.code&&history.code!==stock?.code||history?.region&&history.region!==region||region==='TW'&&history?.market&&history.market!==stock?.market)reasons.push('歷史資料的市場或股票識別不一致。');
 if(history?.currency&&quote?.currency&&history.currency!==quote.currency)reasons.push('行情與歷史日線幣別不一致。');
 if(history?.adjustment&&!['unadjusted','split-adjusted','dividend-and-split-adjusted'].includes(history.adjustment))reasons.push('價格調整口徑未確認。');
 if(rows.some(r=>!validCandle(r)||!finite(age(r.date,marketDate(now,region))))||new Set(rows.map(r=>r.date)).size!==rows.length)reasons.push('日線有無效欄位或重複日期。');
 const days=dailyAverages(rows),last=days.at(-1),prior=days.at(-2);
 if(!last||(live?(last.date>quote?.date||age(last.date,quote?.date)>10):(last.date!==quote?.date||last.close!==price)))reasons.push('最後一筆日線與目前行情的日期或價格未對齊。');
 if(rows.length<20)reasons.push(`只有 ${rows.length} 筆日線，MA20 至少需要 20 筆。`);
 const base={available:false,title:'技術面資料不足',reasons:[...new Set(reasons)],metrics:[],count:rows.length,volumeRatio:null,trend:'unavailable'};
 if(reasons.length)return base;
 const metrics=[5,20,60].map(n=>({period:n,value:last['ma'+n],prior:prior?.['ma'+n]??null,slope:finite(last['ma'+n])&&finite(prior?.['ma'+n])?last['ma'+n]-prior['ma'+n]:null,bias:finite(last['ma'+n])?(price/last['ma'+n]-1)*100:null,rows:days.slice(-n),complete:finite(last['ma'+n])}));
 const complete=metrics.every(m=>m.complete&&finite(m.slope)),[ma5,ma20,ma60]=metrics;
 const rising=complete&&price>ma5.value&&ma5.value>ma20.value&&ma20.value>ma60.value&&metrics.every(m=>m.slope>0);
 const falling=complete&&price<ma5.value&&ma5.value<ma20.value&&ma20.value<ma60.value&&metrics.every(m=>m.slope<0);
 const flat=complete&&metrics.every(m=>m.slope===0),trend=rising?'rising':falling?'falling':flat?'flat':complete?'mixed':'partial';
 const volumeDays=days.slice(-21,-1),volumeBase=!live&&volumeDays.length===20?volumeDays.reduce((s,r)=>s+r.volume,0)/20:null;
 return {...base,available:true,date:last.date,price,metrics,trend,live,averageBasis:'已完成盤後日線',title:{rising:'短中期均線與價格同向偏強',falling:'短中期均線與價格同向偏弱',flat:'均線走平，暫無方向優勢',mixed:'短中期訊號尚未一致',partial:'部分均線可用，長度仍不足'}[trend],bias20:ma20.bias,volumeRatio:volumeBase>0?last.volume/volumeBase:null,volumeBase,volumeDays,volume:last.volume,reason:live?`現價比較 ${last.date} 已完成的日均線；盤中整股量不與歷史全日量混算。`:complete?null:'完整 MA60 方向比較需至少 61 個有效交易日。'};
}

// Financial observations describe reported facts; they do not award an invented
// buy score or treat profitability/momentum as proof of an inexpensive price.
export function assessFundamentals(stock,{snapshot,region='TW',now=new Date()}={}){
 const today=marketDate(now,region),rows=[],gaps=[],risks=[];
 const add=(key,label,{value=null,text='',period='',sources=[],available=true,caution=false,reason='',unit=''}={})=>{
  const row={key,label,value,text,period,sources:[...new Set(sources.filter(Boolean))],available,caution,reason,unit};rows.push(row);if(!available)gaps.push(`${label}：${reason}`);else if(caution)risks.push(`${label}：${text}`);return row;
 };
 if(fundKinds.includes(kindOf(stock)))return {kind:'fund',rows,gaps:['基金需使用同日淨值、折溢價、成分、費用與追蹤差異；不套公司 EPS 模型。'],risks,title:'基金需採專用指標',available:false};
 const financial=stock.fundamentals?.kind==='financial';
 if(region==='US'&&!snapshot?.available)return {kind:'company',rows,gaps:[snapshot?.reason||'尚無已核實 SEC 季度財報與直接四季稀釋 EPS。'],risks,title:'基本面資料不足',available:false};
 if(snapshot?.available){
  const m=snapshot.metrics||{},ttm=snapshot.ttm;
  const freshMetric=(key,label,unit='%',caution=v=>v<0)=>{
   const metric=m[key],fresh=metric?.available&&age(metric.end,today)>=0&&age(metric.end,today)<=200;
   return add(key,label,{available:!!fresh,value:metric?.value,unit,text:fresh?`${format(unit.includes('百萬元')?metric.value/1e6:metric.value)} ${unit}`:'',period:metric?.start?`${metric.start} ～ ${metric.end} · 公告 ${metric.filed||'未核實'}`:'',sources:sourceList(metric),caution:fresh&&caution(metric.value),reason:metric?.available?'財報期間過舊、在未來或缺少日期。':metric?.reason||'缺少已核實數值。'});
  };
  const epsFresh=ttm?.available&&age(ttm.latest?.periodEnd,today)>=0&&age(ttm.latest?.periodEnd,today)<=200;
  add('eps','近四季稀釋 EPS',{available:!!epsFresh,value:ttm?.eps,unit:(m.revenue?.currency||stock.currency||'TWD')+'／股',text:epsFresh?`${format(ttm.eps)} ${m.revenue?.currency||stock.currency||'TWD'}／股`:'',period:epsFresh?`${ttm.reports[0]?.periodStart} ～ ${ttm.latest.periodEnd}`:'',sources:ttm?.reports?.map(r=>r.source),caution:epsFresh&&ttm.eps<=0,reason:ttm?.available?'四季涵蓋期間過舊或未核實。':ttm?.reason||'連續四季直接稀釋 EPS 尚未齊全。'});
  const growth=m.revenueYoY;
  if(growth?.available&&growth.current&&growth.prior){
   const c=growth.current,p=growth.prior,fresh=age(c.end,today)>=0&&age(c.end,today)<=200;
   add('revenue','季度營收年增',{available:fresh,value:growth.value,unit:'%',text:`${format(growth.value)}%`,period:`${c.start} ～ ${c.end}，對照 ${p.start} ～ ${p.end}`,sources:[...sourceList(c),...sourceList(p)],caution:growth.value<0,reason:'本期財報日期過舊或異常。'});
  }else add('revenue','季度營收年增',{available:false,reason:growth?.reason||'缺少同期可比資料。'});
  const net=snapshot.comparisons?.netIncome;
  if(net?.available){const c=net.current,p=net.prior,fresh=age(c.end,today)>=0&&age(c.end,today)<=200;add('netIncomeGrowth','季度淨利年增',{available:fresh,value:net.value,unit:'%',text:`${format(net.value)}%`,period:`${c.start} ～ ${c.end}，對照 ${p.start} ～ ${p.end}`,sources:[...sourceList(c),...sourceList(p)],caution:net.value<0,reason:'淨利比較期過舊或異常。'});}
  else if(m.netIncome?.available)freshMetric('netIncome','季度淨利',(m.netIncome.currency||stock.currency||'TWD')+' 百萬元');
  freshMetric('operatingMargin','營業利益率');
  for(const [key,label]of [['operatingCashFlow','營業現金流'],['freeCashFlow','自由現金流']])freshMetric(key,label,(m[key]?.currency||stock.currency||'TWD')+' 百萬元');
  if(rows.find(r=>r.key==='freeCashFlow')?.available&&snapshot.comparisons?.freeCashFlow?.available&&snapshot.comparisons.freeCashFlow.value<0)risks.push(`自由現金流較去年同季減少 ${format(-snapshot.comparisons.freeCashFlow.value)}%，需核對資本支出與收付款時點。`);
 }else{
  const f=stock.fundamentals||{},e=f.earnings,r=f.revenue,p=stock.profit,b=f.balance;
  const freshEPS=finite(e?.epsYtd)&&age(e?.period?.end,today)>=0&&age(e?.period?.end,today)<=200;
  add('eps','累計基本 EPS',{available:freshEPS,value:e?.epsYtd,unit:'TWD／股',text:`${format(e?.epsYtd)} TWD／股（非近四季）`,period:e?.period?.label||'',sources:[stock.sources?.earnings],caution:freshEPS&&e.epsYtd<=0,reason:'缺少新近、期間明確的累計 EPS。'});
  gaps.push('尚無可核實連續四季稀釋 EPS；不將累計 EPS 年化，也不從官方本益比倒推。');
  const match=r?.month?.match(/^(\d{4})-(\d{2})$/),monthAge=match?(Number(today.slice(0,4))-Number(match[1]))*12+Number(today.slice(5,7))-Number(match[2]):Infinity;
  const growthFresh=!!match&&Number(match[2])>=1&&Number(match[2])<=12&&monthAge>=0&&monthAge<=2&&finite(r.yoy);
  add('revenue','單月營收年增',{available:growthFresh,value:r?.yoy,unit:'%',text:`${format(r?.yoy)}%${finite(r?.ytdGrowth)?`；年初累計 ${format(r.ytdGrowth)}%`:''}`,period:r?.month||'',sources:[stock.sources?.revenue],caution:growthFresh&&(r.yoy<0||finite(r.ytdGrowth)&&r.ytdGrowth<0),reason:'月份過舊、異常或未提供年增數值。'});
  if(!financial){
   const same=!!e?.period&&p?.year===e.period.year&&p?.quarter===e.period.quarter;
   add('margin','營業利益率',{available:!!same&&freshEPS&&finite(p?.operating),value:p?.operating,unit:'%',text:`${format(p?.operating)}%（年初累計）`,period:p?.period||'',sources:[stock.sources?.earnings,stock.sources?.profit],caution:finite(p?.operating)&&p.operating<=0,reason:'損益期間未對齊、過舊或未提供。'});
   const freshBalance=age(b?.period?.end,today)>=0&&age(b?.period?.end,today)<=200;
   add('balance','負債與流動性',{available:freshBalance&&finite(b?.debtRatio)&&finite(b?.currentRatio),text:`負債比 ${format(b?.debtRatio)}%；流動比 ${format(b?.currentRatio)}%`,period:b?.period?.label||'',sources:[stock.sources?.balance],caution:freshBalance&&finite(b?.equity)&&b.equity<=0,reason:'缺少新近、期間明確的資產負債表。'});
  }else gaps.push('金融業須核對 ROE、資本適足與資產品質；不套一般業毛利或流動比率門檻。');
  const cash=cashflowView(stock,now),period=cash.available?`${cash.periodStart} ～ ${cash.periodEnd}（年初累計）`:'';
  for(const [key,label,field]of [['cash','營業現金流','amount'],['capex','現金設備支出','capex'],['freeCashFlow','自由現金流','freeCashFlow']]){
   const available=cash.available&&finite(cash[field]);
   add(key,label,{available,value:cash[field],unit:'TWD 百萬元',text:available?`${format(cash[field]/1000)} TWD 百萬元（年初累計）`:'',period,sources:[cash.source],caution:available&&field!=='capex'&&cash[field]<0,reason:cash.reason||'來源未提供此項可核實數字。'});
  }
  if(cash.available)gaps.push('現金流來源未列首次公告日；只供最新基本面觀察，不納入歷史 EPS 估值。');
  if(cash.retained||cash.checkOverdue)gaps.push('現金流來源沿用前次資料或超過 8 天未重新查核，請回查原始版本。');
 }
 const count=rows.filter(r=>r.available).length;
 return {kind:financial?'financial':'company',rows,gaps:[...new Set(gaps)],risks:[...new Set(risks)],available:count>0,title:!count?'基本面資料不足':risks.length?'基本面有需核對的風險':gaps.length?'部分基本面可用，現金品質仍待核對':'已公告基本面可供核對'};
}

export function assessPeer(stock,{region='TW',now=new Date()}={}){
 const v=stock.valuation,p=stock.fundamentals?.peer,f=stock.fundamentals,today=marketDate(now,region);
 const reasons=[];
 if(!p||!v||!(finite(v.pe)&&v.pe>0))reasons.push('缺少正本益比與可比同業。');
 if(!p?.excludesSelf||!p?.positiveOnly||(!Number.isInteger(p?.count)||p.count<5))reasons.push('同業樣本須排除自身、僅採正倍數且至少 5 家。');
 if(!v?.financialPeriod||p?.financialPeriod!==v.financialPeriod||p?.industryCode!==f?.industryCode||p?.date!==v?.date)reasons.push('同業的估值日期、產業或參考財報期間未對齊。');
 if(![p?.p25,p?.median,p?.p75].every(n=>finite(n)&&n>0)||p?.p25>p?.median||p?.median>p?.p75)reasons.push('同業分位數無效。');
 if(age(v?.date,today)<0||age(v?.date,today)>10)reasons.push('官方估值資料過舊或日期異常。');
 if(fundKinds.includes(kindOf(stock))||kindOf(stock)!=='stock')reasons.push('此標的不是適用一般公司本益比比較的普通股。');
 return {available:!reasons.length,reasons,date:v?.date,quoteAligned:v?.date===stock.quote?.date,position:!reasons.length?position(v.pe,p.p25,p.p75):null,pe:v?.pe,p25:p?.p25,median:p?.median,p75:p?.p75,count:p?.count,financialPeriod:v?.financialPeriod,source:stock.sources?.valuation};
}

export function assessPrice({stock,history,valuation,snapshot,region='TW',now=new Date()}){
 const q=stock?.quote||{},price=q.price??q.close??null,currency=q.currency||stock.currency||(region==='TW'?'TWD':'USD'),status=quoteStatus(q,{region,now});
 const technical=assessTechnicals(stock,history,{region,now}),fundamental=assessFundamentals(stock,{snapshot,region,now}),peer=assessPeer(stock,{region,now}),reasons=[];
 const fund=fundKinds.includes(kindOf(stock)),special=kindOf(stock)!=='stock'||fundamental.kind==='financial';
 if(!status.usable)reasons.push(status.reason||'沒有可用行情。');
 if(stock.region&&stock.region!==region||history?.code&&history.code!==stock.code||history?.region&&history.region!==region)reasons.push('標的或市場識別未對齊，停止估值。');
 if(currency!==(region==='TW'?'TWD':'USD')||snapshot?.metrics?.revenue?.currency&&snapshot.metrics.revenue.currency!==currency||valuation?.ttm?.reports?.some(r=>r.currency&&r.currency!==currency))reasons.push('價格與 EPS／財報幣別未對齊，停止估值。');
 if(special)reasons.push(fund?'基金應以同日淨值與折溢價研究，不能套公司本益比法。':'此類證券需專用估值及每股基準，不直接套一般公司歷史本益比法。');
 const ttm=valuation?.ttm;
 if(!special){
 if(!valuation?.available)reasons.push(...(valuation?.reasons||['尚未建立有效歷史估值。']));
 if(!ttm?.available||!(ttm.eps>0))reasons.push('缺少有效正值的連續四季稀釋 EPS。');
 if((valuation?.validSamples?.length||0)<24)reasons.push('歷史有效月末樣本未達 24 筆。');
 if(![valuation?.p25,valuation?.p50,valuation?.p75,valuation?.low,valuation?.high].every(n=>finite(n)&&n>0)||valuation?.p25>valuation?.p50||valuation?.p50>valuation?.p75)reasons.push('歷史倍數或區間口徑尚未核實。');
 if(valuation?.available&&(Math.abs(valuation.low-ttm?.eps*valuation.p25)>.01||Math.abs(valuation.high-ttm?.eps*valuation.p75)>.01))reasons.push('區間算式與來源 EPS／倍數不一致。');
 if(snapshot?.ttm?.available&&ttm?.available&&Math.abs(snapshot.ttm.eps-ttm.eps)>.01)reasons.push('基本面與估值所採用的 EPS 版本未對齊。');
 }
 const available=!reasons.length,where=available?position(price,valuation.low,valuation.high):null;
 const titles={below:'現價偏低於歷史估值參考',within:'現價位於歷史估值參考內',above:'現價偏高於歷史估值參考'};
 const title=available?titles[where]:fund?'改以基金淨值評估價格':'目前無法核實現價合理區間';
 const conclusion=available?`${format(price)} ${currency} 相對歷史參考 ${format(valuation.low)} ～ ${format(valuation.high)} ${currency}，${where==='below'?'低於下緣':where==='above'?'高於上緣':'位於區間內'}。區間假設最新已公告獲利可維持，且歷史倍數仍可比較。`:'仍可閱讀下方已核實的基本面與技術面；尚缺的估值資料不以假設值補上。';
 const trendText=technical.available?`${technical.title}，MA20 乖離 ${format(technical.bias20)}%。`:'技術面目前無法確認趨勢。';
 const riskText=fund?'基金需核對同日淨值、折溢價、費用與追蹤差異。':fundamental.risks.length?'已公告基本面有需進一步核對的警訊；即使價格低於歷史區間，也不能直接視為便宜。':fundamental.gaps.length?'基本面仍有缺口，應先補齊現金流與可持續獲利證據。':'已公告基本面可供核對，但正向數字不保證未來獲利。';
 return {available,title,position:where,price,currency,date:q.date,technical,fundamental,peer,reasons:[...new Set(reasons)],conclusion,context:`${riskText}${trendText}均線只描述價格位置，不會調高或調低本頁估值區間。`,low:available?valuation.low:null,high:available?valuation.high:null,median:available?ttm.eps*valuation.p50:null,ttm:ttm?.available?ttm.eps:null,percentToLow:available?(price/valuation.low-1)*100:null,percentToHigh:available?(price/valuation.high-1)*100:null};
}
