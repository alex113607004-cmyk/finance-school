// Classifications are copied from official registries/SEC submissions, never
// inferred from a company name. TW industry codes and SEC SIC stay distinct.
export const ALL_INDUSTRIES='all';
export const validIndustryKey=value=>value==='all'||value==='ETF'||value==='unclassified'||/^(TW:\d{2}|US:SIC:\d{4})$/.test(value||'');
export function industryInfo(stock,region=stock?.region||'TW'){
 if(stock?.securityKind==='etf'||stock?.type==='etf')return {key:'ETF',label:'ETF（基金類型）',kind:'fund'};
 const saved=stock?.industry;
 if(region==='US')return saved?.scheme==='SEC SIC'&&/^\d{4}$/.test(saved.code)&&saved.label&&saved.source?{...saved,key:'US:SIC:'+saved.code,kind:'industry'}:{key:'unclassified',label:'分類未提供',kind:'missing'};
 const code=String(stock?.company?.industryCode||stock?.fundamentals?.industryCode||saved?.code||'').padStart(2,'0');
 if(!/^\d{2}$/.test(code)||code==='00')return {key:'unclassified',label:'分類未提供',kind:'missing'};
 const financialCode=stock?.fundamentals?.industryCode;
 const financialName=!financialCode||String(financialCode).padStart(2,'0')===code?stock?.fundamentals?.industryName:null;
 return {key:'TW:'+code,code,label:financialName||(saved?.code===code?saved.label:null)||`產業代碼 ${code}`,scheme:'台灣交易所產業分類',kind:'industry',source:stock?.sources?.companies||saved?.source||null,checkedAt:stock?.sourceChecks?.companies||saved?.checkedAt||null};
}
export function matchesIndustry(stock,key='all',region=stock?.region||'TW'){return key==='all'||industryInfo(stock,region).key===key;}
export function industryOptions(entries){
 const groups=new Map();
 for(const {stock,region='TW'} of entries){
  const info=industryInfo(stock,region),group=groups.get(info.key)||{key:info.key,count:0,labels:new Set(),region,kind:info.kind};
  group.count++;group.labels.add(info.label);groups.set(info.key,group);
 }
 return [...groups.values()].map(g=>{
  const names=[...g.labels].filter(n=>!n.startsWith('產業代碼 '));
  return {key:g.key,count:g.count,label:(g.kind==='industry'?g.region==='TW'?'台股 · ':'美股 SIC · ':'')+(names.length?names.sort().join('／'):[...g.labels][0])};
 }).sort((a,b)=>a.key.localeCompare(b.key));
}
export function secIndustry(submissions,{source,checkedAt}={}){
 const code=String(submissions?.sic||'');
 return /^\d{4}$/.test(code)&&submissions?.sicDescription&&source?{key:'US:SIC:'+code,code,label:submissions.sicDescription,scheme:'SEC SIC',kind:'industry',source,checkedAt:checkedAt||null}:null;
}
