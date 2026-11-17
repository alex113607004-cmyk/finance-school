import { readFile, rename, writeFile } from 'node:fs/promises';
import { daysBetween, newYorkDay, US_STOCKS } from '../src/us-stock-analysis.js';
import { validCandle } from '../src/stock-analysis.js';
import { normalizeSecCompany } from './us-sec-data.mjs';

const releases = {
  AAPL: [
    ['2023-07-02', '2023-09-30', '2023-11-02', 1.46],
    ['2024-06-30', '2024-09-28', '2024-10-31', .97],
    ['2025-06-29', '2025-09-27', '2025-10-30', 1.85],
    ['2026-06-28', '2026-09-26', '2026-11-02', 2.10],
  ],
  MSFT: [
    ['2023-04-01', '2023-06-30', '2023-07-25', 2.69],
    ['2024-04-01', '2024-06-30', '2024-07-30', 2.95],
    ['2025-04-01', '2025-06-30', '2025-07-30', 3.65],
    ['2026-04-01', '2026-06-30', '2026-07-29', 4.81],
  ],
};

const now = new Date();
const checkedAt = now.toISOString();
const cutoff = newYorkDay(now);
const snapshotPath = new URL('../src/generated/us-stocks.json', import.meta.url);
const config = process.env;
const publishBars = config.US_PUBLISH_MARKET_DATA === '1';
const feed = config.US_ALPACA_FEED || 'sip';

async function json(url, headers) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      if (response.ok) return await response.json();
      const retryAfter = response.headers.get('retry-after');
      const delay = retryAfter === null ? 2 : /^\d+$/.test(retryAfter) ? Number(retryAfter) : (Date.parse(retryAfter) - Date.now()) / 1000;
      if (attempt === 2 || response.status < 500 && response.status !== 429 || delay > 10) {
        throw new Error(`${new URL(url).hostname} HTTP ${response.status}`);
      }
      await new Promise(resolve => setTimeout(resolve, Math.max(delay, 1) * 1000));
    } catch (error) {
      if (attempt === 2 || error.message.includes(' HTTP ')) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

function q4Releases(symbol) {
  return releases[symbol].map(([start, end, filed, value]) => ({
    start, end, filed, value,
    source: symbol === 'AAPL'
      ? `https://www.apple.com/newsroom/${filed.slice(0, 4)}/${filed.slice(5, 7)}/apple-reports-fourth-quarter-results/`
      : `https://www.microsoft.com/en-us/investor/earnings/fy-${end.slice(0, 4)}-q4/press-release-webcast`,
  }));
}

async function alpacaBars(symbol, adjustment) {
  const url = new URL('https://data.alpaca.markets/v2/stocks/bars');
  const start = new Date(cutoff + 'T00:00:00Z');
  start.setUTCFullYear(start.getUTCFullYear() - 3);
  start.setUTCDate(1);
  url.search = new URLSearchParams({
    symbols: symbol, timeframe: '1Day', start: start.toISOString(),
    end: cutoff + 'T00:00:00Z', limit: 10000, feed, adjustment,
  });
  const data = await json(url, {
    'APCA-API-KEY-ID': config.ALPACA_API_KEY_ID,
    'APCA-API-SECRET-KEY': config.ALPACA_API_SECRET_KEY,
  });
  const bars = data.bars?.[symbol];
  if (!Array.isArray(bars) || data.next_page_token) throw new Error('Incomplete Alpaca bars');
  const rows = bars.map(bar => ({
    date: newYorkDay(new Date(bar.t)),
    open: bar.o, high: bar.h, low: bar.l, close: bar.c, volume: bar.v,
  }));
  if (!rows.length || rows.some((row, index) =>
    !validCandle(row) || row.date >= cutoff || index > 0 && row.date <= rows[index - 1].date)) {
    throw new Error('Invalid Alpaca bars');
  }
  return rows;
}

async function stockHistory(symbol) {
  const rows = await alpacaBars(symbol, 'raw');
  let splitBasisConfirmed = false;
  if (feed === 'sip') {
    try {
      const adjusted = await alpacaBars(symbol, 'split');
      splitBasisConfirmed = rows.length === adjusted.length && rows.every((bar, i) =>
        bar.date === adjusted[i].date && ['open', 'high', 'low', 'close', 'volume'].every(field =>
          bar[field] === adjusted[i][field]));
    } catch (error) {
      console.warn(`${symbol} split check: ${error.message}`);
    }
  }
  return {
    rows, feed, fetchedAt: checkedAt, splitBasisConfirmed,
    partial: rows.some((row, i) => i > 0 && daysBetween(rows[i - 1].date, row.date) > 10),
    source: 'https://docs.alpaca.markets/us/reference/stockbars',
  };
}

const old = await readFile(snapshotPath, 'utf8').then(JSON.parse).catch(() => ({ stocks: {} }));
const stocks = {};
for (const stock of Object.values(US_STOCKS)) {
  const { symbol, cik } = stock;
  try {
    const raw = config.SEC_FIXTURE_DIRECTORY
      ? JSON.parse(await readFile(`${config.SEC_FIXTURE_DIRECTORY}/${symbol}.json`, 'utf8'))
      : await json(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
        'User-Agent': config.SEC_USER_AGENT || 'FinanceSchool research https://github.com/alex113607004-cmyk/finance-school',
      });
    stocks[symbol] = { ...normalizeSecCompany(raw, stock, cutoff, q4Releases(symbol)), checkedAt };
  } catch (error) {
    console.warn(`${symbol} SEC: ${error.message}`);
    const fallback = old.stocks[symbol];
    if (!fallback) continue;
    stocks[symbol] = { ...fallback, warning: '本次 SEC 更新失敗，顯示前次成功擷取的申報資料。' };
  }
  delete stocks[symbol].history;
  if (publishBars && config.ALPACA_API_KEY_ID && config.ALPACA_API_SECRET_KEY && ['iex', 'sip'].includes(feed)) {
    try {
      stocks[symbol].history = await stockHistory(symbol);
    } catch (error) {
      console.warn(`${symbol} Alpaca: ${error.message}`);
      stocks[symbol].marketWarning = '本次美股盤後行情更新失敗。';
    }
  }
}
if (Object.keys(stocks).length !== Object.keys(US_STOCKS).length) {
  throw new Error('One or more initial SEC snapshots could not be generated');
}
const temp = new URL(snapshotPath.href + '.tmp');
await writeFile(temp, JSON.stringify({ stocks }) + '\n');
await rename(temp, snapshotPath);
for (const stock of Object.values(stocks)) {
  console.log(`${stock.symbol}: ${stock.periods.length} periods, ${stock.quarterlyEps.length} EPS observations, ${stock.history?.rows.length || 0} daily bars`);
}
