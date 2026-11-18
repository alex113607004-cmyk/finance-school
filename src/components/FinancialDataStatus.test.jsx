import React from 'react';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect} from 'vitest';
import FinancialDataStatus from './FinancialDataStatus';
import html from '../../tests/fixtures/mops/cashflow-2026-q3.html?raw';
import {parseCashflow,reportURL} from '../../scripts/mops-cashflow.mjs';
it('lets a learner inspect real YTD cash-flow arithmetic without presenting retrieval as announcement',async()=>{
 const period={year:2026,quarter:3,end:'2026-09-30'},stocks=['2317','6488','2330'].map(code=>({code,market:code==='6488'?'TPEX':'TWSE'}));
 const cash=parseCashflow(html,{stocks,period,checkedAt:'2026-11-18T16:00:00Z',source:reportURL(stocks.map(s=>s.code),period)}).find(r=>r.code==='6488'),stock={code:'6488',market:'TPEX',securityKind:'stock',sources:{},fundamentals:{earnings:{period},cashflow:cash}};
 render(<FinancialDataStatus stock={stock} history={{rows:[],partial:false}} valuation={{available:false,validSamples:[]}} now={new Date(cash.checkedAt)}/>);
 await userEvent.click(screen.getByText('展開現金流：原始數字、口徑與查核狀態'));
 const region=screen.getByRole('region',{name:'資料完整度與更新狀態'});expect(region).toHaveTextContent('首次公告日：來源未提供');expect(region).toHaveTextContent('6,379,662 − 8,875,540 ＝ -2,495,878');expect(region).toHaveTextContent('缺少連續四季直接稀釋 EPS');
 expect(screen.getByRole('link',{name:'開啟指定公司及季度的官方表格 ↗'})).toHaveAttribute('href',cash.source);
});
