import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { format } from '../domain';
import { taipeiTime } from '../freshness';
import { scenario } from '../stock-analysis';
import { findUsStock, newYorkDay, US_METRICS, US_STOCKS, usFundamentalSummary, valueUsStock } from '../us-stock-analysis';
import AnalysisChart from './AnalysisChart';
import '../stock-analysis.css';

const money = value => Number.isFinite(value) ? format(value / 1e9, 2) + ' 十億美元' : '尚未取得';
const pct = value => Number.isFinite(value) ? format(value) + '%' : '尚未取得';
const source = (stock, accession) =>
  `https://www.sec.gov/Archives/edgar/data/${Number(stock.cik)}/${accession.replaceAll('-', '')}/${accession}-index.htm`;
const Link = ({ to, children }) => <a className="text-link" href={to} target="_blank" rel="noreferrer">{children} ↗</a>;
const label = row => `FY${row.year} 第 ${row.quarter} 季`;

export function AnalysisMarkets({ us = false }) {
  return <nav className="analysis-course-links" aria-label="個股分析市場">
    <a href="#analysis" aria-current={us ? undefined : 'page'}>台股分析</a>
    <a href="#analysis/us/AAPL" aria-current={us ? 'page' : undefined}>美股分析</a>
  </nav>;
}

function EpsSources({ inputs }) {
  return <div className="table-scroll"><table>
    <thead><tr><th>季度期間</th><th>稀釋 EPS（USD／股）</th><th>申報／公告日</th></tr></thead>
    <tbody>{inputs.map(row => <tr key={row.end}>
      <td>{row.start} ～ {row.end}</td><td>{format(row.value)}</td>
      <td><Link to={row.source}>{row.filed}</Link></td>
    </tr>)}</tbody>
  </table></div>;
}

function Fundamentals({ stock, summary, term }) {
  const { latest, prior, eps, revenueGrowth, grossMargin, operatingMargin, freeCash } = summary;
  if (!latest) return <p role="status">尚未取得已公開的季度資料。</p>;
  const metrics = latest.metrics;
  return <section className="panel analysis-section" aria-label="美股基本面">
    <div className="section-title">
      <div><h2>基本面與現金流</h2><p>{label(latest)} · {latest.start} ～ {latest.end} · 申報 {latest.filed}</p></div>
      <Link to={latest.source}>本季原始申報</Link>
    </div>
    <div className="analysis-ratios">
      <div>{term('EPS')}（近四季稀釋）<b>{Number.isFinite(eps.value) ? format(eps.value) + ' USD／股' : '連續四季資料不足'}</b><small>{eps.inputs[0]?.start} ～ {eps.inputs.at(-1)?.end}</small></div>
      <div>營收年增率<b>{pct(revenueGrowth)}</b><small>{prior ? `相比 ${label(prior)}` : '缺少去年同期'}</small></div>
      <div>毛利率<b>{pct(grossMargin)}</b></div>
      <div>營業利益率<b>{pct(operatingMargin)}</b></div>
      <div>自由現金流<b>{money(freeCash)}</b><small>營業現金流 − 資本支出</small></div>
    </div>
    <p>{Number.isFinite(revenueGrowth) && <>本季營收 {money(metrics.revenue.value)}，較去年同期{revenueGrowth < 0 ? '減少' : '增加'} {pct(Math.abs(revenueGrowth))}。 </>}
      {Number.isFinite(operatingMargin) && <>每 100 美元營收約對應 {format(operatingMargin)} 美元營業利益。 </>}
      {Number.isFinite(freeCash) && <>扣除本季資本支出後，自由現金流為 {money(freeCash)}。</>}
    </p>
    <details><summary>查看近四季 EPS 來源與加總</summary>
      <EpsSources inputs={eps.inputs}/>
      <p>使用公司直接揭露的單季稀釋 EPS，加總有四捨五入與加權股數口徑差異。</p>
    </details>
    <div className="table-scroll"><table>
      <thead><tr><th>季度指標</th><th>{label(latest)}</th><th>{prior ? label(prior) : '去年同期'}</th><th>本期原始數值與資料來源</th></tr></thead>
      <tbody>{Object.entries(US_METRICS).map(([key, name]) => <tr key={key}>
        <th scope="row">{name}</th><td>{money(metrics[key]?.value)}</td><td>{money(prior?.metrics[key]?.value)}</td>
        <td>{metrics[key] ? <details><summary>{metrics[key].method}</summary>{metrics[key].inputs.map(row =>
          <div key={row.accession}><Link to={source(stock, row.accession)}>{row.filed}</Link> · {row.start} ～ {row.end} · {money(row.value)}</div>)}</details> : '尚未取得一致口徑'}</td>
      </tr>)}</tbody>
    </table></div>
    {prior && <p><Link to={prior.source}>去年同期原始申報</Link></p>}
    <a className="text-link" href="#unit/fund-statements">閱讀財報與現金流課程 ↗</a>
  </section>;
}

