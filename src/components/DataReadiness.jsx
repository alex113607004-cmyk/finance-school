import React,{useId} from 'react';
import {Database,ArrowRight,Clock3,CheckCircle2,AlertCircle,XCircle} from 'lucide-react';
import {READINESS_LABELS,readinessIndicator} from '../data-readiness';
import {format} from '../domain';
import {taipeiTime} from '../freshness';
import '../data-readiness.css';
const source=(url,label)=>url?<a href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>:<span>來源尚待提供</span>;
export const readinessId=(region,code)=>`readiness-${region}-${code}`;
export function openReadiness(id){
 const details=document.getElementById(id);if(!details)return;
 for(let node=details;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
 details.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});details.querySelector('summary')?.focus({preventScroll:true});
}
export function DataReadinessSummary({report,detailsId}){
 const status=readinessIndicator(report),panelId=useId(),Icon={ready:CheckCircle2,partial:AlertCircle,missing:XCircle}[status.state];
 return <section className="data-readiness-summary" aria-label="資料狀態摘要" aria-busy={report.busy} data-state={status.state}>
  <details key={detailsId} className="readiness-disclosure">
   <summary className="readiness-toggle" role="button" aria-label={`資料狀態：${status.label}，點擊展開或收起`} aria-controls={panelId} title={`資料狀態：${status.label}，點擊查看詳情`}><Icon size={20} aria-hidden="true"/><span className="sr-only">{status.label}</span></summary>
   <div id={panelId} className="readiness-overview">
  <div className="readiness-title"><span><Database size={14}/>資料狀態 · {status.label}</span><button type="button" onClick={()=>openReadiness(detailsId)}>查看缺口與來源<ArrowRight size={13}/></button></div>
  <div className="readiness-groups">{report.groups.map(g=><article key={g.key} data-state={g.state} aria-label={`${g.label}資料狀態`}><div><b>{g.label}</b><span>{report.busy?'核對中':READINESS_LABELS[g.state]}</span></div><strong>{g.detail}</strong><small>{g.label==='基金淨值'||g.label==='折溢價'?g.note:g.key==='financials'?g.state==='partial'?'期間、公告日仍需分別核對':g.state==='ready'?'各項期間與公告日可查閱':g.state==='inapplicable'?'基金使用專屬資料':'詳見待補欄位':g.key==='model'&&g.state==='missing'?'依缺漏原因停止計算':g.note}</small></article>)}</div>
  {report.mismatches.map(m=><p key={m} className="readiness-alert readiness-date-alert"><Clock3 size={13}/><span>{m}{report.pe&&<small>同日重算本益比 {format(report.pe.value)} 倍，展開查核表看算式。</small>}</span></p>)}
  {report.refreshWarnings.length>0&&<p className="readiness-alert"><AlertCircle size={13}/>本次部分來源未更新，顯示原日期快照；可展開查核失敗項目。</p>}
  {report.feedPaused&&report.financialRows.length>0&&<p className="readiness-alert"><Clock3 size={13}/>財報來源暫停更新，保留已查核資料與原日期；開啟查核表可查看恢復時間。</p>}
  <p className="readiness-legend">✓ 資料完整　! 部分資料缺漏或待核對　× 沒有可用資料</p>
   </div>
  </details>
 </section>;
}
export function CoverageProgress({coverage,paused}){
 if(!coverage||!Number.isFinite(coverage.eligible))return null;
 const complete=coverage.complete||0,total=coverage.eligible;
 return <div className="readiness-coverage" aria-label="官方現金流回補進度"><h3>官方現金流回補進度</h3><div className="coverage-number"><b>{format(complete,0)}<small>／{format(total,0)} 家適用公司</small></b><span>{format(Math.max(0,total-complete),0)} 家待補齊</span></div><progress max={Math.max(total,1)} value={Math.min(complete,total)} aria-label="同期間現金流三項完整公司數"/>
  <p>進度只計同期間的營業現金流、現金設備支出與自由現金流，不代表四季 EPS 或歷史估值已完成。{coverage.frequency}</p>
  {paused?<p className="readiness-pause"><Clock3 size={14}/>官方來源暫停回補至 {taipeiTime(coverage.blockedUntil)}。目前保留前次數值與成功查核時間。</p>:<p>下次排程依來源回應繼續回補，無法保證所有公司完成日期。</p>}
  <p>最近成功取得資料 {taipeiTime(coverage.updatedAt)} · 最近嘗試 {taipeiTime(coverage.attemptedAt)}</p>
  {source(coverage.sourceURL,'官方資料來源')}
 </div>;
}
export function ReadinessDetails({report,id}){
 const rows=[{...report.quote,periodLabel:report.quote.period?.end||'日期未提供'},...report.financialRows];
 return <details id={id} className="readiness-details"><summary>行情、財報與估值查核表</summary>
  <p className="readiness-explainer">各欄獨立標示期間、公告日與來源查核時間。季度財報不因股價每日更新而變成新財報；查核時間也不當成公告日。</p>
  <div className="readiness-table-scroll"><table><thead><tr>{['項目／數值','狀態與口徑','資料期間','公告日','最近成功查核','原始來源'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.key}><th scope="row">{r.label}<strong>{r.available?format(r.value):'—'}<small>{r.unit}</small></strong></th><td data-state={r.state}><b>{READINESS_LABELS[r.state]}</b><small>{r.reason}</small></td><td>{r.periodLabel}</td><td>{r.key==='quote'?'不適用（行情）':r.announcedOn||'來源未提供'}</td><td>{taipeiTime(r.checkedAt)}</td><td>{source(r.source,'查原始數字')}</td></tr>)}</tbody></table></div>
  {report.officialPE&&<p className="readiness-pe">官方本益比 {format(report.officialPE.value)} 倍，資料日 {report.officialPE.date||'尚未提供'}。{report.mismatches.join('')}</p>}
  {report.pe&&<p className="readiness-pe">本頁重算本益比（{report.pe.date}）：{report.pe.formula}；使用已核實、股數口徑一致的近四季稀釋 EPS。與官方倍數各自保留日期及分母口徑。</p>}
  <div className="readiness-model"><h3>{report.groups[2].state==='ready'?<><CheckCircle2 size={16}/>歷史估值已具備計算條件</>:'歷史估值適用條件與缺口'}</h3>{report.modelReasons.length?<ul>{report.modelReasons.map(r=><li key={r}>{r}</li>)}</ul>:<p>連續四季稀釋 EPS、至少 24 筆有效月末樣本及價格／股數基準已核對；計算與原始文件可在「估值試算」查看。</p>}</div>
  {report.region==='US'&&!report.secAutomaticUpdate&&<p className="readiness-alert">SEC 自動更新尚未啟用，財報沿用已核實快照與原查核日；需由維護者設定可識別的 SEC_USER_AGENT 並明確啟用後才能自動查核。</p>}
  {report.refreshWarnings.length>0&&<div><h3>本次來源更新狀態</h3><ul>{report.refreshWarnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
  <CoverageProgress coverage={report.coverage} paused={report.feedPaused}/>
 </details>;
}
