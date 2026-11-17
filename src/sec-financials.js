// SEC facts remain in reported USD (not millions); only the view applies display scales.
const DAY=86400000;
const finite=Number.isFinite;
export const SEC_TAGS={
 revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],
 grossProfit:['GrossProfit'],cost:['CostOfRevenue','CostOfGoodsAndServicesSold'],
 operatingIncome:['OperatingIncomeLoss'],netIncome:['NetIncomeLoss'],
 operatingCashFlow:['NetCashProvidedByUsedInOperatingActivities'],
 capex:['PaymentsToAcquirePropertyPlantAndEquipment'],eps:['EarningsPerShareDiluted'],
 equity:['StockholdersEquity'],shares:['CommonStockSharesOutstanding'],
};
export const days=(start,end)=>(Date.parse(end)-Date.parse(start))/DAY+1;
export const nextDay=date=>new Date(Date.parse(date)+DAY).toISOString().slice(0,10);
export const fiscalKey=p=>p.fiscalYear*4+p.fiscalQuarter;
export function filingURL(cik,accession,primary){const root=`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll('-','')}/`;return root+(primary||`${accession}-index.html`);}
export function submissionIndex(submissions){
 const r=submissions.filings?.recent||{},out={};
 for(let i=0;i<(r.accessionNumber||[]).length;i++)out[r.accessionNumber[i]]={accession:r.accessionNumber[i],form:r.form[i],filed:r.filingDate[i],reportDate:r.reportDate[i],acceptedAt:r.acceptanceDateTime?.[i]||null,primaryDocument:r.primaryDocument?.[i]||null};
 return out;
}
export function extractFacts(companyFacts,submissions,{from='2018-01-01'}={}){
 const index=submissionIndex(submissions),out={};
 for(const [metric,tags]of Object.entries(SEC_TAGS)){
  out[metric]=[];
  for(const tag of tags){
   const unit=metric==='eps'?'USD/shares':metric==='shares'?'shares':'USD';
   for(const f of companyFacts.facts?.['us-gaap']?.[tag]?.units?.[unit]||[]){
    if(!/^(10-K|10-Q)(\/A)?$/.test(f.form)||!finite(f.val)||f.end<from||!f.filed)continue;
    const meta=index[f.accn];
    out[metric].push({value:f.val,start:f.start||null,end:f.end,filed:f.filed,availableFrom:nextDay(f.filed),accession:f.accn,form:f.form,fy:f.fy,fp:f.fp,frame:f.frame||null,tag,unit,currency:unit==='shares'?null:'USD',source:filingURL(companyFacts.cik,f.accn,meta?.primaryDocument),acceptedAt:meta?.acceptedAt||null,amended:f.form.endsWith('/A')});
   }
  }
 }
 return out;
}
export function fiscalPeriods(facts,submissions,extraEPS=[]){
 const index=submissionIndex(submissions),periods=new Map();
 for(const meta of Object.values(index).filter(m=>/^(10-K|10-Q)(\/A)?$/.test(m.form)).sort((a,b)=>a.filed.localeCompare(b.filed))){
  const sample=[...(facts.revenue||[]),...(facts.eps||[])].find(f=>f.accession===meta.accession&&f.end===meta.reportDate&&f.fy&&/^(Q[123]|FY)$/.test(f.fp));
  if(!sample)continue;
  const fiscalQuarter=sample.fp==='FY'?4:Number(sample.fp.slice(1));
  if(!periods.has(meta.reportDate))periods.set(meta.reportDate,{end:meta.reportDate,fiscalYear:sample.fy,fiscalQuarter,firstFiled:meta.filed});
 }
 for(const e of extraEPS){const p=periods.get(e.end);if(!p)periods.set(e.end,{end:e.end,fiscalYear:e.fiscalYear,fiscalQuarter:e.fiscalQuarter,firstFiled:e.filed});else if(e.fiscalYear===p.fiscalYear&&e.fiscalQuarter===p.fiscalQuarter&&e.filed<p.firstFiled)p.firstFiled=e.filed;}
 return [...periods.values()].sort((a,b)=>a.end.localeCompare(b.end));
}
function choose(candidates,asOf){
 const unique=[...new Map(candidates.filter(f=>f.availableFrom<=asOf).map(f=>[[f.accession,f.start,f.end,f.value].join('|'),f])).values()];
 unique.sort((a,b)=>b.filed.localeCompare(a.filed)||String(b.acceptedAt||'').localeCompare(String(a.acceptedAt||''))||b.accession.localeCompare(a.accession));
 if(!unique.length)return null;
 const top=unique[0],conflict=unique.some(f=>f.accession===top.accession&&f.start===top.start&&f.end===top.end&&f.value!==top.value);
 return conflict?{available:false,reason:'同一文件存在無法辨識的不同數值，停止混用。'}:{...top,available:true,method:'direct',sources:[top]};
}
const missing=(reason,period)=>({available:false,value:null,reason,start:null,end:period?.end||null,sources:[]});
export function quarterMetric(facts,periods,period,metric,asOf){
 if(!period)return missing('尚無已申報會計期間。');
 const records=facts[metric]||[],end=period.end;
 for(const tag of SEC_TAGS[metric]||[]){
  const direct=choose(records.filter(f=>f.tag===tag&&f.end===end&&f.start&&days(f.start,f.end)>=70&&days(f.start,f.end)<=110),asOf);
  if(direct)return {...direct,...period};
 }
 if(metric==='eps')return missing('缺少直接申報的單季稀釋 EPS；不以全年／累計 EPS 相減。',period);
 const previous=periods.find(p=>fiscalKey(p)===fiscalKey(period)-1);
 if(period.fiscalQuarter===1||!previous)return missing('沒有可比較的當季或前季累計資料。',period);
 for(const tag of SEC_TAGS[metric]||[]){
  const current=choose(records.filter(f=>f.tag===tag&&f.end===end&&f.start&&days(f.start,f.end)>110&&days(f.start,f.end)>=period.fiscalQuarter*75&&days(f.start,f.end)<=period.fiscalQuarter*100),asOf);
  if(!current?.available)continue;
  const prior=choose(records.filter(f=>f.tag===tag&&f.start===current.start&&f.end===previous.end&&f.unit===current.unit),asOf);
  if(!prior?.available)continue;
  if(current.amended||prior.amended)return missing('累計資料涉及更正，尚未確認重編基準一致，不相減。',period);
  const value=current.value-prior.value;
  if(metric==='capex'&&value<0)return missing('資本支出累計差為負，需核對重分類或更正。',period);
  return {available:true,value,start:nextDay(previous.end),end,currency:current.currency,unit:current.unit,tag,method:'cumulative-difference',filed:[current.filed,prior.filed].sort().at(-1),availableFrom:[current.availableFrom,prior.availableFrom].sort().at(-1),sources:[current,prior],formula:`${current.value} − ${prior.value} = ${value}`,...period};
 }
 return missing('尚無同標籤、同幣別、同年度起日的可比較累計資料。',period);
}
export function epsAt(financials,period,asOf){
 const extras=(financials.extraEPS||[]).filter(f=>f.end===period.end&&f.availableFrom<=asOf);
 const direct=quarterMetric(financials.facts,financials.periods,period,'eps',asOf);
 const curated=choose(extras,asOf);
 if(curated?.available&&(!direct.available||curated.filed>direct.filed))return {...curated,...period};
 return direct;
}
export function usTrailingEPS(financials,asOf){
 const published=financials.periods.filter(p=>p.firstFiled<asOf).map(p=>({...p,eps:epsAt(financials,p,asOf)}));
 // The newest known reported period is authoritative; never skip a missing Q4.
 const four=published.slice(-4),reports=four.map(p=>({year:p.fiscalYear,quarter:p.fiscalQuarter,fiscalYear:p.fiscalYear,fiscalQuarter:p.fiscalQuarter,periodStart:p.eps.start,periodEnd:p.end,eps:p.eps.value,announcedOn:p.eps.filed,availableFrom:p.eps.availableFrom,source:p.eps.sources?.[0]?.source||p.eps.source,accession:p.eps.sources?.[0]?.accession||p.eps.accession,version:'截至觀察日已公開的 SEC 文件版本',verified:p.eps.available,currency:'USD',epsBasis:'quarterly diluted',sources:p.eps.sources||[]}));
 if(four.length!==4||four.some((p,i)=>!p.eps.available||i>0&&fiscalKey(p)!==fiscalKey(four[i-1])+1))return {available:false,reason:'連續四個會計季度的直接稀釋 EPS 尚未齊全。',reports};
 const maxGap=four.some((p,i)=>i>0&&p.eps.start!==nextDay(four[i-1].end));
 if(maxGap)return {available:false,reason:'四季期間不連續，不能加總近四季 EPS。',reports};
 return {available:true,eps:reports.reduce((s,r)=>s+Math.round(r.eps*100),0)/100,reports,latest:reports.at(-1),basis:'四季直接稀釋 EPS 相加；與年度加權股數法可能略異。'};
}
function derived(a,b,fn,unit,description){
 if(!a?.available||!b?.available)return missing('必要原始欄位缺漏：'+description,{end:a?.end||b?.end});
 if(a.start!==b.start||a.end!==b.end||a.currency!==b.currency)return missing('期間或幣別不同，不能混算：'+description,{end:a.end});
 const value=fn(a.value,b.value);if(!finite(value))return missing('分母無效：'+description,{end:a.end});
 return {available:true,value,start:a.start,end:a.end,currency:unit==='percent'?null:a.currency,unit,method:'computed',filed:[a.filed,b.filed].sort().at(-1),availableFrom:[a.availableFrom,b.availableFrom].sort().at(-1),sources:[...(a.sources||[]),...(b.sources||[])],formula:description};
}
export function buildQuarter(financials,period,asOf){
 const metrics=Object.fromEntries(['revenue','grossProfit','operatingIncome','netIncome','operatingCashFlow','capex'].map(m=>[m,quarterMetric(financials.facts,financials.periods,period,m,asOf)]));
 if(!metrics.grossProfit.available){const cost=quarterMetric(financials.facts,financials.periods,period,'cost',asOf);metrics.grossProfit=derived(metrics.revenue,cost,(a,b)=>a-b,'USD','營收 − 營業成本');}
 metrics.eps=epsAt(financials,period,asOf);
 metrics.grossMargin=derived(metrics.grossProfit,metrics.revenue,(a,b)=>b>0?a/b*100:NaN,'percent','毛利 ÷ 營收 × 100%');
 metrics.operatingMargin=derived(metrics.operatingIncome,metrics.revenue,(a,b)=>b>0?a/b*100:NaN,'percent','營業利益 ÷ 營收 × 100%');
 metrics.freeCashFlow=derived(metrics.operatingCashFlow,metrics.capex,(a,b)=>a-b,'USD','營業現金流 − 購置不動產、廠房及設備的現金支出');
 return {...period,start:metrics.revenue.start,metrics};
}
export function compareMetrics(current,prior){
 if(!current?.available||!prior?.available)return {available:false,reason:'缺少同期可比資料。'};
 if(current.unit!==prior.unit||current.currency!==prior.currency||!current.start||!prior.start||Math.abs(days(current.start,current.end)-days(prior.start,prior.end))>10)return {available:false,reason:'期間長度、單位或幣別不可比。'};
 if(prior.value<=0)return {available:false,reason:'去年同期為零或負值，不以百分比描述成長。',current,prior};
 return {available:true,value:(current.value/prior.value-1)*100,unit:'percent',current,prior,periods:[`${current.start}～${current.end}`,`${prior.start}～${prior.end}`]};
}
export function financialSnapshot(financials,asOf){
 const usable=financials.periods.filter(p=>p.firstFiled<asOf),latest=usable.at(-1);
 if(!latest)return {available:false,reason:'尚無截至觀察日已申報的財報。',ttm:{available:false,reports:[]},quarters:[]};
 const current=buildQuarter(financials,latest,asOf),previous=usable.find(p=>p.fiscalYear===latest.fiscalYear-1&&p.fiscalQuarter===latest.fiscalQuarter),prior=previous?buildQuarter(financials,previous,asOf):null;
 const comparisons=Object.fromEntries(['revenue','netIncome','operatingCashFlow','capex','freeCashFlow'].map(k=>[k,compareMetrics(current.metrics[k],prior?.metrics[k])]));
 const metrics={...current.metrics,revenueYoY:comparisons.revenue};
 return {available:true,asOf,latest:current,prior,metrics,comparisons,ttm:usTrailingEPS(financials,asOf),quarters:usable.slice(-8).map(p=>buildQuarter(financials,p,asOf))};
}
export function plainFinancialSummary(snapshot){
 if(!snapshot.available)return [snapshot.reason];
 const n=v=>new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(v),messages=[];
 for(const [key,label]of [['revenue','營收'],['netIncome','淨利'],['operatingCashFlow','營業現金流'],['freeCashFlow','自由現金流']]){
  const c=snapshot.comparisons[key];
  if(c?.available)messages.push(`${c.periods[0]}的${label}較${c.periods[1]}${c.value>=0?'增加':'減少'} ${n(Math.abs(c.value))}%。`);
  else messages.push(`${label}：${c?.reason||'同期資料不足。'}`);
 }
 messages.push('自由現金流採營業現金流減現金購置設備支出，不扣除未付現金的融資租賃；這項口徑會影響資本密集公司的解讀。');
 return messages;
}
