import React from 'react';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
import StockAnalysis from './StockAnalysis';
import us from '../generated/us.json';
import {ETFReference,etfPremium} from './ResearchFundamentals';
const term=t=><button>{t}</button>;
afterEach(()=>vi.unstubAllGlobals());
it('loads Apple SEC data with periods, sources, explicit quote gaps and scenario EPS feedback',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(us)));const user=userEvent.setup();render(<StockAnalysis param="US" symbol="AAPL" term={term}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'重新查詢美股'})).toBeEnabled());expect(document.querySelector('a[href^="#unit/"]')).toBeNull();
 expect(screen.getByRole('region',{name:'美股行情狀態'})).toHaveTextContent('行情資料暫不可用');
 const financials=screen.getByRole('region',{name:'可驗算季度基本面'});expect(financials).toHaveTextContent(us.stocks['US:AAPL'].snapshot.ttm.eps.toFixed(2)+' USD／股');expect(financials).toHaveTextContent(us.stocks['US:AAPL'].snapshot.latest.start+' ～ '+us.stocks['US:AAPL'].snapshot.latest.end);expect(financials).toHaveTextContent('自由現金流');expect(within(financials).getAllByRole('link',{name:/原始來源/}).length).toBeGreaterThan(2);
 const valuation=screen.getByRole('region',{name:'美股歷史估值驗算'});expect(valuation).toHaveTextContent('暫無適用估值');const input=screen.getByRole('spinbutton',{name:'假設近四季 EPS（USD／股）'});await user.clear(input);await user.type(input,'0');expect(screen.getByRole('region',{name:'美股使用者假設情境試算'})).toHaveTextContent('EPS 為零或負值');
});
it('searches names, preserves market in URLs, separates fiscal years and ETF fields',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(us)));const user=userEvent.setup();render(<StockAnalysis param="US" symbol="AAPL" term={term}/>);const search=screen.getByRole('textbox',{name:'搜尋美股代號或公司名稱'});
 await user.type(search,'微軟');await user.click(screen.getByRole('button',{name:'分析美股'}));expect(window.location.hash).toBe('#analysis/US/MSFT');expect(screen.getByRole('region',{name:'可驗算季度基本面'})).toHaveTextContent('FY'+us.stocks['US:MSFT'].snapshot.latest.fiscalYear+' Q'+us.stocks['US:MSFT'].snapshot.latest.fiscalQuarter);
 await user.type(search,'unknown');await user.click(screen.getByRole('button',{name:'分析美股'}));expect(screen.getByRole('alert')).toHaveTextContent('尚未涵蓋');await user.click(screen.getByRole('button',{name:'標普 500 ETF SPY'}));expect(window.location.hash).toBe('#analysis/US/SPY');expect(screen.getByRole('region',{name:'ETF 淨值與折溢價'})).toHaveTextContent('—');expect(screen.queryByRole('region',{name:'美股使用者假設情境試算'})).not.toBeInTheDocument();
});
it('keeps a verified SEC fallback when the source fails, with original dates',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('network unavailable')}));render(<StockAnalysis param="US" symbol="AAPL" term={term}/>);expect(await screen.findByText(/保留最後已核實快照/,{selector:'p.notice[role="status"]'})).toBeInTheDocument();expect(screen.getByRole('region',{name:'可驗算季度基本面'})).toHaveTextContent('2026-11-03');
});
it('calculates ETF premium only for the same date and currency',()=>{
 const quote={price:105,currency:'TWD',date:'2026-11-17'},nav={available:true,value:100,currency:'TWD',date:'2026-11-17'};expect(etfPremium(quote,nav).value).toBeCloseTo(5);expect(etfPremium(quote,{...nav,date:'2026-11-16'}).available).toBe(false);render(<ETFReference quote={quote} nav={nav}/>);expect(screen.getByRole('region',{name:'ETF 淨值與折溢價'})).toHaveTextContent('5.00%');
});