function Valuation({ stock, summary, asOf }) {
  const value = valueUsStock(stock, asOf);
  const [assumptions, setAssumptions] = useState({ eps: null, low: '', high: '' });
  const trial = scenario(assumptions.eps ?? summary.eps.value ?? '', assumptions.low, assumptions.high);
  return <section className="panel analysis-section" aria-label="美股歷史估值">
    <h2>{value.available ? `收盤價${value.position}歷史估值區間` : '暫無適用估值'}</h2>
    {value.available ? <>
      <p>近四季稀釋 EPS {format(value.eps.value)} USD／股 × 本益比 P25～P75（{format(value.p25)}～{format(value.p75)} 倍）＝ <strong>{format(value.low)}～{format(value.high)} USD／股</strong>。</p>
      <p>本益比中位數 {format(value.p50)} 倍。區間反映過去市場如何為獲利定價，仍需比較獲利、現金流與公司營運變化。</p>
    </> : <ul>{value.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    {value.samples.length > 0 && <details><summary>展開月末本益比樣本（{value.samples.length} 筆）</summary>
      <p>使用月末收盤價及該日前已公開的四季 EPS。申報當日的報表從次日才計入。</p>
      <div className="table-scroll"><table>
        <thead><tr><th>月末交易日</th><th>收盤（USD）</th><th>近四季稀釋 EPS</th><th>本益比</th><th>當時的來源</th></tr></thead>
        <tbody>{value.samples.map(row => <tr key={row.date}><td>{row.date}</td><td>{format(row.close)}</td>
          <td>{format(row.eps)}</td><td>{format(row.multiple)}</td>
          <td><details><summary>四季 EPS</summary><EpsSources inputs={row.inputs}/></details></td></tr>)}</tbody>
      </table></div>
    </details>}
    <details><summary>自行輸入倍數，試算估值區間</summary>
      <p>此處以你指定的 EPS 和倍數試算。EPS 預填可查的近四季數值、倍數由你選擇。</p>
      <div className="analysis-scenario-fields">
        {[['eps', '假設 EPS（USD／股）'], ['low', '假設本益比下緣'], ['high', '假設本益比上緣']].map(([key, name]) =>
          <label key={key}>{name}<input type="number" step="any" value={assumptions[key] ?? summary.eps.value ?? ''}
            onChange={e => setAssumptions(old => ({ ...old, [key]: e.target.value }))}/></label>)}
      </div>
      <output role="status">{trial.available ? `假設區間 ${format(trial.low)}～${format(trial.high)} USD／股` : trial.reason}</output>
    </details>
  </section>;
}

export default function UsStockAnalysis({ symbol, term }) {
  const selected = findUsStock(symbol || 'AAPL');
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(new URL('./us-stocks-data.json', document.baseURI), { cache: 'no-cache', signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('US snapshot unavailable');
        return response.json();
      }).then(setSnapshot).catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, []);
  const stock = selected && snapshot?.stocks?.[selected.symbol];
  const asOf = newYorkDay();
  const summary = stock && usFundamentalSummary(stock, asOf);
  const last = stock?.history?.rows.at(-1);
  const previous = stock?.history?.rows.at(-2);
  const searchStock = e => {
    e.preventDefault();
    const result = findUsStock(search);
    if (!result) {
      setError('目前提供 Apple（AAPL）與 Microsoft（MSFT）的已核對財報。');
      return;
    }
    setError('');
    setSearch('');
    window.location.hash = 'analysis/us/' + result.symbol;
  };
  return <div className="stock-analysis-page">
    <div className="page-title"><h1>美股個股分析</h1><p>用公司申報核對獲利、現金流與估值輸入。</p><AnalysisMarkets us/></div>
    <form className="market-search" onSubmit={searchStock}><Search size={18}/>
      <label className="sr-only" htmlFor="us-analysis-search">搜尋美股代號或公司名稱</label>
      <input id="us-analysis-search" value={search} onChange={e => { setSearch(e.target.value); setError(''); }} placeholder="AAPL、MSFT、蘋果、微軟"/>
      <button className="primary">分析美股</button>
    </form>
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="analysis-course-links">{Object.values(US_STOCKS).map(item =>
      <a key={item.symbol} href={'#analysis/us/' + item.symbol} aria-current={item.symbol === selected?.symbol ? 'page' : undefined}>{item.localName} {item.symbol}</a>)}</div>
    {!stock && <p role="status">{!selected ? '這個代號尚未納入美股資料範圍。' : unavailable || snapshot ? '財報快照暫時無法取得。' : '正在讀取財報快照…'}</p>}
    {stock && <>
      <section className="panel analysis-section" aria-label="美股行情">
        <div className="section-title">
          <div><h2>{stock.name}（{stock.symbol}）</h2><p>{stock.exchange} · 美元 USD · SEC 資料擷取 {taipeiTime(stock.checkedAt)}</p></div>
          <Link to={stock.source}>SEC 申報總覽</Link>
        </div>
        {stock.warning && <p className="notice">{stock.warning}</p>}
        {last ? <>
          <div className="analysis-price"><strong>{format(last.close)}</strong><span>USD／股</span>
            {previous && <b>{format(last.close - previous.close)}（{pct((last.close / previous.close - 1) * 100)}）</b>}</div>
          <p>美東交易日 {last.date} · 成交量 {format(last.volume, 0)} 股 · 盤後日線 · {stock.history.feed === 'sip' ? 'SIP 整合行情' : 'IEX 單一交易所'} · 擷取 {taipeiTime(stock.history.fetchedAt)}</p>
          <Link to={stock.history.source}>Alpaca 行情來源</Link>
          <AnalysisChart key={stock.symbol} history={{ ...stock.history, sourceLabel: 'Alpaca', currencyLabel: '美元／股', volumeUnit: '股' }} asOf={asOf} term={term}/>
        </> : <p>{stock.marketWarning || '尚未設定可公開展示的美股報價，暫未提供站內股價與 K 線。'}</p>}
        <Link to={`https://www.google.com/finance/quote/${stock.symbol}:${stock.exchange}`}>外部查價</Link>
      </section>
      <Fundamentals stock={stock} summary={summary} term={term}/>
      <Valuation key={stock.symbol} stock={stock} summary={summary} asOf={asOf}/>
    </>}
  </div>;
}
