import React from 'react';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,describe,it,expect,vi} from 'vitest';
import StockAnalysis from './StockAnalysis';
import analysis from '../generated/analysis.json';
import {format} from '../domain';
const term=t=><button>{t}</button>;
afterEach(()=>vi.unstubAllGlobals());
const setup=()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json(analysis)));return render(<StockAnalysis term={term}/>)};
describe('stock analysis workflow',()=>{
 it('loads a real stock, labels sources and accounting basis, and keeps metric definitions without retired course links',async()=>{
  setup();await waitFor(()=>expect(screen.getByRole('button',{name:'重新查詢'})).toBeEnabled());
  expect(screen.getByRole('heading',{name:'台積電 2330'})).toBeInTheDocument();
  expect(screen.getByRole('region',{name:'個股盤後行情'})).toHaveTextContent('普通股 · 盤後');
  expect(document.querySelector('.analysis-insights')).toBeNull();
  expect(document.querySelector('#stock-chart').compareDocumentPosition(document.querySelector('#stock-assessment'))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(document.querySelector('.financial-data-status details')).not.toHaveAttribute('open');
  await userEvent.click(screen.getByText('月營收與累計財報'));
  expect(screen.getByRole('region',{name:'個股基本面'})).toHaveTextContent('年初至季末累計');
  expect(screen.getAllByRole('button',{name:'EPS'}).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button',{name:'均線'}).length).toBeGreaterThan(0);
  expect(document.querySelector('a[href^="#unit/"]')).toBeNull();
  expect(screen.getByRole('link',{name:/現金流表/})).toHaveAttribute('href',analysis.stocks[2330].filings.cashflow.source);
 });
 it('switches daily/weekly/monthly K, keeps volume, and toggles daily MAs',async()=>{
  const user=userEvent.setup();setup();await screen.findByRole('button',{name:'重新查詢'});
  const chart=screen.getByRole('img',{name:'個股日K 與均線'});expect(chart.querySelector('[data-ma="20"]')).toBeTruthy();
  await user.click(screen.getByRole('checkbox',{name:'MA20（20 日）'}));expect(chart.querySelector('[data-ma="20"]')).toBeNull();
  await user.click(screen.getByRole('button',{name:'週 K',exact:true}));expect(screen.getByRole('img',{name:'個股週K 與均線'})).toBeInTheDocument();expect(screen.getByText('期中 K 棒 · 尚未結束')).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'月 K',exact:true}));expect(screen.getByRole('img',{name:'個股月K 與均線'})).toBeInTheDocument();expect(screen.getByRole('img',{name:'同週期成交量（股）'})).toBeInTheDocument();
 });
 it('lets users reveal the calculation and edit assumptions including EPS zero/negative',async()=>{
  const user=userEvent.setup();setup();await screen.findByRole('button',{name:'重新查詢'});
  await user.click(screen.getByText('展開計算：EPS、歷史倍數與價格區間'));
  expect(screen.getByRole('heading',{name:'1. 原始 EPS：只加單季，不加累計'})).toBeVisible();
  const area=screen.getByRole('region',{name:'使用者假設情境試算'}),input=within(area).getByRole('spinbutton',{name:'假設近四季 EPS（元／股）'});
  await user.clear(input);await user.type(input,'0');expect(within(area).getByRole('status')).toHaveTextContent('暫無適用估值');
  await user.clear(input);await user.type(input,'-3');expect(within(area).getByRole('status')).toHaveTextContent('EPS 為零或負值');
  await user.click(within(area).getByRole('button',{name:'還原原始資料的起始值'}));expect(within(area).getByRole('status')).toHaveTextContent('假設區間');
 });
 it('queries another listed stock and handles unknown codes without borrowing 2330 data',async()=>{
  const user=userEvent.setup();setup();await waitFor(()=>expect(screen.getByRole('button',{name:'重新查詢'})).toBeEnabled());const input=screen.getByRole('combobox',{name:'搜尋個股代號或名稱'});
  await user.type(input,'2317');await user.click(screen.getByRole('button',{name:'分析個股'}));expect(screen.getByRole('heading',{name:'鴻海 2317'})).toBeInTheDocument();expect(screen.getByRole('region',{name:'個股基本面'})).toBeInTheDocument();
  expect(within(screen.getByRole('region',{name:'個股盤後行情'})).queryByRole('heading',{name:/2330/})).not.toBeInTheDocument();
  await user.clear(input);await user.type(input,'9999');await user.click(screen.getByRole('button',{name:'分析個股'}));expect(screen.getByRole('heading',{name:'查無代號或名稱'})).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'查看台積電'}));await waitFor(()=>expect(screen.getByRole('button',{name:'重新查詢'})).toBeEnabled());expect(screen.getByRole('region',{name:'個股盤後行情'})).toHaveTextContent(format(analysis.stocks[2330].quote.close));
 },20000);
 it('finds OTC names and separates emerging snapshots and ETFs from corporate EPS',async()=>{
  const user=userEvent.setup();setup();await waitFor(()=>expect(screen.getByRole('button',{name:'重新查詢'})).toBeEnabled());const input=screen.getByRole('combobox',{name:'搜尋個股代號或名稱'});
  await user.type(input,'環球');const list=screen.getByRole('listbox',{name:'股票搜尋結果'});await user.click(within(list).getByRole('button',{name:/6488/}));expect(screen.getByRole('heading',{name:'環球晶 6488'})).toBeInTheDocument();
  await user.type(input,'1260');await user.click(screen.getByRole('button',{name:'分析個股'}));expect(screen.getByRole('heading',{name:'富味鄉 1260'})).toBeInTheDocument();expect(screen.getByRole('region',{name:'個股盤後行情'})).toHaveTextContent('成交快照');await waitFor(()=>expect(screen.getByRole('button',{name:'重新查詢'})).toBeEnabled());expect(screen.getAllByText(/不拼出假 K/).length).toBeGreaterThan(0);
  await user.type(input,'0050');await user.click(screen.getByRole('button',{name:'分析個股'}));await waitFor(()=>expect(screen.getByRole('button',{name:'重新查詢'})).toBeEnabled());expect(screen.getByRole('heading',{name:'基金不適用公司本益比法'})).toBeInTheDocument();expect(screen.queryByRole('region',{name:'使用者假設情境試算'})).not.toBeInTheDocument();
 });
 it('reports refresh failure and keeps the last dated snapshot',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));render(<StockAnalysis term={term}/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'重新查詢'})).toBeEnabled());expect(within(screen.getByRole('region',{name:'個股盤後行情'})).getByText(/全市場快照本次更新失敗/)).toBeInTheDocument();expect(screen.getByRole('region',{name:'個股盤後行情'})).toHaveTextContent('保留已保存資料');
 });
});
