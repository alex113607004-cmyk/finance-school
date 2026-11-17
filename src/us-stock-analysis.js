import { aggregateCandles, quantile, validCandle } from './stock-analysis.js';

export const US_STOCKS = {
  AAPL: { symbol: 'AAPL', cik: '0000320193', name: 'Apple', localName: '蘋果', exchange: 'NASDAQ' },
  MSFT: { symbol: 'MSFT', cik: '0000789019', name: 'Microsoft', localName: '微軟', exchange: 'NASDAQ' },
};

export const US_METRICS = {
  revenue: '營收',
  grossProfit: '毛利',
  operatingIncome: '營業利益',
  netIncome: '淨利',
  operatingCash: '營業現金流',
  capex: '資本支出',
};

const dayMs = 86_400_000;
export const daysBetween = (start, end) => (Date.parse(end) - Date.parse(start)) / dayMs;
export function newYorkDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);
}

export function findUsStock(query) {
  const normalized = query.trim().toUpperCase();
  const [prefix, ticker] = normalized.split(':');
  const key = ticker ?? prefix;
  return Object.values(US_STOCKS).find(stock =>
    (!ticker || normalized === stock.exchange + ':' + stock.symbol) &&
    [stock.symbol, stock.name.toUpperCase(), stock.localName].includes(key));
}

function availableQuarters(quarters, asOf) {
  const seen = new Map();
  for (const quarter of quarters) {
    if (quarter.filed >= asOf || quarter.end > asOf) continue;
    const current = seen.get(quarter.end);
    if (!current || quarter.filed > current.filed || quarter.filed === current.filed && quarter.priority > current.priority) {
      seen.set(quarter.end, quarter);
    }
  }
  return [...seen.values()].sort((a, b) => a.end.localeCompare(b.end));
}

export function usTrailingEps(quarterlyEps, asOf) {
  const inputs = availableQuarters(quarterlyEps, asOf).slice(-4);
  if (inputs.length !== 4 || inputs.some((r, i) =>
    !Number.isFinite(r.value) || i > 0 && daysBetween(inputs[i - 1].end, r.start) !== 1)) {
    return { inputs, value: null };
  }
  return { inputs, value: Math.round(inputs.reduce((sum, row) => sum + row.value, 0) * 100) / 100 };
}

export function usFundamentalSummary(stock, asOf) {
  const filings = stock.periods.filter(row => row.filed < asOf);
  const latest = filings.at(-1);
  const prior = latest && filings.find(row => row.quarter === latest.quarter && row.year === latest.year - 1);
  const eps = usTrailingEps(stock.quarterlyEps, asOf);
  const value = key => latest?.metrics[key]?.value;
  const revenue = value('revenue');
  const priorRevenue = prior?.metrics.revenue?.value;
  const margin = key => revenue > 0 && Number.isFinite(value(key)) ? value(key) / revenue * 100 : null;
  const cash = value('operatingCash');
  const capex = value('capex');
  return {
    latest, prior, eps, grossMargin: margin('grossProfit'), operatingMargin: margin('operatingIncome'),
    revenueGrowth: priorRevenue > 0 && Number.isFinite(revenue) ? (revenue / priorRevenue - 1) * 100 : null,
    freeCash: Number.isFinite(cash) && capex >= 0 ? cash - capex : null,
  };
}

export function valueUsStock(stock, asOf, minimumSamples = 24) {
  const history = stock.history;
  const rows = history?.rows || [];
  const last = rows.at(-1);
  const reasons = [];
  if (!last) reasons.push('尚無可公開展示的美股行情。');
  if (stock.warning) reasons.push('本次財報更新失敗，尚未確認是否有更新申報。');
  if (last && history.feed !== 'sip') reasons.push('歷史估值使用整合市場日線，目前為單一交易所行情。');
  if (last && (!history.splitBasisConfirmed || history.partial)) reasons.push('股數口徑或行情完整性尚未確認。');
  if (last && (last.date >= asOf || daysBetween(last.date, asOf) > 10)) reasons.push('收盤資料已過期或交易日期未完成。');
  if (rows.some((row, i) => !validCandle(row) || i > 0 && row.date <= rows[i - 1].date)) {
    reasons.push('日線資料未通過價格或日期核對。');
  }
  const eps = last ? usTrailingEps(stock.quarterlyEps, last.date) : { value: null, inputs: [] };
  if (last && !(eps.value > 0)) reasons.push('當時可取得的連續四季稀釋 EPS 不足或非正值。');
  if (last && eps.inputs.length && daysBetween(eps.inputs.at(-1).end, last.date) > 200) {
    reasons.push('估值所用財報期間過舊。');
  }
  const samples = (!history?.splitBasisConfirmed || history.partial ? [] : aggregateCandles(rows, 'month', { asOf }))
    .filter(row => row.start > rows[0]?.date && row.end < last?.date)
    .flatMap(row => {
      const basis = usTrailingEps(stock.quarterlyEps, row.date);
      return basis.value > 0 && daysBetween(basis.inputs.at(-1).end, row.date) <= 200
        ? [{ date: row.date, close: row.close, eps: basis.value, inputs: basis.inputs, multiple: row.close / basis.value }]
        : [];
    });
  if (last && samples.length < minimumSamples) reasons.push(`有效月末樣本 ${samples.length} 筆，至少需 ${minimumSamples} 筆。`);
  if (reasons.length) return { available: false, reasons, samples, eps };
  const multiples = samples.map(s => s.multiple);
  const p25 = quantile(multiples, .25), p50 = quantile(multiples, .5), p75 = quantile(multiples, .75);
  const low = eps.value * p25, high = eps.value * p75;
  const position = last.close < low ? '低於' : last.close > high ? '高於' : '位於';
  return { available: true, reasons, samples, eps, p25, p50, p75, low, high, position };
}
