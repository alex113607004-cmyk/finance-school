import { describe, expect, it } from 'vitest';
import snapshot from './generated/us-stocks.json';
import { findUsStock, newYorkDay, usFundamentalSummary, usTrailingEps, valueUsStock } from './us-stock-analysis';
import { normalizeSecCompany } from '../scripts/us-sec-data.mjs';

const { AAPL, MSFT } = snapshot.stocks;
const testDay = '2026-11-17';

describe('US filings and market-time valuation', () => {
  it('separates the markets, company fiscal calendars and New York trading dates', () => {
    expect(findUsStock('NASDAQ:aapl').symbol).toBe('AAPL');
    expect(findUsStock('微軟').symbol).toBe('MSFT');
    expect(findUsStock('2330')).toBeUndefined();
    expect(newYorkDay(new Date('2026-11-17T01:00:00Z'))).toBe('2026-11-16');
    expect(usFundamentalSummary(AAPL, testDay).latest).toMatchObject({ year: 2026, quarter: 4, end: '2026-09-26' });
    expect(usFundamentalSummary(MSFT, testDay).latest).toMatchObject({ year: 2027, quarter: 1, end: '2026-09-30' });
  });

  it('reproduces quarter EPS and operating cash after deducting cash capital expenditure', () => {
    const result = usFundamentalSummary(AAPL, testDay);
    expect(result.eps.inputs.map(x => x.value)).toEqual([2.84, 2.01, 2.02, 2.1]);
    expect(result.eps.value).toBe(8.97);
    expect(result.latest.metrics.operatingCash.inputs).toHaveLength(2);
    expect(result.freeCash).toBe(25_859_000_000);
    expect(usFundamentalSummary(MSFT, testDay).eps.value).toBe(19.16);
  });

  it('keeps the original EPS for historical dates before a correction is available', () => {
    const asOf = '2026-11-05';
    const correction = { ...AAPL.quarterlyEps.find(q => q.end === '2026-09-26'), value: 1, priority: 2, filed: asOf };
    const eps = [...AAPL.quarterlyEps, correction];
    expect(usTrailingEps(eps, '2026-11-02').value).toBe(8.72);
    expect(usTrailingEps(eps, asOf).value).toBe(8.97);
    expect(usTrailingEps(eps, '2026-11-06').value).toBe(7.87);
    expect(usTrailingEps(eps.filter(row => row.end !== '2026-03-28'), '2026-11-06').value).toBeNull();
  });

  it('uses point-in-time EPS with confirmed SIP bars and rejects incompatible input', () => {
    // These artificial prices exercise the model. They are never shipped as quote data.
    const rows = [];
    for (const day = new Date('2023-12-01'); day < new Date(testDay); day.setUTCDate(day.getUTCDate() + 1)) {
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
      rows.push({ date: day.toISOString().slice(0, 10), open: 100, high: 105, low: 95, close: 100, volume: 50 });
    }
    const history = { rows, feed: 'sip', splitBasisConfirmed: true, partial: false };
    const observation = valueUsStock({ ...AAPL, history }, testDay);
    expect(observation.available).toBe(true);
    expect(observation.samples.length).toBeGreaterThanOrEqual(24);
    expect(observation.low).toBeCloseTo(observation.p25 * 8.97);
    expect(observation.high).toBeCloseTo(observation.p75 * 8.97);
    expect(valueUsStock({ ...AAPL, history: { ...history, feed: 'iex' } }, testDay).available).toBe(false);
    expect(valueUsStock({ ...AAPL, history: { ...history, splitBasisConfirmed: false } }, testDay).samples).toEqual([]);
    expect(valueUsStock({ ...AAPL, history }, '2026-12-04').available).toBe(false);
    expect(valueUsStock({ ...AAPL, history, quarterlyEps: AAPL.quarterlyEps.map(x => ({ ...x, value: -1 })) }, testDay).available).toBe(false);
    expect(valueUsStock(AAPL, testDay).reasons).toContain('尚無可公開展示的美股行情。');
  });

  it('does not treat a year-to-date EPS or a replayed prior-year comparative as the current quarter', () => {
    const base = { fy: 2026, fp: 'Q1', start: '2025-09-28', end: '2025-12-27', val: 2.84, accn: '0000320193-26-000006', form: '10-Q', filed: '2026-01-30' };
    const amended = { ...base, form: '10-Q/A', accn: '0000320193-26-000009', filed: '2026-07-01', val: 2.7 };
    const rows = [base, { ...base, fp: 'Q2', start: '2025-09-28', end: '2026-03-28', val: 4.85, filed: '2026-05-01' },
      { ...base, fy: 2027, filed: '2027-01-30', val: 3 }, amended];
    const input = { cik: 320193, facts: { 'us-gaap': { EarningsPerShareDiluted: { units: { 'USD/shares': rows } } } } };
    const stock = normalizeSecCompany(input, AAPL, '2027-02-01');
    expect(stock.quarterlyEps.map(x => x.value)).toEqual([2.84, 2.7]);
  });
});
