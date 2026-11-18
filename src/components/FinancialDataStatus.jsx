import React from 'react';
import {cashflowView} from '../tw-cashflow';
import {taipeiTime} from '../freshness';
import {format} from '../domain';
import '../financial-data.css';
export default function FinancialDataStatus({stock,history,valuation,coverage,now=new Date()}){
 const f=stock.fundamentals||{},c=cashflowView(stock,now),fund=['etf','etn','reit'].includes(stock.securityKind);
 const rows=fund?[
  ['行情',stock.quote?.close>0,stock.quote?.date,stock.sources?.quotes],
  ['基金淨值',false,'尚缺同日淨值，不套公司本益比估值。'],
 ]:[
  ['近四季稀釋 EPS',!!valuation.ttm?.available,valuation.ttm?.available?`至 ${valuation.ttm.latest.periodEnd}`:'缺少連續四季直接稀釋 EPS 與可核實公告日。',valuation.ttm?.latest?.source],
  ['月營收年增',Number.isFinite(f.revenue?.yoy),f.revenue?.month,stock.sources?.revenue],
  ['累計損益',Number.isFinite(f.earnings?.epsYtd),f.earnings?.period?.label,stock.sources?.earnings],
  ['營業現金流',c.amount!==null,c.available?`${c.periodStart} ～ ${c.periodEnd}（年初累計）`:c.reason,c.source],
  ['現金設備支出',c.capex!==null,c.available?'現金取得不動產、廠房及設備；支出採正值。':c.reason,c.source],
  ['自由現金流',c.freeCashFlow!==null,c.available?'同期間營業現金流 − 現金設備支出。':c.reason,c.source],
  ['MA60 方向',!history.partial&&history.rows.length>=61,`${history.rows.length} 筆日線；至少需 61 筆比較前一日。`],
  ['歷史估值',!!valuation.available,`有效月末樣本 ${valuation.validSamples.length}／最低 24 筆。`],
 ];
 return <section className="panel financial-data-status" aria-label="資料完整度與更新狀態"><div className="section-title"><div><span className="eyebrow">DATA COVERAGE / 官方來源與缺口</span><h2>這檔股票，哪些資料已經齊備？</h2></div><span className="analysis-tag">{rows.filter(r=>r[1]).length}／{rows.length} 項可查閱</span></div><p>行情每日更新，財報依公司申報更新。進站會重讀已發布快照；財報由排程批次查核。</p>
  <div className="financial-status-grid">{rows.map(([label,ok,note,source])=><article key={label}><span>{label}</span><b className={ok?'data-ready':'data-gap'}>{ok?'已有資料':'仍有缺口'}</b><small>{note||'來源尚未提供期間。'}</small>{source&&<a className="text-link" href={source} target="_blank" rel="noopener noreferrer">查原始資料 ↗</a>}</article>)}</div>
  {c.available&&<details className="cashflow-audit"><summary>展開現金流：原始數字、口徑與查核狀態</summary><p>{c.periodStart} ～ {c.periodEnd}，合併、年初累計，單位：新台幣千元。</p><p className="analysis-formula">營業活動淨現金 {format(c.amount,0)}<br/>取得設備原始現金流 {format(c.rawCapex,0)}；支出正值 {format(c.capex,0)}<br/>自由現金流＝{format(c.amount,0)} − {format(c.capex,0)} ＝ {format(c.freeCashFlow,0)}</p><p>首次公告日：來源未提供。首次觀察 {taipeiTime(c.firstObservedAt)}；最近成功查核 {taipeiTime(c.checkedAt)}。擷取日不當作公告日，這組累計財報不納入歷史 EPS 估值。</p>{c.retained&&<p className="notice">本次來源更新失敗，沿用上述原值與原查核日期。</p>}{c.checkOverdue&&<p className="notice">此來源超過 8 天未重新查核，請開啟原始資料確認最新版本。</p>}{c.changedSincePreviousObservation&&<p className="notice">本次觀察到數值修訂；保留前次版本，不將新版回填到舊歷史估值。</p>}<p className="subtle">自由現金流在本頁定義為 OCF 減現金設備支出，不含無形資產取得，也不把全部投資現金流視為資本支出。</p><a className="text-link" href={c.source} target="_blank" rel="noopener noreferrer">開啟指定公司及季度的官方表格 ↗</a></details>}
  {coverage&&<details><summary>全市場財報回補進度與更新配置</summary><p>已補入 {coverage.covered}／{coverage.eligible} 檔適用的一般上市櫃普通股現金流，其中 {coverage.complete} 檔同時具備 OCF、設備支出與 FCF。這是財報涵蓋數，不代表所有股票都有歷史估值。</p><p>行情及清單：TWSE／TPEx；累計損益與營收：官方 OpenAPI；現金流：MOPS 財務比較 E 點通。台灣時間每日 17:00、21:00 排程，GitHub 執行時間可能延後。{coverage.frequency}</p><p>最近嘗試 {taipeiTime(coverage.attemptedAt)}；最近成功 {taipeiTime(coverage.updatedAt)}。來源失敗保留原日期。缺少公告日、單季稀釋 EPS 或歷史樣本時，估值仍顯示缺口。</p>{coverage.warnings?.map((w,i)=><p key={i} className="notice">{w}</p>)}<p>twstock 保留本機行情查核用途，與網站官方行情有相同上游；不把它視為財報供應商。FinMind 尚未啟用；美股 SEC 沿用已驗證快照，沒有新增聯絡資訊或未授權行情。</p></details>}
 </section>;
}
