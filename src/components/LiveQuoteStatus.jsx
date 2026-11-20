import React from 'react';
import {format} from '../domain';
export default function LiveQuoteStatus({live,fallback}){
 if(!live.enabled)return null;
 const q=live.quote,time=t=>new Date(t).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});
 return <div className="live-quote-status" aria-label="私人行情更新狀態" role="status">
  <div><b>{q?q.halted?'暫停交易 · 最近成交':q.status==='aftermarket'?'盤後成交快照':'盤中成交快照':live.busy?'正在取得私人行情…':live.supported?'私人報價暫不可用':'此市場尚未接上私人行情'}</b><button type="button" className="secondary" disabled={live.busy||!live.supported} onClick={live.refresh}>更新行情</button></div>
  {q?<><p><a href={q.source} target="_blank" rel="noopener noreferrer">Fugle</a> · 最後成交 {time(q.timestamp)} · 查詢 {time(q.checkedAt)}</p><p>目前頁面每 30 秒查詢，背景分頁暫停；未還原價格。漲跌依{q.changeBasis} {format(q.referencePrice)} 計算。{q.trialInProgress&&'目前為試撮階段，價格仍使用最近實際成交。'}</p><p>成交量為{q.volumeBasis}，不直接與歷史全日量比較。</p></>:<p>{live.error||(!live.supported?'目前 Fugle 台股 Key 不提供美股行情。':'等待來源回應。')}{fallback?.date&&` 最近盤後資料日 ${fallback.date}。`}</p>}
  {live.auth&&<a href="/">重新驗證登入</a>}
 </div>;
}
