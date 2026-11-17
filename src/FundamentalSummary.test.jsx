import React from 'react';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import FundamentalSummary from './components/FundamentalSummary';
import Market from './components/Market';
import App from './App';

const term=t=><span>{t}</span>;
const fixture=()=>JSON.parse(fs.readFileSync('tests/fixtures/fundamental-2330-20261117.json'));
describe('per-stock financial evidence in the market flow',()=>{
 it('shows all four dimensions, inspectable formulas, dated sources and the remaining gaps',async()=>{
  const user=userEvent.setup(),data=fixture();
  render(<FundamentalSummary data={data} term={term} now={new Date('2026-11-17T03:00:00Z')}/>);
  expect(screen.getByRole('heading',{name:'先觀察，買進條件尚未全部符合'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'01　獲利能力'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'02　營收成長'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'03　財務結構與短期償債'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'04　價格是否已反映基本面？'})).toBeInTheDocument();
  await user.click(screen.getByText('核對資產負債原始值與公式'));
  expect(screen.getByText(/資產總計 10,052,887,514/)).toBeVisible();
  expect(screen.getByText(/營業現金流、自由現金流與多年獲利趨勢尚未接入/)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/證交所｜一般業資產負債表/})).toHaveAttribute('href',data.sources.balance);
  expect(screen.getByText(/出表日不等於公司公告日/)).toBeInTheDocument();
 });
 it('replaces the entire report when changing stocks and uses a separate ETF state',async()=>{
  const user=userEvent.setup();render(<Market term={term}/>);
  const report=()=>within(screen.getByRole('region',{name:'個股基本面摘要與買進條件'}));
  expect(report().getByText(/台積電 2330/)).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:/鴻海 2317/}));
  expect(report().getByText(/鴻海 2317/)).toBeInTheDocument();
  expect(report().queryByText(/台積電 2330/)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:/元大台灣50 0050/}));
  expect(report().getByRole('heading',{name:'ETF 需採基金評估方法'})).toBeInTheDocument();
  expect(report().queryByRole('heading',{name:'01　獲利能力'})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:/Apple AAPL/}));
  expect(report().getByText(/NASDAQ:AAPL/)).toBeInTheDocument();
  expect(report().getByRole('heading',{name:'資料不足，暫不能判斷買進條件'})).toBeInTheDocument();
 });
 it('opens the new financial terms from the actual stock page',async()=>{
  const user=userEvent.setup();window.history.replaceState(null,'','#market');render(<App/>);
  const report=within(screen.getByRole('region',{name:'個股基本面摘要與買進條件'}));
  await user.click(report.getByRole('button',{name:'負債比率'}));
  expect(within(screen.getByRole('dialog')).getByText(/負債總計 ÷ 資產總計 × 100%/)).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'關閉名詞解釋'}));
  await user.click(report.getByRole('button',{name:'流動比率'}));
  expect(within(screen.getByRole('dialog')).getByText(/存貨或應收帳款不一定能立即變現/)).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'關閉名詞解釋'}));
  const moving=within(screen.getByRole('region',{name:'五種均線觀察'}));
  expect(moving.getAllByRole('article')).toHaveLength(5);
  await user.click(moving.getByRole('button',{name:'年線'}));
  expect(within(screen.getByRole('dialog')).getByText(/最近 240 個有效交易日/)).toBeInTheDocument();
 });
});
