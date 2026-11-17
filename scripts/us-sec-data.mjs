import { daysBetween, US_METRICS } from '../src/us-stock-analysis.js';

const concepts = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
  grossProfit: ['GrossProfit'],
  operatingIncome: ['OperatingIncomeLoss'],
  netIncome: ['NetIncomeLoss'],
  operatingCash: ['NetCashProvidedByUsedInOperatingActivities'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment'],
};

export const filingUrl = (cik, accession) =>
  `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll('-', '')}/${accession}-index.htm`;

const date = /^\d{4}-\d{2}-\d{2}$/;
const accession = /^\d{10}-\d{2}-\d{6}$/;
const annual = row => daysBetween(row.start, row.end) >= 340 && daysBetween(row.start, row.end) <= 385;
const quarterly = row => daysBetween(row.start, row.end) >= 70 && daysBetween(row.start, row.end) <= 105;
const next = day => new Date(Date.parse(day) + 86_400_000).toISOString().slice(0, 10);

function facts(company, tag, unit, cutoff) {
  return (company.facts?.['us-gaap']?.[tag]?.units?.[unit] || []).filter(row =>
    ['10-Q', '10-K', '10-Q/A', '10-K/A'].includes(row.form) && accession.test(row.accn) &&
    date.test(row.start) && date.test(row.end) && date.test(row.filed) &&
    row.filed <= cutoff && row.filed >= row.end && row.end >= '2022-01-01' && Number.isFinite(row.val));
}

function unique(rows) {
  return rows.length && rows.every(row => row.val === rows[0].val) ? rows[0] : null;
}

function outline(row) {
  return { start: row.start, end: row.end, filed: row.filed, accession: row.accn, value: row.val };
}

function metric(company, tags, period, cutoff, prior) {
  for (const tag of tags) {
    const all = facts(company, tag, 'USD', cutoff);
    const sameFile = all.filter(row => row.accn === period.accn && row.end === period.end);
    const direct = unique(sameFile.filter(row => row.start === period.start && quarterly(row)));
    if (direct) return { value: direct.val, method: '季度申報值', inputs: [outline(direct)] };
    const cumulative = unique(sameFile.filter(row => row.start === period.fiscalStart));
    if (!cumulative || !prior) continue;
    const previousRows = all.filter(row =>
      row.end === prior.end && row.start === period.fiscalStart && row.filed <= period.filed);
    const latestFiling = previousRows.map(row => row.filed).sort().at(-1);
    const previous = unique(previousRows.filter(row => row.filed === latestFiling && Number(row.fy) === period.year));
    if (previous) return { value: cumulative.val - previous.val, method: '本期累計減前一期累計', inputs: [outline(cumulative), outline(previous)] };
  }
  return null;
}

export function normalizeSecCompany(company, stock, cutoff, earningsReleases = []) {
  if (Number(company.cik) !== Number(stock.cik)) throw new Error('Unexpected CIK');
  const epsFacts = facts(company, 'EarningsPerShareDiluted', 'USD/shares', cutoff);
  const originals = new Set(epsFacts
    .filter(row => !row.form.endsWith('/A') && daysBetween(row.end, row.filed) <= 100)
    .map(row => [row.fy, row.fp, row.start, row.end].join('/')));
  const candidates = new Map();
  for (const row of epsFacts) {
    const quarter = row.fp === 'FY' && annual(row) ? 4 : /^Q[123]$/.test(row.fp) && quarterly(row) ? Number(row.fp[1]) : 0;
    if (!quarter || !Number.isInteger(row.fy) || !originals.has([row.fy, row.fp, row.start, row.end].join('/'))) continue;
    const key = row.accn + '/' + row.end;
    const values = candidates.get(key) || [];
    values.push({ ...row, quarter });
    candidates.set(key, values);
  }
  const releases = earningsReleases.filter(row => row.filed <= cutoff);
  const quarterlyEps = releases.map(row => ({ ...row, priority: 0 }));
  const periodsByEnd = new Map();
  for (const period of [...candidates.values()].map(unique).filter(Boolean).sort((a, b) =>
    a.end.localeCompare(b.end) || a.filed.localeCompare(b.filed))) {
    const { quarter, fy: year, start, end, filed, accn } = period;
    const prior = [...periodsByEnd.values()].find(row => row.year === year && row.quarter === quarter - 1);
    if (quarter > 1 && !prior) continue;
    const fiscalStart = quarter === 1 || quarter === 4 ? start : prior.fiscalStart;
    const quarterStart = quarter === 4 ? next(prior.end) : start;
    if (prior && next(prior.end) !== quarterStart || quarter === 4 && fiscalStart !== prior.fiscalStart) continue;
    const source = filingUrl(stock.cik, accn);
    if (quarter < 4) quarterlyEps.push({ ...outline(period), priority: 1, source });
    const p = { year, quarter, start: quarterStart, fiscalStart, end, filed, source, accn };
    const metrics = Object.fromEntries(Object.keys(US_METRICS).map(key =>
      [key, metric(company, concepts[key], p, cutoff, prior)]));
    periodsByEnd.set(end, { ...p, metrics });
  }
  if (!periodsByEnd.size) throw new Error('No usable SEC periods');
  return { ...stock, source: `https://www.sec.gov/edgar/browse/?CIK=${Number(stock.cik)}`,
    periods: [...periodsByEnd.values()].slice(-12), quarterlyEps: quarterlyEps.sort((a, b) => a.filed.localeCompare(b.filed)) };
}
