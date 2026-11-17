import React, { useEffect, useRef, useState } from 'react';
import { format } from '../domain';
import { taipeiTime } from '../freshness';

export default function QuoteSnapshot({ code, priceUnit, estimate }) {
  const pending = useRef(null);
  const [result, setResult] = useState(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    const request = new AbortController();
    pending.current = request;
    setResult({ loading: true });
    try {
      const response = await fetch('/api/twstock/quote?' + new URLSearchParams({ code }), {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok || data.code !== code || !Number.isFinite(Date.parse(data.snapshotAt))) {
        throw new Error('Invalid quote');
      }
      if (!request.signal.aborted) setResult({ data });
    } catch {
      if (!request.signal.aborted) setResult({ error: true });
    }
  }

  const snapshot = result?.data;
  const price = snapshot?.price;
  const position = estimate.available && Number.isFinite(price)
    ? (price < estimate.low ? '低於' : price > estimate.high ? '高於' : '位於')
    : null;

  return <section className="panel analysis-section" aria-label="本機台股報價快照">
    <div className="section-title">
      <div><h2>報價快照</h2><p className="subtle">按一下查詢單次行情。估值與日 K 仍依各自標示的盤後資料計算。</p></div>
      <button type="button" className="secondary" disabled={result?.loading} onClick={refresh}>
        {result?.loading ? '查詢中…' : '取得報價快照'}
      </button>
    </div>
    <div role="status">
      {result?.error && <p>暫時無法取得快照。請確認本機 twstock 服務已啟動，再重試。</p>}
      {snapshot && <>
        <p>{Number.isFinite(price) ? <><strong>{format(price)}</strong> {priceUnit}</> : '這筆快照未提供成交價。'}</p>
        <p className="subtle">行情時間 {taipeiTime(snapshot.snapshotAt)} · <a className="text-link" href="https://mis.twse.com.tw/stock/index.jsp">證交所基本市況報導網站</a></p>
        {position && <p>快照價格{position}目前頁面盤後估值區間 {format(estimate.low)} ～ {format(estimate.high)} 元。</p>}
      </>}
    </div>
  </section>;
}
