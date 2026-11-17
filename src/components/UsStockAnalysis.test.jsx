import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import snapshot from '../generated/us-stocks.json';
import UsStockAnalysis from './UsStockAnalysis';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.location.hash = '';
});

it('loads SEC fundamentals, supports valuation scenarios, and routes a search by Chinese name', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-17T14:00:00Z'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot }));
  render(<UsStockAnalysis symbol="AAPL" term={name => name}/>);
  await screen.findByRole('heading', { name: 'Apple（AAPL）' });
  expect(screen.getByText('8.97 USD／股')).toBeInTheDocument();
  const valuation = screen.getByRole('region', { name: '美股歷史估值' });
  expect(within(valuation).getByRole('heading', { name: '暫無適用估值' })).toBeInTheDocument();
  fireEvent.click(within(valuation).getByText('自行輸入倍數，試算估值區間'));
  fireEvent.change(within(valuation).getByLabelText('假設本益比下緣'), { target: { value: '20' } });
  fireEvent.change(within(valuation).getByLabelText('假設本益比上緣'), { target: { value: '25' } });
  expect(within(valuation).getByRole('status')).toHaveTextContent('179.40');
  fireEvent.change(screen.getByRole('textbox', { name: '搜尋美股代號或公司名稱' }), { target: { value: '微軟' } });
  fireEvent.click(screen.getByRole('button', { name: '分析美股' }));
  expect(location.hash).toBe('#analysis/us/MSFT');
});
