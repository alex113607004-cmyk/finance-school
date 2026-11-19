import React from 'react';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import ForwardPE from './ForwardPE';
import PriceResearchSummary from './PriceResearchSummary';
import {ForecastProvider} from '../ForecastContext';
const stock={code:'1234',region:'TW',securityKind:'stock',currency:'TWD',quote:{close:100,date:'2026-11-18',currency:'TWD'},fundamentals:{}};
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-19T08:00:00Z'));});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('keeps sourced and user-assumed forward PE distinct, including zero/negative feedback',async()=>{
 const user=userEvent.setup();render(<ForwardPE stock={stock}/>);const area=screen.getByRole('region',{name:'前瞻本益比與預估 EPS'});expect(area).toHaveTextContent('預估資料待補');expect(area).toHaveTextContent('不以已公告近四季 EPS');await user.click(screen.getByText('自行假設未來 EPS，試算前瞻本益比'));
 const input=screen.getByRole('spinbutton',{name:'假設未來 12 個月稀釋 EPS（TWD／股）'});await user.type(input,'5');expect(within(area).getByRole('status')).toHaveTextContent('使用者假設：100.00 ÷ 5.00 ＝ 20.0000 倍');expect(area).toHaveTextContent('預估資料待補');
 await user.clear(input);await user.type(input,'0');expect(within(area).getByRole('status')).toHaveTextContent('前瞻本益比不適用');await user.clear(input);await user.type(input,'-2');expect(within(area).getByRole('status')).toHaveTextContent('前瞻本益比不適用');
});
it('keeps US quote gaps explicit even after a positive EPS assumption',async()=>{render(<ForwardPE stock={{...stock,code:'AAPL',region:'US',quote:{status:'unavailable',currency:'USD'},currency:'USD'}} region="US"/>);await userEvent.click(screen.getByText('自行假設未來 EPS，試算前瞻本益比'));await userEvent.type(screen.getByRole('spinbutton'),'10');expect(screen.getByRole('status')).toHaveTextContent('尚無有效行情');});
it('never renders an EPS assumption for ETFs',()=>{render(<ForwardPE stock={{...stock,securityKind:'etf'}}/>);expect(screen.queryByRole('region',{name:'前瞻本益比與預估 EPS'})).toBeNull();expect(screen.queryByRole('spinbutton')).toBeNull();});
it('renders ETF premium and technical data without historical EPS valuation criteria',()=>{
 render(<PriceResearchSummary stock={{...stock,securityKind:'etf',nav:{available:true,value:98,date:'2026-11-18',currency:'TWD',kind:'official-daily',source:'https://example.com/simulated-nav'}}} history={{rows:[]}} valuation={{available:false,reasons:['尚缺四季EPS'],validSamples:[]}}/>);
 const summary=screen.getByRole('region',{name:'價格合理性評估'});expect(summary).toHaveTextContent('ETF 市價高於淨值');expect(summary).toHaveTextContent('2.04%');expect(summary).not.toHaveTextContent('尚缺四季EPS');expect(summary).not.toHaveTextContent('24 筆');expect(summary).not.toHaveTextContent('P25');
});
it('displays an institutional forecast and switches fiscal year/provider without replacing it with a user assumption',async()=>{
 vi.setSystemTime(new Date('2026-11-19T13:00:00Z'));const user=userEvent.setup();render(<ForwardPE stock={{...stock,code:'2330',quote:{close:2100,date:'2026-11-19',currency:'TWD'}}}/>);
 const area=screen.getByRole('region',{name:'前瞻本益比與預估 EPS'});expect(area).toHaveTextContent('148.64');expect(area).toHaveTextContent('14.13');expect(area).toHaveTextContent('單一法人預估');expect(area).toHaveTextContent('2026-11-19');expect(area).toHaveTextContent('未區分基本／稀釋');expect(area).not.toHaveTextContent('預估資料待補');expect(screen.getByRole('link',{name:'預估 EPS 原始來源'})).toHaveAttribute('href',expect.stringContaining('money.udn.com'));
 await user.selectOptions(screen.getByRole('combobox',{name:'預估來源與年度'}),'TW:2330:FY2027:factset:2026-10-15');expect(area).toHaveTextContent('機構調查中位數');expect(area).toHaveTextContent('145.69');expect(area).toHaveTextContent('14.41');
 await user.click(screen.getByText('自行假設未來 EPS，試算前瞻本益比'));await user.type(screen.getByRole('spinbutton'),'100');expect(screen.getByRole('status')).toHaveTextContent('21.0000');expect(area).toHaveTextContent('145.69');expect(area).toHaveTextContent('14.41');
});
it('retains a verifiable publication on refresh failure without changing its article date',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('offline')}));render(<ForecastProvider><ForwardPE stock={{...stock,code:'2330',quote:{...stock.quote,date:'2026-11-19'}}}/></ForecastProvider>);await waitFor(()=>expect(screen.getByText('法人預估更新失敗，保留已核實報導與原發布日期。')).toBeInTheDocument());expect(screen.getByRole('group',{name:'機構預估原始資料'})).toHaveTextContent('2026-10-15');expect(screen.getByRole('link',{name:'預估 EPS 原始來源'})).toBeInTheDocument();});
