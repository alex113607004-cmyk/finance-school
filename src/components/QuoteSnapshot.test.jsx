import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import QuoteSnapshot from './QuoteSnapshot';

afterEach(() => vi.unstubAllGlobals());

it('shows the source time and compares the matching quote to the existing valuation range', async () => {
  const fetchQuote = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ code: '2330', price: 100, snapshotAt: '2026-11-17T03:00:00Z' }),
  });
  vi.stubGlobal('fetch', fetchQuote);
  render(<QuoteSnapshot code="2330" priceUnit="元／股" estimate={{ available: true, low: 50, high: 80 }} />);
  fireEvent.click(screen.getByRole('button', { name: '取得報價快照' }));
  const status = within(screen.getByRole('status'));
  expect(await status.findByText(/快照價格高於/)).toBeInTheDocument();
  expect(status.getByText(/行情時間/)).toBeInTheDocument();
  expect(fetchQuote).toHaveBeenCalledWith('/api/twstock/quote?code=2330', expect.anything());
});

it('rejects a quote for a different stock', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ code: '2317', price: 100, snapshotAt: '2026-11-17T03:00:00Z' }),
  }));
  render(<QuoteSnapshot code="2330" priceUnit="元／股" estimate={{ available: false }} />);
  fireEvent.click(screen.getByRole('button', { name: '取得報價快照' }));
  expect(await screen.findByText(/暫時無法取得快照/)).toBeInTheDocument();
});
